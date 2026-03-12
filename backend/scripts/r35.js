import fs from "fs";
import pool from "../config/db.js";

// load questions JSON
const questions = JSON.parse(fs.readFileSync("questions.json", "utf8"));

const LETTER_TO_INDEX = {
  A: 0,
  B: 1,
  C: 2,
  D: 3,
  a: 0,
  b: 1,
  c: 2,
  d: 3
};

function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

const importQuestions = async () => {
  try {

    console.log(`[Import] Loaded ${questions.length} questions`);

    // randomize question order first
    shuffle(questions);

    let success = 0;

    for (let i = 0; i < questions.length; i++) {

      const q = questions[i];
      const content = JSON.parse(q.content);

      const text = content.body?.latex || "";
      const imageUrl = content.body?.image || null;
      const options = content.options.map(o => o.latex || "");

      const correctIndex = LETTER_TO_INDEX[content.answer?.value];

      // balanced set distribution
      const set = (i % 6) + 1;

      const formattedContent = {
        set,
        text,
        type: "mcq",
        options,
        imageUrl,
        correctIndex
      };

      const query = `
        INSERT INTO questions
        (id, content, marks, created_at, round, sub_round)
        VALUES ($1,$2,$3,NOW(),$4,$5)
        ON CONFLICT (id) DO UPDATE
        SET content = EXCLUDED.content,
            marks = EXCLUDED.marks,
            round = EXCLUDED.round,
            sub_round = EXCLUDED.sub_round
      `;

      const values = [
        q.id,
        formattedContent,
        10,
        3, // round
        5  // sub_round FIXED
      ];

      await pool.query(query, values);

      success++;
    }

    console.log(`✅ Successfully inserted ${success} Round 3 SubRound 5 questions`);

    process.exit(0);

  } catch (err) {
    console.error("❌ Import failed:", err);
    process.exit(1);
  }
};

importQuestions();