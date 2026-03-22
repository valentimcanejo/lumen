export const TRACK_COLORS: Record<string, string> = {
  foundations:      "#7B8FE0", // blue-purple
  geopolitics:      "#5ED19A", // green
  economics:        "#F5C77A", // yellow
  critical_thinking: "#C47AE0", // purple
};

export const TRACK_BG: Record<string, string> = {
  foundations:      "#0D1025",
  geopolitics:      "#0B1C14",
  economics:        "#1A1408",
  critical_thinking: "#160D20",
};

export function trackColor(id: string): string {
  if (TRACK_COLORS[id]) return TRACK_COLORS[id];
  const prefix = Object.keys(TRACK_COLORS).find((k) => id.startsWith(k));
  return prefix ? TRACK_COLORS[prefix] : "#AAB0C0";
}

export function trackBg(id: string): string {
  if (TRACK_BG[id]) return TRACK_BG[id];
  const prefix = Object.keys(TRACK_BG).find((k) => id.startsWith(k));
  return prefix ? TRACK_BG[prefix] : "#121826";
}
