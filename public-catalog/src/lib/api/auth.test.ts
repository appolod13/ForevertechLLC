import { describe, it, expect } from "vitest";
import { getApiKey, validateApiKey } from "./auth";

describe("auth", () => {
  it("extracts bearer token", () => {
    const h = new Headers({ authorization: "Bearer abc" });
    expect(getApiKey(h)).toBe("abc");
  });
  it("extracts x-api-key", () => {
    const h = new Headers({ "x-api-key": "xyz" });
    expect(getApiKey(h)).toBe("xyz");
  });
  it("validation passes if no env", () => {
    const prev = process.env.PUBLIC_CATALOG_API_KEY;
    delete process.env.PUBLIC_CATALOG_API_KEY;
    expect(validateApiKey("anything")).toBe(true);
    process.env.PUBLIC_CATALOG_API_KEY = prev;
  });
});
