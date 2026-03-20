import { NextRequest } from 'next/server';
import { filterPII, ensureSafePrompt, safeMetadata } from '@/lib/safety';
import { generateCaptions, generateAutoSocialCaptions } from '@/lib/contentFactory/text';
import { generateImageForPlatform } from '@/lib/contentFactory/image';
import { validateFactoryRequest, validateFactoryOutput } from '@/lib/contentFactory/validate';
import { addLog, getLogs } from '@/lib/logging';

type Platform = 'linkedin' | 'instagram' | 'twitter';
type Provider = 'mock' | 'dalle' | 'stablediffusion' | 'midjourney';

type GeneratedImage = {
  image_url: string;
  meta?: Record<string, unknown>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asGeneratedImage(value: unknown): GeneratedImage {
  if (!isRecord(value) || typeof value.image_url !== 'string') {
    throw new Error('invalid_image_generation_response');
  }
  const meta = isRecord(value.meta) ? value.meta : undefined;
  return { image_url: value.image_url, meta };
}

let generatedStore: Array<{
  platform: Platform;
  text_content: string;
  image_url: string;
  generation_metadata: Record<string, unknown>;
}> = [];

export async function GET() {
  return Response.json({ success: true, items: generatedStore, logs: getLogs() });
}

export async function POST(req: NextRequest) {
  try {
    const t0 = Date.now();
    const body = await req.json();
    addLog({ stage: 'validate_input', input: body });

    const validation = validateFactoryRequest(body);
    if (!validation.valid) {
      addLog({ stage: 'failed', error: { message: 'validation-error', context: { errors: validation.errors } } });
      return Response.json({ success: false, error: 'validation-error', details: validation.errors }, { status: 400 });
    }

    const topic: string = String(body.topic || '');
    const platforms: Platform[] = Array.isArray(body.platforms) && body.platforms.length ? body.platforms : ['linkedin', 'instagram', 'twitter'];
    const provider: Provider = (body.imageProvider || 'mock') as Provider;
    const safetyEnabled: boolean = Boolean(body.safetyEnabled ?? true);
    const autoSocialEnabled: boolean = Boolean(body.autoSocialEnabled ?? false);
    const mode: 'full' | 'image_only' = (body.mode || 'full') as 'full' | 'image_only';

    const safeTopic = safetyEnabled ? ensureSafePrompt(topic) : topic;
    const captions: Partial<Record<Platform, string>> =
      mode === 'image_only'
        ? {}
        : autoSocialEnabled
        ? generateAutoSocialCaptions(safeTopic, platforms)
        : generateCaptions(safeTopic, platforms);

    const results: Array<{
      platform: Platform;
      text_content: string;
      image_url: string;
      generation_metadata: Record<string, unknown>;
    }> = [];

    addLog({ stage: 'processing', input: { topic: safeTopic, platforms, provider, mode } });

    for (const p of platforms) {
      const text = mode === 'image_only'
        ? filterPII(String(body.texts?.[p] || ''))
        : String(captions[p] || '');
      // Basic timeout guard for image generation
      const raced = await Promise.race([
        generateImageForPlatform(provider, safeTopic, p),
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 8000))
      ]);
      const img = asGeneratedImage(raced);
      const meta = safeMetadata({
        provider,
        platform: p,
        prompt: safeTopic,
        image: img.meta,
        safety: safetyEnabled,
        auto_social_enabled: autoSocialEnabled,
        timestamp: new Date().toISOString(),
      });
      results.push({
        platform: p,
        text_content: text,
        image_url: img.image_url,
        generation_metadata: meta,
      });
    }

    const outValidation = validateFactoryOutput(results);
    if (!outValidation.valid) {
      addLog({ stage: 'failed', error: { message: 'output-validation-error', context: { errors: outValidation.errors } } });
      return Response.json({ success: false, error: 'output-validation-error', details: outValidation.errors }, { status: 500 });
    }

    generatedStore = [...results, ...generatedStore].slice(0, 50);
    const duration = Date.now() - t0;
    addLog({ stage: 'validate_output', output: { items: results }, durationMs: duration });
    addLog({ stage: 'completed', durationMs: duration });
    return Response.json({ success: true, items: results });
  } catch (e: unknown) {
    const err = e as Error;
    addLog({ stage: 'failed', error: { message: err.message || 'content-factory-error', stack: err.stack } });
    return Response.json({ success: false, error: 'content-factory-error' }, { status: 400 });
  }
}
