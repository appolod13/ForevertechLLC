export interface SearchParams {
  query: string;
  exact?: boolean;
  siteFilters?: string[]; // e.g., ['.edu', '.gov']
  filetypes?: string[];   // e.g., ['pdf']
}

export function buildQuery({ query, exact, siteFilters = [], filetypes = [] }: SearchParams) {
  const parts: string[] = [];
  const base = exact ? `"${query.trim()}"` : query.trim();
  if (base) parts.push(base);
  siteFilters.forEach(s => parts.push(`site:${s.replace(/^site:/, '')}`));
  filetypes.forEach(ft => parts.push(`filetype:${ft}`));
  return parts.join(' ');
}
