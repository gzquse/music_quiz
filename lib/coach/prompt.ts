// Server-only: the instructions, output schema, and request content for one analysis.

import type Anthropic from "@anthropic-ai/sdk";
import {
  METRICS,
  METRIC_KEYS,
  SCORE_ANCHORS,
  formatClock,
  type AudioMetrics,
  type CoachFeedback,
  type InstructorSettings,
  type MetricKey,
  type Score,
} from "./rubric";

const RUBRIC_DETAIL: Record<MetricKey, string> = {
  posture:
    "bench height and distance, torso upright and balanced over the sit bones, head over the spine, feet grounded.",
  arms:
    "shoulders released rather than raised, elbows free of the torso and roughly level with the keys, arm weight carried into the keys, freedom to travel sideways.",
  wrists:
    "wrist roughly level with the forearm, neither collapsed below the keys nor locked high; no sideways bend; the forearm follows the hand.",
  hands:
    "natural curve, firm nail joints (no collapsing), knuckle bridge present, thumb relaxed and not tucked, fingers staying close to the keys.",
  rhythm:
    "steadiness of pulse, tempo control, and continuity (hesitations, stops), judged from the audio measurements.",
  dynamics:
    "dynamic range and shaping over the phrase, judged from the audio loudness profile.",
};

// Kept byte-stable (no dates or per-user text) so it can be prompt-cached.
export const SYSTEM_PROMPT = `You are a piano technique instructor reviewing a student's practice recording. You teach at conservatory level and write the way an experienced professor writes lesson notes: specific, observable, brief, and kind without flattery.

## What you receive
- Still frames sampled evenly from a recording of about one minute, each labeled with its frame number and timestamp. You are seeing moments, not continuous motion: judge patterns that recur across frames, and do not infer movement you cannot see.
- Audio measurements computed on the student's phone (note onsets and loudness). They are approximate: they cannot separate the hands, and legato or pedal can hide onsets. Treat them as supporting evidence, and do not state a rhythm or dynamics problem more confidently than the numbers allow.
- The student's instructor settings (name, tone, level, focus areas, standing notes), what they are playing, and, when available, recent notes from their human professor.

## Rubric
Score each area 1–5, or null when it cannot be judged from this recording.
${METRICS.map((m) => `- ${m.key} (${m.long}): ${RUBRIC_DETAIL[m.key]}`).join("\n")}

Score anchors (the student's professor uses the same scale):
${([5, 4, 3, 2, 1] as Score[]).map((s) => `- ${s} ${SCORE_ANCHORS[s].label}: ${SCORE_ANCHORS[s].detail}`).join("\n")}
- null: not observable (out of frame, blurred, blocked, or audio unavailable). Never guess a score.

Judge against what is appropriate for the student's level, but do not inflate: a 3 means the same thing for every student.

## How to write
- Every observation points to evidence. Cite frames by timestamp (for example "0:24"). If you cannot point to a frame or a measurement, leave it out.
- Name the cause, not only the symptom: "the wrist drops because the elbow hangs behind the torso", not "the wrist is low".
- A correction cue is one physical instruction the student can try at the keyboard right away ("let the elbow float a hand-width from your side"). "Relax more" or "practice slowly" are not cues.
- Use standard piano pedagogy vocabulary (arm weight, knuckle bridge, nail-joint collapse, forearm rotation, thumb under). For beginners, say it in plain words instead.
- Choose one to three priorities that would most improve the playing, ordered by impact. When the take is strong, give fewer.
- Weigh the student's focus areas and standing notes, but report what the recording actually shows.
- No filler praise, emojis, or exclamation marks, and no medical diagnoses. If something could lead to pain, say it is worth checking with their teacher.
- Tone setting: warm frames things encouragingly, balanced is neutral, direct is brief with no softening. Tone changes the wording, never the scores.
- If professor notes are provided, adopt their priorities and terminology where they apply to what you see, but still judge only this recording.
- If framing, lighting, or angle limited what you could judge, explain how to film next time in recordingTip. Otherwise return an empty string.
- Respect the word limits in the output field descriptions. Students read this on a phone.`;

