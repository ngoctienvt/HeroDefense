import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import { debug } from './debug.js';
import { ATLASES } from './visual-kit-atlas-manifest.js';

/** Lazily-created, pooled SpriteManagers for the Blender flipbooks (frames picked by each timeline). */
export class KitFlipbooks {
  private managers = new Map<string, SpriteManager>();
  private pools = new Map<string, Sprite[]>();
  private live = new Map<string, Set<Sprite>>();
  private capLogged = new Set<string>();

  constructor(private scene: Scene) {}

  /** Creates the atlas's SpriteManager on first call only; false when the id is unknown/invalid. */
  ensure(id: string): boolean {
    if (this.managers.has(id)) return true;
    const atlas = ATLASES.get(id);
    if (!atlas) { debug('visual.kit.atlas.invalid', { atlas: id, problems: ['unknown id'] }); return false; }
    const manager = new SpriteManager(`kit-${id}`, atlas.url, atlas.capacity,
      { width: atlas.cell, height: atlas.cell }, this.scene);
    manager.isPickable = false;
    manager.texture.hasAlpha = true;
    manager.texture.onLoadObservable.addOnce(() => debug('visual.kit.asset.ready', { asset: id }));
    this.managers.set(id, manager);
    this.pools.set(id, []);
    this.live.set(id, new Set());
    return true;
  }

  ready(id: string): boolean { return this.managers.get(id)?.texture.isReady() ?? false; }

  /** Returns undefined when the atlas is missing/not loaded or the cap is reached; callers keep their shader layers. */
  spawn(id: string, ground: Vector3, scale: number): Sprite | undefined {
    const manager = this.managers.get(id);
    const live = this.live.get(id);
    const atlas = ATLASES.get(id);
    if (!manager || !live || !atlas || !this.ready(id)) {
      debug('visual.kit.asset.missing', { asset: id });
      return undefined;
    }
    if (live.size >= atlas.capacity) {
      if (!this.capLogged.has(id)) { this.capLogged.add(id); debug('visual.kit.pool.cap', { pool: id }); }
      return undefined;
    }
    const sprite = this.pools.get(id)?.pop() ?? new Sprite(`kit-${id}`, manager);
    this.place(id, sprite, ground, scale);
    sprite.cellIndex = 0;
    sprite.isVisible = true;
    sprite.isPickable = false;
    live.add(sprite);
    return sprite;
  }

  place(id: string, sprite: Sprite, ground: Vector3, scale: number): void {
    const atlas = ATLASES.get(id);
    if (!atlas) return;
    sprite.width = sprite.height = atlas.ortho * scale;
    sprite.position.set(ground.x, ground.y + atlas.targetZ * scale, ground.z);
  }

  /** Idempotent: releasing a sprite that is not live (already released or cleared) does nothing. */
  release(id: string, sprite: Sprite | undefined): void {
    if (!sprite || !this.live.get(id)?.delete(sprite)) return;
    sprite.isVisible = false;
    this.pools.get(id)?.push(sprite);
  }

  /** Zone/match change: returns every live sprite to its pool and re-arms the once-per-zone cap log. */
  clear(): void {
    for (const [id, live] of this.live) {
      for (const sprite of live) { sprite.isVisible = false; this.pools.get(id)?.push(sprite); }
      live.clear();
    }
    this.capLogged.clear();
  }
}
