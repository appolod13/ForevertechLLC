import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function req(body: unknown) {
  return new NextRequest("http://localhost/api/agents/cross-optimize", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

describe("cross-optimize route", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects missing prompt", async () => {
    const res = await POST(req({}));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
  });

  it("returns optimized prompt from model outputs", async () => {
    process.env.OPENAI_API_KEY = "test";
    process.env.OPENAI_BASE_URL = "http://example.test";
    process.env.CROSS_AGENT_MODELS = "m1,m2";

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "IMPROVEMENTS:\n- x\n\nREVISED_PROMPT:\nA" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "CRITIQUE:\n- y\n\nFINAL_PROMPT:\nB" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "CRITIQUE:\n- z\n\nFINAL_PROMPT:\nC" } }] }),
      });

    const res = await POST(req({ prompt: "p" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.optimizedPrompt).toBe("CRITIQUE:\n- z\n\nFINAL_PROMPT:\nC");
    expect(Array.isArray(json.data.reports)).toBe(true);
  });

  it("includes openclaw error when enabled without token", async () => {
    process.env.OPENAI_API_KEY = "test";
    process.env.OPENAI_BASE_URL = "http://example.test";

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "IMPROVEMENTS:\n- x\n\nREVISED_PROMPT:\nA" } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ choices: [{ message: { content: "CRITIQUE:\n- y\n\nFINAL_PROMPT:\nB" } }] }),
      });

    const res = await POST(req({ prompt: "p", includeOpenClaw: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    const reports = json.data.reports as Array<{ model: string; error?: string }>;
    expect(reports.some((r) => r.model.startsWith("openclaw:") && r.error === "missing_OPENCLAW_GATEWAY_TOKEN")).toBe(true);
  });
});
