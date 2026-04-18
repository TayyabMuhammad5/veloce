
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  let interval: NodeJS.Timeout;

  const stream = new ReadableStream({
    start(controller) {
      // Send an initial connection success message
      controller.enqueue('data: {"status": "connected"}\n\n');

      interval = setInterval(() => {
        controller.enqueue('data: {"refresh": true}\n\n');
      }, 5000);
    },
    cancel() {
      clearInterval(interval);
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}