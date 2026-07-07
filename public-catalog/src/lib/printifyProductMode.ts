type ProductModeMeta = {
  templateProductId?: unknown;
  printType?: unknown;
};

type TemplateOptions = {
  defaultTemplateProductId?: string;
  aopTemplateProductId?: string;
};

function asTrimmedString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export function resolveTemplateProductIdForItem(meta: ProductModeMeta, options: TemplateOptions) {
  const explicit = asTrimmedString(meta.templateProductId);
  if (explicit) return explicit;

  const printType = asTrimmedString(meta.printType);
  if (printType === 'all_over_print') {
    return asTrimmedString(options.aopTemplateProductId) || asTrimmedString(options.defaultTemplateProductId);
  }

  return asTrimmedString(options.defaultTemplateProductId);
}

export function expandAopPlacementKeys(placements: string[]) {
  const normalized = Array.from(new Set((placements || []).map((p) => asTrimmedString(p)).filter(Boolean)));
  const blocked = ['neck', 'inside_label', 'inner_label', 'label'];

  const preferred = normalized.filter((placement) => {
    const lower = placement.toLowerCase();
    return !blocked.some((b) => lower.includes(b)) && !lower.includes('back');
  });

  if (preferred.length > 0) return preferred;

  const backPlacement = normalized.find((placement) => placement.toLowerCase().includes('back'));
  if (backPlacement) return [backPlacement];

  return normalized.slice(0, 1);
}
