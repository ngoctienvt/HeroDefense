import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import type { TierMotif } from './visual-tier-motif-textures.js';

/** Shared VisualEffects helpers that hero adapters use for the small accents around their own module. */
export interface HeroVfxHost {
  reduced(): boolean;
  spawn(kind: 'ring' | 'orb' | 'spark' | 'glyph', at: Vector3, color: string, size: number, duration: number,
    texture?: string): void;
  burst(at: Vector3, color: string, count: number, spread: number): void;
  tierBurst(at: Vector3, color: string, count: number, spread: number): void;
  beam(from: Vector3, to: Vector3, color: string): void;
  fireImpact(at: Vector3, full: boolean, radius: number): void;
  waterImpact(at: Vector3, radius: number, duration: number, reduced: boolean): void;
  /** Blender-authored per-skill flipbook (vfx-huyen-<kind>); `ground` lays it flat on the floor and `spin` rotates it. */
  motifShow(at: Vector3, kind: TierMotif, size: number, duration: number, reduced: boolean, ground?: boolean,
    spin?: number): void;
  motifTravel(from: Vector3, to: Vector3, kind: TierMotif, size: number, duration: number, arrive: () => void,
    reduced: boolean): void;
}

/** What a handler receives: cloned points and targets plus the `reduced` flag, resolved once per event. */
export interface HeroEventContext {
  event: GameEvent;
  /** Caster; a copy of `at` when the event carried no origin. */
  origin: Vector3;
  at: Vector3;
  targets: Vector3[];
  /** The supplied target list, or just the impact point when there were none (the "targets or [at]" pattern). */
  targetsOrAt: Vector3[];
  hasOrigin: boolean;
  reduced: boolean;
  main?: Vector3;
}

export type HeroEventHandler = (ctx: HeroEventContext) => void;

export interface LegacyHeroSpec {
  heroId: string;
  aliases?: readonly string[];
  /** skillId → handler for the cast (telegraph) event; an unlisted skillId is left to the generic chain. */
  cast?: Readonly<Record<string, HeroEventHandler>>;
  /** skillId → handler for the server ability/trait event. */
  ability?: Readonly<Record<string, HeroEventHandler>>;
  /** Match for ability skillIds that are not a fixed list (Bàn Cổ: every `*-h01B`). */
  abilityFallback?: (skillId: string) => HeroEventHandler | undefined;
  /** Ability skillIds that only apply when `event.kind === 'ability'` (the same id also arrives as a cast). */
  abilityOnly?: readonly string[];
  tick?(dt: number): void;
  clear?(): void;
}

/**
 * Wraps a pre-kit hero module as a `HeroVfx` without changing what it draws: the lookup tables replace the
 * old `if (event.skillId === …)` chain in VisualEffects, and each handler holds the original call verbatim.
 */
export function legacyHero(spec: LegacyHeroSpec): HeroVfx {
  const context = (event: GameEvent, origin: Vector3 | undefined, at: Vector3, targets: readonly Vector3[],
    hasOrigin: boolean, reduced: boolean, main?: Vector3): HeroEventContext => {
    const point = at.clone();
    return {
      event, at: point, origin: hasOrigin && origin ? origin.clone() : point.clone(),
      targets: targets.map(target => target.clone()), targetsOrAt: targets.length ? [...targets] : [at],
      hasOrigin, reduced, main: main?.clone(),
    };
  };
  return {
    heroId: spec.heroId,
    aliases: spec.aliases,
    prepare: () => undefined,
    cast: (event, at, reduced, origin) => {
      const handler = event.skillId ? spec.cast?.[event.skillId] : undefined;
      if (!handler) return false;
      handler(context(event, origin, at, [], origin !== undefined, reduced));
      return true;
    },
    ability: (event, origin, at, reduced, extra?: AbilityExtra) => {
      const id = event.skillId ?? '';
      const handler = spec.ability?.[id] ?? spec.abilityFallback?.(id);
      if (!handler || (spec.abilityOnly?.includes(id) && event.kind !== 'ability')) return false;
      handler(context(event, origin, at, extra?.targets ?? [], extra?.hasOrigin ?? true, reduced, extra?.main));
      return true;
    },
    tick: dt => spec.tick?.(dt),
    clear: () => spec.clear?.(),
  };
}

export const lift = (at: Vector3, height: number): Vector3 => at.clone().addInPlace(new Vector3(0, height, 0));
