// Seed only students, teachers, and their assignments (no quizzes or responses)
// Run with: npx tsx scripts/seed-participants.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { init, tx, id } from "@instantdb/admin";
import { CURRENT_PARTICIPANT_NAMES } from "../lib/survey";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const TEACHER_NAMES = ["Lingxi Xu", "Dr. Carla Cash"];

async function main() {
  console.log("Creating students...");
  const studentIds = CURRENT_PARTICIPANT_NAMES.map(() => id());
  await db.transact(
    studentIds.map((sid, i) =>
      tx.students[sid].update({
        name: CURRENT_PARTICIPANT_NAMES[i],
        createdAt: Date.now(),
        isActive: true,
      })
    )
  );

  console.log("Creating teachers...");
  const teacherIds = TEACHER_NAMES.map(() => id());
  await db.transact(
    teacherIds.map((tid, i) =>
      tx.teachers[tid].update({ name: TEACHER_NAMES[i], createdAt: Date.now() })
    )
  );

  console.log("Creating teacher-student assignments...");
  await db.transact(
    studentIds.map((studentId) =>
      tx.teacher_student_assignments[id()].update({
        teacherId: teacherIds[0],
        studentId,
      })
    )
  );

  console.log("Participants seeded:");
  console.log("  Students:", CURRENT_PARTICIPANT_NAMES.join(", "));
  console.log("  Instructor: Lingxi Xu");
  console.log("  Research supervisor: Dr. Carla Cash");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
