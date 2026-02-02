// Update teacher and student names
// Run with: npx tsx scripts/update-names.ts

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

const STUDENT_NAMES: Record<string, string> = {
  "Student 1": "Seungwon",
  "Student 2": "Khang",
  "Student 3": "Jacob",
  "Student 4": "Belle",
  "Student 5": "Matthew",
  "Student 6": "Xinlin",
};

const TEACHER_NAMES: Record<string, string> = {
  "Teacher 1": "Prof del Pino",
  "Teacher 2": "Dr. Jin",
  "Teacher 3": "Dr. Sukhina",
  "Teacher 4": "Dr. Cash",
};

async function main() {
  const data = await db.query({ students: {}, teachers: {} });
  const students = data.students || [];
  const teachers = data.teachers || [];

  const txs: ReturnType<typeof tx.students[string]["update"]>[] = [];

  for (const s of students) {
    const newName = STUDENT_NAMES[s.name];
    if (newName) {
      txs.push(tx.students[s.id].update({ ...s, name: newName }));
      console.log(`Student: ${s.name} -> ${newName}`);
    }
  }

  for (const t of teachers) {
    const newName = TEACHER_NAMES[t.name];
    if (newName) {
      txs.push(tx.teachers[t.id].update({ ...t, name: newName }));
      console.log(`Teacher: ${t.name} -> ${newName}`);
    }
  }

  if (txs.length === 0) {
    console.log("No matching Student 1-6 or Teacher 1-4 found to update.");
    return;
  }

  await db.transact(txs);
  console.log(`Updated ${txs.length} records.`);
}

main().catch((err) => {
  console.error("Update failed:", err);
  process.exit(1);
});
