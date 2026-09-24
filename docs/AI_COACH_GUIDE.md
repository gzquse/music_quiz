# Form Coach — how it works, what it costs, how to charge for it

Form Coach lives at `/coach`. A student films about a minute of playing; the app returns lesson-style feedback on six areas scored on the same 1–5 rubric a professor uses, so students can compare the two side by side.

## 1. The pipeline

```
Phone (browser)                         Your server (/api/coach/analyze)          Claude API
───────────────                         ────────────────────────────────          ──────────
record or pick a video
  ├─ 16 evenly spaced frames (JPEG)  ─┐
  ├─ audio measurements:              ├─► check sign-in + quota
  │   onsets, hesitations, drift,     │   add instructor settings
  │   loudness, dynamic range         │   + professor notes          ──────────►  vision + rubric
  └─ small thumbnails                ─┘                                ◄──────────  JSON feedback
                                          save session, count usage
results screen  ◄──────────────────────── session id
```

- **The video never leaves the phone.** Only 16 still frames and a few numbers are uploaded. The server stores the feedback, the loudness strip, and up to 4 small thumbnails. Nothing else.
- **Why frames plus audio numbers?** The Claude API accepts images, not video or audio files. Posture and hand shape come from the frames. Rhythm and dynamics come from measurements taken on the phone ([lib/coach/media.ts](../lib/coach/media.ts)): spectral-flux onset detection, hesitations (gaps where the sound actually fades), tempo drift, and loudness.
- **The measurements are approximate.** The detector was tuned on synthetic recordings. It finds every note in steady and rushing playing, and about 75% of notes in soft pedaled legato and fast scales. The prompt tells Claude to treat these numbers as supporting evidence only. Validate on real recordings before relying on the rhythm scores.

## 2. The API request, piece by piece

Your API key must live only on the server. If it's in browser code, anyone can copy it and spend your money. The browser calls *your* route, and your route calls Claude. Here is the request, from [app/api/coach/analyze/route.ts](../app/api/coach/analyze/route.ts):

```ts
const anthropic = new Anthropic();            // reads ANTHROPIC_API_KEY from the environment

const response = await anthropic.beta.messages.create({
  model: "claude-opus-5",                     // which model; one constant, change it in one place
  max_tokens: 16000,                          // ceiling on output (reasoning + answer)
  thinking: { type: "adaptive" },             // the model decides how much to reason
  output_config: {
    effort: "high",                           // low | medium | high | xhigh | max: trades cost for depth
    format: { type: "json_schema", schema: FEEDBACK_SCHEMA },  // guarantees parseable JSON in this shape
  },
  betas: ["server-side-fallback-2026-07-01"],
  fallbacks: "default",                       // if a safety filter declines, retry on a fallback model
  system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
  messages: [{ role: "user", content: [
    { type: "text", text: "Recording length: 1:00 … audio measurements … instructor settings …" },
    { type: "text", text: "Frame 1 — 0:02" },
    { type: "image", source: { type: "base64", media_type: "image/jpeg", data: "<base64>" } },
    // … 16 frames …
  ]}],
});
```

Then always check **why** it stopped before reading the answer:

| `stop_reason` | Meaning | What the route does |
|---|---|---|
| `end_turn` | Finished normally | Parse the JSON and save it |
| `refusal` | A safety filter declined, even after fallback | 422, "try another take"; no credit used |
| `max_tokens` | Hit the output ceiling | 502, "try again"; no credit used |

Usage is only counted after a successful save, so students never pay for errors.

**Try the raw HTTP call yourself** (what the SDK sends under the hood):

```bash
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model": "claude-opus-5", "max_tokens": 200,
       "messages": [{"role": "user", "content": "In one sentence: what is a collapsed nail joint in piano technique?"}]}'
```

## 3. Why the feedback reads like a professor, not an app

Threshold-based posture apps give generic advice ("keep your wrists up"). The coach's system prompt ([lib/coach/prompt.ts](../lib/coach/prompt.ts)) requires the following instead:

- **Anchored scores.** Each score level has a fixed meaning, for example 3 = "a recurring issue that limits the playing", and scores aren't inflated for level.
- **Evidence.** Every claim cites a timestamp or a measurement. Anything the camera can't see is scored `null` ("Not visible") instead of guessed.
- **Cause plus cue.** Each fix names the cause ("the wrist drops because the elbow hangs behind the torso") and gives one physical instruction the student can try right away.
- **Brevity.** Word limits sit in the output schema, and the model returns one to three priorities, fewer when the take is strong.
- **Calibration.** When "Learn from my professor" is on, the professor's three most recent notes are included, so the coach adopts their priorities and vocabulary.

