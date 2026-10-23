import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { ntId, ntMeta, setFrame } from './visual-nguyen-thuy-art.js';
import { tier6Ending } from './visual-tier6-timeline.js';

const MAX_SIGILS = 24;
const MAX_PULSES = 16;
const SIGIL_SIZE = 2.7;
const ENDING = .35;
const PULSE_SECONDS = .5;
/** Pinwheel frame of the banner sheet: a three-arm Hỗn Độn seal that reads from above. */
const SIGIL_FRAME = 10;

type Sigil = { mesh: Mesh; ring: Layer; age: number; touched: boolean; exiting?: number; meshAlpha: number; ringAlpha: number };
type Pulse = { layer: Layer; age: number; reduced: boolean };

/**
 * Snapshot state of the ultimate on each ally: `primordialBlessing` (6 s pierce) and `divineImmortal` (2 s). The shared
 * invulnerable sheet and the armour-pierce mark are the game-wide status art and stay untouched; this adds only the
 * hero-specific seal under the ally: a slowly turning Hỗn Độn pinwheel and a jade rim, brighter while immortal, closing
 * with the real `remaining`. `blessing-h014` event: a short ripple on the ally that just received it.
 */
export class NguyenThuyStatus {
  private sigils = new Map<string, Sigil>();
  private rings: LayerPool;
  private pulses: Pulse[] = [];
  private pulsePool: LayerPool;
  private serial = 0;
  private time = 0;

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {
    const make = (name: string): Layer => {
      const layer = createGroundLayer(scene, 'kitGround', 'chaos', `nguyenthuy-${name}-${this.serial++}`);
      layer.material.setFloat('uBand', 0);
      return layer;
    };
    this.rings = new LayerPool(() => make('sigil-ring'), MAX_SIGILS, 'nguyenthuy-sigil-ring');
    this.pulsePool = new LayerPool(() => make('pulse'), MAX_PULSES, 'nguyenthuy-pulse');
  }

  /** Called every frame the ally carries the blessing. */
  mark(id: string, at: Vector3, remaining: number, immortal: number, reduced: boolean): void {
    if (![at.x, at.z, remaining, immortal].every(Number.isFinite) || remaining <= 0) return;
    let sigil = this.sigils.get(id);
    if (!sigil) {
      const mesh = this.art.acquire(ntId('sigil'), true);
      const ring = this.rings.acquire();
      if (!mesh || !ring) {
        this.art.release(mesh); if (ring) this.rings.release(ring);
        debug('visual.nguyenthuy.cap', { layer: 'sigil' });
        return;
      }
      ring.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      sigil = { mesh, ring, age: 0, touched: true, meshAlpha: 0, ringAlpha: 0 };
      this.sigils.set(id, sigil);
    }
    sigil.touched = true; sigil.exiting = undefined;
    this.place(sigil, at, remaining, immortal, reduced);
  }

  /** `blessing-h014` on one ally: a quick Hỗn Độn ripple with a few shards. */
  pulse(at: Vector3, reduced: boolean): void {
    if (this.pulses.length >= MAX_PULSES) { debug('visual.nguyenthuy.cap', { layer: 'pulse' }); return; }
    const layer = this.pulsePool.acquire();
    if (!layer) return;
    layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    layer.mesh.position.set(at.x, .06, at.z);
    this.pulses.push({ layer, age: reduced ? PULSE_SECONDS * .4 : 0, reduced });
    if (!reduced) this.spray.ring(at, 1.1, 8, .5, 1.6, 3.6);
    debug('visual.nguyenthuy.blessing', { reduced });
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (const [id, sigil] of this.sigils) {
      sigil.age += dt;
      if (!sigil.touched) sigil.exiting = (sigil.exiting ?? 0) + dt;
      sigil.touched = false;
      if ((sigil.exiting ?? 0) >= ENDING) { this.drop(id, sigil); continue; }
      if (sigil.exiting !== undefined) this.fade(sigil, 1 - sigil.exiting / ENDING);
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i];
      pulse.age += dt;
      if (pulse.age >= PULSE_SECONDS) { this.pulsePool.release(pulse.layer); this.pulses.splice(i, 1); continue; }
      const t = pulse.age / PULSE_SECONDS;
      pulse.layer.mesh.scaling.setAll(pulse.reduced ? 3.4 : 1.2 + 2.4 * (1 - (1 - t) * (1 - t)));
      const m = pulse.layer.material;
      m.setFloat('uTime', time); m.setFloat('uAlpha', (1 - t) * .9); m.setFloat('uFill', .1);
      m.setFloat('uRim', 1); m.setFloat('uRings', 0); m.setFloat('uSwirl', 0); m.setFloat('uSpiral', 0);
    }
  }

  clear(): void {
    for (const [id, sigil] of this.sigils) this.drop(id, sigil);
    for (const pulse of this.pulses) this.pulsePool.release(pulse.layer);
    this.pulses.length = 0;
    this.rings.releaseAll(); this.pulsePool.releaseAll();
  }

  private place(sigil: Sigil, at: Vector3, remaining: number, immortal: number, reduced: boolean): void {
    const end = tier6Ending(remaining, ENDING);
    const meta = ntMeta('sigil');
    const size = SIGIL_SIZE * (reduced ? 1 : 1 - end * .15);
    if (meta) sigil.mesh.scaling.set(size, size * meta.height / meta.width, 1);
    sigil.mesh.position.set(at.x, .075, at.z);
    // Plane lies flat (rotation.x = π/2): turning it about world Y spins the seal on the ground.
    sigil.mesh.rotation.y = reduced ? 0 : -this.time * (immortal > 0 ? .9 : .5);
    setFrame(this.art, sigil.mesh, 'sigil', SIGIL_FRAME);
    sigil.meshAlpha = (immortal > 0 ? .85 : .6) * (1 - end * .85);
    sigil.mesh.visibility = sigil.meshAlpha;
    sigil.ring.mesh.position.set(at.x, .05, at.z);
    sigil.ring.mesh.scaling.setAll(size * 1.15);
    const m = sigil.ring.material;
    m.setFloat('uTime', reduced ? 0 : this.time);
    sigil.ringAlpha = (immortal > 0 ? .85 : .5) * (1 - end);
    m.setFloat('uAlpha', sigil.ringAlpha);
    m.setFloat('uFill', immortal > 0 ? .18 : .06); m.setFloat('uRim', immortal > 0 ? 1 : .7);
    m.setFloat('uRings', 0); m.setFloat('uSwirl', reduced ? 0 : .6); m.setFloat('uSpiral', 0);
  }

  private fade(sigil: Sigil, factor: number): void {
    const keep = Math.max(0, factor);
    sigil.mesh.visibility = sigil.meshAlpha * keep;
    sigil.ring.material.setFloat('uAlpha', sigil.ringAlpha * keep);
  }

  private drop(id: string, sigil: Sigil): void {
    this.sigils.delete(id);
    this.art.release(sigil.mesh);
    this.rings.release(sigil.ring);
  }
}
