import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { GameState } from '../../../packages/contracts/src/types.js';
import { PANGU as P } from '../../../content/pangu-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { PANGU_ART, croppedUvs, flowFrame, quakeDelay, quakeFrame, QUAKE_LIFE, RIFT_TEAR, riftAlpha, riftLayout,
  riftReveal, type GroundPlacement } from './visual-pangu-timeline.js';

export type PanguRiftGround = NonNullable<GameState['groundEffects']>[number];
interface Rift { body?: Mesh; mouth?: Mesh; born: number; touched: boolean; nextChip: number }
interface Quake { mesh: Mesh; age: number; reduced: boolean }

const MAX_RIFTS = 8, MAX_QUAKES = 40;

function placeGround(mesh: Mesh, at: GroundPlacement): void {
  mesh.position.set(at.x, .05, at.z);
  mesh.rotation.y = at.yaw;
  mesh.scaling.set(at.length, at.width, 1);
}

/**
 * The 14×4.5 chaos fissure (`pangu-rift` snapshot ground, 5 s) and the cataclysm cracks. The rift tears open
 * from the caster toward the axe-head mouth (static body art + looping flow sheet), lives exactly as long as the
 * server keeps it, then fades on `remaining`. Cracks sit behind each zone-0 enemy the server listed.
 */
export class PanguRift {
  private rifts = new Map<string, Rift>();
  private quakes: Quake[] = [];
  private time = 0;

  constructor(private art: KitPainted, private bank: KitFxBank) {}

  prepare(): void {
    this.art.prepare('pangu-rift', PANGU_ART.rift.url);
    this.art.prepare('pangu-flow', PANGU_ART.flow.url);
    this.art.prepare('pangu-quake', PANGU_ART.quake.url);
  }

  mark(ground: PanguRiftGround, reduced: boolean): void {
    const key = ground.id ?? `${ground.casterId}:${ground.x}:${ground.z}`;
    let rift = this.rifts.get(key);
    if (!rift) {
      if (this.rifts.size >= MAX_RIFTS) return;
      // Entering a zone mid-rift shows it already torn open, aged from the server's remaining time.
      rift = { born: this.time - Math.max(0, P.riftSeconds - ground.remaining), touched: true, nextChip: this.time };
      this.rifts.set(key, rift);
      debug('visual.pangu.rift', { id: key, remaining: +ground.remaining.toFixed(2), reduced });
    }
    rift.touched = true;
    rift.body ??= this.art.acquire('pangu-rift', true);
    const elapsed = this.time - rift.born;
    const dir = ground.direction ?? { x: 0, z: 1 };
    const layout = riftLayout(ground, dir, ground.length ?? P.riftLength, ground.width ?? P.riftWidth,
      reduced ? 1 : riftReveal(elapsed));
    const alpha = riftAlpha(ground.remaining);
    if (rift.body) {
      placeGround(rift.body, layout.body);
      this.art.mapUvs(rift.body, base => croppedUvs(base, layout.uMax));
      rift.body.visibility = alpha;
    }
    if (layout.mouth) {
      rift.mouth ??= this.art.acquire('pangu-flow', true);
      if (rift.mouth) {
        placeGround(rift.mouth, layout.mouth);
        rift.mouth.alphaIndex = GROUND_ALPHA_INDEX + 4;
        this.art.frame(rift.mouth, reduced ? 0 : flowFrame(this.time), PANGU_ART.flow.columns, PANGU_ART.flow.rows);
        rift.mouth.visibility = alpha;
      }
    }
    if (!reduced && elapsed > RIFT_TEAR && this.time >= rift.nextChip && alpha > .5) {
      // Chaos qi and small chips lifted out of the gap; the art carries the fissure itself.
      rift.nextChip = this.time + .28;
      const along = (.1 + .8 * ((Math.sin(this.time * 7.3) + 1) / 2)) * (ground.length ?? P.riftLength);
      this.bank.spray('jade').trail(new Vector3(ground.x + dir.x * along, .15, ground.z + dir.z * along), new Vector3(0, 2.4, 0), 3);
    }
  }

  quake(points: readonly Vector3[], reduced: boolean): void {
    let placed = 0;
    for (const [index, at] of points.entries()) {
      if (this.quakes.length >= MAX_QUAKES) { debug('visual.pangu.quake.cap', { dropped: points.length - placed }); break; }
      const mesh = this.art.acquire('pangu-quake');
      if (!mesh) break;
      const { size, aspect, anchorY } = PANGU_ART.quake;
      mesh.scaling.set(size, size * aspect, 1);
      mesh.position.set(at.x, (anchorY - .5) * size * aspect, at.z);
      mesh.setEnabled(false);
      this.quakes.push({ mesh, age: reduced ? 0 : -quakeDelay(index), reduced });
      placed++;
    }
    debug('visual.pangu.cataclysm', { targets: points.length, placed, reduced });
  }

  tick(dt: number): void {
    this.time += dt;
    for (const [key, rift] of this.rifts) {
      if (rift.touched) { rift.touched = false; continue; }
      this.art.release(rift.body); this.art.release(rift.mouth);
      this.rifts.delete(key);
    }
    for (let i = this.quakes.length - 1; i >= 0; i--) {
      const quake = this.quakes[i];
      quake.age += dt;
      const frame = quake.reduced ? (quake.age < QUAKE_LIFE * .6 ? 4 : -1) : quakeFrame(quake.age);
      if (frame < 0) { this.art.release(quake.mesh); this.quakes.splice(i, 1); continue; }
      quake.mesh.setEnabled(quake.age >= 0);
      this.art.frame(quake.mesh, frame, PANGU_ART.quake.columns, PANGU_ART.quake.rows);
    }
  }

  clear(): void { this.rifts.clear(); this.quakes.length = 0; this.time = 0; }
}
