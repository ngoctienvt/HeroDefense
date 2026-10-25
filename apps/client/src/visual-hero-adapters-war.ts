import type { HeroVfx } from './visual-kit-hero.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';

/** No war hero is left on the legacy adapter: each one is a direct HeroVfx module registered in VisualEffects. */
export type WarModules = Record<never, never>;

export function warHeroes(_modules: WarModules, _host: HeroVfxHost): HeroVfx[] {
  return [];
}
