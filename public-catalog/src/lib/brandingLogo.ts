export const BRANDING_LOGO_STORAGE_KEY = 'foreverteck.branding.logoUrl';

export function getStoredBrandingLogoUrl() {
  if (typeof window === 'undefined') return '';
  try {
    const raw = localStorage.getItem(BRANDING_LOGO_STORAGE_KEY) || '';
    return raw.trim();
  } catch {
    return '';
  }
}

export function setStoredBrandingLogoUrl(url: string) {
  if (typeof window === 'undefined') return '';
  const normalized = String(url || '').trim();
  try {
    if (!normalized) {
      localStorage.removeItem(BRANDING_LOGO_STORAGE_KEY);
      return '';
    }
    localStorage.setItem(BRANDING_LOGO_STORAGE_KEY, normalized);
    return normalized;
  } catch {
    return normalized;
  }
}

export function clearStoredBrandingLogoUrl() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(BRANDING_LOGO_STORAGE_KEY);
  } catch {
  }
}

export function withBrandingLogo<T extends Record<string, unknown>>(metadata: T) {
  const logoUrl = getStoredBrandingLogoUrl();
  if (!logoUrl) return metadata;
  return {
    ...metadata,
    logoUrl,
  };
}