const metricSchema = {
  type: "object",
  properties: {
    score: {
      anyOf: [{ type: "integer", enum: [1, 2, 3, 4, 5] }, { type: "null" }],
    },
    note: {
      type: "string",
      description:
        "The evidence behind the score, at most 16 words, with a timestamp when visual. If score is null, say what could not be seen or heard.",
    },
  },
  required: ["score", "note"],
  additionalProperties: false,
} as const;

export const FEEDBACK_SCHEMA = {
  type: "object",
  properties: {
    headline: {
      type: "string",
      description: "The single most useful takeaway from this take, one sentence, at most 18 words.",
    },
    confidence: {
      type: "string",
      enum: ["high", "medium", "low"],
      description: "How well this recording let you judge technique.",
    },
    metrics: {
      type: "object",
      properties: Object.fromEntries(METRIC_KEYS.map((k) => [k, metricSchema])),
      required: METRIC_KEYS,
      additionalProperties: false,
    },
    strengths: {
      type: "array",
      items: { type: "string" },
      description: "At most 2 specific things done well, each at most 14 words, with a timestamp when visual.",
    },
    priorities: {
      type: "array",
      description: "1 to 3 corrections, most important first.",
      items: {
        type: "object",
        properties: {
          area: { type: "string", enum: METRIC_KEYS },
          title: { type: "string", description: "Short label, at most 5 words." },
          frame: {
            type: "integer",
            description: "The frame number where this is clearest.",
          },
          observation: {
            type: "string",
            description: "What you see or hear and when, at most 20 words.",
          },
          why: {
            type: "string",
            description: "The cause, or what it costs the playing, at most 14 words.",
          },
          cue: {
            type: "string",
            description: "One physical instruction to try right away, at most 14 words.",
          },
        },
        required: ["area", "title", "frame", "observation", "why", "cue"],
        additionalProperties: false,
      },
    },
    drill: {
      type: "object",
      description: "One short exercise targeting the first priority.",
      properties: {
        name: { type: "string", description: "At most 5 words." },
        minutes: { type: "integer", enum: [3, 5, 10] },
        steps: {
          type: "array",
          items: { type: "string" },
          description: "2 or 3 steps, each at most 14 words.",
        },
      },
      required: ["name", "minutes", "steps"],
      additionalProperties: false,
    },
    recordingTip: {
      type: "string",
      description: "How to film next time if the recording limited your judgment, at most 20 words; otherwise empty.",
    },
  },
  required: ["headline", "confidence", "metrics", "strengths", "priorities", "drill", "recordingTip"],
  additionalProperties: false,
};

export type ProfessorNote = {
  createdAt: number;
  piece?: string;
  professorName?: string;
  notes: string;
  scores?: Record<string, number>;
};

export type AnalysisInput = {
  frames: { t: number; data: string }[];
  durationSec: number;
  audio: AudioMetrics | null;
  piece?: string;
  goal?: string;
  instructor: InstructorSettings;
  professorNotes: ProfessorNote[];
};

function describeAudio(audio: AudioMetrics | null) {
  if (!audio) {
    return "Audio: unavailable for this recording. Score rhythm and dynamics as null.";
  }
  const lines = [
    `Audio measurements (approximate):`,
    `- Note onsets detected: ${audio.onsets} (${audio.notesPerSecond.toFixed(1)} per second while playing)`,
    `- Onset rate by 10 s window: ${audio.rateByWindow.map((w) => `${formatClock(w.t)} ${w.rate.toFixed(1)}/s`).join(", ")}`,
    `- Tempo drift, first third to last third: ${audio.tempoDriftPct > 0 ? "+" : ""}${audio.tempoDriftPct}% (positive means faster at the end)`,
    `- Hesitations (gaps much longer than the local note spacing): ${
      audio.hesitations.length ? audio.hesitations.map(formatClock).join(", ") : "none"
    }`,
    `- Longest pause: ${audio.longestPauseSec.toFixed(1)} s`,
    `- Dynamic range (loud 95th vs soft 10th percentile): ${audio.dynamicRangeDb} dB`,
    `- Loudness by 5 s window (dBFS): ${audio.loudnessByWindow.map((w) => `${formatClock(w.t)} ${w.db}`).join(", ")}`,
  ];
  return lines.join("\n");
}

