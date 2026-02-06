type TokenSource = 'oauth2' | 'api_key' | 'jwt';

export interface AuthConfig {
  source: TokenSource;
  apiKeyEnv?: string;
  jwtSecretEnv?: string;
  oauthTokenUrl?: string;
  oauthClientIdEnv?: string;
  oauthClientSecretEnv?: string;
  scope?: string;
}

function getEnv(name?: string) {
  if (!name) return '';
  return process.env[name] || '';
}

function base64urlDecode(input: string) {
  input = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = input.length % 4;
  if (pad) input += '='.repeat(4 - pad);
  return Buffer.from(input, 'base64');
}

export async function getAuthHeader(config: AuthConfig): Promise<Record<string, string>> {
  if (config.source === 'api_key') {
    const key = getEnv(config.apiKeyEnv);
    if (!key) return {};
    return { Authorization: `ApiKey ${key}` };
  }
  if (config.source === 'oauth2') {
    const clientId = getEnv(config.oauthClientIdEnv);
    const clientSecret = getEnv(config.oauthClientSecretEnv);
    const tokenUrl = config.oauthTokenUrl || '';
    const scope = config.scope || '';
    if (!clientId || !clientSecret || !tokenUrl) return {};
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      scope,
    });
    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });
    if (!res.ok) return {};
    const json = await res.json();
    const token = json.access_token || '';
    if (!token) return {};
    return { Authorization: `Bearer ${token}` };
  }
  if (config.source === 'jwt') {
    const secret = getEnv(config.jwtSecretEnv);
    return secret ? { Authorization: `Bearer ${secret}` } : {};
  }
  return {};
}

import crypto from 'node:crypto';

export function verifyJwtHs256(token: string, secret: string) {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) return false;
    const data = `${h}.${p}`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(data)
      .digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
    if (expected !== s) return false;
    const payload = JSON.parse(base64urlDecode(p).toString('utf8'));
    if (payload.exp && Date.now() / 1000 > payload.exp) return false;
    return true;
  } catch {
    return false;
  }
}
