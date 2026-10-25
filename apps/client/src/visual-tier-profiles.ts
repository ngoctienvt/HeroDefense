export type TierVisual = { color: string; texture: 'magic_01' | 'slash_01' | 'twirl_01' | 'spark_01'; size: number; sparks: number };

/** Compact palette and silhouette choices for tier 2 (tier 1 now runs on the kit recipes, visual-kit-recipes-tier12.ts). */
export const TIER_VISUALS: Readonly<Partial<Record<string, TierVisual>>> = {
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
