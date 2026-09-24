// Shared by the browser and the server: the rubric, feedback shape, and capture settings.
// The AI and the professor score the same six areas on the same 1–5 anchors,
// which is what makes "compare with my professor" meaningful.

export const METRICS = [
  { key: "posture", label: "Posture", long: "Posture & balance", source: "video" },
  { key: "arms", label: "Arms", long: "Arms & shoulders", source: "video" },
  { key: "wrists", label: "Wrists", long: "Wrists & forearms", source: "video" },
  { key: "hands", label: "Hands", long: "Hand shape & fingers", source: "video" },
  { key: "rhythm", label: "Rhythm", long: "Rhythm & pulse", source: "audio" },
  { key: "dynamics", label: "Dynamics", long: "Dynamics & tone", source: "audio" },
] as const;

export type MetricKey = (typeof METRICS)[number]["key"];
export const METRIC_KEYS = METRICS.map((m) => m.key) as MetricKey[];

export type Score = 1 | 2 | 3 | 4 | 5;

export const SCORE_ANCHORS: Record<Score, { label: string; detail: string }> = {
  5: { label: "Performance-ready", detail: "Consistent across the take; nothing to correct." },
  4: { label: "Secure", detail: "Minor or occasional lapses." },
  3: { label: "Developing", detail: "A recurring issue that limits the playing." },
  2: { label: "Needs work", detail: "The issue shows in most of the take." },
  1: { label: "Priority", detail: "Pervasive; likely to cause strain or block progress." },
};

export type CoachFeedback = {
  headline: string;
  confidence: "high" | "medium" | "low";
  metrics: Record<MetricKey, { score: Score | null; note: string }>;
  strengths: string[];
  priorities: {
    area: MetricKey;
    title: string;
    frame: number;
    observation: string;
    why: string;
    cue: string;
  }[];
  drill: { name: string; minutes: number; steps: string[] };
  recordingTip: string;
};

export type AudioMetrics = {
  onsets: number;
  notesPerSecond: number;
  rateByWindow: { t: number; rate: number }[];
  tempoDriftPct: number;
  hesitations: number[];
  longestPauseSec: number;
  dynamicRangeDb: number;
  loudnessByWindow: { t: number; db: number }[];
};

export type Tone = "warm" | "balanced" | "direct";
export type Level = "beginner" | "intermediate" | "advanced" | "preprofessional";

export type InstructorSettings = {
  name: string;
  color: number;
  tone: Tone;
  level: Level;
  focus: MetricKey[];
  notes: string;
  learnFromProfessor: boolean;
};

export const TONES: { value: Tone; label: string; sample: string }[] = [
  {
    value: "warm",
    label: "Warm",
    sample: "Your pulse is lovely and even. Next, let the wrist float up to meet the keys at 0:24.",
  },
  {
    value: "balanced",
    label: "Balanced",
    sample: "Pulse is steady. At 0:24 the wrist drops below the keys; let it float level with the forearm.",
  },
  {
    value: "direct",
    label: "Direct",
    sample: "Wrist collapses at 0:24. Keep it level with the forearm.",
  },
];

export const LEVELS: { value: Level; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "preprofessional", label: "Pre-professional" },
];

export const INSTRUCTOR_COLORS = [
  "from-[#c45c6a] to-[#8e3d4a]",
  "from-[#e07a3c] to-[#b85a22]",
  "from-[#8a5a78] to-[#5c3d52]",
  "from-[#5f7d6e] to-[#3d5549]",
  "from-[#4f6a8a] to-[#34495f]",
  "from-[#7a5640] to-[#4f3729]",
];

export const DEFAULT_INSTRUCTOR: InstructorSettings = {
  name: "Coach Aria",
  color: 0,
  tone: "balanced",
  level: "intermediate",
  focus: [],
  notes: "",
  learnFromProfessor: true,
};

export const MAX_FOCUS = 3;
export const MAX_NOTES = 400;

// What the phone sends. 16 frames × ~1,000 image tokens keeps one analysis near
// 18k input tokens and the request body well under Vercel's 4.5 MB limit.
export const CAPTURE = {
  frames: 16,
  maxEdge: 1152,
  jpegQuality: 0.72,
  maxFrameChars: 240_000,
  thumbEdge: 320,
  recordSeconds: 60,
  minSeconds: 10,
  maxAnalyzeSeconds: 90,
} as const;

export function scoreColor(score: number | null | undefined) {
  if (score == null) return "#b9aca5";
  if (score >= 4.5) return "#4f8a64";
  if (score >= 3.5) return "#6a9a78";
  if (score >= 2.5) return "#d9973a";
  if (score >= 1.5) return "#e07a52";
  return "#d45c4a";
}

export function anchorFor(score: number | null | undefined) {
  if (score == null) return null;
  const rounded = Math.min(5, Math.max(1, Math.round(score))) as Score;
  return SCORE_ANCHORS[rounded];
}

export function overallScore(metrics: CoachFeedback["metrics"]): number | null {
  const scores = METRIC_KEYS.map((k) => metrics[k]?.score).filter(
    (s): s is Score => typeof s === "number"
  );
  if (!scores.length) return null;
  return Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10;
}

export function formatClock(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function metricLabel(key: MetricKey) {
  return METRICS.find((m) => m.key === key)?.long ?? key;
}
