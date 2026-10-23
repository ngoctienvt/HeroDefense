import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, lift, type HeroEventHandler, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualNuwa } from './visual-nuwa.js';
import type { VisualChuclong } from './visual-chuclong.js';
import type { VisualFuxi } from './visual-fuxi.js';

export interface SageModules {
  nuwa: VisualNuwa; chuclong: VisualChuclong;
  fuxi: VisualFuxi;
}

/** Sage routing preserves normal attacks; the four ultimates now delegate to their own kit/art layers. */
export function sageHeroes(m: SageModules, host: HeroVfxHost): HeroVfx[] {
  const nuwaBlessing: HeroEventHandler = c => m.nuwa.blessing(c.event, c.targets, c.reduced);
  return [
    legacyHero({
      heroId: 'h01C',
      cast: { 'skill-h01C': c => m.nuwa.cast(c.event, c.at, c.reduced, c.origin) },
      ability: {
        'trait-h01C': c => m.nuwa.attack(c.event, c.origin, c.targets, c.reduced),
        'skill-h01C': c => m.nuwa.impact(c.event, c.origin, c.targets, c.reduced),
        'blessing-h01C': nuwaBlessing,
        'stone-blessing-h01C': nuwaBlessing,
      },
      tick: dt => m.nuwa.tick(dt), clear: () => m.nuwa.clear(),
    }),
    legacyHero({
      heroId: 'h01K',
      cast: { 'skill-h01K': c => m.chuclong.cast(c.event, c.at, c.reduced, c.origin) },
      ability: {
        'trait-h01K': c => {
          m.chuclong.breath(c.event, c.origin, c.at, c.reduced);
          host.fireImpact(c.at.clone(), false, 2.8);
        },
        'skill-h01K': c => {
          m.chuclong.winter(c.event, c.at, c.targets, c.reduced);
        },
        'summer-h01K': c => {
          m.chuclong.summer(c.event, c.at, c.reduced, c.targets);
        },
      },
      tick: dt => m.chuclong.tick(dt), clear: () => m.chuclong.clear(),
    }),
    legacyHero({
      heroId: 'h01D',
      cast: { 'skill-h01D': c => m.fuxi.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h01D': c => m.fuxi.attack(c.event, c.origin, c.targets, c.reduced),
        'skill-h01D': c => m.fuxi.impact(c.event, c.at, c.reduced, c.targets),
      },
      tick: dt => m.fuxi.tick(dt), clear: () => m.fuxi.clear(),
    }),
  ];
}
