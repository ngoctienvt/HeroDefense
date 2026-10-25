import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale } from './visual-nuwa-assets.js';
import { BLESS_RADIUS, BLESS_RING_LIFE, MAX_BLESS, MAX_REVIVE, MAX_WARDS, MEND_ALLY_WIDTH, mendAllyFrame, mendAllySeconds,
  REVIVE_MEND_WIDTH, WARD_DIAMETER, WARD_ENTER, WARD_EXIT, WARD_GRACE, wardAlpha, wardPulse } from './visual-nuwa-timeline.js';

type Mend = { mesh: Mesh; at: Vector3; age: number; life: number; width: number; reduced: boolean };
type Ward = { layer?: Layer; at: Vector3; remaining: number; touched: boolean; idle: number; since: number; reduced: boolean };
const MAX_MENDS = MAX_BLESS + MAX_REVIVE;

/**
 * Nữ Oa's support results, each on the ally the server named:
 * `blessing-h01C` (every deployed ally healed + shielded) → a five-colour ground pulse, rising motes and a small mending line
 * closing behind the ally; `revive-h01C` (only the allies standing up beside her) → the same mending line, larger, with a
 * petal spray (the shared revive sheet is drawn by the effects layer); the 35 % `five-color` ward → a slow stone sigil under
 * the ally for `ward.remaining`, drawing back over the last WARD_EXIT. The shield dome is the shared one and appears only
 * when the heal overflowed into `nuwaShields`.
 */
export class NuwaBlessing {
  private mends: Mend[] = [];
  private wards = new Map<string, Ward>();
  private layers: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank, private sprays: readonly KitSpray[]) {
    let serial = 0;
    this.layers = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'fivecolor', `nuwa-ward-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      layer.material.setFloat('uSpiral', 1); layer.material.setFloat('uBand', 1);
      return layer;
    }, MAX_WARDS, 'nuwa-wards');
  }

  blessing(targets: readonly Vector3[], reduced: boolean): void {
    const shown = targets.slice(0, MAX_BLESS);
    for (const [index, at] of shown.entries()) {
      this.bank.ring(at, BLESS_RADIUS, 'fivecolor', { life: BLESS_RING_LIFE, fill: .1, rim: .9, swirl: .8, alpha: .8, reduced, order: 5 });
      this.mend(at, MEND_ALLY_WIDTH, reduced);
      if (!reduced) this.sprays[index % 2 ? 0 : 1].rise(at, 1.1, 7);
    }
    if (targets.length > shown.length) debug('visual.nuwa.blessing.cap', { allies: targets.length, rendered: shown.length });
    debug('visual.nuwa.blessing', { allies: targets.length, rendered: shown.length, reduced });
  }

  revive(targets: readonly Vector3[], reduced: boolean): void {
    for (const at of targets.slice(0, MAX_REVIVE)) {
      this.mend(at, REVIVE_MEND_WIDTH, reduced);
      this.bank.ring(at, BLESS_RADIUS * 1.3, 'fivecolor', { life: BLESS_RING_LIFE, fill: .14, rim: 1, swirl: 1, alpha: .9, reduced, order: 6 });
      if (!reduced) { this.sprays[3].rise(at, 1.4, 12); this.sprays[1].ring(at, .6, 8, 1.5, 3, 5); }
    }
    debug('visual.nuwa.revive', { revived: targets.length, reduced });
  }

  /** Snapshot marker: `ward.kind === 'five-color'` of one ally (called every frame while it lasts). */
  markWard(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let ward = this.wards.get(id);
    if (!ward) {
      if (this.wards.size >= MAX_WARDS) { debug('visual.nuwa.cap', { layer: 'ward' }); return; }
      ward = { layer: this.layers.acquire(), at: at.clone(), remaining, touched: true, idle: 0, since: 0, reduced };
      this.wards.set(id, ward);
      debug('visual.nuwa.ward', { remaining: +remaining.toFixed(2), reduced });
    }
    ward.touched = true; ward.idle = 0; ward.remaining = remaining; ward.reduced = reduced; ward.at.copyFrom(at);
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.mends.length - 1; i >= 0; i--) {
      const mend = this.mends[i];
      mend.age += dt;
      if (mend.age >= mend.life) { this.art.release(mend.mesh); this.mends.splice(i, 1); continue; }
      const meta = artMeta('rift');
      if (!meta) continue;
      const scale = billboardScale('rift', mend.width);
      mend.mesh.scaling.set(scale.x, scale.y, 1);
      mend.mesh.position.copyFrom(billboardCenter(mend.at, scale.y, meta.anchorY, up, .6));
      this.art.frame(mend.mesh, mendAllyFrame(mend.age, mend.reduced), meta.columns, meta.rows);
      mend.mesh.visibility = .95;
    }
    for (const [id, ward] of this.wards) {
      // The snapshot loop marks less often than frames render: only a marker silent past the grace is really gone.
      if (ward.touched) ward.idle = 0; else ward.idle += dt;
      if (ward.idle > WARD_GRACE) { if (ward.layer) this.layers.release(ward.layer); this.wards.delete(id); continue; }
      ward.touched = false; ward.since += dt;
      this.placeWard(ward, time);
      if (!ward.reduced && ward.remaining > WARD_EXIT && Math.random() < .05) this.sprays[Math.floor(Math.random() * 4)].rise(ward.at, 1.2, 1);
    }
  }

  clear(): void {
    for (const mend of this.mends) this.art.release(mend.mesh);
    this.mends.length = 0;
    this.wards.clear();
    this.layers.releaseAll();
  }

  private mend(at: Vector3, width: number, reduced: boolean): void {
    if (this.mends.length >= MAX_MENDS) { debug('visual.nuwa.cap', { layer: 'mend' }); return; }
    const mesh = this.art.acquire('rift');
    if (mesh) this.mends.push({ mesh, at: at.clone(), age: 0, life: mendAllySeconds(reduced), width, reduced });
  }

  private placeWard(ward: Ward, time: number): void {
    ward.layer ??= this.layers.acquire();
    const layer = ward.layer;
    if (!layer) return;
    const exit = Math.min(1, ward.remaining / WARD_EXIT);
    const size = WARD_DIAMETER * (.8 + .2 * exit);
    layer.mesh.position.set(ward.at.x, .04, ward.at.z);
    layer.mesh.scaling.set(size, 1, size);
    const m = layer.material;
    m.setFloat('uTime', ward.reduced ? 0 : time);
    m.setFloat('uAlpha', .7 * wardAlpha(ward.remaining, ward.since) * wardPulse(time, ward.reduced));
    m.setFloat('uFill', .1 * Math.min(1, ward.since / WARD_ENTER)); m.setFloat('uRim', .9);
    m.setFloat('uRings', ward.reduced ? 0 : .3); m.setFloat('uSwirl', ward.reduced ? 0 : .7);
  }
}
