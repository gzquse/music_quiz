// Seed only students, teachers, and their assignments (no quizzes or responses)
// Run with: npx tsx scripts/seed-participants.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { init, tx, id } from "@instantdb/admin";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

const STUDENT_NAMES = ["Seungwon", "Khang", "Jacob", "Belle", "Matthew", "Xinlin"];
const TEACHER_NAMES = ["Prof del Pino", "Dr. Jin", "Dr. Sukhina", "Dr. Cash"];

async function main() {
  console.log("Creating students...");
  const studentIds = STUDENT_NAMES.map(() => id());
  await db.transact(
    studentIds.map((sid, i) =>
      tx.students[sid].update({ name: STUDENT_NAMES[i], createdAt: Date.now() })
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
  const assignments = [
    { teacherId: teacherIds[0], studentId: studentIds[0] },
    { teacherId: teacherIds[0], studentId: studentIds[1] },
    { teacherId: teacherIds[1], studentId: studentIds[2] },
    { teacherId: teacherIds[1], studentId: studentIds[3] },
    { teacherId: teacherIds[2], studentId: studentIds[4] },
    { teacherId: teacherIds[3], studentId: studentIds[5] },
  ];
  await db.transact(
    assignments.map((a) =>
      tx.teacher_student_assignments[id()].update({
        teacherId: a.teacherId,
        studentId: a.studentId,
      })
    )
  );

  console.log("Participants seeded:");
  console.log("  Prof del Pino -> Seungwon, Khang");
  console.log("  Dr. Jin -> Jacob, Belle");
  console.log("  Dr. Sukhina -> Matthew");
  console.log("  Dr. Cash -> Xinlin");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
