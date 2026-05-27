import { filterPII } from '../safety';

type Platform = 'linkedin' | 'instagram' | 'twitter';

function seasonTag(date = new Date()) {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'Winter';
  if (m >= 2 && m <= 4) return 'Spring';
  if (m >= 5 && m <= 7) return 'Summer';
  return 'Autumn';
}

function extractHashtags(topic: string, maxTags: number) {
  const raw = filterPII(topic || '').trim();
  if (!raw) return [];

  const stop = new Set([
    'a','an','and','are','as','at','be','but','by','for','from','has','have','i','in','into','is','it','its','of','on','or','our','the','their','this','to','with','without','your',
    'shot','photo','image','render','rendered','high','quality','ultra','realistic','photoreal','photorealistic','cinematic','wide','establishing','scene','concept','art',
  ]);

  const tokens = raw
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, ' ')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => t.length >= 3 && t.length <= 20)
    .filter((t) => !stop.has(t))
    .filter((t) => !/^\d+$/.test(t));

  const score = new Map<string, number>();
  for (const t of tokens) score.set(t, (score.get(t) || 0) + 1);
  const ranked = [...score.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t);

  const out: string[] = [];
  for (const t of ranked) {
    if (out.length >= maxTags) break;
    const tag = `#${t.replace(/-/g, '')}`;
    if (tag.length < 4 || tag.length > 24) continue;
    if (!out.includes(tag)) out.push(tag);
  }
  return out;
}

function fitTwitter(text: string) {
  const t = text.trim();
  if (t.length <= 280) return t;
  return `${t.slice(0, 277).trimEnd()}…`;
}

export function generateCaptions(topic: string, platforms: Platform[]) {
  const season = seasonTag();
  const base = filterPII(topic.trim());
  const out: Record<Platform, string> = {} as Record<Platform, string>;
  for (const p of platforms) {
    if (p === 'linkedin') {
      out[p] = `${base}.\n\n${season} insights for professionals.\n\n#Leadership #Innovation #${season}`;
    } else if (p === 'instagram') {
      out[p] = `✨ ${base} ✨\n${season} vibes. Tap to save.\n\n#${season} #Inspo #DailyPost`;
    } else if (p === 'twitter') {
      out[p] = `${base} • ${season} trends\n#${season} #Tech`;
    }
  }
  return out;
}

export function generateAutoSocialCaptions(topic: string, platforms: Platform[]) {
  const base = filterPII(topic.trim());
  const inferred = extractHashtags(base, 6);
  const autoTags = ['#AutoGen', '#SmartPost', '#DailyBoost', ...inferred];
  const out = generateCaptions(base, platforms);
  for (const p of platforms) {
    const merged = `${out[p]}\n${autoTags.join(' ')}`.trim();
    out[p] = p === 'twitter' ? fitTwitter(merged) : merged;
  }
  return out;
}
