import { NextRequest } from 'next/server';
import { getLogs } from '@/lib/logging';

export const runtime = 'nodejs';

export async function GET(_req: NextRequest) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const write = (data: string) => controller.enqueue(encoder.encode(data));
      write('retry: 3000\n');
      const tick = () => {
        const payload = JSON.stringify({ logs: getLogs().slice(0, 20), ts: Date.now() });
        write(`data: ${payload}\n\n`);
      };
      tick();
      const id = setInterval(tick, 3000);
      const close = () => {
        clearInterval(id);
        controller.close();
      };
      // @ts-expect-error missing oncancel in DOM stream controller types
      controller.oncancel = close;
    },
  });
  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
    },
  });
}
