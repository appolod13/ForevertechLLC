export type ApiSuccess<T> = { success: true; data: T };
export type ApiError = { success: false; error: string; details?: unknown };

export function ok<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify({ success: true, data } satisfies ApiSuccess<T>), {
    status,
    headers: { "content-type": "application/json" },
  });
}

export function fail(error: string, status = 400, details?: unknown): Response {
  return new Response(JSON.stringify({ success: false, error, details } satisfies ApiError), {
    status,
    headers: { "content-type": "application/json" },
  });
}
