import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualTuongThan } from './visual-tuong-than.js';
import type { VisualPhuongHoang } from './visual-phuong-hoang.js';
import type { VisualHauNghe } from './visual-hau-nghe.js';
import type { VisualKimsi } from './visual-kimsi.js';
import type { VisualKhuongTuNha } from './visual-khuongtu-nha.js';

export interface MythModules {
  tuongThan: VisualTuongThan; phuongHoang: VisualPhuongHoang; haunghe: VisualHauNghe; kimsi: VisualKimsi;
  khuongtu: VisualKhuongTuNha;
}

/** Tướng Thần, Phượng Hoàng, Hậu Nghệ, Kim Sĩ, Khương Tử Nha on the registry (behaviour unchanged). */
export function mythHeroes(m: MythModules, host: HeroVfxHost): HeroVfx[] {
  return [
    legacyHero({
      heroId: 'h03Z',
      cast: { 'skill-h03Z': c => m.tuongThan.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h03Z': c => m.tuongThan.attack(c.event, c.at, c.reduced),
        'skill-h03Z': c => m.tuongThan.impact(c.event, c.at, c.reduced, c.targets),
        'blood-general-h03Z': c => m.tuongThan.attack(c.event, c.at, c.reduced),
        'blood-warrior-h03Z': c => m.tuongThan.attack(c.event, c.at, c.reduced),
      },
      tick: dt => m.tuongThan.tick(dt), clear: () => m.tuongThan.clear(),
    }),
    legacyHero({
      heroId: 'h041',
      cast: { 'skill-h041': c => m.phuongHoang.cast(c.event, c.at) },
      ability: {
        'trait-h041': c => m.phuongHoang.attack(c.event, c.at, c.reduced),
        'skill-h041': c => m.phuongHoang.impact(c.event, c.at, c.origin, c.reduced),
        'phoenix-rebirth-h041': c => m.phuongHoang.rebirth(c.event, c.at, c.reduced),
        'phoenix-egg-h041': () => undefined,
      },
      tick: dt => m.phuongHoang.tick(dt), clear: () => m.phuongHoang.clear(),
    }),
    legacyHero({
      heroId: 'h017',
      cast: { 'skill-h017': c => m.haunghe.cast(c.event, c.at) },
      ability: {
        'skill-h017': c => {
          m.haunghe.impact(c.event, c.at, c.reduced);
          host.fireImpact(c.at.clone(), true, 6.5);
        },
        'trait-h017': c => {
          if (c.hasOrigin && !c.reduced) host.beam(c.origin, c.at.clone(), '#ffad46');
          m.haunghe.arrow(c.event, c.at, c.reduced);
        },
      },
      abilityOnly: ['skill-h017'],
      tick: dt => m.haunghe.tick(dt), clear: () => m.haunghe.clear(),
    }),
    legacyHero({
      heroId: 'h016',
      cast: { 'skill-h016': c => m.kimsi.cast(c.event, c.at) },
      ability: {
        'skill-h016': c => m.kimsi.impact(c.event, c.origin, c.reduced),
        'trait-h016': c => m.kimsi.attack(c.event, c.at, c.reduced),
      },
      abilityOnly: ['skill-h016'],
      tick: dt => m.kimsi.tick(dt), clear: () => m.kimsi.clear(),
    }),
    legacyHero({
      heroId: 'h019',
      cast: { 'skill-h019': c => m.khuongtu.cast(c.event, c.at) },
      ability: {
        'skill-h019': c => m.khuongtu.impact(c.event),
        'bolt-h019': c => m.khuongtu.bolt(c.event, c.at, c.reduced),
        'trait-h019': c => {
          if (c.reduced) return;
          let previous = c.origin;
          for (const target of c.targetsOrAt) {
            host.beam(previous, target.clone(), '#8dc9c0');
            previous = target.clone();
          }
        },
      },
      abilityOnly: ['skill-h019'],
      tick: dt => m.khuongtu.tick(dt), clear: () => m.khuongtu.clear(),
    }),
  ];
}
