import pool from '../config/db.js';
import { appwriteUsers } from '../config/appwrite.js';

const removeRound2LabelFromAllUsers = async () => {
    let successCount = 0;
    let failCount = 0;

    const userList = await appwriteUsers.list();

    for (const user of userList.users) {
        if (user.labels && user.labels.includes('round2')) {
            try {
                const updatedLabels = user.labels.filter(label => label !== 'round2');
                await appwriteUsers.updateLabels(user.$id, updatedLabels);
                successCount++;
            } catch (err) {
                console.error(`[Round 2] Failed to revoke label for ${user.email}:`, err.message);
                failCount++;
            }
        }
    }

    return { successCount, failCount };
};

/**
 * Qualify the Top N Teams for Round 2.
 * Admin only feature.
 */
export const qualifyTopNTeams = async (req, res) => {
    try {
        const { n } = req.body;

        if (!n || isNaN(n) || n <= 0) {
            return res.status(400).json({ error: 'Please provide a valid number of teams (n > 0).' });
        }

        console.log(`[Round 2] Qualifying Top ${n} Teams...`);

        // 1. Fetch Top N Teams from PostgreSQL based on combined team total score
        const teamQuery = `
            SELECT id, total_score 
            FROM public.team
            ORDER BY total_score DESC NULLS LAST
            LIMIT $1;
        `;
        const topTeamsResult = await pool.query(teamQuery, [n]);
        const topTeams = topTeamsResult.rows;

        if (topTeams.length === 0) {
            return res.status(404).json({ error: 'No teams found to qualify.' });
        }

        const clearedLabels = await removeRound2LabelFromAllUsers();
        console.log(`[Round 2] Cleared ${clearedLabels.successCount} existing round2 labels before re-qualifying. (${clearedLabels.failCount} failed)`);

        // Extract Top Team IDs
        const teamIds = topTeams.map(t => t.id);

        // 2. Find only the team leaders for those Top N Teams.
        const usersQuery = `
            SELECT id
            FROM public.users
            WHERE team_id = ANY($1::uuid[])
              AND is_leader = true;
        `;
        const qualifiedUsersRes = await pool.query(usersQuery, [teamIds]);
        const qualifiedAppwriteIds = qualifiedUsersRes.rows.map(u => u.id);

        if (qualifiedAppwriteIds.length === 0) {
            return res.status(404).json({ error: 'No team leaders were found for the qualified teams.' });
        }

        console.log(`[Round 2] Found ${qualifiedAppwriteIds.length} leader IDs belonging to the top ${n} teams.`);

        // 3. Update the Appwrite Labels for each of these users
        let successCount = 0;
        let failCount = 0;

        for (const appwriteUserId of qualifiedAppwriteIds) {
            try {
                // We don't need to search Appwrite via lists anymore, we can directly GET and update.
                const userObj = await appwriteUsers.get(appwriteUserId);
                const existingLabels = userObj.labels || [];

                if (!existingLabels.includes('round2')) {
                    const newLabels = [...existingLabels, 'round2'];
                    await appwriteUsers.updateLabels(appwriteUserId, newLabels);
                }
                successCount++;
            } catch (err) {
                console.error(`[Round 2] Failed to update labels for Native Appwrite ID: ${appwriteUserId}:`, err.message);
                failCount++;
            }
        }

        // 4. Fetch the qualified leaders details for reporting
        const detailsQuery = `
            SELECT t.team_name, u.full_name, u.email, t.total_score, u.is_leader
            FROM public.team t
            JOIN public.users u ON t.id = u.team_id
            WHERE t.id = ANY($1::uuid[])
              AND u.is_leader = true
            ORDER BY t.total_score DESC NULLS LAST, t.team_name, u.full_name;
        `;
        const qualifiedDetailsRes = await pool.query(detailsQuery, [teamIds]);

        return res.status(200).json({
            success: true,
            message: `Successfully qualified ${successCount} team leaders from the top ${n} teams after clearing existing Round 2 access. (${failCount} failed, ${clearedLabels.failCount} clear failures)`,
            qualifiedTeams: qualifiedDetailsRes.rows
        });

    } catch (error) {
        console.error('[Round 2] qualifyTopNTeams Error:', error);
        return res.status(500).json({ error: 'Internal Server Error while qualifying teams.' });
    }
};

/**
 * Revokes the Round 2 access from ALL users.
 * Admin only feature.
 */
export const revokeAllQualifications = async (req, res) => {
    try {
        console.log('[Round 2] Revoking all Round 2 qualifications...');

        // Unfortunately, Appwrite Server SDK list() doesn't officially support powerful array filtering for labels via standard Queries without indexes, 
        // so we must iterate through all users to remove the label.

        const { successCount, failCount } = await removeRound2LabelFromAllUsers();

        return res.status(200).json({
            success: true,
            message: `Successfully revoked Round 2 access from ${successCount} users. (${failCount} failed)`
        });

    } catch (error) {
        console.error('[Round 2] revokeAllQualifications Error:', error);
        return res.status(500).json({ error: 'Internal Server Error while revoking qualifications.' });
    }
};

export const getRound2Reports = async (req, res) => {
    try {
        const requestedN = parseInt(req.query.n, 10);
        const n = Number.isFinite(requestedN) && requestedN > 0 ? requestedN : 20;

        const rankedTeamsRes = await pool.query(`
            SELECT
                ROW_NUMBER() OVER (ORDER BY t.total_score DESC NULLS LAST, t.team_name ASC) AS rank,
                t.id,
                t.team_name,
                COALESCE(t.total_score, 0) AS total_score
            FROM public.team t
            ORDER BY rank;
        `);

        const qualifiedTeams = rankedTeamsRes.rows.slice(0, n).map((team) => ({
            rank: team.rank,
            team_name: team.team_name,
            total_score: team.total_score
        }));

        return res.status(200).json({
            success: true,
            topN: n,
            rankedTeams: rankedTeamsRes.rows,
            qualifiedTeams
        });
    } catch (error) {
        console.error('[Round 2] getRound2Reports Error:', error);
        return res.status(500).json({ error: 'Internal Server Error while fetching team reports.' });
    }
};
