import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./image/route";

describe("image route (direct)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("validates payload", async () => {
    const req = new NextRequest("http://localhost/api/generate/image", { method: "POST", body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
  it("generates image", async () => {
    const req = new NextRequest("http://localhost/api/generate/image", {
      method: "POST",
      body: JSON.stringify({ prompt: "test", platform: "twitter", provider: "mock" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.image_url).toContain("data:image");
  });

  it("passes fractal render params to fusion service", async () => {
    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          success: true,
          imageUrl: "/uploads/mock-fractal.png",
          meta: { provider: "fusion" },
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const req = new NextRequest("http://localhost/api/generate/image", {
      method: "POST",
      body: JSON.stringify({
        prompt: "ethereal quantum mandelbrot city",
        width: 512,
        height: 512,
        use_fractal_fusion: true,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit;
    const requestBody = JSON.parse(String(requestInit.body || "{}")) as Record<string, unknown>;
    expect(requestBody.render_params).toBeTypeOf("object");
    expect(Object.keys(requestBody.render_params as Record<string, unknown>).length).toBeGreaterThan(0);
    expect(requestBody).toHaveProperty("quality");
    expect(requestBody).toHaveProperty("iterations");
    expect(requestBody).toHaveProperty("palette_index");
    expect(requestBody).toHaveProperty("zoom_level");
  });
});
