import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { BLESSING_SECONDS, CHANT_SECONDS, SA_CAPS, blessingPose, chantPose,
  guidancePose, guidanceSeconds, guidanceStrip, guidanceUvs } from './visual-sa-ngo-tinh-timeline.js';
import layout from './visual-sa-ngo-tinh-layout.json';

export type SandArt = 'chant' | 'ground' | 'guidance' | 'pillar' | 'quicken';
type Chant = { at: Vector3; age: number; reduced: boolean; main?: Mesh; ground?: Mesh };
type Flight = { from: Vector3; to: Vector3; age: number; duration: number; mesh?: Mesh };
type Blessing = { at: Vector3; age: number; reduced: boolean; pillar?: Mesh; quicken?: Mesh; ground?: Mesh };

/** Gold skull beads carry the sand blessing; shared ward rendering stays snapshot-owned. */
export class SaNgoTinhArt {
  readonly art: Tier3Art<SandArt>;
  private chants: Chant[] = []; private flights: Flight[] = []; private blessings: Blessing[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'sa-ngo-tinh', layout, ['chant', 'guidance', 'pillar', 'quicken'], 128);
  }
  prepare(): void { this.art.prepare(); }
  chant(at: Vector3, reduced: boolean): void {
    if (this.chants.length < SA_CAPS.chants) this.chants.push({ at: at.clone(), age: 0, reduced });
  }
  guide(origin: Vector3 | undefined, to: Vector3, reduced: boolean): void {
    if (reduced || !origin || Vector3.DistanceSquared(origin, to) < .01) { this.arrive(to, reduced); return; }
    if (this.flights.length >= SA_CAPS.flights) return;
    this.flights.push({ from: origin.clone(), to: to.clone(), age: 0,
      duration: guidanceSeconds(Vector3.Distance(origin, to)) });
  }
  private arrive(at: Vector3, reduced: boolean): void {
    if (this.blessings.length >= SA_CAPS.blessings) return;
    this.blessings.push({ at: at.clone(), age: 0, reduced });
    this.bank.ring(at, 1.15, 'sangotinh', { life: .45, hold: true, fill: .16, rim: .7, alpha: .65, reduced });
    if (!reduced) {
      this.bank.spray('sangotinh').ring(at, .65, 16, .12, 1.3, 2.1);
      this.bank.spray('gold').rise(at, .45, 5);
    }
  }
  tick(dt: number): void {
    for (let i = this.chants.length - 1; i >= 0; i--) {
      const c = this.chants[i]; c.age += dt;
      if (c.age >= CHANT_SECONDS) {
        this.art.planes.release(c.main); this.art.planes.release(c.ground); this.chants.splice(i, 1); continue;
      }
      const pose = chantPose(c.age, c.reduced);
      c.main ??= this.art.planes.acquire('chant'); c.ground ??= this.art.planes.acquire('ground', true);
      if (c.main) {
        this.art.frame(c.main, 'chant', pose.frame); this.art.place(c.main, 'chant', c.at, 5 * pose.scale);
        c.main.visibility = pose.alpha;
      }
      if (c.ground) { this.art.ground(c.ground, 'ground', c.at, 2.1); c.ground.visibility = pose.alpha * .7; }
    }
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i]; f.age += dt;
      const pose = guidancePose(f.age, f.duration);
      if (pose.arrived) { resetStrip(f.mesh); this.art.planes.release(f.mesh); this.flights.splice(i, 1); this.arrive(f.to, false); continue; }
      f.mesh ??= this.art.planes.acquire('guidance');
      if (!f.mesh) continue;
      const delta = f.to.subtract(f.from), distance = delta.length(), direction = delta.normalize();
      const head = Vector3.Lerp(f.from, f.to, pose.progress).add(new Vector3(0, .8 + pose.lift, 0));
      const strip = guidanceStrip(distance, pose.progress, layout.guidance.bounds);
      this.art.planes.mapUvs(f.mesh, base => guidanceUvs(base, strip.reveal, layout.guidance.bounds));
      const placed = placeStrip(f.mesh, head, direction, cameraLook(this.scene), Math.max(.001, strip.span), strip.height);
      f.mesh.visibility = placed && strip.reveal > 0 ? Math.min(1, f.age / .08) : 0;
    }
    for (let i = this.blessings.length - 1; i >= 0; i--) {
      const b = this.blessings[i]; b.age += dt;
      if (b.age >= BLESSING_SECONDS) {
        this.art.planes.release(b.pillar); this.art.planes.release(b.quicken); this.art.planes.release(b.ground);
        this.blessings.splice(i, 1); continue;
      }
      const pose = blessingPose(b.age, b.reduced);
      b.pillar ??= this.art.planes.acquire('pillar'); b.quicken ??= this.art.planes.acquire('quicken');
      b.ground ??= this.art.planes.acquire('ground', true);
      if (b.pillar) {
        this.art.frame(b.pillar, 'pillar', pose.pillar); this.art.place(b.pillar, 'pillar', b.at, 2.8 * pose.scale, 5.2);
        b.pillar.visibility = .85 * pose.alpha;
      }
      if (b.quicken) {
        this.art.frame(b.quicken, 'quicken', pose.quicken); this.art.place(b.quicken, 'quicken', b.at, 3.8, 4.6);
        b.quicken.visibility = pose.alpha;
      }
      if (b.ground) { this.art.ground(b.ground, 'ground', b.at, 1.15); b.ground.visibility = .6 * pose.alpha; }
    }
  }
  clear(): void {
    for (const f of this.flights) resetStrip(f.mesh);
    this.chants.length = 0; this.flights.length = 0; this.blessings.length = 0; this.art.clear();
  }
}
