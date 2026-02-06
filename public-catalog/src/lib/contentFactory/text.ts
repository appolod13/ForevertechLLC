import { filterPII } from '../safety';

type Platform = 'linkedin' | 'instagram' | 'twitter';

function seasonTag(date = new Date()) {
  const m = date.getMonth();
  if (m <= 1 || m === 11) return 'Winter';
  if (m >= 2 && m <= 4) return 'Spring';
  if (m >= 5 && m <= 7) return 'Summer';
  return 'Autumn';
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
  const autoTags = ['#AutoGen', '#SmartPost', '#DailyBoost'];
  const out = generateCaptions(base, platforms);
  for (const p of platforms) {
    out[p] = `${out[p]}\n${autoTags.join(' ')}`;
  }
  return out;
}
