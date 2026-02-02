// Clear all students, teachers, assignments, responses, and answers
// Run with: npx tsx scripts/clear-participants.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { init, tx } from "@instantdb/admin";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function main() {
  const data = await db.query({
    students: {},
    teachers: {},
    teacher_student_assignments: {},
    responses: {},
    answers: {},
  });

  const answers = data.answers || [];
  const responses = data.responses || [];
  const assignments = data.teacher_student_assignments || [];
  const students = data.students || [];
  const teachers = data.teachers || [];

  const txs = [
    ...answers.map((a: { id: string }) => tx.answers[a.id].delete()),
    ...responses.map((r: { id: string }) => tx.responses[r.id].delete()),
    ...assignments.map((a: { id: string }) => tx.teacher_student_assignments[a.id].delete()),
    ...students.map((s: { id: string }) => tx.students[s.id].delete()),
    ...teachers.map((t: { id: string }) => tx.teachers[t.id].delete()),
  ];

  if (txs.length === 0) {
    console.log("No participant data found.");
    return;
  }

  console.log(
    `Deleting: ${answers.length} answers, ${responses.length} responses, ` +
      `${assignments.length} assignments, ${students.length} students, ${teachers.length} teachers`
  );

  await db.transact(txs);
  console.log("All student and teacher data cleared.");
}

main().catch((err) => {
  console.error("Clear failed:", err);
  process.exit(1);
});
