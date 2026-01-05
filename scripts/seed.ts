// Seed script to populate the database with demo quiz and 1000 random responses
// Run with: npx tsx scripts/seed.ts

import { init, tx, id } from "@instantdb/admin";

const APP_ID = "919ede8c-9639-45ee-ba92-b3c65c936e37";

// You need to create an admin token in your InstantDB dashboard
// Go to https://instantdb.com/dash > Your App > Admin Tokens > Create Token
const ADMIN_TOKEN = process.env.INSTANTDB_ADMIN_TOKEN || "";

if (!ADMIN_TOKEN) {
  console.error("Please set INSTANTDB_ADMIN_TOKEN environment variable");
  console.log("Get your admin token from: https://instantdb.com/dash");
  process.exit(1);
}

// Initialize InstantDB Admin
const db = init({ appId: APP_ID, adminToken: ADMIN_TOKEN });

// Demo Quiz Data based on the Post-Session Playing Experience Survey
const quizId = id();

const demoQuiz = {
  id: quizId,
  title: "Post-Session Playing Experience Survey",
  description:
    "Please respond based on your own playing experience and physical state immediately after today's session. There are no right or wrong answers.",
  instructions:
    "Please respond based on your own playing experience and physical state immediately after today's session.\nThere are no right or wrong answers.\n\nScale:\n1 = Not at all\n2 = Slightly\n3 = Moderately\n4 = Very\n5 = Extremely",
  scaleMin: 1,
  scaleMax: 5,
  scaleLabels: ["Not at all", "Slightly", "Moderately", "Very", "Extremely"],
  isActive: true,
  createdAt: Date.now(),
};

const questionIds = [id(), id(), id(), id(), id(), id(), id(), id(), id()];

const demoQuestions = [
  {
    id: questionIds[0],
    quizId: quizId,
    text: "I am aware of my body and movement while playing the piano right now.",
    type: "scale",
    options: null,
    order: 0,
    required: true,
  },
  {
    id: questionIds[1],
    quizId: quizId,
    text: "My body feels physically free and not tense while playing.",
    type: "scale",
    options: null,
    order: 1,
    required: true,
  },
  {
    id: questionIds[2],
    quizId: quizId,
    text: "My body felt flexible, responsive, and physically ready for piano playing today.",
    type: "scale",
    options: null,
    order: 2,
    required: true,
  },
  {
    id: questionIds[3],
    quizId: quizId,
    text: "Physical movements or bodily sensations were integrated into my piano technique today.",
    type: "scale",
    options: null,
    order: 3,
    required: true,
  },
  {
    id: questionIds[4],
    quizId: quizId,
    text: "My piano technique feels clear and well-organized today.",
    type: "scale",
    options: null,
    order: 4,
    required: true,
  },
  {
    id: questionIds[5],
    quizId: quizId,
    text: "My physical state today supports musical expressions at the piano.",
    type: "scale",
    options: null,
    order: 5,
    required: true,
  },
  {
    id: questionIds[6],
    quizId: quizId,
    text: "If anything stood out in today's playing experience, please describe it briefly:",
    type: "text",
    options: null,
    order: 6,
    required: false,
  },
  {
    id: questionIds[7],
    quizId: quizId,
    text: "Role",
    type: "choice",
    options: ["Undergraduate", "Graduate", "Faculty"],
    order: 7,
    required: true,
  },
  {
    id: questionIds[8],
    quizId: quizId,
    text: "Today's session included a guided warm-up",
    type: "choice",
    options: ["Yes", "No"],
    order: 8,
    required: true,
  },
];

// Sample text responses for the optional question
const sampleTextResponses = [
  "Felt more relaxed than usual after the warm-up exercises.",
  "My fingers felt particularly nimble today.",
  "Noticed tension in my shoulders during difficult passages.",
  "The breathing exercises really helped me focus.",
  "Struggled with the left hand coordination initially.",
  "Best practice session this week!",
  "Need to work on maintaining posture during long pieces.",
  "The metronome practice improved my timing significantly.",
  "Felt a strong connection between my body and the music.",
  "Hands felt cold at the start but warmed up nicely.",
  "",
  "",
  "", // Some empty responses to simulate optional skips
];

// Generate weighted random score (tends toward middle values with some variation)
function generateWeightedScore(): number {
  const weights = [0.1, 0.2, 0.35, 0.25, 0.1]; // Weights for scores 1-5
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (random < cumulative) {
      return i + 1;
    }
  }
  return 3;
}

// Generate random date within last 90 days
function generateRandomDate(): number {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  return Math.floor(Math.random() * (now - ninetyDaysAgo) + ninetyDaysAgo);
}

async function seed() {
  console.log("Starting database seed...");

  try {
    // Create the demo quiz
    console.log("Creating demo quiz...");
    await db.transact([tx.quizzes[demoQuiz.id].update(demoQuiz)]);

    // Create all questions
    console.log("Creating questions...");
    const questionTransactions = demoQuestions.map((q) =>
      tx.questions[q.id].update(q)
    );
    await db.transact(questionTransactions);

    // Generate 1000 random responses
    console.log("Generating 1000 random responses...");
    
    const batchSize = 50; // Process in batches to avoid rate limits
    const totalResponses = 1000;
    
    for (let batch = 0; batch < totalResponses / batchSize; batch++) {
      const transactions: ReturnType<typeof tx.responses[string]["update"]>[] = [];
      
      for (let i = 0; i < batchSize; i++) {
        const responseId = id();
        const submittedAt = generateRandomDate();
        
        // Create response
        transactions.push(
          tx.responses[responseId].update({
            quizId: quizId,
            submittedAt,
            metadata: {
              demo: true,
              userAgent: "Seed Script",
            },
          })
        );

        // Create answers for each question
        for (const question of demoQuestions) {
          const answerId = id();
          let value: string | number;

          if (question.type === "scale") {
            value = generateWeightedScore();
          } else if (question.type === "choice") {
            const options = question.options!;
            value = options[Math.floor(Math.random() * options.length)];
          } else {
            // Text question - pick random sample or empty
            value = sampleTextResponses[
              Math.floor(Math.random() * sampleTextResponses.length)
            ];
          }

          transactions.push(
            tx.answers[answerId].update({
              responseId,
              questionId: question.id,
              value,
            })
          );
        }
      }

      await db.transact(transactions);
      console.log(`Batch ${batch + 1}/${totalResponses / batchSize} complete`);
    }

    console.log("Seed completed successfully!");
    console.log(`Created 1 quiz with ${demoQuestions.length} questions and ${totalResponses} responses.`);
    
  } catch (error) {
    console.error("Seed failed:", error);
    throw error;
  }
}

// Run the seed
seed().then(() => {
  console.log("Done!");
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
