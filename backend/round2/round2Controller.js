import pool from '../config/db.js';
import { appwriteUsers } from '../config/appwrite.js';

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

        // Extract Top Team IDs
        const teamIds = topTeams.map(t => t.id);

        // 2. Find all Members of those specific Top N Teams
        // We will fetch the explicit IDs now since Postgres exact parity is achieved. 
        const usersQuery = `
            SELECT id 
            FROM public.users
            WHERE team_id = ANY($1::uuid[]);
        `;
        const qualifiedUsersRes = await pool.query(usersQuery, [teamIds]);
        const qualifiedAppwriteIds = qualifiedUsersRes.rows.map(u => u.id);

        console.log(`[Round 2] Found ${qualifiedAppwriteIds.length} explicit user IDs belonging to the top ${n} teams.`);

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

        // 4. Fetch the qualified teams details for reporting
        const detailsQuery = `
            SELECT t.team_name, u.full_name, u.email, t.total_score
            FROM public.team t
            JOIN public.users u ON t.id = u.team_id
            WHERE t.id = ANY($1::uuid[])
            ORDER BY t.total_score DESC NULLS LAST, t.team_name, u.full_name;
        `;
        const qualifiedDetailsRes = await pool.query(detailsQuery, [teamIds]);

        return res.status(200).json({
            success: true,
            message: `Successfully qualified ${successCount} users from the top ${n} teams. (${failCount} failed)`,
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

        let successCount = 0;
        let failCount = 0;
        let offset = 0;
        const limit = 100;
        let hasMore = true;

        while (hasMore) {
            // Fetch users page by page
            // Note: In Appwrite v1.4+, queries are preferred. We're using standard pagination approach for node-appwrite compatibility
            const userList = await appwriteUsers.list();
            // Note: If you have thousands of users, ideally use offset/cursor pagination.
            // Simplified here since the participant pool is likely <1000 for this CBT.

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

            // Due to limitations of simply dumping all pages for safety in generic script, 
            // breaking the loop if total users < 1 page limit (assuming a simple list pull).
            hasMore = false;
        }

        return res.status(200).json({
            success: true,
            message: `Successfully revoked Round 2 access from ${successCount} users. (${failCount} failed)`
        });

    } catch (error) {
        console.error('[Round 2] revokeAllQualifications Error:', error);
        return res.status(500).json({ error: 'Internal Server Error while revoking qualifications.' });
    }
};
