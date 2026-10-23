import { Matrix, Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { ntId, ntMeta } from './visual-nguyen-thuy-art.js';
import { beamBasis, NT_TIME, STREAM_FAN, streamAlpha, streamProgress } from './visual-nguyen-thuy-timeline.js';

const MAX_VOLLEYS = 4;
/** Waist height of the lane, and the sword sheet's length in world units (its own 3:1 aspect is kept). */
const LANE_HEIGHT = 1.6;
const SWORD_LENGTH = 7.2;
/** Fallback when the camera cannot be read: battlefield pitch (beta .84). */
const FALLBACK_VIEW: readonly [number, number, number] = [0, -.669, -.743];

/** Scratch matrix: the quaternion copies what it needs. */
const ORIENTATION = new Matrix();

type Stream = {
  mesh?: Mesh; trail?: Layer; age: number; delay: number; dir: { x: number; z: number }; offset: number; reach: number;
  origin: Vector3; reduced: boolean;
};

/**
 * Three Hỗn Độn sword streams of ONE resolve (a motif, not three hits). Each is a fixed-aspect, camera-facing strip of the
 * Codex sword sheet (head on +X) that launches from the caster along the lane while a thin rift trail follows, so
 * it reads above monsters and below heroes instead of lying flat under them.
 */
export class NguyenThuyStreams {
  private streams: Stream[] = [];
  private trails: LayerPool;
  private serial = 0;

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {
    this.trails = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'chaos', `nguyenthuy-trail-${this.serial++}`),
      MAX_VOLLEYS * NT_TIME.maxStreams, 'nguyenthuy-trail');
  }

  /** Releases the fan from `origin` along `dir`; `reach` is the visual lane length, not a gameplay limit. */
  launch(origin: Vector3, dir: { x: number; z: number }, reach: number, reduced: boolean): void {
    if (this.streams.length + NT_TIME.maxStreams > MAX_VOLLEYS * NT_TIME.maxStreams) {
      debug('visual.nguyenthuy.cap', { layer: 'streams' }); return;
    }
    for (const fan of STREAM_FAN) {
      const cos = Math.cos(fan.angle), sin = Math.sin(fan.angle);
      this.streams.push({
        age: 0, delay: reduced ? 0 : fan.delay, origin: new Vector3(origin.x, LANE_HEIGHT, origin.z), reduced,
        dir: { x: dir.x * cos - dir.z * sin, z: dir.x * sin + dir.z * cos },
        offset: fan.lateral, reach: reach * fan.reach,
      });
    }
    if (!reduced) this.spray.trail(new Vector3(origin.x + dir.x * 1.5, 1.2, origin.z + dir.z * 1.5),
      new Vector3(dir.x * 9, 1.5, dir.z * 9), 12);
    debug('visual.nguyenthuy.streams', { reach: +reach.toFixed(1), reduced });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    const view = this.view();
    for (let i = this.streams.length - 1; i >= 0; i--) {
      const s = this.streams[i];
      if (s.delay > 0) { s.delay -= dt; if (s.delay > 0) continue; }
      s.age += dt;
      if (s.age >= NT_TIME.streamLife) { this.free(s); this.streams.splice(i, 1); continue; }
      this.draw(s, up, view, time);
    }
  }

  clear(): void {
    for (const s of this.streams) this.free(s);
    this.streams.length = 0;
    this.trails.releaseAll();
  }

  private draw(s: Stream, up: Vector3, view: readonly [number, number, number], time: number): void {
    const progress = s.reduced ? .6 : streamProgress(s.age);
    const alpha = s.reduced ? .8 : streamAlpha(s.age);
    s.mesh ??= this.art.acquire(ntId('sword'), true);
    s.trail ??= this.trails.acquire();
    const meta = ntMeta('sword');
    if (s.mesh && meta) {
      const basis = beamBasis(s.dir, view, [up.x, up.y, up.z]);
      if (basis) {
        const head = (s.reach + 1) * progress;
        const lateral = { x: -s.dir.z * s.offset, z: s.dir.x * s.offset };
        const centre = head - SWORD_LENGTH / 2;
        s.mesh.position.set(s.origin.x + s.dir.x * centre + lateral.x, s.origin.y, s.origin.z + s.dir.z * centre + lateral.z);
        Matrix.FromXYZAxesToRef(new Vector3(...basis.x), new Vector3(...basis.y), new Vector3(...basis.z), ORIENTATION);
        s.mesh.rotationQuaternion = Quaternion.FromRotationMatrix(ORIENTATION);
        s.mesh.scaling.set(SWORD_LENGTH, (basis.flip ? -1 : 1) * SWORD_LENGTH * meta.height / meta.width, 1);
        s.mesh.alphaIndex = GROUND_ALPHA_INDEX + 12;
        s.mesh.visibility = alpha;
      }
    }
    if (s.trail) {
      const length = Math.max(.5, s.reach);
      const lateral = { x: -s.dir.z * s.offset, z: s.dir.x * s.offset };
      s.trail.mesh.scaling.set(length, 1, .55);
      s.trail.mesh.position.set(s.origin.x + s.dir.x * length / 2 + lateral.x, s.origin.y - .15, s.origin.z + s.dir.z * length / 2 + lateral.z);
      s.trail.mesh.rotation.y = -Math.atan2(s.dir.z, s.dir.x);
      const m = s.trail.material;
      const tail = progress < 1 ? Math.max(0, progress - .55) : Math.min(1, (s.age - NT_TIME.streamFlight) / (NT_TIME.streamLife - NT_TIME.streamFlight));
      m.setFloat('uTime', time); m.setFloat('uHead', progress); m.setFloat('uTail', s.reduced ? 0 : tail);
      m.setFloat('uWave', s.reduced ? 0 : .4); m.setFloat('uTaper', .5); m.setFloat('uAlpha', alpha * .85);
    }
  }

  private view(): readonly [number, number, number] {
    const camera = this.scene.activeCamera as TargetCamera | null;
    if (!camera || typeof camera.getTarget !== 'function') return FALLBACK_VIEW;
    const look = camera.getTarget().subtract(camera.position);
    return look.lengthSquared() > 1e-6 ? [look.x, look.y, look.z] : FALLBACK_VIEW;
  }

  private free(s: Stream): void {
    if (s.mesh) s.mesh.rotationQuaternion = null;
    this.art.release(s.mesh);
    if (s.trail) this.trails.release(s.trail);
    s.mesh = undefined; s.trail = undefined;
  }
}
