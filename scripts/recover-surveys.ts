// Update existing quizzes and questions to match the docx (Student Ver & Teacher Ver)
// Run with: npx tsx scripts/recover-surveys.ts

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

const STUDENT_QUIZ = {
  title: "Post-Session Playing Experience Survey (Student Ver)",
  description:
    "Please respond to the questions below based on your own playing experience and physical state at today's lesson. Please respond within 24 hours of receipt of the survey.",
  instructions:
    "Please respond to the questions below based on your own playing experience and physical state at today's lesson. Please respond within 24 hours of receipt of the survey.\n\nScale:\n1 = Not at all\n2 = Slightly\n3 = Moderately\n4 = Very\n5 = Extremely",
};

const TEACHER_QUIZ = {
  title: "Post-Session Playing Experience Survey (Teacher Ver)",
  description:
    "Please respond to the questions below based on your observations of your student's physical state and performance at today's lesson. Please respond within 24 hours of receipt of the survey.",
  instructions:
    "Please respond to the questions below based on your observations of your student's physical state and performance at today's lesson. Please respond within 24 hours of receipt of the survey.\n\nScale:\n1 = Not at all\n2 = Slightly\n3 = Moderately\n4 = Very\n5 = Extremely",
};

const STUDENT_QUESTION_TEXTS = [
  "I was aware of my body and movement during my lesson today.",
  "My body was physically free and relaxed while playing during today's lesson.",
  "My body was flexible, responsive, and physically ready for piano playing during the lesson today.",
  "Physical movements or bodily sensations felt integrated in my piano technique at the lesson today.",
  "My piano technique allowed me to play comfortably and clearly.",
  "My physical state supported my musical expressions at the piano today.",
  "If anything stood out in today's playing experience, please describe it briefly:",
  "Your name:",
  "Today's session included a guided warm-up",
];

const TEACHER_QUESTION_TEXTS = [
  "My student was aware of his/her body and movement during the lesson today.",
  "My student's body was physically free and relaxed while playing during today's lesson.",
  "My student's body was flexible, responsive, and physically ready for piano playing during the lesson today.",
  "Physical movements or bodily sensations felt integrated in my student's piano technique at the lesson today.",
  "My student's piano technique allowed him/her to play comfortably and clearly.",
  "My student's physical state supported his/her musical expressions at the piano today.",
  "If anything stood out in today's playing experience, please describe it briefly:",
];

async function main() {
  const data = await db.query({ quizzes: {}, questions: {} });
  const quizzes = data.quizzes || [];
  const questions = data.questions || [];

  const studentQuiz = quizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "student" || (q.title || "").toLowerCase().includes("student")
  );
  const teacherQuiz = quizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "teacher" || (q.title || "").toLowerCase().includes("teacher")
  );

  const txs: ReturnType<typeof tx.quizzes[string]["update"]>[] = [];

  if (studentQuiz) {
    txs.push(
      tx.quizzes[studentQuiz.id].update({
        ...studentQuiz,
        ...STUDENT_QUIZ,
      })
    );
    console.log("Updating student quiz:", studentQuiz.title, "->", STUDENT_QUIZ.title);
    const sq = questions
      .filter((q: { quizId: string }) => q.quizId === studentQuiz.id)
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    for (let i = 0; i < sq.length && i < STUDENT_QUESTION_TEXTS.length; i++) {
      txs.push(tx.questions[sq[i].id].update({ ...sq[i], text: STUDENT_QUESTION_TEXTS[i] }));
    }
  } else {
    console.log("No student quiz found.");
  }

  if (teacherQuiz) {
    txs.push(
      tx.quizzes[teacherQuiz.id].update({
        ...teacherQuiz,
        ...TEACHER_QUIZ,
      })
    );
    console.log("Updating teacher quiz:", teacherQuiz.title, "->", TEACHER_QUIZ.title);
    const tq = questions
      .filter((q: { quizId: string }) => q.quizId === teacherQuiz.id)
      .sort((a: { order: number }, b: { order: number }) => a.order - b.order);
    for (let i = 0; i < tq.length && i < TEACHER_QUESTION_TEXTS.length; i++) {
      txs.push(tx.questions[tq[i].id].update({ ...tq[i], text: TEACHER_QUESTION_TEXTS[i] }));
    }
  } else {
    console.log("No teacher quiz found.");
  }

  if (txs.length === 0) {
    console.log("Nothing to update.");
    return;
  }

  await db.transact(txs);
  console.log("Surveys recovered from docx.");
}

main().catch((err) => {
  console.error("Recover failed:", err);
  process.exit(1);
});
