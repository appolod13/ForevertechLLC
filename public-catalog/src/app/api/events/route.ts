import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const encoder = new TextEncoder();

  let isClosed = false;
  const stream = new ReadableStream({
    async start(controller) {
      // Send initial connection message
      controller.enqueue(encoder.encode('event: connected\ndata: {"status":"connected"}\n\n'));

      // Keep connection alive with periodic pings
      const interval = setInterval(() => {
        if (isClosed) {
          clearInterval(interval);
          return;
        }
        try {
          controller.enqueue(encoder.encode('event: ping\ndata: {"ping":true}\n\n'));
        } catch (_) {
          isClosed = true;
          clearInterval(interval);
        }
      }, 15000);

      // Handle stream close
      request.signal.addEventListener('abort', () => {
        isClosed = true;
        clearInterval(interval);
      });
    },
    cancel() {
      isClosed = true;
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
