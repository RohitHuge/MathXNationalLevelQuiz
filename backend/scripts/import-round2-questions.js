import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const importQuestions = async () => {
    try {
        console.log('[Setup] Ensuring the "round" column exists in PostgreSQL...');
        try {
            // Safely attempt to add the column if it doesn't already exist
            await pool.query('ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS round INTEGER DEFAULT 1;');
            console.log('[Setup] Column "round" verification complete.');
        } catch (colErr) {
            console.warn('[Setup] Warning checking column (it may already exist):', colErr.message);
        }

        // Reaching out to the root to grab the JSON
        const filePath = path.join(__dirname, '../../integerquestions.json');
        const fileData = fs.readFileSync(filePath, 'utf-8');
        const questions = JSON.parse(fileData);

        console.log(`[Import] Found ${questions.length} questions in JSON. Beginning ingestion...`);

        let successCount = 0;

        for (const q of questions) {
            // The JSON has 'content' encoded as a stringified object. We parse it out.
            const rawContent = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

            // We reformat the content to uniquely match our FastFingers schema expectations
            // Extracting the latex string and the numerical answer.
            const fastFingersContent = {
                text: 'Solve the following Math expression:',
                mathText: rawContent.body?.latex || '',
                correctInteger: rawContent.answer?.value ? Number(rawContent.answer.value) : null
            };

            const query = `
                INSERT INTO public.questions 
                (id, content, marks, round)
                VALUES ($1, $2, $3, $4)
                ON CONFLICT (id) DO UPDATE 
                SET content = EXCLUDED.content, marks = EXCLUDED.marks, round = EXCLUDED.round
            `;

            const values = [
                q.id,
                fastFingersContent, // Injecting the newly formatted JSON
                q.marks || 10, // Default 10 marks if not provided
                2 // <-- EXPLICITLY SETTING ROUND = 2
            ];

            await pool.query(query, values);
            successCount++;
        }

        console.log(`[Success] Successfully imported ${successCount} Round 2 FastFingers questions into the database!`);
        process.exit(0);
    } catch (err) {
        console.error('[Error] Failed to import questions:', err);
        process.exit(1);
    }
};

importQuestions();
