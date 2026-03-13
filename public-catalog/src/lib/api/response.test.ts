import { describe, it, expect } from "vitest";
import { ok, fail } from "./response";

describe("response helpers", () => {
  it("ok returns success json", async () => {
    const res = ok({ x: 1 });
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.data.x).toBe(1);
  });
  it("fail returns error json", async () => {
    const res = fail("bad", 400);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.success).toBe(false);
    expect(json.error).toBe("bad");
  });
});
