import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./image/route";

describe("image route (direct)", () => {
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
});
