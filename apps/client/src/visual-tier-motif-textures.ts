/** Blender-authored RGBA flipbooks used by Tier Huyền cast, travel and impacts. */
export const TIER_MOTIFS = ['bell', 'vines', 'sand', 'sword', 'shield', 'flower', 'sniper',
  'soul', 'ice', 'bloom', 'song', 'seed', 'hammer', 'fire-sweep', 'lightning',
  'coin', 'tower', 'dragon', 'rock', 'peacock', 'judgement', 'seal', 'wheel', 'hound'] as const;
export type TierMotif = typeof TIER_MOTIFS[number];
export const TIER_MOTIF_FRAMES = 12;

export function tierMotifAtlas(kind: TierMotif): string {
  return kind === 'lightning' ? '/assets/vfx-tier34-lightning.webp' : `/assets/vfx-huyen-${kind}.webp`;
}

export function tierMotifStill(kind: TierMotif): string {
  return `/assets/vfx-huyen-${kind}-static.webp`;
}
