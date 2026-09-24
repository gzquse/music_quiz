import Anthropic from "@anthropic-ai/sdk";
import { CAPTURE, overallScore, type AudioMetrics, type CoachFeedback } from "@/lib/coach/rubric";
import { toInstructor, type InstructorRow } from "@/lib/coach/records";
import {
  FEEDBACK_SCHEMA,
  SYSTEM_PROMPT,
  buildUserContent,
  tidyFeedback,
  type ProfessorNote,
} from "@/lib/coach/prompt";
import {
  HttpError,
  accountSummary,
  adminDb,
  entitlement,
  errorResponse,
  getOrCreateAccount,
  recordUsage,
  requireUser,
} from "@/lib/coach/server";

export const runtime = "nodejs";
export const maxDuration = 300;

// Change the model here. See docs/AI_COACH_GUIDE.md for cost per analysis.
const MODEL = "claude-opus-5";

// Reads ANTHROPIC_API_KEY. Timeout × (retries + 1) stays inside maxDuration.
const anthropic = new Anthropic({ timeout: 140_000, maxRetries: 1 });

type AnalyzeBody = {
  frames: { t: number; data: string }[];
  thumbs: string[];
  durationSec: number;
  audio: AudioMetrics | null;
  loudness: number[];
  piece?: string;
  goal?: string;
};

function readBody(body: unknown): AnalyzeBody {
  const b = body as Partial<AnalyzeBody>;
  const frames = Array.isArray(b.frames) ? b.frames : [];
  const thumbs = Array.isArray(b.thumbs) ? b.thumbs : [];
  if (frames.length < 4 || frames.length > CAPTURE.frames) {
    throw new HttpError(400, "Recording could not be read. Please try another take.");
  }
  for (const f of frames) {
    if (typeof f?.data !== "string" || f.data.length > CAPTURE.maxFrameChars || typeof f.t !== "number") {
      throw new HttpError(400, "A frame was too large or malformed.");
    }
  }
  const durationSec = Number(b.durationSec);
  if (!Number.isFinite(durationSec) || durationSec < CAPTURE.minSeconds - 1 || durationSec > 600) {
    throw new HttpError(400, `Please record at least ${CAPTURE.minSeconds} seconds.`);
  }
  return {
    frames,
    thumbs: thumbs.filter(
      (t): t is string => typeof t === "string" && t.startsWith("data:image/jpeg;base64,") && t.length < 80_000
    ),
    durationSec,
    audio: b.audio && typeof b.audio === "object" ? b.audio : null,
    loudness: Array.isArray(b.loudness)
      ? b.loudness.slice(0, 120).map((v) => Math.min(1, Math.max(0, Number(v) || 0)))
      : [],
    piece: typeof b.piece === "string" ? b.piece.slice(0, 120) : undefined,
    goal: typeof b.goal === "string" ? b.goal.slice(0, 300) : undefined,
  };
}

async function loadCoachContext(userId: string) {
  const db = adminDb();
  const [instructorRes, notesRes] = await Promise.all([
    db.from("coach_instructors").select("*").eq("user_id", userId).maybeSingle(),
    db
      .from("coach_sessions")
      .select("created_at, piece, professor_name, professor_notes, professor_scores")
      .eq("user_id", userId)
      .not("professor_notes", "is", null)
      .order("created_at", { ascending: false })
      .limit(3),
  ]);
  if (instructorRes.error) throw instructorRes.error;
  if (notesRes.error) throw notesRes.error;

  const instructor = toInstructor(instructorRes.data as InstructorRow | null);
  const professorNotes: ProfessorNote[] = instructor.learnFromProfessor
    ? (notesRes.data ?? [])
        .filter((s) => s.professor_notes?.trim())
        .map((s) => ({
          createdAt: Date.parse(s.created_at),
          piece: s.piece ?? undefined,
          professorName: s.professor_name ?? undefined,
          notes: (s.professor_notes ?? "").slice(0, 800),
          scores: s.professor_scores ?? undefined,
        }))
    : [];

  return { instructor, professorNotes };
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req);
    const body = readBody(await req.json().catch(() => ({})));

    const account = await getOrCreateAccount(user);
    const ent = entitlement(account);
    if (!ent.allowed) {
      const message =
        ent.reason === "trial_used"
          ? "You've used your free analyses. Upgrade to keep going."
          : "You've reached this month's analysis limit.";
      throw new HttpError(402, message, ent.reason);
    }

    const { instructor, professorNotes } = await loadCoachContext(user.id);

    const response = await anthropic.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: FEEDBACK_SCHEMA },
      },
      // If a safety classifier declines, the API retries on its recommended fallback model.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
      messages: [
        {
          role: "user",
          content: buildUserContent({
            frames: body.frames,
            durationSec: body.durationSec,
            audio: body.audio,
            piece: body.piece,
            goal: body.goal,
            instructor,
            professorNotes,
          }),
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      throw new HttpError(422, "This recording couldn't be reviewed. Please try another take.");
    }
    if (response.stop_reason === "max_tokens") {
      throw new HttpError(502, "The review was cut short. Please try again.");
    }
    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") {
      throw new HttpError(502, "The review came back empty. Please try again.");
    }

    const feedback = tidyFeedback(JSON.parse(text.text) as CoachFeedback, body.frames.length);

    // Keep a cover image and the frames the priorities point to; drop the rest.
    const keep = new Set([Math.ceil(body.frames.length / 2), ...feedback.priorities.map((p) => p.frame)]);
    const thumbs = Object.fromEntries(
      [...keep].filter((n) => body.thumbs[n - 1]).map((n) => [String(n), body.thumbs[n - 1]])
    );

    const { data: saved, error: saveError } = await adminDb()
      .from("coach_sessions")
      .insert({
        user_id: user.id,
        piece: body.piece?.trim() || null,
        goal: body.goal?.trim() || null,
        duration_sec: body.durationSec,
        frame_times: body.frames.map((f) => f.t),
        thumbs,
        loudness: body.loudness,
        audio: body.audio,
        ai: feedback,
        overall: overallScore(feedback.metrics),
        instructor_name: instructor.name,
        model: response.model,
      })
      .select("id")
      .single();
    if (saveError) throw saveError;
    await recordUsage(account, ent.via);

    console.info("coach.analyze", {
      user: user.id,
      model: response.model,
      input: response.usage.input_tokens,
      cacheRead: response.usage.cache_read_input_tokens,
      output: response.usage.output_tokens,
    });

    const updated = await getOrCreateAccount(user);
    return Response.json({ sessionId: saved.id, account: accountSummary(updated) });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "The coach is busy right now. Please try again in a minute." }, { status: 429 });
    }
    if (err instanceof Anthropic.APIError) {
      console.error("Claude API error", err.status, err.message);
      return Response.json({ error: "The coach is unavailable. Please try again." }, { status: 502 });
    }
    return errorResponse(err);
  }
}
