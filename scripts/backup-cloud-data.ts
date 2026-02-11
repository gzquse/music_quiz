// Backup cloud data from InstantDB (read-only, no modifications)
// Run with: npx tsx scripts/backup-cloud-data.ts

import { config } from "dotenv";
import { writeFileSync, mkdirSync } from "fs";
import { join } from "path";

config({ path: ".env.local" });
config();

import { init } from "@instantdb/admin";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function backup() {
  console.log("Backing up cloud data (read-only)...");

  const data = await db.query({
    quizzes: {},
    questions: {},
    students: {},
    teachers: {},
    teacher_student_assignments: {},
    responses: {},
    answers: {},
  });

  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `cloud-backup-${timestamp}.json`;
  const filepath = join(backupDir, filename);

  const backup = {
    exportedAt: new Date().toISOString(),
    counts: {
      quizzes: data.quizzes?.length ?? 0,
      questions: data.questions?.length ?? 0,
      students: data.students?.length ?? 0,
      teachers: data.teachers?.length ?? 0,
      teacher_student_assignments: data.teacher_student_assignments?.length ?? 0,
      responses: data.responses?.length ?? 0,
      answers: data.answers?.length ?? 0,
    },
    data,
  };

  writeFileSync(filepath, JSON.stringify(backup, null, 2), "utf-8");
  console.log(`Backup saved to ${filepath}`);
  console.log("Counts:", backup.counts);
}

backup().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
