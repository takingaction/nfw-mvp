/**
 * Anthropic Claude API wrapper for grant application evaluation.
 *
 * Lazy initialization (matches lib/slack-notifications.ts pattern).
 * Never throws — all failures return a safe "uncertain" evaluation so
 * the caller's flow (submission, scoring start, etc.) is never broken.
 */

export interface EvaluationResult {
  relevance: "relevant" | "irrelevant" | "uncertain";
  reasoning: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
}

export interface GrantEvaluationInput {
  cycleName: string;
  cycleDescription: string;
  whoAreYou: string;
  biggestChallenge: string;
  fundUsage: string;
}

const MODEL = "claude-sonnet-4-5-20250929";
const TIMEOUT_MS = 8000;

let cachedClient: any | null = null;

async function getClient(): Promise<any | null> {
  if (cachedClient) return cachedClient;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn(
      "[anthropic] ANTHROPIC_API_KEY not configured, AI evaluation disabled",
    );
    return null;
  }
  try {
    const mod = await import("@anthropic-ai/sdk");
    cachedClient = new mod.default({ apiKey });
    return cachedClient;
  } catch (err) {
    console.error("[anthropic] Failed to load SDK:", err);
    return null;
  }
}

function buildPrompt(input: GrantEvaluationInput): {
  system: string;
  user: string;
} {
  const system = `You evaluate grant applications for a nonprofit. Your job is to determine whether the applicant's stated use of funds is reasonably aligned with the grant's stated purpose.

Read the cycle name, the cycle description (the grant's purpose), and the applicant's 3 free-text answers. Respond ONLY with valid JSON in this exact shape:
{ "relevance": "relevant" | "irrelevant" | "uncertain", "reasoning": "1-3 sentence explanation" }

- "relevant": applicant clearly fits the grant's purpose
- "irrelevant": applicant's stated use of funds does not match the grant's purpose
- "uncertain": cannot determine from the answers provided (e.g., too vague)

Be strict but fair. If the applicant mentions a need that is even tangentially related to the grant's stated purpose, lean toward "relevant". Only mark "irrelevant" when the applicant's use of funds is clearly outside the grant's scope.`;

  const user = `GRANT CYCLE NAME: ${input.cycleName}

GRANT CYCLE DESCRIPTION (the grant's purpose):
${input.cycleDescription || "(no description provided)"}

---

APPLICANT ANSWERS:

Who are you?
${input.whoAreYou}

What is your biggest challenge right now?
${input.biggestChallenge}

How would you use the grant funds and what difference would it make?
${input.fundUsage}

---

Respond ONLY with valid JSON. No markdown, no explanation outside the JSON.`;

  return { system, user };
}

function parseEvaluation(text: string): {
  relevance: EvaluationResult["relevance"];
  reasoning: string;
} | null {
  // Strip markdown fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned
      .replace(/^```(?:json)?\n?/i, "")
      .replace(/\n?```$/i, "")
      .trim();
  }

  try {
    const parsed = JSON.parse(cleaned);
    const rel = parsed.relevance;
    if (
      rel !== "relevant" &&
      rel !== "irrelevant" &&
      rel !== "uncertain"
    ) {
      return null;
    }
    const reasoning =
      typeof parsed.reasoning === "string"
        ? parsed.reasoning.slice(0, 500)
        : "";
    return { relevance: rel, reasoning };
  } catch {
    return null;
  }
}

export async function evaluateGrantApplication(
  input: GrantEvaluationInput,
): Promise<EvaluationResult> {
  const fallback = (reason: string): EvaluationResult => ({
    relevance: "uncertain",
    reasoning: reason,
    model: MODEL,
    inputTokens: 0,
    outputTokens: 0,
  });

  const client = await getClient();
  if (!client) {
    return fallback("AI evaluation unavailable (API key not configured)");
  }

  const { system, user } = buildPrompt(input);

  // AbortController timeout
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: 300,
        temperature: 0,
        system,
        messages: [{ role: "user", content: user }],
      },
      { signal: controller.signal as any },
    );

    clearTimeout(timer);

    const content = response.content?.[0];
    const text = content?.type === "text" ? content.text : "";
    const parsed = parseEvaluation(text || "");

    if (!parsed) {
      console.warn("[anthropic] Failed to parse response:", text?.slice(0, 200));
      return fallback("AI evaluation could not parse response");
    }

    return {
      relevance: parsed.relevance,
      reasoning: parsed.reasoning,
      model: MODEL,
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0,
    };
  } catch (err: any) {
    clearTimeout(timer);
    // APIUserAbortError is raised by the SDK when the underlying fetch is
    // aborted — either by our 8 s AbortController above, or by the runtime
    // killing the worker (Vercel terminates serverless functions by aborting
    // in-flight requests once `maxDuration` is reached). Distinguish it from
    // generic errors so the log isn't misleading and reviewers see a clear
    // timeout reason instead of "AI evaluation failed".
    //
    // Use duck-typed message check rather than instanceof import to avoid
    // bundling APIUserAbortError into the hot path of every submission.
    if (
      err?.name === "AbortError" ||
      typeof err?.message === "string" &&
        err.message.toLowerCase().includes("request was aborted")
    ) {
      return fallback("AI evaluation timed out");
    }
    console.error("[anthropic] API error:", err?.message || err);
    return fallback("AI evaluation failed");
  }
}

export const AI_MODEL_VERSION = MODEL;
