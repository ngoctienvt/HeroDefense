import type { AbilityEffect, AbilityKind, EnergyType, HeroAbility, HeroDef, Role } from '../packages/contracts/src/types.js';
import brief from './tier3-tier4-brief.json';
import { TIER3_TIER4_REWORK, reworkBriefText } from './tier3-tier4-rework.js';

type SkillSettings = {
  role: Role;
  kind: AbilityKind;
  power: number;
  cooldown: number;
  effect: AbilityEffect;
};
type TierStats = Pick<HeroDef, 'hp' | 'attack' | 'armor' | 'range' | 'interval' | 'speed'> & { block?: number };
type TierDesign = Pick<HeroDef, 'hp' | 'attack' | 'armor' | 'range' | 'interval' | 'speed'
  | 'role' | 'element' | 'block' | 'energyType' | 'maxEnergy' | 'ability' | 'trait'>;

// Numeric combat values are transcribed from the player's design brief. The
// descriptions stay alongside them so every runtime value has a source; the
// 19-10-2026 rework (soft control, recipient-scaled support) lives in
// tier3-tier4-rework.ts.
const SETTINGS: Readonly<Record<string, SkillSettings>> = {
  h00J: { role: 'guardian', kind: 'shield', power: 2.5, cooldown: 0, effect: { target: 'self', shape: 'single', radius: 5, statusSeconds: 5 } },
  h00K: { role: 'support', kind: 'heal', power: 2.6, cooldown: 8.5, effect: { target: 'allies', shape: 'radius', radius: 8, maxTargets: 3, status: 'ward', statusSeconds: 4, statusStrength: .3, recipientMaxHpRatio: TIER3_TIER4_REWORK.h00K.recipientMaxHpRatio } },
  h00L: { role: 'ranger', kind: 'cleave', power: 3.1, cooldown: 0, effect: { target: 'enemy', shape: 'line', length: 12, width: 3.5, status: 'slow', statusSeconds: 2, statusStrength: TIER3_TIER4_REWORK.h00L.slow } },
  h00M: { role: 'ranger', kind: 'nova', power: 5.2, cooldown: 0, effect: { target: 'enemy', shape: 'radius', radius: 5.5, status: 'slow', statusSeconds: 2, statusStrength: .4 } },
  h00N: { role: 'mage', kind: 'nova', power: 2.8, cooldown: 10, effect: { target: 'enemy', shape: 'radius', radius: 5.2, groundBurnSeconds: 4 } },
  h00O: { role: 'warrior', kind: 'cleave', power: 3.4, cooldown: 0, effect: { target: 'enemy', shape: 'radius', radius: 4.8, maxTargets: 5 } },
  h00P: { role: 'warrior', kind: 'nova', power: 3.5, cooldown: 0, effect: { target: 'enemy', shape: 'radius', radius: 5.5, knockback: TIER3_TIER4_REWORK.h00P.knockback, status: 'slow', statusSeconds: 1.8, statusStrength: TIER3_TIER4_REWORK.h00P.slow } },
  h00Q: { role: 'mage', kind: 'cleave', power: 2.7, cooldown: 10.5, effect: { target: 'enemy', shape: 'line', length: 10, width: 6, knockback: 2.5, status: 'slow', statusSeconds: 4, statusStrength: .5 } },
  h03Q: { role: 'warrior', kind: 'nova', power: 3, cooldown: 9, effect: { target: 'enemy', shape: 'radius', radius: 5, sunder: .35, statusSeconds: 5 } },
  h03R: { role: 'support', kind: 'heal', power: 2.8, cooldown: 10, effect: { target: 'allies', shape: 'radius', radius: 9, status: 'haste', statusSeconds: 5, statusStrength: .3, recipientMaxHpRatio: TIER3_TIER4_REWORK.h03R.recipientMaxHpRatio } },
  h03S: { role: 'guardian', kind: 'shield', power: 2.6, cooldown: 0, effect: { target: 'allies', shape: 'radius', radius: 8, statusSeconds: 5 } },
  h00R: { role: 'warrior', kind: 'cleave', power: 3.8, cooldown: 0, effect: { target: 'enemy', shape: 'line', length: 9, width: 3, status: 'slow', statusSeconds: 1.5, statusStrength: TIER3_TIER4_REWORK.h00R.slow, sunder: .3 } },
  h00S: { role: 'mage', kind: 'nova', power: 2.9, cooldown: 10, effect: { target: 'enemy', shape: 'radius', radius: 6, status: 'stun', statusSeconds: 1.2, secondary: { status: 'slow', seconds: 4.5, strength: .5 } } },
  h00T: { role: 'mage', kind: 'nova', power: 4.5, cooldown: 9.5, effect: { target: 'enemy', shape: 'radius', radius: 6.5, groundBurnSeconds: 3 } },
  h00U: { role: 'warrior', kind: 'cleave', power: 3.2, cooldown: 0, effect: { target: 'enemy', shape: 'line', length: 12, width: 3 } },
  h00V: { role: 'warrior', kind: 'chain', power: 3, cooldown: 0, effect: { target: 'enemy', shape: 'chain', jumps: 8, jumpRange: 6 } },
  h00W: { role: 'guardian', kind: 'shield', power: 2.8, cooldown: 0, effect: { target: 'allies', shape: 'radius', radius: 8, statusSeconds: 5 } },
  h00X: { role: 'ranger', kind: 'chain', power: 3.1, cooldown: 9, effect: { target: 'enemy', shape: 'chain', jumps: 7, jumpRange: 6, status: 'sunder', statusSeconds: 4, statusStrength: .4 } },
  h00Y: { role: 'support', kind: 'nova', power: 2.5, cooldown: 10, effect: { target: 'enemy', shape: 'radius', radius: 6.5, maxTargets: 8 } },
  h00Z: { role: 'ranger', kind: 'nova', power: 3.6, cooldown: 0, effect: { target: 'enemy', shape: 'radius', radius: 6.5, status: 'slow', statusSeconds: 2.2, statusStrength: TIER3_TIER4_REWORK.h00Z.slow, sunder: .3 } },
  h010: { role: 'support', kind: 'heal', power: 2.7, cooldown: 9.5, effect: { target: 'allies', shape: 'radius', radius: 8.5, maxTargets: 4, statusSeconds: 5, recipientMaxHpRatio: TIER3_TIER4_REWORK.h010.recipientMaxHpRatio } },
  h03T: { role: 'guardian', kind: 'shield', power: 3, cooldown: 0, effect: { target: 'allies', shape: 'radius', radius: 5.5, status: 'ward', statusSeconds: 5, statusStrength: .4, reflect: .6 } },
  h03U: { role: 'support', kind: 'heal', power: 3.2, cooldown: 9, effect: { target: 'allies', shape: 'radius', radius: 8.5, maxTargets: 4, statusSeconds: 4, recipientMaxHpRatio: TIER3_TIER4_REWORK.h03U.recipientMaxHpRatio } },
  h03V: { role: 'ranger', kind: 'cleave', power: 3.7, cooldown: 0, effect: { target: 'enemy', shape: 'line', length: 13, width: 5.5, status: 'slow', statusSeconds: 2.2, statusStrength: TIER3_TIER4_REWORK.h03V.slow } },
};

