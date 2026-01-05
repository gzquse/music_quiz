import { init, tx, id } from "@instantdb/react";
import schema from "../instant.schema";

// Type aliases for convenience
export type Quiz = {
  id: string;
  title: string;
  description: string;
  instructions: string;
  scaleMin: number;
  scaleMax: number;
  scaleLabels: string[];
  isActive: boolean;
  createdAt: number;
};

export type Question = {
  id: string;
  quizId: string;
  text: string;
  type: "scale" | "text" | "choice";
  options: string[] | null;
  order: number;
  required: boolean;
};

export type Response = {
  id: string;
  quizId: string;
  submittedAt: number;
  metadata: Record<string, unknown>;
};

export type Answer = {
  id: string;
  responseId: string;
  questionId: string;
  value: string | number;
};

// Initialize InstantDB with schema
const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID || "";

const db = init({ appId: APP_ID, schema });

// Export typed db and transaction helpers
export { db, tx, id };
