import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { HeroVfxHost } from './visual-hero-adapter.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KitAuraShell } from './visual-kit-aura-shell.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { auraRadius } from './visual-kit-recipe-geometry.js';
import { paintSkillCast } from './visual-kit-recipe-skills.js';
import { runTierRecipe, type RunContext } from './visual-kit-recipe-runner.js';
import { ELEMENT_KITS, TIER12_RECIPES, type TierRecipe } from './visual-kit-recipes-tier12.js';

/** One recipe-driven hero. Cheap: it only routes; the shared host owns every pool and the clock. */
class RecipeHero implements HeroVfx {
  readonly heroId: string;
  constructor(private recipe: TierRecipe, private host: TierRecipeHost, private driver: boolean) {
    this.heroId = recipe.heroId;
  }

  /** Atlases load only when this hero is on the field. */
  prepare(): void {
    const kit = ELEMENT_KITS[this.recipe.element];
    this.host.bank.ensureAtlases(this.recipe.skill ? [kit.hit, kit.burst, kit.pillar] : [kit.hit, kit.burst]);
  }

  /** Server windup of the active skill (tier 2): telegraph ring on the caster. */
  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    return paintSkillCast(this.host.context, this.recipe, event, at, reduced);
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    return runTierRecipe(this.host.context, this.recipe, event, origin, at, reduced, extra?.targets ?? []);
  }

  /** Snapshot marker `shell` (aura archetype): the standing shell around the caster. */
  mark(kind: string, id: string, at: Vector3): void {
    if (kind === 'shell' && auraRadius(this.heroId) > 0) this.host.aura.mark(id, at);
  }

  /** Every hero module is ticked/cleared by the registry; only the driver advances the shared host. */
  tick(dt: number, time: number): void { if (this.driver) this.host.tick(dt, time); }
  clear(): void { if (this.driver) this.host.clear(); }
}

/** Shared pools, clock and memories of all recipe heroes (one bank, one aura shell pool). */
class TierRecipeHost {
  readonly bank: KitFxBank;
  readonly aura: KitAuraShell;
  readonly context: RunContext;
  private time = 0;

  constructor(scene: Scene, accents: HeroVfxHost) {
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.aura = new KitAuraShell(scene, 'ice', 12, 'tier12-shell');
    this.context = { bank: this.bank, aura: this.aura, accents, hits: new Map(), pulses: new Map(), now: () => this.time };
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.bank.tick(dt, time);
    this.aura.tick(dt, time);
  }

  clear(): void {
    this.bank.clear();
    this.aura.clear();
    this.context.hits.clear();
    this.context.pulses.clear();
  }
}

/** The tier 1–2 recipe heroes, ready for `HeroVfxRegistry.register`. */
export function createTierRecipeHeroes(scene: Scene, accents: HeroVfxHost): HeroVfx[] {
  const host = new TierRecipeHost(scene, accents);
  return TIER12_RECIPES.map((recipe, index) => new RecipeHero(recipe, host, index === 0));
}
