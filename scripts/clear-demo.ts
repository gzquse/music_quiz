// Clear demo (8-week seeded) responses and their answers
// Run with: npx tsx scripts/clear-demo.ts

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

async function main() {
  const data = await db.query({ responses: {}, answers: {} });
  const responses = data.responses || [];
  const answers = data.answers || [];

  const demoResponseIds = responses
    .filter((r: { metadata?: { demo?: boolean } }) => r.metadata?.demo === true)
    .map((r: { id: string }) => r.id);

  const demoAnswerIds = answers
    .filter((a: { responseId: string }) => demoResponseIds.includes(a.responseId))
    .map((a: { id: string }) => a.id);

  if (demoResponseIds.length === 0) {
    console.log("No demo responses found.");
    return;
  }

  console.log(`Deleting ${demoAnswerIds.length} answers and ${demoResponseIds.length} responses...`);

  const txs = [
    ...demoAnswerIds.map((id: string) => tx.answers[id].delete()),
    ...demoResponseIds.map((id: string) => tx.responses[id].delete()),
  ];

  await db.transact(txs);
  console.log("Demo data cleared.");
}

main().catch((err) => {
  console.error("Clear failed:", err);
  process.exit(1);
});
