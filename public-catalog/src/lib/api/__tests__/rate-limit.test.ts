import { describe, it, expect } from "vitest";
import { consume } from "../rate-limit";

describe("rate-limit", () => {
  it("allows within window", () => {
    const res1 = consume("key", { windowMs: 1000, max: 2 });
    const res2 = consume("key", { windowMs: 1000, max: 2 });
    expect(res1.allowed).toBe(true);
    expect(res2.allowed).toBe(true);
    const res3 = consume("key", { windowMs: 1000, max: 2 });
    expect(res3.allowed).toBe(false);
  });
});
