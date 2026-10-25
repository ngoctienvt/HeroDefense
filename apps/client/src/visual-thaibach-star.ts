import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { debug } from './debug.js';
import { billboardCenter } from './visual-kit-billboard.js';
import type { KitPainted } from './visual-kit-painted.js';
import { CAST_ANCHOR_Y, CAST_COLUMNS, CAST_LIFT, CAST_ROWS, CAST_SIZE, castPose, DEFAULT_WINDUP } from './visual-thaibach-timeline.js';

type Cast = { mesh?: Mesh; pos: Vector3; age: number; windup: number; resolvedAt?: number; reduced: boolean };
const MAX_CASTS = 6;

/**
 * Sao Trường Canh + mây bạc (windup). `cast skill-h015` raises the morningstar sheet above the caster's head and
 * gathers it over the real windup (held open if the resolve is late); `resolve` (the `ability skill-h015` or
 * `revive-h015` event, keyed by the caster) shows the open star and then folds it away in .25 s. The server decides the
 * branch only at resolve, so nothing here shows a heal or a revive. Cast with no resolve (nobody to help) folds after a
 * grace. The sheet follows the caster through the `caster` marker (every frame). Foreground pass: over monsters, under heroes.
 */
export class ThaibachStar {
  private casts = new Map<string, Cast>();

  constructor(private art: KitPainted) {}

  begin(origin: Vector3, windup: number, reduced: boolean, source?: string): void {
    const id = source ?? 'unknown';
    this.free(this.casts.get(id));
    if (this.casts.size >= MAX_CASTS) { debug('visual.thaibach.cap', { layer: 'star' }); return; }
    this.casts.set(id, { pos: origin.clone(), age: 0, windup: windup || DEFAULT_WINDUP, reduced });
  }

  follow(id: string, at: Vector3): void {
    this.casts.get(id)?.pos.copyFrom(at);
  }

  /** Star centre of the live cast of `source` (guidance start); undefined without a cast. */
  starPoint(source?: string): Vector3 | undefined {
    const cast = this.casts.get(source ?? 'unknown');
    return cast ? new Vector3(cast.pos.x, 0, cast.pos.z) : undefined;
  }

  /** Marks the resolve. A resolve without a cast (reconnect, lobby) opens nothing: the recipient's layers still play. */
  resolve(source: string | undefined): boolean {
    const cast = this.casts.get(source ?? 'unknown');
    if (!cast) return false;
    cast.resolvedAt ??= cast.age;
    return true;
  }

  tick(dt: number, up: Vector3, time: number): void {
    for (const [id, cast] of this.casts) {
      cast.age += dt;
      const pose = castPose(cast.age, cast.windup, cast.resolvedAt);
      if (pose.done) { this.free(cast); this.casts.delete(id); continue; }
      cast.mesh ??= this.art.acquire('cast');
      if (!cast.mesh) continue;
      const mesh = cast.mesh;
      this.art.frame(mesh, pose.frame, CAST_COLUMNS, CAST_ROWS);
      // Bobbing only without reduced motion; the plane stands along the camera's screen-up, cloud base above her head.
      const bob = cast.reduced ? 0 : Math.sin(time * 3 + cast.pos.x) * .08;
      mesh.position.copyFrom(billboardCenter(new Vector3(cast.pos.x, 0, cast.pos.z), CAST_SIZE, CAST_ANCHOR_Y, up, CAST_LIFT + bob));
      mesh.scaling.setAll(CAST_SIZE);
      mesh.visibility = pose.alpha;
    }
  }

  clear(): void {
    for (const cast of this.casts.values()) this.free(cast);
    this.casts.clear();
  }

  private free(cast: Cast | undefined): void {
    if (cast) this.art.release(cast.mesh);
  }
}
