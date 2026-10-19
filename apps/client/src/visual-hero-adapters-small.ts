import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { debug } from './debug.js';
import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, lift, type HeroVfxHost } from './visual-hero-adapter.js';

/** Heroes whose VFX is a few pooled accents rather than a module (star ring, water shield burst, motifs, death bursts). */
export function smallHeroes(host: HeroVfxHost): HeroVfx[] {
  return [
    legacyHero({
      heroId: 'h015',
      ability: {
        'revive-h015': c => starRing(host, c.targetsOrAt, true, c.reduced, c.event.id, c.event.skillId),
        'star-guard-h015': c => starRing(host, c.targetsOrAt, false, c.reduced, c.event.id, c.event.skillId),
      },
    }),
    legacyHero({
      heroId: 'h00J',
      ability: {
        'water-shield-burst-h00J': c => {
          host.waterImpact(c.at, 5, .65, c.reduced);
          if (!c.reduced) host.tierBurst(c.at.clone(), '#b4e9f2', 14, 3.2);
        },
      },
    }),
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
    legacyHero({
      heroId: 'h003',
      ability: {
        'burst-h003': c => {
          host.fireImpact(c.at, true, 2);
          debug('visual.trait.burst', { eventId: c.event.id, skillId: c.event.skillId });
        },
      },
    }),
    legacyHero({
      heroId: 'h005',
      ability: { 'burst-h005': c => softBurst(host, c, false) },
    }),
    legacyHero({
      heroId: 'h008',
      ability: { 'burst-h008': c => softBurst(host, c, true) },
    }),
  ];
}

/** Thái Bạch: a gold star ring marks each ally revived or saved from death. */
function starRing(host: HeroVfxHost, targets: readonly Vector3[],
  revive: boolean, reduced: boolean, eventId: number, skillId?: string): void {
  for (const at of targets) {
    host.spawn('ring', at.clone(), revive ? '#ffe7a3' : '#fff6d2', revive ? 4.2 : 3, revive ? .6 : .45);
    if (!reduced) host.burst(lift(at, 1.2), '#fff3c4', revive ? 12 : 7, 2.2);
  }
  debug('visual.thaibach.save', { eventId, skillId, reduced });
}

/** Trait burst: ring plus glyph and sparks; the earth variant (h008) is bigger. */
function softBurst(host: HeroVfxHost, c: { at: Vector3;
  reduced: boolean; event: { id: number; skillId?: string } }, earth: boolean): void {
  host.spawn('ring', c.at, earth ? '#d6b47e' : '#f0d28a', earth ? 5 : 2.2, .38);
  if (!c.reduced) {
    host.spawn('glyph', c.at, earth ? '#e2c994' : '#fff1b6', earth ? 2.8 : 1.4, .38, earth ? 'twirl_01' : 'spark_01');
    host.burst(c.at, earth ? '#d6b47e' : '#f0d28a', earth ? 7 : 4, earth ? 2.1 : 1.1);
  }
  debug('visual.trait.burst', { eventId: c.event.id, skillId: c.event.skillId });
}
