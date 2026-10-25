import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, TouchedLayers } from './visual-kit-layers.js';
import { STATUS_FADE, statusActive, statusAlpha, type StatusKind } from './visual-thaibach-timeline.js';

type Ring = { age: number; out: number; reduced: boolean; kind: StatusKind };
const MAX_RINGS = 16;
const RING_RADIUS: Readonly<Record<StatusKind, number>> = { haste: 1.1, immortal: 1.5 };

/**
 * Star-silver aftermath on a recipient of Tinh Quân / Trường Canh: a thin ring at the feet while the snapshot shows
 * `haste` (at most the 5 s haste) or `divineImmortal` (1.5 s). Haste and divineImmortal also come from other heroes,
 * so a marker only draws for ids recorded from our own events (`record`), and only inside the design window. When the
 * marker stops the ring eases out in .25 s. The shared haste / invulnerable marks still draw above it.
 */
export class ThaibachStatus {
  private recorded = new Map<string, { kind: StatusKind; at: number }>();
  private pool: LayerPool;
  private rings: TouchedLayers<Ring>;
  private serial = 0;
  private now = 0;

  constructor(scene: Scene, private bank: KitFxBank) {
    this.pool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'changgeng', `thaibach-status-${this.serial++}`),
      MAX_RINGS, 'thaibach-status');
    this.rings = new TouchedLayers(this.pool, () => ({ age: 0, out: 0, reduced: false, kind: 'haste' }));
  }

  /** Our own event granted `kind` to `id` (a heal grants haste, a revive/star-guard grants invulnerability). */
  record(id: string | undefined, kind: StatusKind): void {
    if (id) this.recorded.set(`${id}:${kind}`, { kind, at: this.now });
  }

  /** Snapshot marker (every frame while the ally shows that status). */
  mark(kind: StatusKind, id: string, at: Vector3, reduced: boolean): void {
    const entry = this.recorded.get(`${id}:${kind}`);
    if (!entry || !statusActive(kind, entry.at, this.now)) return;
    const ring = this.rings.touch(`${id}:${kind}`);
    if (!ring) return;
    ring.state.reduced = reduced;
    ring.state.kind = kind;
    ring.layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    ring.layer.mesh.position.set(at.x, .05, at.z);
    ring.layer.mesh.scaling.setAll(RING_RADIUS[kind] * 2);
  }

  tick(dt: number, time: number): void {
    this.now = time;
    this.rings.sweep(({ layer, state }, touched) => {
      if (touched) { state.age += dt; state.out = 0; } else state.out += dt;
      const m = layer.material;
      m.setFloat('uTime', time); m.setFloat('uFill', state.kind === 'immortal' ? .16 : .06); m.setFloat('uRim', 1);
      m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', 0);
      m.setFloat('uAlpha', statusAlpha(state.age, state.out, time, state.reduced));
      if (touched && !state.reduced && Math.random() < dt * 1.4) {
        this.bank.spray('changgeng').rise(new Vector3(layer.mesh.position.x, 0, layer.mesh.position.z), .8, 1);
      }
      return state.out >= STATUS_FADE;
    });
    for (const [key, entry] of this.recorded) if (time - entry.at > 8) this.recorded.delete(key);
  }

  clear(): void {
    this.rings.clear();
    this.recorded.clear();
  }
}
