import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: "../.env" });

const { Pool } = pkg;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the provided JSON dump (adjust path if running from frontend/backend dir)
const JSON_FILE_PATH = path.join(__dirname, './questions.json');

async function importQuestions() {
    console.log('🔄 Starting Question Import Process...');

    try {
        // 1. Read the JSON file
        const rawData = fs.readFileSync(JSON_FILE_PATH, 'utf-8');
        const questionsArr = JSON.parse(rawData);

        console.log(`📂 Loaded ${questionsArr.length} total questions from JSON.`);

        let insertedCount = 0;
        let skippedImageCount = 0;

        for (const q of questionsArr) {
            // 2. Filter out questions with images
            if (q.has_image === true) {
                skippedImageCount++;
                continue;
            }

            // 3. Parse the nested "content" string into an object to extract relevant fields
            let nestedContent;
            try {
                nestedContent = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;
            } catch (err) {
                console.warn(`⚠️ Skipping Question ID ${q.id} due to invalid JSON content.`);
                continue;
            }

            // If the body itself indicates it has an image (redundancy check), skip it
            if (nestedContent?.body?.image !== null || nestedContent?.body?.has_image === true) {
                skippedImageCount++;
                continue;
            }

            // 4. Force strict MCQ validation. Ignore Integer type bugs.
            if (nestedContent.answer?.type !== 'mcq') {
                skippedImageCount++; // We'll count integers under skipped
                continue;
            }

            // Calculate exact array index (A=0, B=1, C=2, D=3) for grading evaluation
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
                options: mappedOptions,
                correctIndex: correctIndex
            };

            // 5. Insert directly into public.questions
            await pool.query(`
                INSERT INTO public.questions (id, content, marks)
                VALUES ($1, $2, $3)
                ON CONFLICT (id) DO UPDATE 
                SET content = EXCLUDED.content,
                    marks = EXCLUDED.marks;
            `, [
                q.id, // Keep the exact UUID string from the JSON to prevent duplication
                cleanContentObject, // This converts to JSONB automatically via pg
                10 // Standard marks equivalent
            ]);

            insertedCount++;
        }

        console.log(`✅ Import Complete!`);
        console.log(`   - Successfully inserted/updated: ${insertedCount} questions`);
        console.log(`   - Skipped (has imagery): ${skippedImageCount} questions`);

    } catch (error) {
        console.error('❌ Fatal error during import:', error);
    } finally {
        await pool.end();
        process.exit(0);
    }
}

importQuestions();
