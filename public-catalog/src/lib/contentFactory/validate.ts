type Platform = 'linkedin' | 'instagram' | 'twitter';
type Provider = 'mock' | 'dalle' | 'stablediffusion' | 'midjourney';
type Mode = 'full' | 'image_only';

export interface FactoryRequest {
  topic: string;
  platforms: Platform[];
  imageProvider: Provider;
  safetyEnabled: boolean;
  mode: Mode;
  texts?: Record<string, string>;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export interface FactoryOutputItem {
  platform: string;
  text_content: string;
  image_url: string;
  generation_metadata: Record<string, unknown>;
}

export function validateFactoryRequest(req: Partial<FactoryRequest>): ValidationResult {
  const errors: string[] = [];
  const allowedPlatforms: Platform[] = ['linkedin', 'instagram', 'twitter'];
  const allowedProviders: Provider[] = ['mock', 'dalle', 'stablediffusion', 'midjourney'];
  const allowedModes: Mode[] = ['full', 'image_only'];

  if (typeof req.topic !== 'string' || !req.topic.trim()) {
    errors.push('topic must be a non-empty string');
  } else if (req.topic.length > 512) {
    errors.push('topic length must be <= 512');
  }

  if (!Array.isArray(req.platforms) || req.platforms.length === 0) {
    errors.push('platforms must be a non-empty array');
  } else {
    const invalid = (req.platforms as Platform[]).filter(p => !allowedPlatforms.includes(p));
    if (invalid.length) errors.push(`invalid platforms: ${invalid.join(',')}`);
  }

  if (typeof req.imageProvider !== 'string' || !allowedProviders.includes(req.imageProvider as Provider)) {
    errors.push('imageProvider must be one of mock|dalle|stablediffusion|midjourney');
  }

  if (typeof req.safetyEnabled !== 'boolean') {
    errors.push('safetyEnabled must be a boolean');
  }

  if (typeof req.mode !== 'string' || !allowedModes.includes(req.mode as Mode)) {
    errors.push('mode must be one of full|image_only');
  }

  if (req.mode === 'image_only') {
    const texts = req.texts || {};
    const missing: string[] = [];
    for (const p of (req.platforms || []) as Platform[]) {
      if (typeof texts[p] !== 'string' || !texts[p]?.trim()) missing.push(p);
    }
    if (missing.length) errors.push(`texts missing for platforms: ${missing.join(',')}`);
  }

  return { valid: errors.length === 0, errors };
}

export function validateFactoryOutput(items: FactoryOutputItem[]): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(items)) {
    errors.push('items must be an array');
  } else {
    items.forEach((it, i) => {
      if (typeof it.platform !== 'string') errors.push(`items[${i}].platform missing`);
      if (typeof it.text_content !== 'string') errors.push(`items[${i}].text_content missing`);
      if (typeof it.image_url !== 'string') errors.push(`items[${i}].image_url missing`);
      if (typeof it.generation_metadata !== 'object') errors.push(`items[${i}].generation_metadata missing`);
    });
  }
  return { valid: errors.length === 0, errors };
}
