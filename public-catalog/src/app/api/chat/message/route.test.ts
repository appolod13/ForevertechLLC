import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

describe("chat message route", () => {
  it("rejects empty payload", async () => {
    const req = new NextRequest("http://localhost/api/chat/message", { method: "POST", body: JSON.stringify({}) });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("accepts a message", async () => {
    const req = new NextRequest("http://localhost/api/chat/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ user: "u", text: "hello" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.message.text).toBe("hello");
  });
});

