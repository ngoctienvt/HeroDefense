import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';

type Entry = { ring?: Layer; charm?: Mesh; at: Vector3; phase: number; spark: number; reduced: boolean; touched: boolean };
const MAX_BLESSINGS = 20;
/** Orbit wider than the ~4-unit hero billboard so the charm reads beside the body instead of behind it. */
const ORBIT_RADIUS = 2.8, ORBIT_SPEED = 3.4, CHARM_HEIGHT = 2.8, CHARM_SIZE = 2.4, RING_SIZE = 4.2;

/**
 * Thunder blessing (+haste, lightning on hit) on each ally the snapshot reports: a fast gold rune ring at the
 * feet, a Bắc Đẩu sword charm orbiting quickly (speed) and short ice-lightning sparks (charged attacks).
 */
export class TruongBlessings {
  private rings: LayerPool;
  private entries = new Map<string, Entry>();
  private serial = 0;

  constructor(scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    this.rings = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'gold', `beidou-bless-${this.serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      const m = layer.material;
      m.setFloat('uFill', .18); m.setFloat('uRim', 1); m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0);
      return layer;
    }, MAX_BLESSINGS, 'beidou-blessing');
  }

  mark(id: string, at: Vector3, reduced: boolean): void {
    let entry = this.entries.get(id);
    if (!entry) {
      if (this.entries.size >= MAX_BLESSINGS) return;
      entry = { at: at.clone(), phase: this.entries.size * 1.7, spark: 0, reduced, touched: true };
      this.entries.set(id, entry);
      debug('visual.beidou.blessing', { reduced });
    }
    entry.at.copyFrom(at); entry.reduced = reduced; entry.touched = true;
    entry.ring ??= this.rings.acquire();
    entry.charm ??= this.art.acquire('sword');
  }

  tick(dt: number, time: number): void {
    for (const [id, entry] of this.entries) {
      if (!entry.touched) { this.free(entry); this.entries.delete(id); continue; }
      entry.touched = false;
      const { at, reduced } = entry;
      if (entry.ring) {
        entry.ring.mesh.position.set(at.x, .04, at.z);
        entry.ring.mesh.scaling.set(RING_SIZE, 1, RING_SIZE);
        const m = entry.ring.material;
        m.setFloat('uTime', time); m.setFloat('uSwirl', reduced ? 0 : 2.6);
        m.setFloat('uAlpha', reduced ? .75 : .75 + .2 * Math.sin(time * 9 + entry.phase));
      }
      const angle = reduced ? entry.phase : time * ORBIT_SPEED + entry.phase;
      const bob = reduced ? 0 : .12 * Math.sin(time * 6 + entry.phase);
      const charm = new Vector3(at.x + Math.cos(angle) * ORBIT_RADIUS, CHARM_HEIGHT + bob, at.z + Math.sin(angle) * ORBIT_RADIUS);
      if (entry.charm) {
        entry.charm.position.copyFrom(charm);
        entry.charm.scaling.set(CHARM_SIZE * 544 / 800, CHARM_SIZE, 1);
        entry.charm.visibility = reduced ? .6 : .9;
      }
      if (reduced) continue;
      entry.spark -= dt;
      if (entry.spark <= 0) {
        entry.spark = .35 + Math.random() * .25;
        this.bank.spray('frost').trail(charm, new Vector3(-Math.sin(angle) * 2.5, 1.5, Math.cos(angle) * 2.5), 2);
      }
    }
  }

  clear(): void {
    for (const entry of this.entries.values()) this.free(entry);
    this.entries.clear();
    this.rings.releaseAll();
  }

  private free(entry: Entry): void {
    if (entry.ring) this.rings.release(entry.ring);
    this.art.release(entry.charm);
    entry.ring = undefined; entry.charm = undefined;
  }
}
