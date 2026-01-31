// Seed script to populate the database with participants and dual questionnaire
// Run with: npx tsx scripts/seed.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config(); // fallback to .env

import { init, tx, id } from "@instantdb/admin";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";

// You need to create an admin token in your InstantDB dashboard
// Go to https://instantdb.com/dash > Your App > Admin Tokens > Create Token
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  console.log("Get these from: https://instantdb.com/dash > Your App > Settings & Admin Tokens");
  process.exit(1);
}

// Initialize InstantDB Admin
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// Student version questions (from Survey questions Student ver)
const studentQuestions = [
  { text: "I was aware of my body and movement during my lesson today.", type: "scale" as const, order: 0, required: true },
  { text: "My body was physically free and relaxed while playing during today's lesson.", type: "scale" as const, order: 1, required: true },
  { text: "My body was flexible, responsive, and physically ready for piano playing during the lesson today.", type: "scale" as const, order: 2, required: true },
  { text: "Physical movements or bodily sensations felt integrated in my piano technique at the lesson today.", type: "scale" as const, order: 3, required: true },
  { text: "My piano technique allowed me to play comfortably and clearly.", type: "scale" as const, order: 4, required: true },
  { text: "My physical state supported my musical expressions at the piano today.", type: "scale" as const, order: 5, required: true },
  { text: "If anything stood out in today's playing experience, please describe it briefly:", type: "text" as const, order: 6, required: false },
  { text: "Your name:", type: "text" as const, order: 7, required: false },
  { text: "Today's session included a guided warm-up", type: "choice" as const, options: ["Yes", "No"], order: 8, required: true },
];

// Teacher version questions (from Survey questions Teacher Ver)
const teacherQuestions = [
  { text: "My student was aware of his/her body and movement during the lesson today.", type: "scale" as const, order: 0, required: true },
  { text: "My student's body was physically free and relaxed while playing during today's lesson.", type: "scale" as const, order: 1, required: true },
  { text: "My student's body was flexible, responsive, and physically ready for piano playing during the lesson today.", type: "scale" as const, order: 2, required: true },
  { text: "Physical movements or bodily sensations felt integrated in my student's piano technique at the lesson today.", type: "scale" as const, order: 3, required: true },
  { text: "My student's piano technique allowed him/her to play comfortably and clearly.", type: "scale" as const, order: 4, required: true },
  { text: "My student's physical state supported his/her musical expressions at the piano today.", type: "scale" as const, order: 5, required: true },
  { text: "If anything stood out in today's playing experience, please describe it briefly:", type: "text" as const, order: 6, required: false },
];

function generateWeightedScore(): number {
  const weights = [0.1, 0.2, 0.35, 0.25, 0.1];
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) return i + 1;
  }
  return 3;
}

