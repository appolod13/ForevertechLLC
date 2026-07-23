export function buildPlatformLoginUrl(platform: string, userId: string): string {
  if (platform === 'reddit' && userId.trim()) {
    return `/api/auth/reddit/login?userId=${encodeURIComponent(userId.trim())}`;
  }
  return `/api/auth/${platform}/login`;
}
