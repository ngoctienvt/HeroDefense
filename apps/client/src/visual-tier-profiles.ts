export type TierVisual = { color: string; texture: 'magic_01' | 'slash_01' | 'twirl_01' | 'spark_01'; size: number; sparks: number };

/** Compact palette and silhouette choices for the first two hero tiers. */
export const TIER_VISUALS: Readonly<Partial<Record<string, TierVisual>>> = {
  h001: { color: '#f9dda0', texture: 'spark_01', size: 1.1, sparks: 2 },
  h002: { color: '#91e5b6', texture: 'twirl_01', size: 1.1, sparks: 2 },
  h003: { color: '#ec78bd', texture: 'slash_01', size: 1.4, sparks: 3 },
  h004: { color: '#fff0b0', texture: 'slash_01', size: 1.2, sparks: 2 },
  h005: { color: '#e6cc85', texture: 'spark_01', size: 1.25, sparks: 3 },
  h006: { color: '#c8f8da', texture: 'magic_01', size: 1.35, sparks: 3 },
  h007: { color: '#82d9f4', texture: 'magic_01', size: 1.3, sparks: 2 },
  h008: { color: '#d6b47e', texture: 'twirl_01', size: 1.4, sparks: 3 },
  h009: { color: '#f5c85b', texture: 'magic_01', size: 3.2, sparks: 7 },
  h00A: { color: '#3ac587', texture: 'slash_01', size: 3.8, sparks: 8 },
  h00B: { color: '#bd9255', texture: 'twirl_01', size: 2.7, sparks: 7 },
  h00C: { color: '#fb7135', texture: 'slash_01', size: 3.7, sparks: 8 },
  h00D: { color: '#fb7135', texture: 'slash_01', size: 4.2, sparks: 9 },
  h00E: { color: '#f5c85b', texture: 'magic_01', size: 4.5, sparks: 8 },
  h00F: { color: '#3ac587', texture: 'magic_01', size: 2.8, sparks: 7 },
  h00G: { color: '#38bdf8', texture: 'twirl_01', size: 4.5, sparks: 9 },
  h00H: { color: '#bd9255', texture: 'magic_01', size: 2.5, sparks: 7 },
  h00I: { color: '#38bdf8', texture: 'twirl_01', size: 2.5, sparks: 7 },
  h03O: { color: '#38bdf8', texture: 'magic_01', size: 3, sparks: 8 },
  h03P: { color: '#3ac587', texture: 'magic_01', size: 4, sparks: 8 },
};
