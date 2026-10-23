/**
 * Semantic colours shared by the DOM HUD and the Babylon battlefield.
 * CSS reads them as `--c-<key>` (written once at boot by applyPaletteToCss);
 * Babylon materials import the hex values directly, so both always match.
 */
export const PALETTE = {
  'hp-high': '#4fbf6a',
  'hp-mid': '#e0b23c',
  'hp-low': '#d9503f',
  shield: '#fff1b2',
  mana: '#3d8fe0',
  rage: '#f0782a',
  // Faction colours for overhead bars and hover rings: whose unit it is, not how hurt it is.
  'faction-self': '#52c46a',
  'faction-self-low': '#2f7a3f',
  'faction-ally': '#3cb8d0',
  'faction-ally-low': '#21707f',
  'faction-enemy': '#d8483a',
  'faction-enemy-low': '#842a22',
  'faction-elite': '#b8282e',
  'faction-elite-low': '#6e171b',
  'elite-frame': '#e8c46a',
  'self-mark': '#f2d58f',
  selection: '#f2d58f',
  // Ngũ Hành: Kim, Mộc, Thủy, Hỏa, Thổ (index 1-5, matching HeroDef.element).
  'element-1': '#e6b84a',
  'element-2': '#5bbf6a',
  'element-3': '#3fa8d8',
  'element-4': '#e2583c',
  'element-5': '#b8864e',
  // Hero tier ladder (Phẩm 1-6): grey, green, blue, violet, orange, red.
  'tier-1': '#9aa3a8',
  'tier-2': '#5bbf8a',
  'tier-3': '#4a9be0',
  'tier-4': '#a46ae0',
  'tier-5': '#e0a03a',
  'tier-6': '#e5534b',
} as const;

export type PaletteKey = keyof typeof PALETTE;

export function elementColor(element: number): string {
  return PALETTE[`element-${element}` as PaletteKey] ?? PALETTE['tier-1'];
}

export function tierColor(tier: number): string {
  return PALETTE[`tier-${Math.max(1, Math.min(6, tier))}` as PaletteKey];
}

/** Writes every palette entry to `:root` as `--c-<key>` so stylesheets never hard-code these colours. */
export function applyPaletteToCss(root: HTMLElement = document.documentElement): void {
  for (const [key, value] of Object.entries(PALETTE)) root.style.setProperty(`--c-${key}`, value);
}

/** Mixes a hex colour toward black by `amount` (0-1); used for icon cel-shade tones. */
export function shadeHex(hex: string, amount: number): string {
  const value = Number.parseInt(hex.replace('#', ''), 16);
  if (!Number.isFinite(value) || hex.replace('#', '').length !== 6) return hex;
  const channel = (shift: number) => Math.round(((value >> shift) & 255) * (1 - amount));
  return `#${[16, 8, 0].map(shift => channel(shift).toString(16).padStart(2, '0')).join('')}`;
}
