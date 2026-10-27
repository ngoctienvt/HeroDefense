import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { actorAlphaIndex, GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, createLatheShellLayer, LayerPool, TouchedLayers, type LatheProfile,
  type Layer } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BELL_SCALE } from './visual-kimtra-ultimate.js';
import type { KimtraBell3D } from './visual-kimtra-bell3d.js';
import { KIMTRA_ATLAS, REFLECT_RADIUS, RING_GATE, ringAlpha, ringPulse, RING_SECONDS, ringRadius, shatterFrame,
  SHATTER_SECONDS, SHELL3D_DIAMETER, SHELL3D_HEIGHT, SHELL_HANDOFF, shellAlpha, shellSettle } from './visual-kimtra-timeline.js';

/** Fanzhong silhouette (local y -.5..+.5): flared lip, straight waist, round shoulder, crown; the small
 * radius bumps are the cast hoops, which catch the fresnel rim as engraved bands. */
const BELL_PROFILE: LatheProfile = [
  [-.5, .5], [-.47, .5], [-.455, .465], [-.44, .48], [-.4, .455], [-.32, .44], [-.25, .45], [-.23, .43],
  [-.05, .42], [.13, .41], [.15, .425], [.17, .405], [.3, .395], [.33, .41], [.35, .385], [.4, .36],
  [.44, .3], [.475, .2], [.495, .08], [.5, 0],
];
/** World size of the seated shell, matching the flipbook bell at BELL_SCALE (3.6 tall, lip radius 1.52). With the
 * real-time bell the shell takes SHELL3D_* instead (fixed when the shell first appears). */
const SHELL_HEIGHT = 3.75 * BELL_SCALE;
const SHELL_DIAMETER = 3.1 * BELL_SCALE;
const MAX_BELLS = 12;
const MAX_RINGS = 6;
const MAX_SHATTERS = 8;

type BellState = { id: string; age: number; wake: number; reduced: boolean; pulse?: number; height: number; diameter: number };
type Ring = { layer: Layer; age: number };
type Shatter = { sprite: Sprite; age: number };

/**
 * Snapshot-driven seated bells (shield from Kim Tra still up), the break when the shield is gone, and the
 * counter ring-out (`reflect-h009`): the bell rings and a gold wave runs to the 3.0 counter radius.
 */
