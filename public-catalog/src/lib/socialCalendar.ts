export type SocialCalendarDraft = {
  startDate: string;
  endDate: string;
  note: string;
};

export const SOCIAL_CALENDAR_STORAGE_KEY = 'foreverteck.socialCalendarDraft';

function formatDateForInput(value: Date) {
  return value.toISOString().slice(0, 10);
}

export function createDefaultSocialCalendarDraft(now = new Date()): SocialCalendarDraft {
  const start = new Date(now);
  const end = new Date(now);
  end.setDate(end.getDate() + 7);
  return {
    startDate: formatDateForInput(start),
    endDate: formatDateForInput(end),
    note: '',
  };
}

export function readSocialCalendarDraft(): SocialCalendarDraft {
  const fallback = createDefaultSocialCalendarDraft();
  if (typeof window === 'undefined') return fallback;

  try {
    const raw = window.localStorage.getItem(SOCIAL_CALENDAR_STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<SocialCalendarDraft> | null;
    return {
      startDate: typeof parsed?.startDate === 'string' && parsed.startDate.trim() ? parsed.startDate : fallback.startDate,
      endDate: typeof parsed?.endDate === 'string' && parsed.endDate.trim() ? parsed.endDate : fallback.endDate,
      note: typeof parsed?.note === 'string' ? parsed.note : '',
    };
  } catch {
    return fallback;
  }
}

export function writeSocialCalendarDraft(draft: SocialCalendarDraft) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(SOCIAL_CALENDAR_STORAGE_KEY, JSON.stringify(draft));
}
