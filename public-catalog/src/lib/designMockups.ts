import crypto from 'crypto';

export type PrintifyMockupsStatus = 'pending' | 'generating' | 'ready' | 'error';

export type PrintifyMockups = {
  status: PrintifyMockupsStatus;
  frontUrl?: string;
  backUrl?: string;
  leftUrl?: string;
  rightUrl?: string;
};

export function computeDesignHash(params: { imageUrl: string; prompt?: string | null }) {
  const imageUrl = String(params.imageUrl || '').trim();
  const prompt = typeof params.prompt === 'string' ? params.prompt.trim() : '';
  return crypto.createHash('sha256').update(`${imageUrl}\n${prompt}`, 'utf8').digest('hex');
}
