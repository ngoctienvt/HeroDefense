import type { HeroVfxRegistry } from './visual-kit-hero.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';
import { warHeroes, type WarModules } from './visual-hero-adapters-war.js';
import { sageHeroes, type SageModules } from './visual-hero-adapters-sage.js';
import { mythHeroes, type MythModules } from './visual-hero-adapters-myth.js';
import { lateHeroes, type LateModules } from './visual-hero-adapters-late.js';
import { smallHeroes } from './visual-hero-adapters-small.js';

export type LegacyHeroModules = WarModules & SageModules & MythModules & LateModules;

/**
 * Registers every pre-kit hero module on the kit registry, so VisualEffects routes cast/ability events by hero id
 * instead of the former per-hero `if (skillId === …)` chains, and ticks/clears them through one path.
 */
export function registerLegacyHeroes(registry: HeroVfxRegistry, modules: LegacyHeroModules, host: HeroVfxHost): void {
  for (const hero of [...warHeroes(modules, host), ...sageHeroes(modules, host), ...mythHeroes(modules, host),
    ...lateHeroes(modules, host), ...smallHeroes(host)]) registry.register(hero);
}
