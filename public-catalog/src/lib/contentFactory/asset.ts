type Provider = "mock" | "local";

export interface AssetRequest {
  provider: Provider;
  type: "thumbnail" | "sprite" | "bundle";
  prompt?: string;
}

export async function generateAsset(req: AssetRequest) {
  const id = Math.random().toString(36).slice(2);
  const url = `/assets/generated/${req.type}/${id}.json`;
  const meta = { provider: req.provider, type: req.type, id, prompt: req.prompt || "" };
  return { asset_url: url, meta };
}
