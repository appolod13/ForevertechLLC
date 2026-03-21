import { NextRequest } from "next/server";

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};

function isEnabled(value: string | undefined): boolean {
  if (!value) return false;
  const v = value.trim().toLowerCase();
  return v === "1" || v === "true" || v === "on" || v === "enabled";
}

function maintenanceHtml(params: { title: string; message: string }) {
  const safeTitle = params.title.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const safeMessage = params.message.replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      body { margin:0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial; background:#050607; color:#e5e7eb; }
      .wrap { min-height: 100vh; display:flex; align-items:center; justify-content:center; padding: 24px; }
      .card { max-width: 720px; width: 100%; border: 1px solid #27272a; background: rgba(9,9,11,0.6); border-radius: 18px; padding: 28px; }
      h1 { margin: 0 0 8px; font-size: 26px; }
      p { margin: 0; color: #a1a1aa; line-height: 1.5; }
      .meta { margin-top: 18px; font-size: 12px; color:#71717a; }
      .pill { display:inline-block; padding: 4px 10px; border-radius: 999px; border: 1px solid #3f3f46; color:#d4d4d8; margin-right: 8px; }
      a { color:#93c5fd; }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="pill">Maintenance</div><div class="pill">503</div>
        <h1>${safeTitle}</h1>
        <p>${safeMessage}</p>
        <div class="meta">If you are the site owner, set MAINTENANCE_MODE=0 and redeploy to restore service.</div>
      </div>
    </div>
  </body>
</html>`;
}

export function middleware(req: NextRequest) {
  const enabled = isEnabled(process.env.MAINTENANCE_MODE);
  if (!enabled) return;

  const pathname = req.nextUrl.pathname;
  const isApi = pathname.startsWith("/api/");
  const retryAfterSeconds = "600";

  if (isApi) {
    return Response.json(
      { success: false, error: "maintenance", message: "Service temporarily unavailable due to maintenance." },
      {
        status: 503,
        headers: {
          "cache-control": "no-store",
          "retry-after": retryAfterSeconds,
        },
      },
    );
  }

  const html = maintenanceHtml({
    title: "ForeverTeck is undergoing maintenance",
    message: "We’re applying updates. Please check back shortly.",
  });

  return new Response(html, {
    status: 503,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
      "retry-after": retryAfterSeconds,
    },
  });
}

