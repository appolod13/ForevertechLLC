import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { uploadToIpfs } from "./upload";

describe("uploadToIpfs", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("returns disabled when IPFS_API_URL is not set", async () => {
    delete process.env.IPFS_API_URL;
    const res = await uploadToIpfs({ imageUrl: "data:image/png;base64,AAAA" });
    expect(res.status).toBe("disabled");
  });

  it("uploads a data URL and returns ipfs:// cid", async () => {
    process.env.IPFS_API_URL = "http://ipfs.test";
    process.env.IPFS_GATEWAY_BASE = "https://gateway.test/ipfs";

    const fetchMock = vi.fn();
    global.fetch = fetchMock as unknown as typeof fetch;

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ Name: "file", Hash: "QmCid", Size: "1" }),
    });

    const res = await uploadToIpfs({ imageUrl: "data:image/png;base64,AAAA", filename: "x.png" });
    expect(res.status).toBe("uploaded");
    if (res.status === "uploaded") {
      expect(res.ipfsUrl).toBe("ipfs://QmCid");
      expect(res.gatewayUrl).toBe("https://gateway.test/ipfs/QmCid");
    }
  });
});

