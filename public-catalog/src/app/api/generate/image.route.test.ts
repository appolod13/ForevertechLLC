import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./image/route";

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
    const fetchMock = vi.fn(async () => {
      return {
        ok: true,
        json: async () => ({ success: true, imageUrl: "/uploads/test.png", meta: { provider: "fusion" } }),
      } as any;
    });
    globalThis.fetch = fetchMock as any;

    const req = makeReq({ prompt: "peaceful ocean", width: 512, height: 512 });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(typeof json.image_url === "string" || typeof json.imageUrl === "string").toBe(true);
    const calledBody = JSON.parse((fetchMock.mock.calls[0]?.[1] as any).body);
    expect(calledBody.palette_profile).toBe("peaceful");
  });
});
