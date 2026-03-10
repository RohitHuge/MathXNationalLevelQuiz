import fs from "fs";

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

let sql = `INSERT INTO questions (id, content, marks, created_at, round, sub_round)\nVALUES\n`;

questions.forEach((q, i) => {
  const content = JSON.parse(q.content);

  const text = content.body?.latex || "";
  const imageUrl = content.body?.image || null;

  const options = content.options.map(o => o.latex || "");

  const correctIndex = LETTER_TO_INDEX[content.answer?.value];

  const set = (i % 6) + 1;

  const formattedContent = {
    text,
    type: "mcq",
    options,
    imageUrl,
    correctIndex,
    set
  };

  const row = `(
'${q.id}',
'${JSON.stringify(formattedContent).replace(/'/g, "''")}',
10,
NOW(),
3,
${set}
)`;

  sql += row;

  if (i !== questions.length - 1) sql += ",\n";
});

sql += ";";

fs.writeFileSync("insert_questions.sql", sql);

console.log("✅ SQL file generated: insert_questions.sql");