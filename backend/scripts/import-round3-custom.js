import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pool from '../config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * CONFIGURATION
 * Which round and sub-round are we targeting?
 */
const ROUND = 3;
const SUB_ROUND = 4; // <--- CHANGE THIS (e.g., 1, 2, 3, 4, 5)
const MARKS_PER_QUESTION = 10;

const importRound3QuestionsFromJSON = async () => {
    console.log(`\n🔄 Starting Round 3 Question Import Process to Sub-Round ${SUB_ROUND}...`);

    try {
        // Path to questions.json in the same directory
        const jsonFilePath = path.join(__dirname, 'questions.json');

        if (!fs.existsSync(jsonFilePath)) {
            console.error(`❌ [Error] File not found: ${jsonFilePath}`);
            process.exit(1);
        }

        const rawData = fs.readFileSync(jsonFilePath, 'utf-8');
        const questionsList = JSON.parse(rawData);

        console.log(`📂 Loaded ${questionsList.length} questions from JSON.`);

        let successCount = 0;

        for (const [index, q] of questionsList.entries()) {
            // q.content is stringified in the standard questions.json
            const rawContent = typeof q.content === 'string' ? JSON.parse(q.content) : q.content;

            // Determine correct index from letter (A, B, C, D)
            let correctIndex = null;
            let answerText = null;
            if (rawContent.answer?.value) {
                const rawAnswer = String(rawContent.answer.value).trim();
                const char = rawAnswer.toUpperCase();
                if (char >= 'A' && char <= 'D' && char.length === 1) {
                    correctIndex = char.charCodeAt(0) - 65;
                } else if (rawAnswer) {
                    answerText = rawAnswer;
                }
            }

            const mappedOptions = Array.isArray(rawContent.options)
                ? rawContent.options.map(o => o.latex || o.text || o)
                : [];
            const hasNamedAnswer = Boolean(answerText);

            // Map standard keys to Round 3 sub-round schema
            const formattedContent = {
                text: rawContent.body?.text || "",
                mathText: rawContent.body?.latex || "",
                infoText: rawContent.body?.info || rawContent.body?.description || "",
                options: hasNamedAnswer ? [] : mappedOptions,
                correctIndex: hasNamedAnswer ? null : correctIndex,
                answerText,
                imageUrl: rawContent.body?.image || null,
                // For sub-round 5 (Rapid Fire), sets are used (1-6)
                set: rawContent.set || (SUB_ROUND === 5 ? (Math.floor(index / 10) + 1) : 0),
                type: rawContent.type || (hasNamedAnswer ? "visual-identification" : rawContent.options?.length > 0 ? "mcq" : "integer")
            };

            const query = `
                INSERT INTO public.questions 
                (id, content, marks, round, sub_round)
                VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (id) DO UPDATE 
                SET content = EXCLUDED.content, 
                    marks = EXCLUDED.marks, 
                    round = EXCLUDED.round, 
                    sub_round = EXCLUDED.sub_round
                RETURNING id;
            `;

            const values = [
                q.id,
                formattedContent,
                q.marks || MARKS_PER_QUESTION,
                ROUND,
                SUB_ROUND
            ];

            await pool.query(query, values);
            successCount++;
        }

        console.log(`\n✅ Successfully imported/updated ${successCount} questions into Round ${ROUND}, Sub-Round ${SUB_ROUND}.`);

    } catch (err) {
        console.error('❌ [Error] Failed to import Round 3 questions from JSON:', err);
    } finally {
        // Cleanly close the pool as per best practices in other scripts
        await pool.end();
        process.exit(0);
    }
};

importRound3QuestionsFromJSON();
