import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, lift, type HeroEventHandler, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualNuwa } from './visual-nuwa.js';
import type { VisualHienvien } from './visual-hienvien.js';
import type { VisualShennong } from './visual-shennong.js';
import type { VisualChuclong } from './visual-chuclong.js';
import type { VisualFuxi } from './visual-fuxi.js';

export interface SageModules {
  nuwa: VisualNuwa; hienvien: VisualHienvien; shennong: VisualShennong; chuclong: VisualChuclong;
  fuxi: VisualFuxi;
}

/** Nữ Oa, Hiên Viên, Thần Nông, Chúc Long, Phục Hy on the registry (behaviour unchanged). */
export function sageHeroes(m: SageModules, host: HeroVfxHost): HeroVfx[] {
  const nuwaBlessing: HeroEventHandler = c => m.nuwa.blessing(c.event, c.targets, c.reduced);
  return [
    legacyHero({
      heroId: 'h01C',
      cast: { 'skill-h01C': c => m.nuwa.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h01C': c => m.nuwa.attack(c.event, c.origin, c.targets, c.reduced),
        'skill-h01C': c => m.nuwa.impact(c.event, c.origin, c.targets, c.reduced),
        'blessing-h01C': nuwaBlessing,
        'stone-blessing-h01C': nuwaBlessing,
        'revive-h01C': nuwaBlessing,
      },
      tick: dt => m.nuwa.tick(dt), clear: () => m.nuwa.clear(),
    }),
    legacyHero({
      heroId: 'h01F',
      cast: { 'skill-h01F': c => m.hienvien.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h01F': c => m.hienvien.attack(c.event, c.origin, c.at, c.reduced),
        'skill-h01F': c => {
          m.hienvien.impact(c.event, c.at, c.reduced);
          host.spawn('ring', c.at.clone(), '#d8a839', 17, .42);
          if (!c.reduced) host.tierBurst(c.at.clone(), '#c89330', 14, 4);
        },
        'sword-rain-h01F': c => m.hienvien.rain(c.event, c.at, c.reduced),
        'imperial-blessing-h01F': () => undefined,
      },
      tick: dt => m.hienvien.tick(dt), clear: () => m.hienvien.clear(),
    }),
    legacyHero({
      heroId: 'h01E',
      cast: { 'skill-h01E': c => m.shennong.cast(c.event, c.at) },
      ability: {
        'trait-h01E': c => m.shennong.attack(c.event, c.origin, c.at, c.reduced),
        'skill-h01E': c => {
          m.shennong.impact(c.event, c.at, c.reduced);
          host.spawn('ring', c.at.clone(), '#61b995', 17, .48);
        },
        'herb-heal-h01E': c => {
          for (const target of c.targets.slice(0, 20)) host.spawn('orb', lift(target, 1.4), '#91d9a7', .36, .3);
        },
      },
      tick: dt => m.shennong.tick(dt), clear: () => m.shennong.clear(),
    }),
    legacyHero({
      heroId: 'h01K',
      cast: { 'skill-h01K': c => m.chuclong.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h01K': c => {
          m.chuclong.breath(c.event, c.origin, c.at, c.reduced);
          host.fireImpact(c.at.clone(), false, 2.8);
        },
        'skill-h01K': c => {
          m.chuclong.winter(c.event, c.at, c.targets, c.reduced);
          host.spawn('ring', c.at.clone(), '#5374a0', 24, .55);
          for (const target of c.targets.slice(0, c.reduced ? 6 : 20)) host.spawn('spark', lift(target, 1.2), '#9fc9df', .38, .4);
        },
        'summer-h01K': c => {
          m.chuclong.summer(c.event, c.at, c.reduced);
          host.spawn('ring', c.at.clone(), '#f7b34e', 24, .65);
          host.fireImpact(c.at.clone(), true, 12);
        },
      },
      tick: dt => m.chuclong.tick(dt), clear: () => m.chuclong.clear(),
    }),
    legacyHero({
      heroId: 'h01D',
      cast: { 'skill-h01D': c => m.fuxi.cast(c.event, c.at) },
      ability: {
        'trait-h01D': c => m.fuxi.attack(c.event, c.origin, c.targets, c.reduced),
        'skill-h01D': c => m.fuxi.impact(c.event, c.at, c.reduced),
      },
      tick: dt => m.fuxi.tick(dt), clear: () => m.fuxi.clear(),
    }),
  ];
}
