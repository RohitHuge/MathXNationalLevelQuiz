import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: "../.env" });

const { Pool } = pkg;
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

/**
 * Utility script to simulate Round 1 exam submissions for all users in the PostgreSQL database.
 * This will dynamically fetch all active questions and all active users,
 * generate semi-random correct/incorrect answers, and write the final calculated scores 
 * to 'results', 'users', and 'team' tables so that Round 2 Qualification can be tested.
 * 
 * Run via: node scripts/simulate-round1.js
 */
const simulateRound1 = async () => {
    try {
        console.log('--- Starting Round 1 Fake Data Simulation ---');

        // 1. Fetch all questions and mapped truth data
        const questionsRes = await pool.query('SELECT id, content, marks FROM public.questions');
        const questions = questionsRes.rows;

        if (questions.length === 0) {
            console.error('No questions found in the database. Cannot simulate exam.');
            process.exit(1);
        }

        console.log(`[Data] Fetched ${questions.length} questions.`);

        // 2. Fetch all users
        const usersRes = await pool.query('SELECT id, email, team_id FROM public.users');
        const users = usersRes.rows;

        if (users.length === 0) {
            console.error('No users found in the database. Cannot simulate exam.');
            process.exit(1);
        }

        console.log(`[Data] Fetched ${users.length} users.`);
        console.log(`[Simulating] Generating responses...`);

        // 3. Generate Fake Responses per user
        for (const user of users) {
            let totalScoreEarned = 0;
            const responsePromises = [];

            // Iterate through EVERY question for this user
            for (const q of questions) {
                const correctIndex = q.content?.correctIndex;
                const marks = q.marks || 10;

                // Skip if question format is unexpected
                if (correctIndex === undefined || correctIndex === null) continue;

                // Randomly decide if they get it right (e.g., 60% chance of being correct)
                const isCorrectRandom = Math.random() < 0.6;
                // If correct, use the correct index. If wrong, pick a random wrong index between 0-3 (assuming standard 4 option MCQ)
                let selectedOption = correctIndex;

                if (!isCorrectRandom) {
                    // Pick a random index that is NOT the correct index
                    do {
                        selectedOption = Math.floor(Math.random() * 4);
                    } while (selectedOption === correctIndex);
                }

                // Tally Score
                const isCorrect = (selectedOption === correctIndex);
                if (isCorrect) {
                    totalScoreEarned += marks;
                }

                // Insert into responses
                const insertResponse = pool.query(`
                    INSERT INTO public.responses (user_id, question_id, selected_option, is_correct, answered_at)
                    VALUES ($1, $2, $3, $4, NOW())
                 `, [user.id, q.id, selectedOption.toString(), isCorrect]);

                responsePromises.push(insertResponse);
            }

            // Wait for all individual response logs for this user to finish
            await Promise.all(responsePromises);

            // Log final aggregated score to public.results
            await pool.query(`
                 INSERT INTO public.results (user_id, total_score, submitted_at)
                 VALUES ($1, $2, NOW())
             `, [user.id, totalScoreEarned]);

            console.log(`   -> Simulated submission for User ${user.email} (Score: ${totalScoreEarned})`);
        }

        // 4. Mimic the Admin 'Calculate Results' button behavior to finalize the scores into the user and team tables
        console.log(`[Aggregating] Updating individual user scores and combined team scores...`);

        // Update user individual score
        await pool.query(`
            UPDATE public.users u
            SET individual_score = (r.total_score#>>'{}')::integer
            FROM (
                SELECT user_id, total_score
                FROM (
                    SELECT user_id, total_score,
                           ROW_NUMBER() OVER(PARTITION BY user_id ORDER BY submitted_at DESC) as rn
                    FROM public.results
                ) recent_results
                WHERE rn = 1
            ) r
            WHERE u.id = r.user_id;
        `);

        // Update team total score
        await pool.query(`
            UPDATE public.team t
            SET total_score = agg.combined_score
            FROM (
                SELECT team_id, SUM(individual_score) as combined_score
                FROM public.users
                WHERE team_id IS NOT NULL
                GROUP BY team_id
            ) agg
            WHERE t.id = agg.team_id;
        `);

        console.log('--- Simulation Complete ---');
        console.log('Round 1 data populated! You can now test the Round 2 Top N threshold in the Admin UI.');
        process.exit(0);

    } catch (error) {
        console.error('Fatal Simulation Error:', error);
        process.exit(1);
    }
};

simulateRound1();
