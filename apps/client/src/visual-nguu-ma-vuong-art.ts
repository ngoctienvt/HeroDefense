import type { Scene } from '@babylonjs/core/scene.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { Tier3Art } from './visual-tier3-art.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { NGUU_MA_VUONG as N, NM_CAPS, HOOF_CONTACT, QUAKE_LIFE, FISSURE_LIFE, DUST_LIFE,
  ROCK_CLUSTERS, hoofShock, spikePose, dustDirection, quakePlaneSize } from './visual-nguu-ma-vuong-timeline.js';
import layout from './visual-nguu-ma-vuong-layout.json';
type Key = 'charge' | 'quake' | 'fissure' | 'spike' | 'hit';
type Shock = { at: Vector3; age: number; reduced: boolean; fired: boolean; quake?: Mesh; fissure?: Mesh; spikes: (Mesh | undefined)[] };
type Hit = { at: Vector3; direction?: Vector3; age: number; reduced: boolean; fired: boolean; mesh?: Mesh };
export class NguuMaVuongArt {
  readonly art: Tier3Art<Key>; private shocks: Shock[] = []; private hits: Hit[] = [];
  constructor(private scene: Scene, private bank: KitFxBank) {
    this.art = new Tier3Art(scene, 'nguu-ma-vuong', layout, ['charge', 'quake', 'hit'], NM_CAPS.planes);
  }
  prepare(): void { this.art.prepare(); }
  strike(origin: Vector3 | undefined, targets: readonly Vector3[], reduced: boolean): void {
    if (origin && this.shocks.length < NM_CAPS.shocks)
      this.shocks.push({ at: origin.clone(), age: 0, reduced, fired: false, spikes: [] });
    for (const at of targets) {
      if (this.hits.length >= NM_CAPS.hits) break;
      const d = origin ? dustDirection(origin, at) : undefined;
      this.hits.push({ at: at.clone(), direction: d ? new Vector3(d.x, 0, d.z) : undefined,
        age: reduced ? HOOF_CONTACT : 0, reduced, fired: false });
    }
  }
  tick(dt: number): void {
    for (let i = this.shocks.length - 1; i >= 0; i--) {
      const s = this.shocks[i]; s.age += dt;
      if (s.age >= FISSURE_LIFE) { this.releaseShock(s); this.shocks.splice(i, 1); continue; }
      const pose = hoofShock(s.age, s.reduced);
      if (s.age >= HOOF_CONTACT && !s.fired) {
        s.fired = true; this.bank.ring(s.at, N.radius, 'nguumavuong', { life: .38, fill: 0, rim: .9, reduced: s.reduced });
        if (!s.reduced) this.bank.spray('nguumavuong').ring(s.at, 1.1, 22, .2, 2.4, 4.5);
      }
      if (s.age < QUAKE_LIFE) {
        s.quake ??= this.art.planes.acquire('quake'); if (s.quake) {
          this.art.frame(s.quake, 'quake', pose.frame);
          const size = quakePlaneSize(N.radius, Math.abs(cameraLook(this.scene).y), layout.quake.footprintHull, layout.quake.footprintPadding);
          this.art.place(s.quake, 'quake', s.at, Math.max(.001, size) * pose.scale);
          s.quake.visibility = size > 0 ? pose.alpha : 0;
        }
      } else { this.art.planes.release(s.quake); s.quake = undefined; }
      s.fissure ??= this.art.planes.acquire('fissure', true); if (s.fissure) {
        this.art.ground(s.fissure, 'fissure', s.at, N.radius); s.fissure.visibility = .9 * pose.fissure;
      }
      this.placeSpikes(s);
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      const h = this.hits[i]; h.age += dt; const age = h.age - HOOF_CONTACT;
      if (age < 0) continue;
      if (age >= DUST_LIFE) { resetStrip(h.mesh); this.art.planes.release(h.mesh); this.hits.splice(i, 1); continue; }
      if (!h.fired) {
        h.fired = true; this.bank.ring(h.at, .65, 'nguumavuong', { life: .7, hold: true, fill: .4, rim: .2, reduced: h.reduced });
        if (!h.reduced) this.bank.spray('nguumavuong').ring(h.at, .2, 10, .15, 1.3, 2.3);
      }
      // Overlap or missing caster has no truthful dust axis; use a local, nondirectional rock contact.
      if (!h.direction) {
        h.mesh ??= this.art.planes.acquire('quake');
        if (h.mesh) {
          this.art.frame(h.mesh, 'quake', h.reduced ? 5 : Math.min(15, 4 + Math.floor(age / DUST_LIFE * 12)));
          this.art.place(h.mesh, 'quake', h.at, 2.2);
          h.mesh.visibility = Math.min(1, (DUST_LIFE - age) / .15);
        }
        continue;
      }
      h.mesh ??= this.art.planes.acquire('hit'); if (h.mesh) {
        this.art.frame(h.mesh, 'hit', h.reduced ? 1 : Math.min(7, Math.floor(age / DUST_LIFE * 8)));
        const placed = placeStrip(h.mesh, h.at.add(new Vector3(0, .7, 0)), h.direction, cameraLook(this.scene), 3.3, 2.8);
        h.mesh.visibility = placed ? Math.min(1, (DUST_LIFE - age) / .15) : 0;
      }
    }
  }
  /** Translate the rock up/down through the ground cut; proportional UV/geometry avoids squash/stretch. */
  private placeSpikes(s: Shock): void {
    const count = s.reduced ? 3 : ROCK_CLUSTERS.length, up = screenUp(this.scene), anchor = layout.spike.anchorY;
    for (let i = 0; i < count; i++) {
      const rock = ROCK_CLUSTERS[i], pose = spikePose(s.age, rock.delay, s.reduced);
      if (pose.alpha <= 0 || pose.reveal <= .001) { this.art.planes.release(s.spikes[i]); s.spikes[i] = undefined; continue; }
      s.spikes[i] ??= this.art.planes.acquire('spike'); const mesh = s.spikes[i]; if (!mesh) continue;
      const at = s.at.add(new Vector3(rock.x, 0, rock.z)), reveal = anchor * pose.reveal;
      const height = rock.size * pose.height * reveal;
      mesh.scaling.set(rock.size, height, 1);
      mesh.position.copyFrom(billboardCenter(at, height, 1, up)); mesh.visibility = pose.alpha;
      this.art.planes.mapUvs(mesh, base => base.map((v, k) => k % 2 === 0 ? v : 1 - reveal + v * reveal));
    }
  }
  private releaseShock(s: Shock): void {
    this.art.planes.release(s.quake); this.art.planes.release(s.fissure); for (const mesh of s.spikes) this.art.planes.release(mesh);
  }
  clear(): void {
    for (const s of this.shocks) this.releaseShock(s); for (const h of this.hits) { resetStrip(h.mesh); this.art.planes.release(h.mesh); }
    this.shocks.length = 0; this.hits.length = 0; this.art.clear();
  }
}
