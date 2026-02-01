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
    }),
    students: i.entity({
      name: i.string(),
      createdAt: i.number(),
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
  },
});

export default schema;
export type Schema = typeof schema;

