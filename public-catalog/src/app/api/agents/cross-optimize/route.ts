import { NextRequest } from "next/server";
import { ok, fail } from "@/lib/api/response";
import { logInfo, logError } from "@/lib/api/logger";

type CrossOptimizeRequest = {
  prompt: string;
  goals?: string[];
  models?: string[];
  includeOpenClaw?: boolean;
};

type ModelReport = {
  model: string;
  role: "planner" | "critic" | "optimizer";
  output: string;
  error?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asStringArray(v: unknown): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out = v.filter((x) => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  return out.length ? out : undefined;
}

function safeModels(models: string[] | undefined): string[] {
  const list = (models || []).map((m) => m.trim()).filter(Boolean);
  if (list.length) return list;
  const env = (process.env.CROSS_AGENT_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return env.length ? env : ["gpt-4o-mini"];
}

async function callOpenAICompatible(params: {
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  timeoutMs: number;
}): Promise<string> {
  const base = params.baseUrl.replace(/\/$/, "");
  const url = `${base}/v1/chat/completions`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${params.apiKey}`,
      },
      body: JSON.stringify({
        model: params.model,
        messages: params.messages,
        temperature: 0.4,
      }),
      signal: controller.signal,
    });
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = isRecord(json) && isRecord(json.error) && typeof json.error.message === "string" ? json.error.message : `http_${res.status}`;
      throw new Error(msg);
    }
    const choice = isRecord(json) && Array.isArray(json.choices) ? json.choices[0] : undefined;
    const message = isRecord(choice) ? choice.message : undefined;
    const content = isRecord(message) ? message.content : undefined;
    if (typeof content !== "string" || !content.trim()) throw new Error("empty_model_output");
    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}

async function callOpenClawOpenResponses(params: {
  url: string;
  token: string;
  agentId: string;
  input: string;
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), params.timeoutMs);
  try {
    const res = await fetch(params.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${params.token}`,
      },
      body: JSON.stringify({
        model: `openclaw:${params.agentId}`,
        input: params.input,
        stream: false,
      }),
      signal: controller.signal,
    });
    const json: unknown = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`openclaw_http_${res.status}`);
    if (!isRecord(json) || !Array.isArray(json.output)) throw new Error("openclaw_invalid_response");
    const texts: string[] = [];
    for (const item of json.output) {
      if (!isRecord(item)) continue;
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (isRecord(c) && c.type === "output_text" && typeof c.text === "string") texts.push(c.text);
        }
      }
    }
    const out = texts.join("\n").trim();
    if (!out) throw new Error("openclaw_empty_output");
    return out;
  } finally {
    clearTimeout(timeout);
  }
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  try {
    const body: unknown = await req.json().catch(() => ({}));
    const b = isRecord(body) ? body : {};

    const prompt = typeof b.prompt === "string" ? b.prompt.trim() : "";
    const goals = asStringArray(b.goals);
    const models = safeModels(asStringArray(b.models));
    const includeOpenClaw = Boolean(b.includeOpenClaw);

    if (!prompt) return fail("prompt_required", 400);

    logInfo("cross_agent.request", { requestId, modelsCount: models.length, includeOpenClaw });

    const baseUrl = (process.env.OPENAI_BASE_URL || "https://api.openai.com").trim();
    const apiKey = (process.env.OPENAI_API_KEY || "").trim();
    const timeoutMs = Math.min(Math.max(Number(process.env.CROSS_AGENT_TIMEOUT_MS || 25_000), 5_000), 120_000);

    const system = [
      "You are a cross-agent prompt optimizer for an image generator inside ForeverTeck Studio.",
      "Return plain text only. No markdown fences.",
      "Be concrete: produce an improved prompt that preserves the user's intent, clarifies composition, lighting, mood, and avoids unsafe content.",
    ].join("\n");

    const goalLine = goals && goals.length ? `Goals:\n- ${goals.join("\n- ")}` : "";

    const plannerPrompt = [
      goalLine,
      "Task: propose 5–10 focused improvements and then provide a revised prompt.",
      `Original prompt:\n${prompt}`,
      "Output format:",
      "IMPROVEMENTS:",
      "- ...",
      "REVISED_PROMPT:",
      "<single prompt string>",
    ].filter(Boolean).join("\n\n");

    const reports: ModelReport[] = [];

    if (!apiKey) {
      reports.push({
        model: "openai-compatible",
        role: "planner",
        output: "",
        error: "missing_OPENAI_API_KEY",
      });
    } else {
      const planner = await callOpenAICompatible({
        baseUrl,
        apiKey,
        model: models[0],
        messages: [
          { role: "system", content: system },
          { role: "user", content: plannerPrompt },
        ],
        timeoutMs,
      });
      reports.push({ model: models[0], role: "planner", output: planner });

      const criticPrompt = [
        goalLine,
        "Task: critique the revised prompt and propose an improved final prompt.",
        "Keep the final prompt as one paragraph.",
        `Planner output:\n${planner}`,
        "Output format:",
        "CRITIQUE:",
        "- ...",
        "FINAL_PROMPT:",
        "<single prompt string>",
      ].filter(Boolean).join("\n\n");

      const criticModels = models.slice(0, 3);
      const criticResults = await Promise.all(
        criticModels.map(async (m): Promise<ModelReport> => {
          try {
            const out = await callOpenAICompatible({
              baseUrl,
              apiKey,
              model: m,
              messages: [
                { role: "system", content: system },
                { role: "user", content: criticPrompt },
              ],
              timeoutMs,
            });
            return { model: m, role: "critic", output: out };
          } catch (e) {
            return { model: m, role: "critic", output: "", error: e instanceof Error ? e.message : "critic_failed" };
          }
        }),
      );
      reports.push(...criticResults);
    }

    if (includeOpenClaw) {
      const url = (process.env.OPENCLAW_OPENRESPONSES_URL || "http://127.0.0.1:18789/v1/responses").trim();
      const token = (process.env.OPENCLAW_GATEWAY_TOKEN || "").trim();
      const agentId = (process.env.OPENCLAW_AGENT_ID || "main").trim() || "main";
      if (!token) {
        reports.push({ model: `openclaw:${agentId}`, role: "critic", output: "", error: "missing_OPENCLAW_GATEWAY_TOKEN" });
      } else {
        try {
          const out = await callOpenClawOpenResponses({
            url,
            token,
            agentId,
            input: `Critique and improve this image prompt for ForeverTeck Studio.\n\n${prompt}\n\nReturn ONLY the final improved prompt.`,
            timeoutMs,
          });
          reports.push({ model: `openclaw:${agentId}`, role: "critic", output: out });
        } catch (e) {
          reports.push({ model: `openclaw:${agentId}`, role: "critic", output: "", error: e instanceof Error ? e.message : "openclaw_failed" });
        }
      }
    }

    const candidates = reports
      .map((r) => r.output)
      .filter((s) => typeof s === "string" && s.trim().length > 0);

    const optimizedPrompt = candidates.length ? candidates[candidates.length - 1].trim() : prompt;
    const durationMs = Date.now() - t0;
    logInfo("cross_agent.success", { requestId, durationMs, reports: reports.length });

    return ok({ requestId, optimizedPrompt, reports, durationMs });
  } catch (e) {
    const durationMs = Date.now() - t0;
    logError("cross_agent.failed", { requestId, durationMs, error: e instanceof Error ? e.message : "unknown_error" });
    return fail("cross_agent_failed", 500);
  }
}

