import pkg from "pg";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config({ path: "../.env" });

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.SUPABASE_DB_URL
});

const BREVO_API_KEY = process.env.BREVO_API_KEY;

const leaders = JSON.parse(fs.readFileSync("./leaders.json", "utf-8"));
const leaderIds = leaders.map(l => l.id);

async function sendEmail(team) {

  const membersList = team.members
    .map(m => `<li>${m}</li>`)
    .join("");

  const htmlContent = `
  <p>Dear Participant,</p>

  <p>Greetings from <b>MathX Club, PCCOER Ravet</b>.</p>

  <p>
  This is to inform you that <b>your registration for the National Level Maths Quiz 2026 has been confirmed</b>.
  </p>

  <p><b>Team Name:</b> ${team.team_name}</p>

  <p><b>Team Members:</b></p>
  <ul>
  ${membersList}
  </ul>

  <p>The event will be held on <b>14th March 2026 at PCCOER, Ravet</b>.</p>

  <p><b>Reporting Time:</b> 8:30 AM</p>

  <p><b>Entry will not be allowed after 9:30 AM</b>, so participants are requested to arrive on time.</p>

  <p>
  We look forward to your participation and wish you the very best for the competition.
  </p>

  <p>
  Regards,<br>
  Team MathX<br>
  PCCOER, Ravet
  </p>
  `;

  const emailBody = {
    sender: {
      name: "MathX Team",
      email: "mathxpccoer@gmail.com"
    },
    to: [{ email: team.leader_email }],
    subject: `Registration Confirmed - ${team.team_name}`,
    htmlContent
  };

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "api-key": BREVO_API_KEY
    },
    body: JSON.stringify(emailBody)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err);
  }
}

async function main() {

  console.log("Fetching teams...");

  const result = await pool.query(
    `
   SELECT
    t.id,
    t.team_name,
    leader.email AS leader_email,
    m.full_name
FROM teams t
JOIN members m
    ON m.team_id = t.id
JOIN members leader
    ON leader.team_id = t.id
    AND leader.is_leader = true
WHERE leader.id = ANY($1)
ORDER BY t.team_name;
    `,
    [leaderIds]
  );

  const teamsMap = {};

  for (const row of result.rows) {

    if (!teamsMap[row.id]) {
      teamsMap[row.id] = {
        team_name: row.team_name,
        leader_email: row.leader_email,
        members: []
      };
    }

    teamsMap[row.id].members.push(row.full_name);
  }

  const teams = Object.values(teamsMap);

  console.log(`Total teams to email: ${teams.length}`);

  let success = 0;
  let failed = 0;

  for (const team of teams) {

    try {

      await sendEmail(team);

      success++;

      console.log(`✔ Sent → ${team.team_name}`);

      await new Promise(r => setTimeout(r, 250));

    } catch (err) {

      failed++;

      console.error(`✖ Failed → ${team.team_name}`, err.message);
    }
  }

  console.log("\nEmail Summary");
  console.log("--------------");
  console.log(`Success: ${success}`);
  console.log(`Failed: ${failed}`);

  process.exit();
}

main();