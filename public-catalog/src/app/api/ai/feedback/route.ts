import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

type FeedbackType = 'like' | 'dislike';

type FeedbackEvent = {
  id: string;
  timestamp: number;
  imageId: string;
  type: FeedbackType;
  prompt?: string;
  mediaUrl?: string;
};

type PromptStats = {
  prompt: string;
  likes: number;
  dislikes: number;
  lastAt: number;
};

type ImageStats = {
  imageId: string;
  likes: number;
  dislikes: number;
  lastAt: number;
};

type Store = {
  events: FeedbackEvent[];
  totals: { likes: number; dislikes: number };
  byPrompt: Record<string, PromptStats>;
  byImage: Record<string, ImageStats>;
};

function getStore(): Store {
  const g = globalThis as unknown as { __ftFeedbackStore?: Store };
  if (!g.__ftFeedbackStore) {
    g.__ftFeedbackStore = {
      events: [],
      totals: { likes: 0, dislikes: 0 },
      byPrompt: {},
      byImage: {},
    };
  }
  return g.__ftFeedbackStore;
}

function clamp01(n: number) {
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

function safeString(v: unknown) {
  return typeof v === 'string' ? v.trim() : '';
}

function computeMetrics(totals: { likes: number; dislikes: number }) {
  const total = totals.likes + totals.dislikes;
  const likeRate = total > 0 ? totals.likes / total : 0;
  const confidence = clamp01(1 - Math.exp(-total / 60));
  const preferenceStrength = clamp01(Math.abs(likeRate - 0.5) * 2);
  const learningDegree = clamp01((0.55 * confidence) + (0.45 * preferenceStrength));
  return { total, likeRate, confidence, preferenceStrength, learningDegree };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const imageId = safeString((body as Record<string, unknown>).imageId);
    const type = safeString((body as Record<string, unknown>).type) as FeedbackType;
    const prompt = safeString((body as Record<string, unknown>).prompt);
    const mediaUrl = safeString((body as Record<string, unknown>).mediaUrl);

    if (!imageId) {
      return NextResponse.json({ success: false, error: 'missing_imageId' }, { status: 400 });
    }
    if (type !== 'like' && type !== 'dislike') {
      return NextResponse.json({ success: false, error: 'invalid_type' }, { status: 400 });
    }

    const store = getStore();
    const now = Date.now();
    const ev: FeedbackEvent = {
      id: `fb_${now}_${Math.random().toString(36).slice(2, 10)}`,
      timestamp: now,
      imageId,
      type,
      ...(prompt ? { prompt } : {}),
      ...(mediaUrl ? { mediaUrl } : {}),
    };
    store.events.unshift(ev);
    store.events = store.events.slice(0, 2000);

    if (type === 'like') store.totals.likes += 1;
    else store.totals.dislikes += 1;

    const img = store.byImage[imageId] || { imageId, likes: 0, dislikes: 0, lastAt: now };
    if (type === 'like') img.likes += 1;
    else img.dislikes += 1;
    img.lastAt = now;
    store.byImage[imageId] = img;

    if (prompt) {
      const key = prompt.toLowerCase().slice(0, 240);
      const ps = store.byPrompt[key] || { prompt, likes: 0, dislikes: 0, lastAt: now };
      if (type === 'like') ps.likes += 1;
      else ps.dislikes += 1;
      ps.lastAt = now;
      store.byPrompt[key] = ps;
    }

    const metrics = computeMetrics(store.totals);

    return NextResponse.json({
      success: true,
      stored: ev,
      totals: store.totals,
      metrics,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'internal_error' }, { status: 500 });
  }
}

export async function GET() {
  const store = getStore();
  const metrics = computeMetrics(store.totals);

  const topImages = Object.values(store.byImage)
    .map((x) => ({ ...x, total: x.likes + x.dislikes, likeRate: (x.likes + x.dislikes) > 0 ? x.likes / (x.likes + x.dislikes) : 0 }))
    .sort((a, b) => (b.total - a.total) || (b.lastAt - a.lastAt))
    .slice(0, 10);

  const topPrompts = Object.values(store.byPrompt)
    .map((x) => ({ ...x, total: x.likes + x.dislikes, likeRate: (x.likes + x.dislikes) > 0 ? x.likes / (x.likes + x.dislikes) : 0 }))
    .sort((a, b) => (b.total - a.total) || (b.lastAt - a.lastAt))
    .slice(0, 10);

  const recent = store.events.slice(0, 30);

  return NextResponse.json({
    success: true,
    totals: store.totals,
    metrics,
    topImages,
    topPrompts,
    recent,
    explanation: {
      signal: 'Likes are treated as positive reinforcement signals; dislikes are treated as negative signals.',
      learning: 'As votes accumulate, confidence increases and the system can bias future generations toward what users prefer.',
      learningDegree: 'Learning Degree combines signal confidence (more data) + preference strength (clearer preference).',
    },
  });
}
