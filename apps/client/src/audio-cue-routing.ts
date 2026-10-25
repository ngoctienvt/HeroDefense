import type { EnemyRank, GameEvent, HeroDef, Role } from '../../../packages/contracts/src/types.js';
import { isEnemySkillEvent } from './visual-enemy-skill-routing.js';

/**
 * Which sound a confirmed combat event makes. Pure data + one resolver so the whole mapping is testable
 * without WebAudio. Presentation only: nothing here feeds back into combat.
 */
export type CueGroup = 'attack' | 'enemy' | 'skill' | 'beat';
export interface CueDef {
  /** Runtime files under /assets/audio/sfx/; one is picked at random per play. */
  files: readonly string[];
  group: CueGroup;
  /** Linear gain before the SFX bus; balances the sources against each other. */
  gain: number;
  /** Minimum wall-clock gap between two plays of this cue. */
  cooldownMs: number;
}

const cue = (group: CueGroup, gain: number, cooldownMs: number, ...files: string[]): CueDef => ({ files, group, gain, cooldownMs });

export const CUES = {
  'atk-slash': cue('attack', .42, 45, 'atk-slash-1', 'atk-slash-2'),
  'atk-arrow': cue('attack', .4, 45, 'atk-arrow-1', 'atk-arrow-2'),
  'atk-bolt': cue('attack', .4, 45, 'atk-bolt-1', 'atk-bolt-2'),
  'atk-blunt': cue('attack', .4, 45, 'atk-blunt-1', 'atk-blunt-2'),
  'atk-chime': cue('attack', .36, 60, 'atk-chime-1', 'atk-chime-2'),
  'enemy-hit': cue('enemy', .3, 50, 'enemy-hit-1', 'enemy-hit-2'),
  'boss-hit': cue('enemy', .62, 120, 'boss-hit'),
  'cast-charge': cue('skill', .5, 90, 'cast-charge'),
  'skill-kim': cue('skill', .78, 80, 'skill-kim'),
  'skill-moc': cue('skill', .8, 80, 'skill-moc'),
  'skill-thuy': cue('skill', 1, 80, 'skill-thuy'),
  'skill-hoa': cue('skill', .72, 80, 'skill-hoa'),
  'skill-tho': cue('skill', .72, 80, 'skill-tho'),
  'skill-vo': cue('skill', .72, 80, 'skill-vo'),
  'skill-ice': cue('skill', 1, 80, 'skill-ice'),
  'skill-thunder': cue('skill', .78, 120, 'skill-thunder'),
  'skill-heal': cue('skill', .66, 120, 'skill-heal'),
  'skill-shield': cue('skill', 1, 120, 'skill-shield'),
  'death-enemy': cue('enemy', .32, 70, 'death-enemy'),
  'death-hero': cue('beat', .7, 200, 'death-hero'),
  'wave-start': cue('beat', .75, 1500, 'wave-start'),
  'boss-spawn': cue('beat', .95, 3000, 'boss-spawn'),
} as const satisfies Record<string, CueDef>;
export type CueId = keyof typeof CUES;

/** Higher wins when voices are full: match beats > skills > own attacks > allies > enemies. */
export const PRIORITY = { enemy: 0, ally: 1, own: 2, skill: 3, beat: 4 } as const;

export interface CueRequest { cue: CueId; priority: number; /** playbackRate multiplier before random jitter. */ rate: number }

/** What the battlefield knows about the event's actors when it arrives. */
export interface CueContext {
  viewZone: number;
  /** Zone the event happened in (event.zone, else its source/target actor's zone). */
  eventZone?: number;
  sourceHero?: Pick<HeroDef, 'role' | 'element'>;
  sourceEnemyRank?: EnemyRank;
  /** For `death`: whether the fallen actor is a hero. */
  targetIsHero?: boolean;
  ownSource?: boolean;
}

/** Follow-up events of a skill that already made its sound, or deliberately quiet accents. */
export const SILENT_SKILLS: ReadonlySet<string> = new Set([
  'peacock-poison-hit-h03R',
  'cataclysm-h01B',
  'quake-h00E',
]);