function describeInstructor(s: InstructorSettings) {
  const focus = s.focus.length
    ? s.focus.map((k) => METRICS.find((m) => m.key === k)?.long ?? k).join(", ")
    : "none chosen";
  return [
    `Instructor settings:`,
    `- Name: ${s.name}`,
    `- Tone: ${s.tone}`,
    `- Student level: ${s.level}`,
    `- Focus areas: ${focus}`,
    `- Standing notes from the student: ${s.notes.trim() || "none"}`,
  ].join("\n");
}

function describeProfessor(notes: ProfessorNote[]) {
  if (!notes.length) return "";
  const entries = notes.map((n) => {
    const date = new Date(n.createdAt).toISOString().slice(0, 10);
    const scores = n.scores
      ? Object.entries(n.scores)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ")
      : "";
    return [
      `<professor_note date="${date}"${n.piece ? ` piece="${n.piece.replace(/"/g, "'")}"` : ""}>`,
      n.notes,
      scores ? `Scores: ${scores}` : "",
      `</professor_note>`,
    ]
      .filter(Boolean)
      .join("\n");
  });
  return `Recent notes from the student's professor, for calibration:\n${entries.join("\n")}`;
}

export function buildUserContent(input: AnalysisInput): Anthropic.Beta.BetaContentBlockParam[] {
  const context = [
    `Recording length: ${formatClock(input.durationSec)}. ${input.frames.length} frames follow.`,
    `Piece: ${input.piece?.trim() || "not given"}`,
    `What the student wants checked: ${input.goal?.trim() || "not given"}`,
    describeInstructor(input.instructor),
    describeAudio(input.audio),
    describeProfessor(input.professorNotes),
  ]
    .filter(Boolean)
    .join("\n\n");

  const content: Anthropic.Beta.BetaContentBlockParam[] = [{ type: "text", text: context }];
  input.frames.forEach((frame, index) => {
    content.push({ type: "text", text: `Frame ${index + 1} — ${formatClock(frame.t)}` });
    content.push({
      type: "image",
      source: { type: "base64", media_type: "image/jpeg", data: frame.data },
    });
  });
  content.push({ type: "text", text: "Review this take using the rubric." });
  return content;
}

// Structured outputs guarantee the shape; this enforces the limits the schema can't express.
export function tidyFeedback(raw: CoachFeedback, frameCount: number): CoachFeedback {
  const clampFrame = (n: number) => Math.min(frameCount, Math.max(1, Math.round(n) || 1));
  return {
    headline: raw.headline.trim(),
    confidence: raw.confidence,
    metrics: Object.fromEntries(
      METRIC_KEYS.map((k) => [k, { score: raw.metrics[k].score, note: raw.metrics[k].note.trim() }])
    ) as CoachFeedback["metrics"],
    strengths: raw.strengths.map((s) => s.trim()).filter(Boolean).slice(0, 2),
    priorities: raw.priorities.slice(0, 3).map((p) => ({ ...p, frame: clampFrame(p.frame) })),
    drill: {
      name: raw.drill.name.trim(),
      minutes: raw.drill.minutes,
      steps: raw.drill.steps.map((s) => s.trim()).filter(Boolean).slice(0, 3),
    },
    recordingTip: raw.recordingTip.trim(),
  };
}
