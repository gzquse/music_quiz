// Update existing quizzes and questions to the weekly movement questionnaire
// Run with: npx tsx scripts/recover-surveys.ts

import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { init, tx } from "@instantdb/admin";
import {
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
  const data = await db.query({ quizzes: {}, questions: {} });
  const quizzes = data.quizzes || [];
  const questions = data.questions || [];

  const studentQuiz = quizzes.find(
    (q: { variant?: string; title?: string }) =>
      q.variant === "student" ||
      (q.title || "").toLowerCase().includes("weekly") ||
      (q.title || "").toLowerCase().includes("student")
  );

  if (!studentQuiz) {
    console.log("No student quiz found.");
    return;
  }

  const txs = [
    tx.quizzes[studentQuiz.id].update({
      ...studentQuiz,
      title: SURVEY_TITLE,
      description: SURVEY_DESCRIPTION,
      instructions: SURVEY_INSTRUCTIONS,
      scaleMin: 1,
      scaleMax: 5,
      scaleLabels: [...DEFAULT_SCALE_LABELS],
      isActive: true,
      variant: "student",
    }),
  ];

  const existing = questions
    .filter((q: { quizId: string }) => q.quizId === studentQuiz.id)
    .sort((a: { order: number }, b: { order: number }) => a.order - b.order);

  for (let i = 0; i < existing.length; i++) {
    const next = WEEKLY_QUESTIONS[i];
    if (!next) {
      txs.push(tx.questions[existing[i].id].delete());
      continue;
    }
    txs.push(
      tx.questions[existing[i].id].update({
        ...existing[i],
        title: next.title,
        text: next.text,
        type: next.type,
        required: next.required,
        order: i,
        options: null,
      })
    );
  }

  await db.transact(txs);
  console.log("Student survey updated to the weekly movement questionnaire.");
}

main().catch((error) => {
  console.error("Recover failed:", error);
  process.exit(1);
});
