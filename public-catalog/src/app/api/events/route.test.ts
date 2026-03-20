import { describe, it, expect } from "vitest";
import { GET } from "./route";

describe("events route", () => {
  it("returns an event-stream response", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type") || "").toContain("text/event-stream");
    expect(res.headers.get("cache-control") || "").toContain("no-store");
  });
});

