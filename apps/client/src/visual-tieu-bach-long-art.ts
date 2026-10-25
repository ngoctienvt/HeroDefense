import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { GALE_CAPS, GALE_EXIT, GALE_FLIGHT, GALE_HIT, TIEU_BACH_LONG as L,
  dragonStrip, galeLane, galePose, galeUvs } from './visual-tieu-bach-long-timeline.js';
import layout from './visual-tieu-bach-long-layout.json';

export type GaleArt = 'charge' | 'dragon' | 'lane' | 'hit';
type Flight = { at: Vector3; dir?: Vector3; age: number; reduced: boolean; dragon?: Mesh; echo?: Mesh; lane?: Mesh; release?: Mesh };
type Hit = { at: Vector3; age: number; fired: boolean; reduced: boolean; mesh?: Mesh };

/** Wind and torn leaves are the material; no client-created binding or slow status. */
export class TieuBachLongArt {
  readonly art: Tier3Art<GaleArt>; private flights: Flight[] = []; private hits: Hit[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'tieu-bach-long', layout, ['charge', 'dragon', 'hit'], 112);
  }
  prepare(): void { this.art.prepare(); }
  launch(at: Vector3, dir: { x: number; z: number } | undefined, reduced: boolean): void {
    if (this.flights.length >= GALE_CAPS.flights) return;
    this.flights.push({ at: at.clone(), dir: dir ? new Vector3(dir.x, 0, dir.z) : undefined, age: 0, reduced });
  }
  hit(at: Vector3, delay: number, reduced: boolean): void {
    if (this.hits.length < GALE_CAPS.hits) this.hits.push({ at: at.clone(), age: -delay, fired: false, reduced });
  }
  private dragon(mesh: Mesh, flight: Flight, progress: number, alpha: number): void {
    if (!flight.dir) return;
    const strip = dragonStrip(progress, layout.dragon.bounds);
    this.art.planes.mapUvs(mesh, base => galeUvs(base, strip.reveal, layout.dragon.bounds));
    const head = flight.at.add(flight.dir.scale(L.length * progress)).add(new Vector3(0, 1.15, 0));
    const placed = placeStrip(mesh, head, flight.dir, cameraLook(this.scene), Math.max(.001, strip.length), strip.height);
    mesh.visibility = placed && strip.reveal > 0 ? alpha : 0;
  }
  tick(dt: number): void {
    for (let i = this.flights.length - 1; i >= 0; i--) {
      const f = this.flights[i]; f.age += dt;
      if (f.age >= (f.dir ? GALE_FLIGHT + GALE_EXIT : .22)) {
        for (const mesh of [f.dragon, f.echo, f.release]) { resetStrip(mesh); this.art.planes.release(mesh); }
        this.art.planes.release(f.lane); this.flights.splice(i, 1); continue;
      }
      const pose = galePose(f.age, f.reduced);
      if (f.age < .22 || !f.dir) {
        f.release ??= this.art.planes.acquire('charge');
        if (f.release) {
          this.art.frame(f.release, 'charge', f.dir ? pose.releaseFrame : 3);
          if (f.dir && !f.reduced) {
            const placed = placeStrip(f.release, f.at.add(f.dir.scale(2)).add(new Vector3(0, 1.15, 0)), f.dir, cameraLook(this.scene), 4, 4);
            f.release.visibility = placed ? 1 - Math.min(1, f.age / .22) : 0;
          } else {
            this.art.place(f.release, 'charge', f.at, 3.8, 3.8, 1.15);
            f.release.visibility = 1 - Math.min(1, f.age / .22);
          }
        }
      } else { resetStrip(f.release); this.art.planes.release(f.release); f.release = undefined; }
      if (!f.dir) continue;
      if (f.age < GALE_FLIGHT) {
        f.dragon ??= this.art.planes.acquire('dragon'); if (f.dragon) this.dragon(f.dragon, f, pose.progress, f.reduced ? .8 : 1);
        if (!f.reduced) {
          f.echo ??= this.art.planes.acquire('dragon'); if (f.echo) this.dragon(f.echo, f, pose.echo, .18);
        }
      } else {
        resetStrip(f.dragon); resetStrip(f.echo); this.art.planes.release(f.dragon); this.art.planes.release(f.echo);
        f.dragon = f.echo = undefined;
      }
      f.lane ??= this.art.planes.acquire('lane', true);
      if (f.lane) {
        this.art.planes.mapUvs(f.lane, base => galeUvs(base, pose.progress, layout.lane.bounds));
        const lane = galeLane(f.at, f.dir, pose.progress);
        f.lane.position.set(lane.x, .055, lane.z); f.lane.rotation.set(Math.PI / 2, lane.yaw, 0);
        f.lane.scaling.set(Math.max(.001, lane.length), lane.width, 1); f.lane.visibility = .62 * pose.alpha;
      }
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt; if (h.age < 0) continue;
      if (h.age >= GALE_HIT) { this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      if (!h.fired) {
        h.fired = true; this.bank.ring(h.at, .9, 'tieubachlong', { life: .4, hold: true, fill: .15, rim: .55, reduced: h.reduced });
        if (!h.reduced) this.bank.spray('tieubachlong').ring(h.at, .35, 9, .6, 1.6, 2);
      }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 2 : Math.min(7, Math.floor(h.age / GALE_HIT * 8)));
        this.art.place(h.mesh, 'hit', h.at, 3.7, 3.7, .5); h.mesh.visibility = Math.min(1, (GALE_HIT - h.age) / .15);
      }
    }
  }
  clear(): void {
    for (const f of this.flights) for (const mesh of [f.dragon, f.echo, f.release]) resetStrip(mesh);
    this.flights.length = 0; this.hits.length = 0; this.art.clear();
  }
}
