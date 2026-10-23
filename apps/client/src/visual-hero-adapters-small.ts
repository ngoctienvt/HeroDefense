import { debug } from './debug.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, type HeroVfxHost } from './visual-hero-adapter.js';

/** Heroes whose VFX is a few pooled accents rather than a module (water shield burst, motifs; Thái Bạch moved to visual-thaibach.ts). h003/h005/h008 moved to the tier 1–2 recipes (visual-tier12.ts). */
export function smallHeroes(host: HeroVfxHost): HeroVfx[] {
  return [
    legacyHero({
      heroId: 'h03U',
      ability: { 'immortal-h03U': c => host.motifShow(c.at, 'shield', 3.8, .8, c.reduced) },
    }),
    legacyHero({
      heroId: 'h00U',
      ability: {
        'pet-h00U': c => {
          host.motifTravel(c.origin, c.at, 'hound', 2.7, .42, () => host.tierBurst(c.at.clone(), '#ebc873', 6, 1.8), c.reduced);
          debug('visual.tier34.pet', { eventId: c.event.id, skillId: c.event.skillId });
        },
      },
    }),
  ];
}
