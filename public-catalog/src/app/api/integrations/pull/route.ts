import { NextRequest } from 'next/server';
import { addLog } from '@/lib/logging';
import { fetchWithRetry } from '@/lib/integrations/http';
import { getAuthHeader } from '@/lib/integrations/auth';
import { validatePull, buildUrl } from '@/lib/integrations/transform';

type AuthSource = 'oauth2' | 'api_key' | 'jwt';

export async function POST(req: NextRequest) {
  const t0 = Date.now();
  try {
    const body = await req.json();
    addLog({ stage: 'validate_input', input: body });
    if (!validatePull(body)) {
      addLog({ stage: 'failed', error: { message: 'invalid-pull-request' } });
      return Response.json({ success: false, error: 'invalid-pull-request' }, { status: 400 });
    }
    const base = process.env[`${body.service.toUpperCase()}_BASE_URL`] || '';
    if (!base) {
      addLog({ stage: 'failed', error: { message: 'missing-service-base-url', context: { service: body.service } } });
      return Response.json({ success: false, error: 'missing-service-base-url' }, { status: 400 });
    }
    const authSource: AuthSource = (process.env[`${body.service.toUpperCase()}_AUTH_SOURCE`] as AuthSource) || 'api_key';
    const headers = await getAuthHeader({
      source: authSource,
      apiKeyEnv: `${body.service.toUpperCase()}_API_KEY`,
      jwtSecretEnv: `${body.service.toUpperCase()}_JWT_SECRET`,
      oauthTokenUrl: process.env[`${body.service.toUpperCase()}_OAUTH_TOKEN_URL`] || '',
      oauthClientIdEnv: `${body.service.toUpperCase()}_OAUTH_CLIENT_ID`,
      oauthClientSecretEnv: `${body.service.toUpperCase()}_OAUTH_CLIENT_SECRET`,
      scope: process.env[`${body.service.toUpperCase()}_OAUTH_SCOPE`] || '',
    });
    addLog({ stage: 'auth', input: { service: body.service, source: authSource } });
    const url = buildUrl(base, body.resource, body.params);
    addLog({ stage: 'pull', input: { url } });
    const data = await fetchWithRetry(url, { method: 'GET', headers }, { retries: 3, baseDelayMs: 250, timeoutMs: 8000 });
    const duration = Date.now() - t0;
    addLog({ stage: 'completed', durationMs: duration, output: { size: Array.isArray(data) ? data.length : 1 } });
    return Response.json({ success: true, data, durationMs: duration });
  } catch (e: unknown) {
    const err = e as Error;
    addLog({ stage: 'retry', error: { message: err.message } });
    return Response.json({ success: false, error: 'pull-failed' }, { status: 502 });
  }
}
