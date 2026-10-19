import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, type HeroEventHandler, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualTruongDaoLang } from './visual-truong-dao-lang.js';
import type { VisualDivine } from './visual-divine.js';
import type { VisualTayvuongmau } from './visual-tayvuongmau.js';
import type { VisualLucnhi } from './visual-lucnhi.js';

export interface LateModules {
  truongDaoLang: VisualTruongDaoLang; divine: VisualDivine; tayvuongmau: VisualTayvuongmau; lucnhi: VisualLucnhi;
}

const DIVINE_IDS = ['h03W', 'h03X', 'h01I', 'h01J', 'h014'] as const;
const DIVINE_ABILITY = /^(skill|trait|shield|blessing|reflect|crow-burst)-h(03W|03X|01I|01J|014)$/;

/** Trương Đạo Lăng, the five divine heroes, Tây Vương Mẫu, Lục Nhĩ on the registry (behaviour unchanged). */
export function lateHeroes(m: LateModules, host: HeroVfxHost): HeroVfx[] {
  const bolt: HeroEventHandler = c => m.truongDaoLang.bolt(c.event, c.at, c.reduced);
  return [
    legacyHero({
      heroId: 'h040',
      cast: { 'skill-h040': c => m.truongDaoLang.cast(c.event, c.at, c.reduced) },
      ability: {
        'skill-h040': c => m.truongDaoLang.impact(c.event, c.at, c.reduced),
        'bolt-h040': bolt,
        'blessing-hit-h040': bolt,
        'blessing-h040': c => host.beam(c.origin, c.at.clone(), '#cfeaff'),
      },
      abilityOnly: ['skill-h040'],
      tick: dt => m.truongDaoLang.tick(dt), clear: () => m.truongDaoLang.clear(),
    }),
    legacyHero({
        heroId: DIVINE_IDS[0],
        aliases: DIVINE_IDS.slice(1),
        cast: Object.fromEntries(DIVINE_IDS.map(id => [`skill-${id}`, (c => m.divine.cast(c.event, c.at, c.reduced)) as HeroEventHandler])),
        abilityFallback: id => DIVINE_ABILITY.test(id) ? c => m.divine.show(c.event, c.at, c.reduced) : undefined,
        tick: dt => m.divine.tick(dt), clear: () => m.divine.clear(),
    }),
    legacyHero({
      heroId: 'h01A',
      cast: { 'skill-h01A': c => m.tayvuongmau.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h01A': c => m.tayvuongmau.attack(c.event, c.origin, c.targetsOrAt, c.reduced),
        'skill-h01A': c => m.tayvuongmau.rain(c.event, c.at, c.reduced),
        'peach-h01A': c => m.tayvuongmau.gift(c.event, c.origin, c.at, c.reduced),
      },
      tick: dt => m.tayvuongmau.tick(dt), clear: () => m.tayvuongmau.clear(),
    }),
    legacyHero({
      heroId: 'h03Y',
      cast: { 'skill-h03Y': c => m.lucnhi.cast(c.event, c.at, c.reduced) },
      ability: {
        'trait-h03Y': c => m.lucnhi.attack(c.event, c.origin, c.reduced),
        'skill-h03Y': c => m.lucnhi.begin(c.event, c.at, c.reduced),
        'shadow-hit-h03Y': c => m.lucnhi.strike(c.event, c.at, c.reduced),
      },
      tick: dt => m.lucnhi.tick(dt), clear: () => m.lucnhi.clear(),
    }),
  ];
}
