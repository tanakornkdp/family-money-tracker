export const cardColors = {
  indigo: "#6366f1", pink: "#ec4899", orange: "#f97316", green: "#22c55e",
  blue: "#3b82f6", purple: "#a855f7", red: "#ef4444", cyan: "#06b6d4",
} as const;

export type CardColor = keyof typeof cardColors;

export function cardColorToken(value: string): CardColor | undefined {
  if (Object.hasOwn(cardColors, value)) return value as CardColor;
  return (Object.keys(cardColors) as CardColor[]).find(key => cardColors[key] === value?.toLowerCase());
}

export function cardBackground(value: string) {
  const token = cardColorToken(value);
  const color = token ? cardColors[token] : /^#[0-9a-f]{6}$/i.test(value) ? value : cardColors.indigo;
  return `linear-gradient(135deg, ${color}, color-mix(in srgb, ${color} 60%, #020617))`;
}
