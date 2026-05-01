export type ShippingOptionRule = {
  id: string;
  label: string;
  enabled: boolean;
  countries: "US_ONLY" | "NON_US_ONLY" | "ALL";
  baseUsd: number;
  perItemUsd: number;
  eta: string;
};

export type ShippingConfig = {
  version: string;
  options: ShippingOptionRule[];
};

type PartialDeep<T> = { [K in keyof T]?: T[K] extends object ? PartialDeep<T[K]> : T[K] };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function asNonEmptyString(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const s = v.trim();
  return s ? s : null;
}

function asFiniteNumber(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function clampMoney(v: unknown, min: number, max: number, fallback: number): number {
  const n = asFiniteNumber(v);
  if (n === null) return fallback;
  const clamped = Math.max(min, Math.min(max, n));
  return Math.round(clamped * 100) / 100;
}

function newVersion() {
  return Date.now().toString(36);
}

function defaultConfig(): ShippingConfig {
  return {
    version: newVersion(),
    options: [
      { id: "us_standard", label: "US Standard", enabled: true, countries: "US_ONLY", baseUsd: 6.95, perItemUsd: 2.0, eta: "3–7 business days" },
      { id: "us_express", label: "US Express", enabled: true, countries: "US_ONLY", baseUsd: 14.95, perItemUsd: 2.5, eta: "2–3 business days" },
      { id: "intl_standard", label: "International", enabled: true, countries: "NON_US_ONLY", baseUsd: 24.95, perItemUsd: 5.0, eta: "7–21 business days" },
    ],
  };
}

function getStore(): ShippingConfig {
  const g = globalThis as unknown as { __ftShippingConfig?: ShippingConfig };
  if (!g.__ftShippingConfig) g.__ftShippingConfig = defaultConfig();
  return g.__ftShippingConfig;
}

function setStore(next: ShippingConfig) {
  const g = globalThis as unknown as { __ftShippingConfig?: ShippingConfig };
  g.__ftShippingConfig = next;
}

export function getShippingConfig(): ShippingConfig {
  return getStore();
}

export function updateShippingConfig(patch: PartialDeep<ShippingConfig>): ShippingConfig {
  const cur = getStore();
  const optionsIn = Array.isArray(patch.options) ? patch.options : null;

  const nextOptions = (optionsIn || cur.options).map((o: unknown, idx: number) => {
    const fallback = cur.options[idx] || cur.options[0];
    const rec = isRecord(o) ? o : {};
    const id = asNonEmptyString(rec.id) || fallback.id;
    const label = asNonEmptyString(rec.label) || fallback.label;
    const enabled = typeof rec.enabled === "boolean" ? rec.enabled : fallback.enabled;
    const countries = rec.countries === "US_ONLY" || rec.countries === "NON_US_ONLY" || rec.countries === "ALL" ? rec.countries : fallback.countries;
    const baseUsd = clampMoney(rec.baseUsd, 0, 999, fallback.baseUsd);
    const perItemUsd = clampMoney(rec.perItemUsd, 0, 999, fallback.perItemUsd);
    const eta = asNonEmptyString(rec.eta) || fallback.eta;
    return { id, label, enabled, countries, baseUsd, perItemUsd, eta } satisfies ShippingOptionRule;
  });

  const next: ShippingConfig = { version: newVersion(), options: nextOptions };
  setStore(next);
  return next;
}

export function quoteShipping(params: { country: string; itemCount: number }): Array<{ id: string; label: string; amountUsd: number; eta: string }> {
  const cfg = getStore();
  const c = (params.country || "").trim().toUpperCase();
  const isUS = c === "US";
  const count = Math.max(1, Math.min(1000, Math.trunc(params.itemCount || 1)));

  return cfg.options
    .filter((o) => o.enabled)
    .filter((o) => {
      if (o.countries === "ALL") return true;
      if (o.countries === "US_ONLY") return isUS;
      if (o.countries === "NON_US_ONLY") return !isUS;
      return false;
    })
    .map((o) => {
      const amountUsd = Math.round((o.baseUsd + o.perItemUsd * Math.max(0, count - 1)) * 100) / 100;
      return { id: o.id, label: o.label, amountUsd, eta: o.eta };
    })
    .filter((o) => Number.isFinite(o.amountUsd) && o.amountUsd >= 0);
}

export type ShippingConfigPatch = PartialDeep<ShippingConfig>;
