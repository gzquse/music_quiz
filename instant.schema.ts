import { i } from "@instantdb/react";

const schema = i.schema({
  entities: {
    quizzes: i.entity({
      title: i.string(),
      description: i.string(),
      instructions: i.string(),
      scaleMin: i.number(),
      scaleMax: i.number(),
      scaleLabels: i.json<string[]>(),
      isActive: i.boolean(),
      createdAt: i.number(),
      variant: i.string().optional(), // "student" | "teacher"
      studyStartDate: i.number().optional(), // timestamp when Week 1 began (used to calculate week from submission date)
    }),
    questions: i.entity({
      quizId: i.string(),
      text: i.string(),
      type: i.string(), // "scale" | "text" | "choice"
      options: i.json<string[] | null>(),
      order: i.number(),
      required: i.boolean(),
      title: i.string().optional(),
    }),
    students: i.entity({
      name: i.string(),
      createdAt: i.number(),
      group: i.string().optional(), // "A" | "B"
      isActive: i.boolean().optional(),
    }),
    teachers: i.entity({
      name: i.string(),
      createdAt: i.number(),
    }),
    teacher_student_assignments: i.entity({
      teacherId: i.string(),
      studentId: i.string(),
    }),
    responses: i.entity({
      quizId: i.string(),
      submittedAt: i.number(),
      metadata: i.json<Record<string, unknown>>(),
      respondentType: i.string().optional(), // "student" | "teacher"
      studentId: i.string().optional(), // who the response is about (self for student, target for teacher)
      teacherId: i.string().optional(), // empty string when respondentType is "student"
    }),
    answers: i.entity({
      responseId: i.string(),
      questionId: i.string(),
      value: i.json<string | number>(),
    }),

    // --- Form Coach (signed-in students; see lib/coach and instant.perms.ts) ---
    // Written only by the server (billing + usage), readable by its owner.
    coach_accounts: i.entity({
      userId: i.string().unique().indexed(),
      email: i.string().optional(),
      createdAt: i.number(),
      trialUsed: i.number(),
      stripeCustomerId: i.string().optional().indexed(),
      subscriptionId: i.string().optional(),
      subscriptionStatus: i.string().optional(), // Stripe status: trialing | active | past_due | canceled | ...
      periodStart: i.number().optional(),
      periodEnd: i.number().optional(),
      periodUsed: i.number().optional(),
    }),
    // The student's personal AI instructor, edited by its owner.
    coach_instructors: i.entity({
      userId: i.string().unique().indexed(),
      name: i.string(),
      color: i.number(),
      tone: i.string(), // "warm" | "balanced" | "direct"
      level: i.string(), // "beginner" | "intermediate" | "advanced" | "preprofessional"
      focus: i.json<string[]>(),
      notes: i.string(),
      learnFromProfessor: i.boolean(),
      updatedAt: i.number(),
    }),
    // One analyzed take. Created by the server; the owner adds professor feedback.
    coach_sessions: i.entity({
      userId: i.string().indexed(),
      createdAt: i.number().indexed(),
      piece: i.string().optional(),
      goal: i.string().optional(),
      durationSec: i.number(),
      frameTimes: i.json<number[]>(),
      thumbs: i.json<Record<string, string>>(),
      loudness: i.json<number[]>(),
      audio: i.json<Record<string, unknown> | null>(),
      ai: i.json<Record<string, unknown>>(),
      overall: i.number().optional(),
      instructorName: i.string(),
      model: i.string(),
      professorName: i.string().optional(),
      professorNotes: i.string().optional(),
      professorScores: i.json<Record<string, number>>().optional(),
      professorAt: i.number().optional(),
    }),
  },
});

export default schema;
export type Schema = typeof schema;

