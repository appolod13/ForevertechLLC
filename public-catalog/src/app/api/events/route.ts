export const runtime = "nodejs";

export async function GET() {
  const encoder = new TextEncoder();
  const headers = new Headers();
  headers.set("content-type", "text/event-stream; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("connection", "keep-alive");
  headers.set("access-control-allow-origin", "*");

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\n`));
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { ok: true, ts: Date.now() });

      const ping = setInterval(() => {
        send("ping", { ts: Date.now() });
      }, 15_000);

      // @ts-expect-error missing oncancel in DOM stream controller types
      controller.oncancel = () => {
        clearInterval(ping);
        controller.close();
      };
    },
  });

  return new Response(stream, { headers });
}

