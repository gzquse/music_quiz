// Apply the weekly movement questionnaire and current participant roster
// Run with: npx tsx scripts/apply-weekly-survey.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { init, tx, id } from "@instantdb/admin";
import {
  CURRENT_PARTICIPANT_NAMES,
  DEFAULT_SCALE_LABELS,
  SURVEY_DESCRIPTION,
  SURVEY_INSTRUCTIONS,
  SURVEY_TITLE,
  WEEKLY_QUESTIONS,
} from "../lib/survey";

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || process.env.INSTANTDB_APP_ID || "";
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!APP_ID || !ADMIN_TOKEN) {
  console.error("Please set NEXT_PUBLIC_INSTANTDB_APP_ID and INSTANTDB_ADMIN_TOKEN in .env.local");
  process.exit(1);
}

const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

async function main() {
  const data = await db.query({ quizzes: {}, questions: {}, students: {} });
  const quizzes = data.quizzes || [];
  const questions = data.questions || [];
  const students = data.students || [];
  const now = Date.now();

  const existingWeekly = quizzes.find((q: { title?: string }) => q.title === SURVEY_TITLE);
  const existingStudent =
    existingWeekly ||
    quizzes.find(
      (q: { variant?: string; title?: string }) =>
        q.variant === "student" || (q.title || "").toLowerCase().includes("student")
    );

  const quizId = existingWeekly?.id || existingStudent?.id || id();
  const txs = [];

  for (const quiz of quizzes) {
    if (quiz.id !== quizId && quiz.isActive) {
      txs.push(tx.quizzes[quiz.id].update({ ...quiz, isActive: false }));
    }
  }

  txs.push(
    tx.quizzes[quizId].update({
      ...(existingWeekly || existingStudent || {}),
      title: SURVEY_TITLE,
      description: SURVEY_DESCRIPTION,
      instructions: SURVEY_INSTRUCTIONS,
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: [...DEFAULT_SCALE_LABELS],
      isActive: true,
      createdAt: existingWeekly?.createdAt || existingStudent?.createdAt || now,
      variant: "student",
      studyStartDate: existingWeekly?.studyStartDate || existingStudent?.studyStartDate || now,
    })
  );

  const existingQuestions = questions.filter((q: { quizId: string }) => q.quizId === quizId);
  for (const question of existingQuestions) {
    txs.push(tx.questions[question.id].delete());
  }
  for (const [index, question] of WEEKLY_QUESTIONS.entries()) {
    txs.push(
      tx.questions[id()].update({
        quizId,
        title: question.title,
        text: question.text,
        type: question.type,
        options: null,
        order: index,
        required: question.required,
      })
    );
  }

  const existingByName = new Map(
    students.map((s: { id: string; name: string }) => [s.name.toLowerCase(), s])
  );

  for (const name of CURRENT_PARTICIPANT_NAMES) {
    const match = existingByName.get(name.toLowerCase()) as
      | { id: string; name: string; createdAt?: number }
      | undefined;
    if (match) {
      txs.push(
        tx.students[match.id].update({
          ...match,
          name: match.name,
          isActive: true,
        })
      );
    } else {
      txs.push(
        tx.students[id()].update({
          name,
          createdAt: now,
          isActive: true,
        })
      );
    }
  }

  for (const student of students) {
    const keep = CURRENT_PARTICIPANT_NAMES.some(
      (name) => name.toLowerCase() === student.name.toLowerCase()
    );
    if (!keep) {
      txs.push(tx.students[student.id].update({ ...student, isActive: false }));
    }
  }

  await db.transact(txs);
  console.log("Weekly questionnaire applied.");
  console.log("Quiz ID:", quizId);
  console.log("Participants:", CURRENT_PARTICIPANT_NAMES.join(", "));
}

main().catch((error) => {
  console.error("Apply failed:", error);
  process.exit(1);
});
