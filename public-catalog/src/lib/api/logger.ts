export type LogEntry =
  | { level: "info"; msg: string; meta?: Record<string, unknown>; time: string }
  | { level: "error"; msg: string; error?: unknown; time: string };

const logs: LogEntry[] = [];

export function logInfo(msg: string, meta?: Record<string, unknown>) {
  const entry: LogEntry = { level: "info", msg, meta, time: new Date().toISOString() };
  logs.push(entry);
  // eslint-disable-next-line no-console
  console.log("[api]", msg, meta || "");
}

export function logError(msg: string, error?: unknown) {
  const entry: LogEntry = { level: "error", msg, error, time: new Date().toISOString() };
  logs.push(entry);
  // eslint-disable-next-line no-console
  console.error("[api]", msg, error || "");
}

export function recentLogs(limit = 100): LogEntry[] {
  return logs.slice(-limit);
}
