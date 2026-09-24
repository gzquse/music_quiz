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

const NAMESPACES = [
  "quizzes",
  "questions",
  "students",
  "teachers",
  "teacher_student_assignments",
  "responses",
  "answers",
  // Form Coach test data and sign-in accounts, if any exist on Instant.
  "coach_accounts",
  "coach_instructors",
  "coach_sessions",
  "$users",
];

async function backup() {
  console.log("Backing up cloud data (read-only)...");

  // One table per request, with retries: a single query for everything can time out.
  const data: Record<string, unknown[]> = {};
  for (const name of NAMESPACES) {
    for (let attempt = 1; ; attempt++) {
      try {
        const result = (await db.query({ [name]: {} })) as Record<string, unknown[]>;
        data[name] = result[name] ?? [];
        console.log(`  ${name}: ${data[name].length}`);
        break;
      } catch (err) {
        if (attempt >= 4) throw err;
        console.log(`  ${name}: attempt ${attempt} failed, retrying…`);
        await new Promise((r) => setTimeout(r, attempt * 3000));
      }
    }
  }

  const backupDir = join(process.cwd(), "backups");
  mkdirSync(backupDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `cloud-backup-${timestamp}.json`;
  const filepath = join(backupDir, filename);

  const backup = {
    exportedAt: new Date().toISOString(),
    appId: APP_ID,
    counts: Object.fromEntries(
      Object.entries(data).map(([name, rows]) => [name, Array.isArray(rows) ? rows.length : 0])
    ),
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
