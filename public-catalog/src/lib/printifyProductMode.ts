type ProductModeMeta = {
  templateProductId?: unknown;
  printType?: unknown;
};

type TemplateOptions = {
  defaultTemplateProductId?: string;
  aopTemplateProductId?: string;
};

type AopBodyZone = 'front' | 'back' | 'left_sleeve' | 'right_sleeve';

type AopPlacementPlan = {
  body: Partial<Record<AopBodyZone, string>>;
  branding: {
    inside_neck_tag?: string;
    collar?: string;
  };
  unsupported: string[];
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
    return !blocked.some((b) => lower.includes(b));
  });

  if (preferred.length > 0) return preferred;

  const backPlacement = normalized.find((placement) => placement.toLowerCase().includes('back'));
  if (backPlacement) return [backPlacement];

  return normalized.slice(0, 1);
}

function normalizePlacement(value: string) {
  return asTrimmedString(value).toLowerCase().replace(/[\s-]+/g, '_');
}

function findPlacement(placements: string[], aliases: string[], excludedAliases: string[] = []) {
  const normalizedAliases = aliases.map(normalizePlacement);
  const normalizedExcluded = excludedAliases.map(normalizePlacement);
  const filteredPlacements = placements.filter((placement) => {
    const normalizedPlacement = normalizePlacement(placement);
    return !normalizedExcluded.some(
      (alias) => normalizedPlacement === alias || normalizedPlacement.includes(alias),
    );
  });

  const exact = filteredPlacements.find((placement) => {
    const normalizedPlacement = normalizePlacement(placement);
    return normalizedAliases.some((alias) => normalizedPlacement === alias);
  });
  if (exact) return exact;

  return filteredPlacements.find((placement) => {
    const normalizedPlacement = normalizePlacement(placement);
    return normalizedAliases.some(
      (alias) => normalizedPlacement === alias || normalizedPlacement.includes(alias),
    );
  });
}

export function buildAopPlacementPlan(placements: string[]): AopPlacementPlan {
  const normalized = Array.from(new Set((placements || []).map((p) => asTrimmedString(p)).filter(Boolean)));

  return {
    body: {
      front: findPlacement(normalized, ['front', 'chest']),
      back: findPlacement(normalized, ['back', 'rear']),
      left_sleeve: findPlacement(normalized, ['left_sleeve', 'left sleeve']),
      right_sleeve: findPlacement(normalized, ['right_sleeve', 'right sleeve']),
    },
    branding: {
      inside_neck_tag: findPlacement(normalized, ['inside_neck_tag', 'inside neck tag', 'inside_label', 'inner_label', 'label']),
      collar: findPlacement(normalized, ['collar', 'neck'], ['inside_neck_tag', 'inside neck tag', 'inside_label', 'inner_label', 'label']),
    },
    unsupported: [],
  };
}
