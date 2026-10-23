import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CLEAVE_IMPACT, CLEAVE_TELEGRAPH_GRACE, PANGU_ART, chargeFrame, craterAlpha, CRATER_LIFE, impactFrame,
  telegraphFrame } from './visual-pangu-timeline.js';

interface Charge { mesh: Mesh; age: number; windup: number; resolvedAt?: number; reduced: boolean }
interface Cleave { mesh: Mesh; age: number; windup: number; impactAt?: number; reduced: boolean }
interface Crater { mesh: Mesh; age: number }

const A = PANGU_ART;

/** Places a billboard so the art's ground anchor (fraction from the top) sits on the floor at `at`. */
function plantBillboard(mesh: Mesh, at: Vector3, width: number, height: number, anchorY: number): void {
  mesh.scaling.set(width, height, 1);
  mesh.position.set(at.x, at.y + (anchorY - .5) * height, at.z);
}

/**
 * Windup → impact of Khai Thiên Nhất Phủ. Chaos qi gathers on Bàn Cổ (behind his body: heroes draw in a later
 * pass) while the great-axe shadow falls on the locked point; the server's ability event drops the strike frame,
 * splits the ground into rock banks (foreground over the crowd), leaves the crater decal and an R8.5 rim.
 */
export class PanguCleaver {
  private charges = new Map<string, Charge>();
  private cleaves = new Map<string, Cleave>();
  private loose: Cleave[] = [];
  private craters: Crater[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank, private shake: (seconds: number) => void) {}

  prepare(): void {
    this.art.prepare('pangu-charge', A.charge.url, { foreground: true });
    this.art.prepare('pangu-cleave', A.cleave.url, { foreground: true });
    this.art.prepare('pangu-crater', A.crater.url);
  }

  cast(source: string, caster: Vector3, point: Vector3, windup: number, reduced: boolean): void {
    this.end(this.charges.get(source)?.mesh); this.end(this.cleaves.get(source)?.mesh);
    this.charges.delete(source); this.cleaves.delete(source);
    const charge = this.art.acquire('pangu-charge');
    if (charge) {
      plantBillboard(charge, caster, A.charge.size, A.charge.size, A.charge.anchorY);
      this.art.frame(charge, reduced ? 3 : 0, A.charge.columns, A.charge.rows);
      this.charges.set(source, { mesh: charge, age: 0, windup, reduced });
    }
    const shadow = this.art.acquire('pangu-cleave');
    if (shadow) {
      plantBillboard(shadow, point, A.cleave.size, A.cleave.size, A.cleave.anchorY);
      this.art.frame(shadow, reduced ? 2 : 0, A.cleave.columns, A.cleave.rows);
      this.cleaves.set(source, { mesh: shadow, age: 0, windup, reduced });
    }
    // The real blast radius, readable on the floor while the axe is still in the air.
    this.bank.ring(point, P.blastRadius, 'pangu', { life: windup + .1, hold: true, rim: 1, fill: .12, alpha: .55, reduced });
    if (!reduced) this.bank.spray('earth').rise(caster, 2.2, 14);
  }

  impact(source: string, point: Vector3, reduced: boolean): void {
    const charge = this.charges.get(source);
    if (charge) charge.resolvedAt = charge.age;
    let cleave = this.cleaves.get(source);
    this.cleaves.delete(source);
    if (!cleave) {
      const mesh = this.art.acquire('pangu-cleave');
      if (mesh) cleave = { mesh, age: 0, windup: 0, reduced };
    }
    if (cleave) {
      // Strike at the event's point even if the telegraph was placed from the cast (same locked point).
      plantBillboard(cleave.mesh, point, A.cleave.size, A.cleave.size, A.cleave.anchorY);
      cleave.impactAt = cleave.age;
      this.loose.push(cleave);
    }
    const crater = this.art.acquire('pangu-crater', true);
    if (crater) {
      crater.position.set(point.x, .045, point.z);
      crater.scaling.set(A.crater.size, A.crater.size, 1);
      crater.visibility = 0;
      this.craters.push({ mesh: crater, age: 0 });
    }
    this.bank.ring(point, P.blastRadius, 'pangu', { life: .6, rim: 1, alpha: .85, reduced });
    if (reduced) return;
    this.bank.spray('earth').ring(point, 1.6, 26, .6, 7, 6);
    this.bank.spray('jade').ring(point, 1.1, 12, 1.4, 3, 7);
    this.shake(.25);
  }

  tick(dt: number): void {
    for (const [source, charge] of this.charges) {
      charge.age += dt;
      const frame = charge.reduced ? (charge.resolvedAt === undefined ? 3 : -1)
        : chargeFrame(charge.age, charge.windup, charge.resolvedAt);
      const orphaned = charge.resolvedAt === undefined && charge.age > charge.windup + CLEAVE_TELEGRAPH_GRACE;
      if (frame < 0 || orphaned || (charge.reduced && charge.resolvedAt !== undefined && charge.age > charge.resolvedAt + .2)) {
        this.end(charge.mesh); this.charges.delete(source);
      } else this.art.frame(charge.mesh, frame, A.charge.columns, A.charge.rows);
    }
    for (const [source, shadow] of this.cleaves) {
      shadow.age += dt;
      // No ability event after the windup (cancelled cast): the shadow lifts away instead of striking.
      const late = shadow.age - shadow.windup - CLEAVE_TELEGRAPH_GRACE;
      if (late > 0) { this.end(shadow.mesh); this.cleaves.delete(source); continue; }
      if (!shadow.reduced) this.art.frame(shadow.mesh, telegraphFrame(shadow.age, shadow.windup), A.cleave.columns, A.cleave.rows);
    }
    for (let i = this.loose.length - 1; i >= 0; i--) {
      const strike = this.loose[i];
      strike.age += dt;
      const since = strike.age - (strike.impactAt ?? 0);
      const frame = strike.reduced ? (since < CLEAVE_IMPACT * .5 ? 5 : -1) : impactFrame(since);
      if (frame < 0) { this.end(strike.mesh); this.loose.splice(i, 1); }
      else this.art.frame(strike.mesh, frame, A.cleave.columns, A.cleave.rows);
    }
    for (let i = this.craters.length - 1; i >= 0; i--) {
      const crater = this.craters[i];
      crater.age += dt;
      if (crater.age >= CRATER_LIFE) { this.end(crater.mesh); this.craters.splice(i, 1); }
      else crater.mesh.visibility = craterAlpha(crater.age);
    }
  }

  private end(mesh: Mesh | undefined): void { this.art.release(mesh); }

  clear(): void {
    this.charges.clear(); this.cleaves.clear(); this.loose.length = 0; this.craters.length = 0;
  }
}
