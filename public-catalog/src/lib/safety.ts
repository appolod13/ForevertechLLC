export function filterPII(input: string) {
  let out = input;
  out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[REDACTED_EMAIL]');
  out = out.replace(/\b(\+?\d{1,3}[\s-]?)?(\(?\d{3}\)?[\s-]?)?\d{3}[\s-]?\d{4}\b/g, '[REDACTED_PHONE]');
  out = out.replace(/\b\d{1,3}\s+\w+\s+(Street|St|Avenue|Ave|Road|Rd|Boulevard|Blvd)\b/gi, '[REDACTED_ADDRESS]');
  return out;
}

export function ensureSafePrompt(prompt: string) {
  const sanitized = prompt.replace(/<[^>]*>/g, '').slice(0, 1000);
  return filterPII(sanitized);
}

export function safeMetadata(meta: Record<string, unknown>) {
  const clean: Record<string, unknown> = {};
  for (const k of Object.keys(meta || {})) {
    const v = meta[k];
    if (typeof v === 'string') clean[k] = filterPII(v);
    else clean[k] = v;
  }
  return clean;
}