export const TIER3_TIER4_DESIGNS: Readonly<Record<string, TierDesign>> = Object.fromEntries(brief.heroes.map((hero) => {
  const settings = SETTINGS[hero.id];
  if (!settings) throw new Error(`Missing Tier 3/4 skill settings for ${hero.id}`);
  const stats: TierStats = hero.stats;
  if (!['cooldown', 'rage_on_attack', 'rage_on_hit'].includes(hero.energyType))
    throw new Error(`Invalid Tier 3/4 energy type for ${hero.id}`);
  const ability: HeroAbility = {
    id: `tier3-tier4-${hero.id}`,
    name: hero.skillName,
    description: `${reworkBriefText(hero.id, 'skillParameters', hero.skillParameters)}. ${reworkBriefText(hero.id, 'skillEffect', hero.skillEffect)}`,
    provenance: 'original',
    kind: settings.kind,
    cooldown: settings.cooldown,
    power: settings.power,
    effect: settings.effect,
  };
  return [hero.id, {
    ...stats,
    role: settings.role,
    element: hero.element,
    block: stats.block ?? 0,
    energyType: hero.energyType as EnergyType,
    maxEnergy: 100,
    ability,
    trait: { name: 'Đánh thường', description: reworkBriefText(hero.id, 'basicAttack', hero.basicAttack) },
  }];
}));
