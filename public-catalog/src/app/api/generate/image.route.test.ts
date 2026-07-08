import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./image/route";

type JsonResponseMock = {
  ok: boolean;
  json: () => Promise<Record<string, unknown>>;
};

describe("image route (direct)", () => {
  const originalFetch = globalThis.fetch;
  function makeReq(body: unknown) {
    return new NextRequest("http://localhost/api/generate/image", { method: "POST", body: JSON.stringify(body) });
  }

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("validates payload", async () => {
    const req = makeReq({});
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it("generates image", async () => {
    const fetchMock = vi.fn<() => Promise<JsonResponseMock>>(async () => {
      return {
        ok: true,
        json: async () => ({ success: true, imageUrl: "/uploads/test.png", meta: { provider: "fusion" } }),
      };
    });
    globalThis.fetch = fetchMock as typeof fetch;

    const req = makeReq({ prompt: "peaceful ocean", width: 512, height: 512 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.image_url === "string" || typeof json.imageUrl === "string").toBe(true);
    expect(String(json.image_url || json.imageUrl)).toMatch(/^\/api\/fusion-image\?path=/);
    const calledBody = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body || "{}")) as Record<string, unknown>;
    expect(calledBody.palette_profile).toBe("peaceful");
    expect(calledBody.story_mode).toBeDefined();
    expect(calledBody.mandelbrot_weight).toBeLessThanOrEqual(0.18);
    expect(calledBody.brightness_floor).toBeGreaterThanOrEqual(0.2);
    expect(json.meta?.narrative_settings?.story_mode).toBe(calledBody.story_mode);
  });

  it("retries fusion generation without narrative fields when upstream rejects them", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: async () => ({ detail: "validation error" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, imageUrl: "/uploads/test.png", meta: { provider: "fusion" } }),
      });

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const req = new NextRequest("http://localhost/api/generate/image", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt: "retry test", width: 512, height: 512 }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(String(json.image_url || json.imageUrl)).toMatch(/^\/api\/fusion-image\?path=/);

    const firstBody = JSON.parse(String((fetchMock.mock.calls[0]?.[1] as RequestInit | undefined)?.body || "{}")) as Record<string, unknown>;
    const secondBody = JSON.parse(String((fetchMock.mock.calls[1]?.[1] as RequestInit | undefined)?.body || "{}")) as Record<string, unknown>;

    expect(firstBody.story_mode).toBeDefined();
    expect(secondBody.story_mode).toBeUndefined();
  });
});
