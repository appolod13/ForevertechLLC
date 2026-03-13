import os from "os";

export async function GET() {
  const startedAt = process.env.APP_STARTED_AT
    ? Number(process.env.APP_STARTED_AT)
    : Date.now();
  const uptimeSec = Math.round(process.uptime());
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
      port: 3002,
      dependencies: {
        database: "not-configured",
      },
    },
    startedAt,
  };
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