export class KimtraStatus {
  private bellPool: LayerPool;
  private bells: TouchedLayers<BellState>;
  private states = new Map<string, BellState>();
  private ringPool: LayerPool;
  private rings: Ring[] = [];
  private lastRing = new Map<string, number>();
  private shatters: Shatter[] = [];
  private serial = 0;
  private time = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray, private bell3d: KimtraBell3D) {
    this.bellPool = new LayerPool(() => createLatheShellLayer(scene, 'kimtra', `kimtra-bell-${this.serial++}`,
      BELL_PROFILE, 40), MAX_BELLS, 'kimtra-bell');
    this.bells = new TouchedLayers(this.bellPool, () => ({ id: '', age: 0, wake: 0, reduced: false,
      height: this.bell3d.ready ? SHELL3D_HEIGHT : SHELL_HEIGHT, diameter: this.bell3d.ready ? SHELL3D_DIAMETER : SHELL_DIAMETER }));
    this.ringPool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'kimtra', `kimtra-ring-${this.serial++}`),
      MAX_RINGS, 'kimtra-ring');
  }

  /** Every frame a unit still holds Kim Tra's shield (battlefield tracker). */
  markBell(id: string, at: Vector3, reduced: boolean): void {
    const entry = this.bells.touch(id);
    if (!entry) return;
    entry.state.id = id;
    entry.state.reduced = reduced;
    this.states.set(id, entry.state);
    const { mesh } = entry.layer;
    mesh.position.x = at.x; mesh.position.z = at.z; // height follows the settle scale in tick()
    // Drawn right before its own unit: the body stays crisp on top, only the gold rim shows around it.
    mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
  }

  /** `reflect-h009` at Kim Tra: gated so six blocked attackers don't stack waves. */
  ring(source: string, at: Vector3, reduced: boolean): void {
    const last = this.lastRing.get(source);
    if (last !== undefined && this.time - last < RING_GATE) return;
    this.lastRing.set(source, this.time);
    const layer = this.ringPool.acquire();
    if (layer) {
      const { mesh, material: m } = layer;
      mesh.position.set(at.x, .045, at.z);
      mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
      m.setFloat('uFill', 0); m.setFloat('uRim', 1); m.setFloat('uBand', 0); m.setFloat('uSpiral', 0);
      m.setFloat('uRings', 0); m.setFloat('uSwirl', 0);
      this.rings.push({ layer, age: reduced ? RING_SECONDS * .5 : 0 });
    }
    const bell = this.states.get(source); // the counter only fires while Kim Tra holds his own bell
    if (bell) { bell.wake = 0; if (!reduced) bell.pulse = 0; }
    if (!reduced) this.spray.ring(at, REFLECT_RADIUS * .75, 10, .6, 3.5, 2);
    debug('visual.kimtra.reflect', { reduced, bell: Boolean(bell) });
  }

  tick(dt: number, time: number): void {
    this.time = time;
    this.bells.sweep((entry, touched) => {
      const { mesh, material: m } = entry.layer;
      const state = entry.state;
      state.age += dt;
      state.wake += dt;
      m.setFloat('uTime', time);
      if (!touched) { this.states.delete(state.id); this.shatter(mesh.position, state.reduced); return true; }
      const pulse = state.pulse === undefined ? 1 : ringPulse(state.pulse += dt);
      if (state.pulse !== undefined && state.pulse > .35) state.pulse = undefined;
      // Settled: lip pulled in to the body footprint and a faint rim, so crowding units are not veiled.
      const settle = shellSettle(state.wake);
      const width = state.diameter * (1 - .4 * settle) * pulse, height = state.height * (1 - .12 * settle) * (2 - pulse);
      mesh.scaling.set(width, height, width);
      mesh.position.y = height * .5;
      m.setFloat('uAlpha', (.9 - .45 * settle) * shellAlpha(state.age - SHELL_HANDOFF));
      m.setFloat('uDissolve', 0);
      return false;
    });
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const ring = this.rings[i];
      ring.age += dt;
      const m = ring.layer.material;
      ring.layer.mesh.scaling.setAll(Math.max(.2, ringRadius(ring.age)) * 2);
      m.setFloat('uAlpha', ringAlpha(ring.age)); m.setFloat('uTime', time);
      if (ring.age >= RING_SECONDS) { this.ringPool.release(ring.layer); this.rings.splice(i, 1); }
    }
    for (let i = this.shatters.length - 1; i >= 0; i--) {
      const shatter = this.shatters[i];
      shatter.age += dt;
      if (shatter.age >= SHATTER_SECONDS) {
        this.flipbooks.release(KIMTRA_ATLAS.shatter, shatter.sprite);
        this.shatters.splice(i, 1);
        continue;
      }
      shatter.sprite.cellIndex = shatterFrame(shatter.age);
    }
  }

  clear(): void {
    this.bells.clear();
    this.bellPool.releaseAll();
    this.states.clear();
    this.rings.length = 0;
    this.ringPool.releaseAll();
    this.lastRing.clear();
    for (const shatter of this.shatters) this.flipbooks.release(KIMTRA_ATLAS.shatter, shatter.sprite);
    this.shatters.length = 0;
  }

  /** Shield gone (absorbed, death, zone change): the bell cracks and falls apart. */
  private shatter(at: Vector3, reduced: boolean): void {
    debug('visual.kimtra.bell.break', { reduced });
    if (reduced) return;
    const ground = new Vector3(at.x, 0, at.z);
    if (this.bell3d.shatter(ground)) {
      // real-time shards; the dust/gold spray below still plays
    } else if (this.shatters.length < MAX_SHATTERS) {
      const sprite = this.flipbooks.spawn(KIMTRA_ATLAS.shatter, ground, BELL_SCALE);
      if (sprite) this.shatters.push({ sprite, age: 0 });
    }
    this.spray.ring(ground, 1.2 * BELL_SCALE, 12, 1.8, 3, 3);
  }
}
