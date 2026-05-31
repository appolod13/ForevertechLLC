import os from "os";
import { getAiGeneratorsConfig } from "@/lib/aiGeneratorsConfig";

export async function GET() {
  const startedAt = process.env.APP_STARTED_AT
    ? Number(process.env.APP_STARTED_AT)
    : Date.now();
  const uptimeSec = Math.round(process.uptime());
  const env = process.env as Record<string, string | undefined>;
  const cfg = getAiGeneratorsConfig();
  const isLocalHost = (value: string) => {
    try {
      const u = new URL(value);
      const h = u.hostname.toLowerCase();
      return h === "localhost" || h === "127.0.0.1" || h === "::1";
    } catch {
      return false;
    }
  };
  const payload = {
    ok: true,
    time: new Date().toISOString(),
    uptimeSec,
    version: process.env.npm_package_version || "unknown",
    node: process.version,
    platform: process.platform,
    arch: process.arch,
    host: os.hostname(),
    env: {
      nodeEnv: process.env.NODE_ENV || "development",
    },
    checks: {
      port: 3001,
      dependencies: {
        database: "not-configured",
      },
      integrations: {
        stripe: {
          hasSecretKey: Boolean(env.STRIPE_SECRET_KEY),
          hasWebhookSecret: Boolean(env.STRIPE_WEBHOOK_SECRET),
        },
        printify: {
          hasApiToken: Boolean(env.PRINTIFY_API_TOKEN),
          hasShopId: Boolean(env.PRINTIFY_SHOP_ID),
          hasDefaultSku: Boolean(env.PRINTIFY_DEFAULT_SKU),
          hasSizeSkus: ["S", "M", "L", "XL", "XXL"].some(size => Boolean(env[`PRINTIFY_SKU_${size}`])),
        },
        generators: {
          quantum: {
            enabled: Boolean(cfg.quantum.enabled),
            internalConfigured: Boolean(cfg.quantum.internalBaseUrl),
            internalIsLocalhost: Boolean(cfg.quantum.internalBaseUrl && isLocalHost(cfg.quantum.internalBaseUrl)),
          },
          fusion: {
            enabled: Boolean(cfg.fusion.enabled),
            internalConfigured: Boolean(cfg.fusion.internalBaseUrl),
            internalIsLocalhost: Boolean(cfg.fusion.internalBaseUrl && isLocalHost(cfg.fusion.internalBaseUrl)),
          },
        },
      },
    },
    startedAt,
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
