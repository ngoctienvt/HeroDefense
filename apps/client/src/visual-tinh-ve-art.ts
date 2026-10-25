import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { CALL_LIFE, CRATER_LIFE, STONE_FALL, STONE_HIT, TINH_CAPS, TINH_VE as T,
  stoneCall, stoneFall, stoneImpact, stoneTrail, stoneTrailUvs } from './visual-tinh-ve-timeline.js';
import layout from './visual-tinh-ve-layout.json';

export type TinhArt = 'call' | 'warning' | 'boulder' | 'trail' | 'hit' | 'crater';
type Call = { at: Vector3; age: number; reduced: boolean; mesh?: Mesh };
type Warning = { at: Vector3; remaining: number; radius: number; touched: boolean; reduced: boolean; mesh?: Mesh };
type Stone = { at: Vector3; start: Vector3; age: number; reduced: boolean; fired: boolean;
  rock?: Mesh; trail?: Mesh; hit?: Mesh; crater?: Mesh };

export class TinhVeArt {
  readonly art: Tier3Art<TinhArt>; private calls: Call[] = []; private stones: Stone[] = [];
  private warnings = new Map<string, Warning>();
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'tinh-ve', layout, ['call', 'boulder', 'trail', 'hit'], 160);
  }
  prepare(): void { this.art.prepare(); }
  call(at: Vector3, reduced: boolean): void {
    if (this.calls.length < TINH_CAPS.calls) this.calls.push({ at: at.clone(), age: 0, reduced });
  }
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    let warning = this.warnings.get(id);
    if (!warning) {
      if (this.warnings.size >= TINH_CAPS.warnings) return;
      warning = { at: at.clone(), radius, remaining, touched: true, reduced }; this.warnings.set(id, warning);
    }
    warning.at.copyFrom(at); Object.assign(warning, { radius, remaining, touched: true, reduced });
  }
  /** Called exactly once per confirmed pulse event, never from the ability/warning clocks. */
  pulse(at: Vector3, origin: Vector3 | undefined, reduced: boolean): void {
    if (this.stones.length >= TINH_CAPS.stones) return;
    const back = origin ? origin.subtract(at) : Vector3.Zero(); back.y = 0;
    if (back.lengthSquared() > .001) back.normalize().scaleInPlace(1.8);
    const start = at.add(back).add(new Vector3(0, 6, 0));
    this.stones.push({ at: at.clone(), start, age: reduced ? STONE_FALL : 0, reduced, fired: false });
  }
  tick(dt: number): void {
    for (const [id, warning] of this.warnings) {
      if (!warning.touched) { this.art.planes.release(warning.mesh); this.warnings.delete(id); continue; }
      warning.touched = false; warning.mesh ??= this.art.planes.acquire('warning', true);
      if (warning.mesh) {
        this.art.ground(warning.mesh, 'warning', warning.at, warning.radius);
        warning.mesh.visibility = .8 * Math.min(1, warning.remaining / .18);
      }
    }
    for (let i = this.calls.length - 1; i >= 0; i--) {
      const c = this.calls[i]; c.age += dt;
      if (c.age >= CALL_LIFE) { this.art.planes.release(c.mesh); this.calls.splice(i, 1); continue; }
      const pose = stoneCall(c.age, c.reduced);
      c.mesh ??= this.art.planes.acquire('call'); if (c.mesh) {
        this.art.frame(c.mesh, 'call', pose.frame); this.art.place(c.mesh, 'call', c.at, 4.5);
        c.mesh.visibility = pose.alpha;
      }
    }
    for (let i = this.stones.length - 1; i >= 0; i--) {
      const s = this.stones[i]; s.age += dt;
      const impactAge = s.age - STONE_FALL;
      if (impactAge >= CRATER_LIFE) {
        this.releaseFlight(s); this.art.planes.release(s.hit); this.art.planes.release(s.crater); this.stones.splice(i, 1); continue;
      }
      if (impactAge < 0) {
        const pose = stoneFall(s.age), position = Vector3.Lerp(s.start, s.at, pose.progress);
        s.rock ??= this.art.planes.acquire('boulder'); s.trail ??= this.art.planes.acquire('trail');
        if (s.rock) this.art.place(s.rock, 'boulder', position, 3.1);
        if (s.trail) {
          const shape = stoneTrail(pose.progress, layout.trail.bounds);
          this.art.planes.mapUvs(s.trail, base => stoneTrailUvs(base, shape.reveal, layout.trail.bounds));
          const direction = s.at.subtract(s.start);
          const placed = placeStrip(s.trail, position.add(new Vector3(0, .65, 0)), direction, cameraLook(this.scene),
            Math.max(.001, shape.length), shape.height);
          s.trail.visibility = placed && shape.reveal > 0 ? .8 : 0;
        }
        continue;
      }
      this.releaseFlight(s);
      if (!s.fired) {
        s.fired = true;
        this.bank.ring(s.at, T.hitRadius, 'tinhve', { life: .35, fill: .2, rim: .7, reduced: s.reduced });
        if (!s.reduced) {
          this.bank.spray('tinhve').ring(s.at, .45, 14, .18, 1.1, 2.4);
          this.bank.spray('frost').ring(s.at, .2, 3, .1, .7, 1.6);
        }
      }
      const pose = stoneImpact(impactAge, s.reduced);
      if (impactAge < STONE_HIT) {
        s.hit ??= this.art.planes.acquire('hit'); if (s.hit) {
          this.art.frame(s.hit, 'hit', pose.frame);
          const bounds = layout.hit.bounds, width = T.hitRadius * 2 / (bounds.right - bounds.left);
          this.art.place(s.hit, 'hit', s.at, width); s.hit.visibility = pose.alpha;
        }
      } else { this.art.planes.release(s.hit); s.hit = undefined; }
      s.crater ??= this.art.planes.acquire('crater', true); if (s.crater) {
        this.art.ground(s.crater, 'crater', s.at, T.hitRadius); s.crater.visibility = .85 * pose.craterAlpha;
      }
    }
  }
  private releaseFlight(s: Stone): void {
    resetStrip(s.trail); this.art.planes.release(s.trail); this.art.planes.release(s.rock); s.trail = s.rock = undefined;
  }
  clear(): void {
    for (const s of this.stones) this.releaseFlight(s);
    this.stones.length = 0; this.calls.length = 0; this.warnings.clear(); this.art.clear();
  }
}
