export type CreatorTier = 'free' | 'premium_creator';

export type UserAccessLike = {
  id?: string;
  premiumCreator?: boolean;
};

export type StoredGenerationVia = 'free' | 'quantum_paid' | 'premium_creator';

export type StoredGenerationLike = {
  id: string;
  prompt: string;
  imageUrl: string;
  createdAt: string;
  storedVia: StoredGenerationVia;
};

export type CreatorAccess = {
  storageLimit: number;
  tier: CreatorTier;
  canResell: boolean;
  payoutRate: number;
  hasPremiumCreatorAccess: boolean;
};

export type QuantumSourceLinksInput = {
  id: string;
  metadata?: Record<string, unknown> | null;
};

const FREE_STORAGE_LIMIT = 5;

export function getCreatorAccess(user: UserAccessLike | null | undefined): CreatorAccess {
  if (user?.premiumCreator) {
    return {
      storageLimit: Number.POSITIVE_INFINITY,
      tier: 'premium_creator',
      canResell: true,
      payoutRate: 0.45,
      hasPremiumCreatorAccess: true,
    };
  }

  return {
    storageLimit: FREE_STORAGE_LIMIT,
    tier: 'free',
    canResell: false,
    payoutRate: 0,
    hasPremiumCreatorAccess: false,
  };
}

export function canStoreGeneration(
  existing: StoredGenerationLike[],
  options: { access: CreatorAccess; storedVia: StoredGenerationVia },
) {
  if (options.storedVia === 'quantum_paid' || options.storedVia === 'premium_creator') {
    return true;
  }

  return existing.length < options.access.storageLimit;
}

export function buildQuantumSourceLinks(input: QuantumSourceLinksInput) {
  const metadata = input.metadata || {};
  const provider = String(metadata.provider || '').trim().toLowerCase();
  const backend = String(metadata.backend || '').trim();
  const jobId = String(metadata.jobId || metadata.job_id || '').trim();

  const params = new URLSearchParams();
  if (backend) params.set('backend', backend);
  if (jobId) params.set('job', jobId);

  const suffix = params.toString();
  const externalSourceUrl = provider === 'ibm'
    ? `https://quantum.ibm.com/${suffix ? `?${suffix}` : ''}`
    : '';

  return {
    sourceRecordPath: `/pixelqrypt/source?record=${encodeURIComponent(input.id)}`,
    externalSourceUrl,
    externalSourceLabel: externalSourceUrl ? 'View IBM Quantum Reference' : 'View Source Reference',
  };
}

export const creatorAccessConstants = {
  FREE_STORAGE_LIMIT,
};
