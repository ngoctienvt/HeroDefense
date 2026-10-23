import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { actorAlphaIndex } from './visual-kit-depth.js';
import { createGuardLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { SHIELD_CHEST, SHIELD_HEIGHT, SHIELD_WIDTH, shieldDone, shieldLook } from './visual-shared-shield-timeline.js';

type Entry = { layer?: Layer; at: Vector3; follow: Vector3; age: number; touched: boolean; breakAge?: number; reduced: boolean };
/** One bubble per shielded actor; 24 at once is far above a 4-player roster. */
const MAX_SHIELDS = 24;

/**
 * The single shield of the whole game, element-neutral: a soft white fresnel bubble around the actor, sorted right
 * behind the hero billboard so the body stays crisp and only the rim shows. One entry per actor id however many sources
 * grant a shield: `mark` is called every frame the snapshot still shows an absorbing shield; when the calls stop the
 * bubble dissolves once, still following the actor's live position, and is returned to the pool. The client never decides the amount.
 */
export class SharedShield {
  private pool: LayerPool;
  private entries = new Map<string, Entry>();
  private serial = 0;
  private time = 0;

  constructor(private scene: Scene) {
    this.pool = new LayerPool(() => createGuardLayer(scene, 'guard', `shared-shield-${this.serial++}`, 24), MAX_SHIELDS, 'shared-shield');
  }

  /** Procedural: nothing to preload. Kept so hero modules can warm every shared layer the same way. */
  prepare(): void {}

  mark(id: string, at: Vector3, reduced: boolean): void {
    let entry = this.entries.get(id);
    if (entry?.breakAge !== undefined) { this.free(entry); entry = undefined; } // shield renewed while breaking: restart
    if (!entry) {
      if (this.entries.size >= MAX_SHIELDS) return;
      entry = { at: at.clone(), follow: at, age: 0, touched: true, reduced };
      this.entries.set(id, entry);
      debug('visual.shield.start', { reduced });
    }
    entry.follow = at; entry.at.copyFrom(at); entry.touched = true; entry.reduced = reduced;
  }

  tick(dt: number): void {
    this.time += dt;
    const up = screenUp(this.scene);
    for (const [id, entry] of this.entries) {
      if (entry.touched) { entry.age += dt; entry.touched = false; }
      else if (entry.breakAge === undefined) entry.breakAge = 0;
      else entry.breakAge += dt;
      entry.at.copyFrom(entry.follow); // keep riding the actor while it dissolves, when marks have stopped
      if (shieldDone(entry.breakAge, entry.reduced)) { this.free(entry); this.entries.delete(id); continue; }
      this.place(entry, up);
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) this.free(entry);
    this.entries.clear();
    this.pool.releaseAll();
  }

  private place(entry: Entry, up: Vector3): void {
    entry.layer ??= this.pool.acquire();
    if (!entry.layer) return;
    const { mesh, material } = entry.layer;
    const look = shieldLook(entry.age, entry.breakAge, entry.reduced);
    mesh.position.copyFrom(billboardCenter(entry.at, SHIELD_HEIGHT, .5, up, SHIELD_CHEST));
    mesh.scaling.set(SHIELD_WIDTH * look.scale, SHIELD_HEIGHT * look.scale, SHIELD_WIDTH * look.scale);
    // Right before this actor: the hero billboard paints over the bubble's centre, leaving only the rim around it.
    mesh.alphaIndex = actorAlphaIndex(this.scene, entry.at.x, entry.at.z) - 1;
    material.setFloat('uTime', this.time);
    material.setFloat('uAlpha', look.alpha);
    material.setFloat('uDissolve', look.dissolve);
  }

  private free(entry: Entry): void {
    if (entry.layer) this.pool.release(entry.layer);
    entry.layer = undefined;
  }
}
