import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import { HERO_BY_ID } from '../../../content/catalog.js';

/** Presentation reach of a hero's basic attack, always read from the authoritative combat profile. */
export interface AttackReach { type: string; reach: number; angle?: number; bounces?: number }

export function attackReach(heroId: string): AttackReach | undefined {
  const geometry = HERO_COMBAT_PROFILES[heroId]?.geometry;
  if (!geometry) return undefined;
  const g = geometry as unknown as Record<string, number | string | undefined>;
  const num = (key: string): number => (typeof g[key] === 'number' ? g[key] as number : 0);
  switch (geometry.type) {
    case 'frontal_cleave': return { type: geometry.type, reach: num('radius'), angle: num('angle') };
    case 'linear_pierce': return { type: geometry.type, reach: num('length') };
    case 'impact_splash': return { type: geometry.type, reach: num('radius') };
    case 'bounce': return { type: geometry.type, reach: num('bounceRadius'), bounces: num('bounces') };
    default: return { type: geometry.type, reach: 0 };
  }
}

/** Orbit-aura radius from the on-hit trait (0 when the hero has none). */
export function auraRadius(heroId: string): number {
  const trait = HERO_COMBAT_PROFILES[heroId]?.trait as unknown as { type?: string; orbitRadius?: number } | undefined;
  return trait?.type === 'orbit_aura' ? trait.orbitRadius ?? 2.8 : 0;
}

/** Earthquake / nth-strike radius of a trait (0 when none). */
export function nthRadius(heroId: string): number {
  const trait = HERO_COMBAT_PROFILES[heroId]?.trait as unknown as { nthRadius?: number } | undefined;
  return trait?.nthRadius ?? 0;
}

/** Radius of the hero's active skill from the catalog design (0 when it has none). */
export function skillRadius(heroId: string): number {
  return HERO_BY_ID[heroId]?.ability?.effect?.radius ?? 0;
}
