import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../image/route";

function makeReq(body: unknown, headers: Record<string, string> = {}) {
  return new NextRequest("http://localhost/api/generate/image", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("image route", () => {
  it("rejects invalid input", async () => {
    const res = await POST(makeReq({}));
    expect(res.status).toBe(400);
  });
  it("generates with mock provider", async () => {
    const res = await POST(makeReq({ prompt: "hello", platform: "twitter", provider: "mock" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.success).toBe(true);
    expect(data.data.image_url).toContain("data:image/svg+xml");
  });
});