**How to improve it.** The compare screen doubles as an evaluation set. Every take with professor scores tells you how often the coach agrees within one point, and in which areas it drifts. When you edit the prompt, re-run a fixed set of saved takes and check that agreement went up before shipping.

## 4. Cost per analysis

Image tokens ≈ width × height ÷ 750. The current settings (16 frames, long edge 1152 px) come to about 16k image tokens, plus about 2.5k tokens of text.

| Model | Input (≈18.5k tokens) | Output (≈3–7k, incl. reasoning) | Per analysis |
|---|---|---|---|
| `claude-opus-5` ($5 / $25 per M tokens), current | ≈ $0.09 | ≈ $0.08–0.18 | **≈ $0.17–0.27** |
| `claude-sonnet-5` ($2 / $10 per M tokens) | ≈ $0.04 | ≈ $0.03–0.07 | ≈ $0.07–0.11 |

These are estimates. The route logs real token counts on every call (`coach.analyze` in your Vercel logs), so check actual spend after the first 20 or so analyses. Cost levers, in order: fewer frames or a smaller edge (`CAPTURE` in [lib/coach/rubric.ts](../lib/coach/rubric.ts)), lower `effort`, then a cheaper model. Change one at a time and compare feedback quality on the same takes.

## 5. Charging, free analyses, and trials

**How the plans work now:**

- **Free:** every new account gets `COACH_FREE_ANALYSES` (default 3), with no card. At ~$0.25 each, that's roughly $0.75 to acquire a user.
- **Pro:** a Stripe monthly subscription with a fair-use cap of `COACH_PRO_MONTHLY_ANALYSES` (default 30) per billing period.
- **Optional card-required trial:** set `STRIPE_TRIAL_DAYS=7` and Pro starts with a 7-day trial. Stripe charges automatically when it ends unless the student cancels. Free analyses convert more gently, while card-required trials filter for serious users. You can use both.

**Margin check at $12.99/month:** Stripe takes about 2.9% + 30¢, which leaves ≈ $12.31. A student who maxes out 30 analyses costs ≈ $8, still profitable. A typical 8–10 analyses cost ≈ $2.50.

**Who can change what:** balances live in `coach_accounts`, which only the server can write ([instant.perms.ts](../instant.perms.ts)), so a student can't edit their own credits from the browser.

### Stripe setup (test mode first)

1. Create a Stripe account and stay in **Test mode**.
2. **Product catalog → Add product** "Form Coach Pro", recurring monthly price (e.g. $12.99). Copy the `price_…` ID into `STRIPE_PRICE_ID`, and set `COACH_PRICE_LABEL` to match.
3. **Developers → API keys**: copy the secret key into `STRIPE_SECRET_KEY`.
4. **Settings → Billing → Customer portal**: activate it. "Manage billing" won't work until you do.
5. Webhook, local: install the Stripe CLI and run `stripe listen --forward-to localhost:3000/api/billing/webhook`. It prints a `whsec_…` secret for `STRIPE_WEBHOOK_SECRET`.
6. Webhook, production: **Developers → Webhooks → Add endpoint** `https://your-app/api/billing/webhook` with events `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`. Use that endpoint's secret in Vercel.
7. Test with card `4242 4242 4242 4242`, any future date, any CVC. The Plans page should flip to **Pro** within a few seconds.
8. When ready, repeat steps 2–6 in **Live mode** with live keys.

**App Store note:** selling through the web app (this PWA, paid with Stripe) avoids App Store fees. If you later ship a native iOS app, Apple's in-app purchase rules apply to digital subscriptions sold inside it.

## 6. Setup checklist

1. Get an API key: Claude Console (platform.claude.com) → API Keys. Set `ANTHROPIC_API_KEY` and a monthly spend limit.
2. Set `INSTANTDB_ADMIN_TOKEN` (InstantDB dashboard → Admin Tokens).
3. Push the database changes: `npx instant-cli push schema`, then `npx instant-cli push perms`. The perms file only restricts the coach tables; the survey tables keep their current open rules. Review the diff it shows before confirming.
4. Add the Stripe variables (section 5), or leave them unset to launch with free analyses only.
5. Deploy to Vercel. The analyze route allows up to 300 s (`maxDuration`); request bodies stay under Vercel's 4.5 MB limit.
6. On an iPhone: open `/coach` in Safari → Share → Add to Home Screen. It installs as "Form Coach".

## 7. Before real students use it

- **Privacy and consent.** Tell students what is uploaded (frames, not video) and what is stored. Check Anthropic's commercial terms and data-retention settings, and summarize them in your privacy policy. If any students are minors or part of the research study, get the appropriate consent (and IRB approval, if applicable) first.
- **Known limits.** The rhythm and dynamics numbers are approximate (see section 1). Two analyses started at the same instant could both use the last free credit. Not yet tested on a physical iPhone.
