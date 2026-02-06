export type LogStage =
  | 'validate_input'
  | 'processing'
  | 'validate_output'
  | 'completed'
  | 'failed'
  | 'auth'
  | 'sync'
  | 'retry'
  | 'monitor'
  | 'push'
  | 'pull';

export interface FactoryLogEntry {
  id: string;
  timestamp: number;
  stage: LogStage;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  durationMs?: number;
  error?: { message: string; stack?: string; context?: Record<string, unknown> };
}

const logs: FactoryLogEntry[] = [];

export function addLog(entry: Omit<FactoryLogEntry, 'id' | 'timestamp'>) {
  const id = Math.random().toString(36).slice(2);
  const ts = Date.now();
  const full = { id, timestamp: ts, ...entry };
  logs.unshift(full);
  if (logs.length > 200) logs.length = 200;
  return full;
}

export function getLogs() {
  return logs;
}
