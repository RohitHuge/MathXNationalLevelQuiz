import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

// Path to the provided JSON dump (adjust path if running from frontend/backend dir)
// For this script, we point to the root where question3.json is located
const JSON_FILE_PATH = path.join(__dirname, '../../question3.json');

async function importRound3Questions() {
    console.log('🔄 Starting Round 3 Question Import Process...');

    try {
        // 1. Read the JSON file
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const questionsArr = JSON.parse(rawData);

        console.log(`📂 Loaded ${questionsArr.length} total questions from JSON.`);

        let insertedCount = 0;
        let skippedCount = 0;

        // Track subrounds so we can distribute non-image questions evenly
        const nonVisualSubRounds = [1, 3, 4, 5];
        let subRoundPointer = 0;

        for (const q of questionsArr) {
            // 2. Parse the nested "content" string into an object
            let nestedContent;
            try {
                nestedContent = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
            } catch (err) {
                console.warn(`⚠️ Skipping Question ID ${q.id} due to invalid JSON content.`);
                skippedCount++;
                continue;
            }

            // 3. Determine if it has an image (for Visual Round - Sub Round 2)
            const hasImage = q.has_image === true || nestedContent?.body?.image !== null || nestedContent?.body?.has_image === true;

            let assignedSubRound = 1;
            if (hasImage) {
                assignedSubRound = 2; // Fixed Visual Round
            } else {
                // Distribute evenly among 1, 3, 4, 5
                assignedSubRound = nonVisualSubRounds[subRoundPointer % nonVisualSubRounds.length];
                subRoundPointer++;
            }

            // Calculate exact array index (A=0, B=1, C=2, D=3)
            let correctIndex = null;
            if (nestedContent.answer?.value) {
                const charCode = nestedContent.answer.value.toUpperCase().charCodeAt(0);
                correctIndex = charCode - 65; // 'A' becomes 0
            }

            // Map options array correctly
            const mappedOptions = Array.isArray(nestedContent.options)
                ? nestedContent.options.map(opt => opt.latex || opt.text || '')
                : [];

            const cleanContentObject = {
                type: 'mcq',
                text: nestedContent.body?.latex || '',
                imageUrl: hasImage ? nestedContent.body?.image : null,
                options: mappedOptions,
                correctIndex: correctIndex
            };

            // 5. Insert directly into public.questions for Round 3
            // Explicitly setting round = 3 and sub_round = assignedSubRound
            await pool.query(`
                INSERT INTO public.questions (id, content, marks, round, sub_round)
                VALUES ($1, $2, $3, 3, $4)
                ON CONFLICT (id) DO UPDATE 
                SET content = EXCLUDED.content,
                    marks = EXCLUDED.marks,
                    round = 3,
                    sub_round = EXCLUDED.sub_round;
            `, [
                q.id,
                cleanContentObject,
                10,
                assignedSubRound
            ]);

            console.log(`✅ Inserted Question ${q.id} -> Sub-Round ${assignedSubRound} (Image: ${hasImage})`);
            insertedCount++;
        }

        console.log(`\n🎉 Import Complete!`);
        console.log(`   - Successfully inserted/updated: ${insertedCount} questions for Round 3`);
        console.log(`   - Skipped (invalid format): ${skippedCount} questions\n`);

    } catch (error) {
        console.error('❌ Fatal error during import:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

importRound3Questions();
