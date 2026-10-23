import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';
import { KitPainted } from './visual-kit-painted.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { boltAlpha, boltHitFrame, boltReach, boltUvs } from './visual-truong-dao-lang-timeline.js';

/** Strike = a downward lightning strip; charm = a sword sprite flashing on a chain target. */
type Flash = { mesh: Mesh; age: number; life: number; reduced: boolean; strike?: { height: number } };
type Impact = { mesh: Mesh; age: number; reduced: boolean };
const BOLT_ASPECT = 373 / 1056;

/** Sky strikes, contact hits, the impact shock and the chain; every one lands on a server event point. */
export class TruongAccents {
  readonly books: KitFlipbooks;
  readonly bank: KitFxBank;
  private flashes: Flash[] = [];
  private impacts: Impact[] = [];

  constructor(scene: Scene, private art: KitPainted) {
    this.books = new KitFlipbooks(scene);
    this.bank = new KitFxBank(scene, this.books);
  }

  prepare(): void { this.art.prepare('hit','/assets/vfx-truong-hit.webp',{ foreground:true }); }

  /** Contact: hit flipbook (lightning + ice shards), a frost scorch ring and small ice chips. */
  impact(at: Vector3, scale: number, reduced: boolean, debris = true): void {
    this.prepare();
    if (this.impacts.length < 40) {
      const mesh = this.art.acquire('hit');
      if (mesh) {
        mesh.position.set(at.x,at.y+1.05*scale,at.z); mesh.scaling.setAll(4*scale);
        this.art.frame(mesh,reduced ? 2 : 0,4,2);
        this.impacts.push({ mesh, age: 0, reduced });
      }
    }
    this.bank.ring(at, 1.1 * scale, 'ice', { life: .5, fill: .12, rim: .5, alpha: .5, hold: true, reduced });
    if (!reduced && debris) this.bank.spray('frost').ring(at, .3 * scale, Math.round(10 * scale), .3, 2.2, 3);
  }

  /** One of the 21 strikes (or a blessing hit): the head races down from the sky, then the contact bursts. */
  bolt(at: Vector3, reduced: boolean, small = false): void {
    this.strike(at, reduced ? 1.2 : small ? 3.2 : 7, reduced ? .14 : small ? .18 : .26, reduced);
    this.impact(at, small ? .35 : .7, reduced, !small);
  }

  /** Server impact of Bắc Đẩu Trận: central heaven strike, shock ring out to the real radius, ice burst. */
  shock(at: Vector3, reduced: boolean): void {
    this.strike(at, reduced ? 2 : 10, reduced ? .16 : .32, reduced);
    this.impact(at, reduced ? .8 : 1.5, reduced, false);
    this.bank.ring(at, B.radius, 'ice', { life: .55, fill: .05, rim: 1, alpha: .9, reduced, order: 6 });
    this.bank.ring(at, B.radius, 'gold', { life: .45, hold: true, alpha: .55, reduced, order: 7 });
    if (reduced) return;
    this.bank.spray('frost').ring(at, .8, 40, .4, 6, 7);
    this.bank.spray('frost').ring(at, B.radius * .95, 60, .2, 2.5, 4);
  }

  chain(origin: Vector3, targets: readonly Vector3[], reduced: boolean): void {
    let from = origin;
    for (const to of targets.slice(0, B.chainTargets)) {
      this.bank.ribbon(from, to, 'ice', { life: .27, width: .22, wave: reduced ? 0 : .12, height: .9, reduced });
      const charm = this.art.acquire('sword');
      if (charm) {
        charm.position.set(to.x, .9, to.z);
        charm.scaling.set(1.4 * 544 / 800, 1.4, 1);
        this.flash({ mesh: charm, age: 0, life: .28, reduced });
      }
      this.impact(to, .35, reduced, false);
      from = to;
    }
  }

  tick(dt: number, time: number): void {
    this.bank.tick(dt, time);
    for (let i = this.flashes.length - 1; i >= 0; i--) {
      const f = this.flashes[i]; f.age += dt;
      if (f.age >= f.life) { this.art.release(f.mesh); this.flashes.splice(i, 1); continue; }
      if (f.strike) this.reach(f, f.reduced ? 1 : boltReach(f.age, f.life));
      f.mesh.visibility = (f.reduced ? .55 : .95) * boltAlpha(f.age, f.life);
    }
    for (let i = this.impacts.length - 1; i >= 0; i--) {
      const item = this.impacts[i]; item.age += dt;
      this.art.frame(item.mesh,item.reduced ? 2 : boltHitFrame(item.age),4,2);
      item.mesh.visibility = item.reduced ? .5 * boltAlpha(item.age, .18) : 1;
      if (item.age >= (item.reduced ? .18 : .44)) {
        this.art.release(item.mesh); this.impacts.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const item of this.flashes) this.art.release(item.mesh);
    for (const item of this.impacts) this.art.release(item.mesh);
    this.flashes.length = this.impacts.length = 0;
    this.bank.clear();
  }

  private strike(at: Vector3, height: number, life: number, reduced: boolean): void {
    const mesh = this.art.acquire('bolt');
    if (!mesh) return;
    mesh.position.set(at.x, 0, at.z);
    const flash: Flash = { mesh, age: 0, life, reduced, strike: { height } };
    this.reach(flash, reduced ? 1 : 0);
    this.flash(flash);
  }

  /** Upright strip whose head sits `reach` of the way from the sky to the ground; texture never stretches. */
  private reach(flash: Flash, reach: number): void {
    const height = flash.strike?.height ?? 0, length = Math.max(.01, height * reach);
    flash.mesh.scaling.set(height * BOLT_ASPECT, length, 1);
    flash.mesh.position.y = height - length / 2;
    this.art.mapUvs(flash.mesh, base => boltUvs(base, reach));
  }

  private flash(flash: Flash): void {
    if (this.flashes.length >= 32) this.art.release(this.flashes.shift()?.mesh);
    this.flashes.push(flash);
  }
}
