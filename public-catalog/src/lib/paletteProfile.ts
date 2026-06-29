const KEYWORDS = [
  "peaceful",
  "serene",
  "tranquil",
  "meditative",
  "void",
  "dark",
  "shadow",
  "abyss",
  "angry",
  "rage",
  "ominous",
  "joyful",
  "joy",
  "radiant",
  "cosmic",
  "nebula",
  "mysterious",
  "ethereal",
  "dreamlike",
  "quantum",
  "crystalline",
  "fractured",
];

export function paletteProfileFromPrompt(prompt: string): string {
  const normalized = prompt.toLowerCase();
  for (const key of KEYWORDS) {
    if (normalized.includes(key)) return key;
  }
  return "quantum";
}