/** Skills whose material is not their hero's element (ice and lightning have no element of their own). */
export const SKILL_CUE_OVERRIDES: Readonly<Record<string, CueId>> = {
  'tier3-tier4-h00T': 'skill-thunder',
  'skill-h019': 'skill-thunder',
  'bolt-h019': 'skill-thunder',
  'skill-h040': 'skill-thunder',
  'bolt-h040': 'skill-thunder',
  'tier3-tier4-h00Z': 'skill-ice',
  'freeze-h018': 'skill-ice',
  'reflect-h009': 'skill-kim',
};

/** ELEMENT_LABELS order: Vô, Kim, Mộc, Thủy, Hỏa, Thổ. */
const ELEMENT_CUES: readonly CueId[] = ['skill-vo', 'skill-kim', 'skill-moc', 'skill-thuy', 'skill-hoa', 'skill-tho'];
/** The shared windup is tinted per element by pitch: metal rings higher, earth and fire sit lower. */
const ELEMENT_CHARGE_RATE: readonly number[] = [1, 1.12, .96, 1.05, .9, .84];
const ROLE_CUES: Readonly<Record<Role, CueId>> = {
  warrior: 'atk-slash', ranger: 'atk-arrow', mage: 'atk-bolt', guardian: 'atk-blunt', support: 'atk-chime',
};

export function elementCue(element: number | undefined): CueId { return ELEMENT_CUES[element ?? 0] ?? 'skill-vo'; }

/** Main-island boss (zone 0): heard from anywhere, like the music that follows it. */
function isSharedBoss(ctx: CueContext): boolean { return ctx.sourceEnemyRank === 'boss' && ctx.eventZone === 0; }

/** First match wins; undefined means the event stays silent. */
export function resolveCue(event: Pick<GameEvent, 'kind' | 'ability' | 'skillId'>, ctx: CueContext): CueRequest | undefined {
  if (event.kind === 'wave') return { cue: 'wave-start', priority: PRIORITY.beat, rate: 1 };
  if (event.kind !== 'attack' && event.kind !== 'cast' && event.kind !== 'ability' && event.kind !== 'death') return undefined;
  if (ctx.eventZone !== undefined && ctx.eventZone !== ctx.viewZone && !isSharedBoss(ctx)) return undefined;
  if (event.skillId && SILENT_SKILLS.has(event.skillId)) return undefined;

  if (event.kind === 'death')
    return ctx.targetIsHero ? { cue: 'death-hero', priority: PRIORITY.beat, rate: 1 } : { cue: 'death-enemy', priority: PRIORITY.enemy, rate: 1 };

  const enemy = !ctx.sourceHero && ctx.sourceEnemyRank !== undefined;
  const actorPriority = enemy ? PRIORITY.enemy : ctx.ownSource ? PRIORITY.own : PRIORITY.ally;
  const override = event.skillId ? SKILL_CUE_OVERRIDES[event.skillId] : undefined;
  if (override && event.kind !== 'cast') return { cue: override, priority: PRIORITY.skill, rate: 1 };

  if (event.kind === 'cast') {
    if (enemy) return { cue: 'cast-charge', priority: ctx.sourceEnemyRank === 'boss' ? PRIORITY.skill : PRIORITY.enemy, rate: .72 };
    return { cue: 'cast-charge', priority: PRIORITY.skill, rate: ELEMENT_CHARGE_RATE[ctx.sourceHero?.element ?? 0] ?? 1 };
  }
  if (event.ability === 'heal') return { cue: 'skill-heal', priority: PRIORITY.skill, rate: 1 };
  if (event.ability === 'shield') return { cue: 'skill-shield', priority: PRIORITY.skill, rate: 1 };

  if (enemy) {
    const skill = event.kind === 'ability' || isEnemySkillEvent(event.skillId);
    if (ctx.sourceEnemyRank === 'boss') return { cue: skill ? 'skill-tho' : 'boss-hit', priority: PRIORITY.skill, rate: skill ? .8 : 1 };
    if (skill) return { cue: 'skill-tho', priority: ctx.sourceEnemyRank === 'chieftain' ? PRIORITY.skill : PRIORITY.ally, rate: .9 };
    return { cue: 'enemy-hit', priority: PRIORITY.enemy, rate: 1 };
  }
  if (event.kind === 'ability') return { cue: elementCue(ctx.sourceHero?.element), priority: PRIORITY.skill, rate: 1 };
  if (!ctx.sourceHero) return undefined;
  return { cue: ROLE_CUES[ctx.sourceHero.role] ?? 'atk-slash', priority: actorPriority, rate: 1 };
}
