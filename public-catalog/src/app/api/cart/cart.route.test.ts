import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";

describe("/api/cart", () => {
  it("requires deviceId", async () => {
    const req = new NextRequest("http://localhost/api/cart");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns empty cart", async () => {
    const req = new NextRequest("http://localhost/api/cart?deviceId=d1");
    const res = await GET(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(Array.isArray(json.data.items)).toBe(true);
  });
});

