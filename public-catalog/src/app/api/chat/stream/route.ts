import { subscribe, getMessages } from "../_state";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const encoder = new TextEncoder();
  const headers = new Headers();
  headers.set("content-type", "text/event-stream; charset=utf-8");
  headers.set("cache-control", "no-store");
  headers.set("connection", "keep-alive");

  let isClosed = false;
  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (event: string, data: unknown) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ${event}\n`));
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // ignore
        }
      };

      send("history", { messages: getMessages() });

      const unsub = subscribe((msg) => {
        send("message", msg);
      });

      const ping = setInterval(() => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: {}\n\n`));
        } catch (e) {
          // ignore
        }
      }, 15_000);

      cleanup = () => {
        isClosed = true;
        clearInterval(ping);
        unsub();
      };

      request.signal.addEventListener('abort', cleanup);
    },
    cancel() {
      cleanup();
    }
  });

  return new Response(stream, { headers });
}