async function seed() {
  console.log("Starting database seed...");

  try {
    // 1. Create 6 students
    console.log("Creating students...");
    const studentIds = [id(), id(), id(), id(), id(), id()];
    const students = studentIds.map((sid, i) => ({
      id: sid,
      name: `Student ${i + 1}`,
      createdAt: Date.now(),
    }));
    await db.transact(students.map((s) => tx.students[s.id].update({ name: s.name, createdAt: s.createdAt })));

    // 2. Create 4 teachers
    console.log("Creating teachers...");
    const teacherIds = [id(), id(), id(), id()];
    const teachers = teacherIds.map((tid, i) => ({
      id: tid,
      name: `Teacher ${i + 1}`,
      createdAt: Date.now(),
    }));
    await db.transact(teachers.map((t) => tx.teachers[t.id].update({ name: t.name, createdAt: t.createdAt })));

    // 3. Create teacher-student assignments: T1:S1,S2; T2:S3,S4; T3:S5; T4:S6
    console.log("Creating teacher-student assignments...");
    const assignments = [
      { teacherId: teacherIds[0], studentId: studentIds[0] },
      { teacherId: teacherIds[0], studentId: studentIds[1] },
      { teacherId: teacherIds[1], studentId: studentIds[2] },
      { teacherId: teacherIds[1], studentId: studentIds[3] },
      { teacherId: teacherIds[2], studentId: studentIds[4] },
      { teacherId: teacherIds[3], studentId: studentIds[5] },
    ];
    const assignmentIds = assignments.map(() => id());
    await db.transact(
      assignmentIds.map((aid, i) =>
        tx.teacher_student_assignments[aid].update({
          teacherId: assignments[i].teacherId,
          studentId: assignments[i].studentId,
        })
      )
    );

    // 4. Create student quiz
    console.log("Creating student quiz...");
    const studentQuizId = id();
    await db.transact([
      tx.quizzes[studentQuizId].update({
        title: "Post-Session Playing Experience Survey (Student)",
        description:
          "Please respond to the questions below based on your own playing experience and physical state at today's lesson.",
        instructions:
          "Please respond based on your own playing experience and physical state at today's lesson.\n\nScale:\n1 = Not at all\n2 = Slightly\n3 = Moderately\n4 = Very\n5 = Extremely",
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
        isActive: true,
        createdAt: Date.now(),
        variant: "student",
      }),
    ]);

    const studentQuestionIds = studentQuestions.map(() => id());
    await db.transact(
      studentQuestions.map((q, i) =>
        tx.questions[studentQuestionIds[i]].update({
          quizId: studentQuizId,
          text: q.text,
          type: q.type,
          options: "options" in q && q.options ? q.options : null,
          order: q.order,
          required: q.required,
        })
      )
    );

    // 5. Create teacher quiz
    console.log("Creating teacher quiz...");
    const teacherQuizId = id();
    await db.transact([
      tx.quizzes[teacherQuizId].update({
        title: "Post-Session Playing Experience Survey (Teacher)",
        description:
          "Please respond to the questions below based on your observations of your student's physical state and performance at today's lesson.",
        instructions:
          "Please respond based on your observations of your student's physical state at today's lesson.\n\nScale:\n1 = Not at all\n2 = Slightly\n3 = Moderately\n4 = Very\n5 = Extremely",
        scaleMin: 1,
        scaleMax: 5,
        scaleLabels: ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
        isActive: true,
        createdAt: Date.now(),
        variant: "teacher",
      }),
    ]);

    const teacherQuestionIds = teacherQuestions.map(() => id());
    await db.transact(
      teacherQuestions.map((q, i) =>
        tx.questions[teacherQuestionIds[i]].update({
          quizId: teacherQuizId,
          text: q.text,
          type: q.type,
          options: "options" in q && q.options ? q.options : null,
          order: q.order,
          required: q.required,
        })
      )
    );

    // 6. Create 8 weeks of student self-assessments (6 students x 8 weeks = 48 responses)
    const WEEKS = 8;
    const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

    console.log(`Creating ${WEEKS} weeks of student responses...`);
    for (let week = 1; week <= WEEKS; week++) {
      const weekStart = Date.now() - (WEEKS - week) * MS_PER_WEEK;
      for (let i = 0; i < 6; i++) {
        const responseId = id();
        const submittedAt = weekStart + i * 60 * 60 * 1000; // spread within week
        await db.transact([
          tx.responses[responseId].update({
            quizId: studentQuizId,
            submittedAt,
            metadata: { demo: true, week },
            respondentType: "student",
            studentId: studentIds[i],
            teacherId: "",
          }),
        ]);
        const answerTxs: ReturnType<typeof tx.answers[string]["update"]>[] = [];
        for (let q = 0; q < studentQuestions.length; q++) {
          const qu = studentQuestions[q];
          let value: string | number;
          if (qu.type === "scale") value = generateWeightedScore();
          else if (qu.type === "choice" && qu.options) value = qu.options[Math.floor(Math.random() * qu.options.length)];
          else if (qu.type === "text" && qu.order === 7) value = students[i].name;
          else value = "";
          answerTxs.push(
            tx.answers[id()].update({
              responseId,
              questionId: studentQuestionIds[q],
              value,
            })
          );
        }
        await db.transact(answerTxs);
      }
    }

    // 7. Create 8 weeks of teacher assessments (6 assignments x 8 weeks = 48 responses)
    console.log(`Creating ${WEEKS} weeks of teacher responses...`);
    for (let week = 1; week <= WEEKS; week++) {
      const weekStart = Date.now() - (WEEKS - week) * MS_PER_WEEK;
      for (const a of assignments) {
        const responseId = id();
        const submittedAt = weekStart + Math.floor(Math.random() * 5) * 60 * 60 * 1000;
        await db.transact([
          tx.responses[responseId].update({
            quizId: teacherQuizId,
            submittedAt,
            metadata: { demo: true, week },
            respondentType: "teacher",
            studentId: a.studentId,
            teacherId: a.teacherId,
          }),
        ]);
        const answerTxs: ReturnType<typeof tx.answers[string]["update"]>[] = [];
        for (let q = 0; q < teacherQuestions.length; q++) {
          const qu = teacherQuestions[q];
          const value = qu.type === "scale" ? generateWeightedScore() : "";
          answerTxs.push(
            tx.answers[id()].update({
              responseId,
              questionId: teacherQuestionIds[q],
              value,
            })
          );
        }
        await db.transact(answerTxs);
      }
    }

    console.log("Seed completed successfully!");
    console.log("Students:", studentIds.length, "| Teachers:", teacherIds.length);
    console.log("Responses: 48 student + 48 teacher = 96 total (8 weeks)");
    console.log("Student quiz ID:", studentQuizId);
    console.log("Teacher quiz ID:", teacherQuizId);
    console.log("Add these to .env.local or use in URLs:");
    console.log("NEXT_PUBLIC_STUDENT_QUIZ_ID=" + studentQuizId);
    console.log("NEXT_PUBLIC_TEACHER_QUIZ_ID=" + teacherQuizId);
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  }
}

seed()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
