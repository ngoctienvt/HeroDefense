import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

/**
 * Skill id → hero id for the tier-skill painters. Strict on purpose: only the listed prefixes count.
 * (Moved from visual-tier-skills.ts, which re-exports it.)
 */
export function extractHeroIdFromSkill(skillId?: string): string {
  if (!skillId) return '';
  if (skillId.startsWith('skill-')) return skillId.slice(6);
  if (skillId.startsWith('web-')) return skillId.slice(4);
  if (skillId.startsWith('trait-')) return skillId.slice(6);
  if (skillId.startsWith('burst-')) return skillId.slice(6);
  if (skillId.startsWith('splash-')) return skillId.slice(7);
  if (skillId.startsWith('bounce-')) return skillId.slice(7);
  if (skillId.startsWith('mark-detonate-')) return skillId.slice(14);
  return '';
}

/** Hero id from any `<kind>-<heroId>` skill id (skill-, trait-, shield-, bolt-, …); '' when none. */
export function heroIdFromSkillId(skillId?: string): string {
  if (!skillId) return '';
  const tail = skillId.slice(skillId.lastIndexOf('-') + 1);
  return /^h[0-9A-Za-z]{3}$/.test(tail) ? tail : '';
}

/** What `VisualEffects.show` knows besides the caster/impact points: every target hit and whether a caster was given. */
export interface AbilityExtra {
  readonly targets: readonly Vector3[];
  readonly hasOrigin: boolean;
}

/**
 * What a hero's VFX module exposes to the kit registry. Every hook is optional except tick/clear.
 * `cast`/`ability` return true when the event was handled so the caller stops routing it.
 */
export interface HeroVfx {
  readonly heroId: string;
  /** Extra hero ids served by the same module (e.g. one divine painter for five heroes). */
  readonly aliases?: readonly string[];
  /** Ensure atlases/materials when the hero appears on the field (idempotent). */
  prepare(): void;
  cast?(event: GameEvent, at: Vector3, reduced: boolean): boolean;
  ability?(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean;
  /** Snapshot marker (aura, ward, frozen…); called every frame the state is present. */
  mark?(kind: string, id: string, at: Vector3, reduced: boolean): void;
  tick(dt: number, time: number): void;
  clear(): void;
}

/** Routes server events and snapshot markers to registered hero modules; owns the shared clock. */
export class HeroVfxRegistry {
  private heroes = new Map<string, HeroVfx>();
  private modules = new Set<HeroVfx>();
  private prepared = new Set<string>();
  private time = 0;

  register(vfx: HeroVfx): void {
    this.modules.add(vfx);
    for (const id of [vfx.heroId, ...(vfx.aliases ?? [])]) this.heroes.set(id, vfx);
  }

  has(heroId: string): boolean { return this.heroes.has(heroId); }

  /** Once per hero per zone (reset by clear()); called from the snapshot loop. */
  prepare(heroId: string): void {
    const vfx = this.heroes.get(heroId);
    if (!vfx || this.prepared.has(heroId)) return;
    this.prepared.add(heroId);
    vfx.prepare();
    debug('visual.kit.registry.prepare', { heroId });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    return this.heroes.get(heroIdFromSkillId(event.skillId))?.cast?.(event, at, reduced) ?? false;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    return this.heroes.get(heroIdFromSkillId(event.skillId))?.ability?.(event, origin, at, reduced, extra) ?? false;
  }

  mark(heroId: string, kind: string, id: string, at: Vector3, reduced: boolean): void {
    this.heroes.get(heroId)?.mark?.(kind, id, at, reduced);
  }

  tick(dt: number): void {
    if (!Number.isFinite(dt) || dt <= 0) return;
    this.time += dt;
    for (const vfx of this.modules) vfx.tick(dt, this.time);
  }

  clear(): void {
    for (const vfx of this.modules) vfx.clear();
    this.prepared.clear();
  }
}
