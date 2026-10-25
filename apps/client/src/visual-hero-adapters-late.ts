import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, type HeroEventHandler, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualTruongDaoLang } from './visual-truong-dao-lang.js';
import type { VisualDivine } from './visual-divine.js';

export interface LateModules {
  truongDaoLang: VisualTruongDaoLang; divine: VisualDivine;
}

/** Như Lai (h01J) left this module: it runs on `visual-nhu-lai.ts`. */
/** Bồ Đề (h03X) left it too: it runs on `visual-bodhi.ts`. */
/** Nhiên Đăng (h03W) too: it runs on `visual-nhien-dang.ts`. */
const DIVINE_IDS = ['h01I', 'h014'] as const;
const DIVINE_ABILITY = /^(skill|trait|shield|blessing|reflect|crow-burst)-h(01I|014)$/;

/** Divine routing retains the normal painters; Đế Tuấn and Nguyên Thủy delegate their ultimates to kit layers. */
export function lateHeroes(m: LateModules, host: HeroVfxHost): HeroVfx[] {
  return [
    legacyHero({
        heroId: DIVINE_IDS[0],
        aliases: DIVINE_IDS.slice(1),
        cast: Object.fromEntries(DIVINE_IDS.map(id => [`skill-${id}`, (c => m.divine.cast(c.event, c.at, c.reduced, c.origin)) as HeroEventHandler])),
        abilityFallback: id => DIVINE_ABILITY.test(id) ? c => m.divine.show(c.event, c.at, c.reduced, c.targets, c.origin, c.main) : undefined,
        tick: dt => m.divine.tick(dt), clear: () => m.divine.clear(),
    }),
    // Lục Nhĩ (h03Y) is a direct HeroVfx registered in VisualEffects (visual-lucnhi*.ts).
  ];
}
