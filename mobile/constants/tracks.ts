const COLOR_PALETTE = [
  "#7B8FE0", "#5ED19A", "#F5C77A", "#C47AE0",
  "#E26D6D", "#5BB8D4", "#F09A5A", "#9DE08A",
];

const BG_PALETTE = [
  "#0D1025", "#0B1C14", "#1A1408", "#160D20",
  "#1C0D0D", "#0B1820", "#1A1108", "#0E1C0B",
];

function hash(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

export function trackColor(id: string): string {
  return COLOR_PALETTE[hash(id) % COLOR_PALETTE.length];
}

export function trackBg(id: string): string {
  return BG_PALETTE[hash(id) % BG_PALETTE.length];
}
