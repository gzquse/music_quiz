import { db, tx, id as genId, type Question, type Quiz, type Student } from "@/lib/instant";
import {
  CURRENT_PARTICIPANT_NAMES,
  DEFAULT_SCALE_LABELS,
  SURVEY_DESCRIPTION,
  SURVEY_INSTRUCTIONS,
  SURVEY_TITLE,
  WEEKLY_QUESTIONS,
} from "@/lib/survey";

export async function syncWeeklySurvey({
  quizzes,
  questions,
  students,
}: {
  quizzes: Quiz[];
  questions: Question[];
  students: Student[];
}) {
  const now = Date.now();
  const existingWeekly = quizzes.find((q) => q.title === SURVEY_TITLE);
  const existingStudent =
    existingWeekly ||
    quizzes.find((q) => q.variant === "student") ||
    quizzes.find((q) => (q.title || "").toLowerCase().includes("student"));

  const quizId = existingWeekly?.id || existingStudent?.id || genId();
  const deactivateOthers = quizzes
    .filter((q) => q.id !== quizId && q.isActive)
    .map((q) => tx.quizzes[q.id].update({ isActive: false }));

  const quizTx = tx.quizzes[quizId].update({
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
  });

  const existingQuestions = questions.filter((q) => q.quizId === quizId);
  const deleteQuestionTxs = existingQuestions.map((q) => tx.questions[q.id].delete());
  const createQuestionTxs = WEEKLY_QUESTIONS.map((q, index) =>
    tx.questions[genId()].update({
      quizId,
      title: q.title,
      text: q.text,
      type: q.type,
      options: null,
      order: index,
      required: q.required,
    })
  );

  const studentTxs = [];
  const existingByName = new Map(students.map((s) => [s.name.toLowerCase(), s]));

  for (const name of CURRENT_PARTICIPANT_NAMES) {
    const match = existingByName.get(name.toLowerCase());
    if (match) {
      studentTxs.push(
        tx.students[match.id].update({
          name: match.name,
          createdAt: match.createdAt,
          isActive: true,
        })
      );
    } else {
      studentTxs.push(
        tx.students[genId()].update({
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
      studentTxs.push(
        tx.students[student.id].update({
          name: student.name,
          createdAt: student.createdAt,
          isActive: false,
        })
      );
    }
  }

  await db.transact([
    quizTx,
    ...deactivateOthers,
    ...deleteQuestionTxs,
    ...createQuestionTxs,
    ...studentTxs,
  ]);

  return { quizId };
}

export function missingCurrentParticipants(students: Student[]) {
  const existing = new Set(students.map((s) => s.name.toLowerCase()));
  return CURRENT_PARTICIPANT_NAMES.filter((name) => !existing.has(name.toLowerCase()));
}

export async function ensureCurrentParticipants(students: Student[]) {
  const now = Date.now();
  const existingByName = new Map(students.map((s) => [s.name.toLowerCase(), s]));
  const txs = [];

  for (const name of CURRENT_PARTICIPANT_NAMES) {
    const match = existingByName.get(name.toLowerCase());
    if (match) {
      if (match.isActive === false) {
        txs.push(
          tx.students[match.id].update({
            name: match.name,
            createdAt: match.createdAt,
            isActive: true,
          })
        );
      }
    } else {
      txs.push(
        tx.students[genId()].update({
          name,
          createdAt: now,
          isActive: true,
        })
      );
    }
  }

  if (txs.length === 0) return;
  await db.transact(txs);
}
