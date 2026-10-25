import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { KIMTHIEN as K } from '../../../content/kimthien-design.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CAST_GRACE, SMALL_COLUMNS, SMALL_ROWS, SUCTION_ALPHA, SUCTION_LIFT, SUCTION_SIZE, windupPose } from './visual-kimthien-timeline.js';

interface Windup { source: string; at: Vector3; age: number; windup: number; reduced: boolean; mesh?: Mesh }

/** Windups alive at once (one per caster; extra casts replace the oldest). */
const MAX_WINDUPS = 4;

/**
 * Windup at the server-locked point (`cast skill-h013`): the R7 edge lights and a jade-gold swirl gathers at the
 * point, drawing dust upward. It only ever sits where the server already chose; if the resolve never arrives
 * (cancelled, caster died) it just ends, with no impact.
 */
export class KimthienWindup {
  private active: Windup[] = [];

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  begin(at: Vector3, windup: number, reduced: boolean, source = ''): void {
    const index = this.active.findIndex(item => item.source === source);
    if (index >= 0) this.drop(index);
    if (this.active.length >= MAX_WINDUPS) this.drop(0);
    this.active.push({ source, at: new Vector3(at.x, 0, at.z), age: 0, windup, reduced });
    this.bank.ring(at, K.zoneRadius, 'jade', { life: windup + .2, fill: .08, rim: 1, alpha: .6, hold: true, reduced, order: 4 });
    if (!reduced) this.bank.spray('bagua').rise(new Vector3(at.x, 0, at.z), 5, 12);
  }

  /** The resolve arrived: the swirl's alpha is handed to the bowl and the windup is gone. */
  take(source: string): { alpha: number } | undefined {
    const index = this.active.findIndex(item => item.source === source);
    if (index < 0) return undefined;
    const item = this.active[index];
    const alpha = windupPose(item.age, item.windup, item.reduced).alpha / SUCTION_ALPHA;
    this.drop(index);
    return { alpha: Math.min(1, alpha) };
  }

  tick(dt: number, up: Vector3): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const item = this.active[i];
      item.age += dt;
      if (item.age > item.windup + CAST_GRACE) {
        debug('visual.kimthien.release', { source: item.source, reason: 'no-resolve' });
        this.drop(i); continue;
      }
      item.mesh ??= this.art.acquire('suction');
      if (!item.mesh) continue;
      const pose = windupPose(item.age, item.windup, item.reduced);
      const size = SUCTION_SIZE * pose.scale;
      item.mesh.alphaIndex = GROUND_ALPHA_INDEX + 7;
      item.mesh.position.copyFrom(billboardCenter(item.at, size, .5, up, SUCTION_LIFT));
      item.mesh.scaling.setAll(size);
      item.mesh.visibility = pose.alpha;
      this.art.frame(item.mesh, pose.frame, SMALL_COLUMNS, SMALL_ROWS);
    }
  }

  clear(): void { while (this.active.length) this.drop(0); }

  private drop(index: number): void {
    this.art.release(this.active[index].mesh);
    this.active.splice(index, 1);
  }
}
