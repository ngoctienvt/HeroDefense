import type { HeroVfx } from './visual-kit-hero.js';
import { legacyHero, type HeroVfxHost } from './visual-hero-adapter.js';
import type { VisualPangu } from './visual-pangu.js';
import type { VisualXingtian } from './visual-xingtian.js';
import type { VisualDouzhan } from './visual-douzhan.js';
import type { VisualKimthien } from './visual-kimthien.js';
import type { VisualHangnga } from './visual-hangnga.js';

export interface WarModules {
  pangu: VisualPangu; xingtian: VisualXingtian; douzhan: VisualDouzhan; kimthien: VisualKimthien;
  hangnga: VisualHangnga;
}

/** Bàn Cổ, Hình Thiên, Đấu Chiến Thắng Phật, Kim Thiền, Hằng Nga on the registry (behaviour unchanged). */
export function warHeroes(m: WarModules, host: HeroVfxHost): HeroVfx[] {
  return [
    legacyHero({
      heroId: 'h01B',
      cast: { 'skill-h01B': c => m.pangu.cast(c.event, c.at, c.reduced) },
      abilityFallback: id => id.endsWith('-h01B')
        ? c => m.pangu.show(c.event, c.at, c.origin, c.reduced) : undefined,
      tick: dt => m.pangu.tick(dt), clear: () => m.pangu.clear(),
    }),
    legacyHero({
      heroId: 'h011',
      cast: { 'skill-h011': c => m.xingtian.cast(c.event, c.at) },
      ability: {
        'fire-wave-h011': c => m.xingtian.wave(c.event, c.origin),
        'skill-h011': c => m.xingtian.impact(c.event, c.origin, c.reduced),
      },
      abilityOnly: ['skill-h011'],
      tick: dt => m.xingtian.tick(dt, host.reduced()), clear: () => m.xingtian.clear(),
    }),
    legacyHero({
      heroId: 'h012',
      cast: { 'skill-h012': c => m.douzhan.cast(c.event, c.at) },
      ability: {
        'skill-h012': c => m.douzhan.impact(c.event, c.origin, c.reduced),
        'buddha-shadow-h012': c => m.douzhan.shadowHit(c.event, c.at, c.reduced),
        'clone-crit-h012': c => m.douzhan.shadowHit(c.event, c.at, c.reduced),
        'clone-attack-h012': c => m.douzhan.shadowHit(c.event, c.at, c.reduced),
      },
      abilityOnly: ['skill-h012'],
      tick: dt => m.douzhan.tick(dt), clear: () => m.douzhan.clear(),
    }),
    legacyHero({
      heroId: 'h013',
      cast: { 'skill-h013': c => m.kimthien.cast(c.event, c.at) },
      ability: {
        'skill-h013': c => m.kimthien.impact(c.event, c.at),
        'trait-h013': c => m.kimthien.attack(c.event, c.at),
      },
      abilityOnly: ['skill-h013'],
      tick: dt => m.kimthien.tick(dt), clear: () => m.kimthien.clear(),
    }),
    legacyHero({
      heroId: 'h018',
      cast: { 'skill-h018': c => m.hangnga.cast(c.event, c.at, c.reduced) },
      ability: {
        'skill-h018': c => m.hangnga.ability(c.event, c.origin, c.reduced),
        'trait-h018': c => m.hangnga.attack(c.event, c.targets, c.reduced),
        'freeze-h018': c => m.hangnga.freeze(c.event, c.targets, c.reduced),
      },
      abilityOnly: ['skill-h018'],
      tick: dt => m.hangnga.tick(dt), clear: () => m.hangnga.clear(),
    }),
  ];
}
