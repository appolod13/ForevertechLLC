export type SyncModel = 'push' | 'pull';

export interface PullRequest {
  service: string;
  resource: string;
  params?: Record<string, string>;
}

export interface PushRequest {
  service: string;
  resource: string;
  data: unknown;
}

export function validatePull(req: unknown): req is PullRequest {
  if (!req || typeof req !== 'object') return false;
  const r = req as Record<string, unknown>;
  if (typeof r.service !== 'string') return false;
  if (typeof r.resource !== 'string') return false;
  if (r.params && typeof r.params !== 'object') return false;
  return true;
}

export function validatePush(req: unknown): req is PushRequest {
  if (!req || typeof req !== 'object') return false;
  const r = req as Record<string, unknown>;
  if (typeof r.service !== 'string') return false;
  if (typeof r.resource !== 'string') return false;
  return true;
}

export function buildUrl(base: string, resource: string, params?: Record<string, string>) {
  const u = new URL(resource, base);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      u.searchParams.set(k, v);
    }
  }
  return u.toString();
}
