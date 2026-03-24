const http = require("http");

const port = Number(process.env.PORT || 3000);

function json(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(payload),
  });
  res.end(payload);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url || "/", "http://localhost");

  if (url.pathname === "/health") {
    return json(res, 200, { ok: true });
  }

  if (url.pathname === "/") {
    return json(res, 200, { ok: true, service: "web-app", message: "ForeverTeck API gateway is running." });
  }

  if (url.pathname === "/v1/info") {
    return json(res, 200, {
      ok: true,
      env: {
        cfVersionId: process.env.CF_VERSION_ID ? "set" : "unset",
        cfClientId: process.env.CF_CLIENT_ID ? "set" : "unset",
        cfApiToken: process.env.CF_API_TOKEN ? "set" : "unset",
      },
    });
  }

  return json(res, 404, { ok: false, error: "not_found" });
});

server.listen(port, "0.0.0.0", () => {
  process.stdout.write(`Web app listening at http://0.0.0.0:${port}\n`);
});

process.on("SIGTERM", () => {
  process.stdout.write("SIGTERM signal received: closing HTTP server\n");
  server.close(() => {
    process.stdout.write("HTTP server closed\n");
    process.exit(0);
  });
});

