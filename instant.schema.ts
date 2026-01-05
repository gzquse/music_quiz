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
    }),
    questions: i.entity({
      quizId: i.string(),
      text: i.string(),
      type: i.string(), // "scale" | "text" | "choice"
      options: i.json<string[] | null>(),
      order: i.number(),
      required: i.boolean(),
    }),
    responses: i.entity({
      quizId: i.string(),
      submittedAt: i.number(),
      metadata: i.json<Record<string, unknown>>(),
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

