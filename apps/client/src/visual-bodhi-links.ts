import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { cameraLook, resetStrip } from './visual-de-tuan-strip.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { placePin } from './visual-tayvuongmau-pin-strip.js';
import { linkHeight, LINK_ARC, LINK_FROM_HEIGHT, LINK_LENGTH, LINK_LIFE, LINK_SKY_HEIGHT, LINK_TO_HEIGHT, LINK_WIDTH,
  linkProgress, linkShape, MAX_LINKS } from './visual-bodhi-timeline.js';

type Link = { mesh?: Mesh; from: Vector3; to: Vector3; fromHeight: number; arc: number; age: number; arrived: boolean; heading?: Vector3 };
const MAX_ACTIVE = 8;

/**
 * Ribbon from the caster's whisk to each ally the server chose (`skill-h03X` targets, at most two; never the whole heal
 * circle). The painted jade ribbon (Codex) flies head first with a leaf-and-fruit head, holds, and folds into the ally.
 * A thin kit ribbon underlies it. No origin (lobby, reconnect): the ribbon falls from the sky onto the ally.
 */
export class BodhiLinks {
  private links: Link[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  /** One link per chosen ally (capped at `MAX_LINKS` per cast). */
  cast(origin: Vector3, hasOrigin: boolean, allies: readonly Vector3[], reduced: boolean): number {
    let made = 0;
    for (const ally of allies.slice(0, MAX_LINKS)) {
      if (this.links.length >= MAX_ACTIVE) { debug('visual.bodhi.cap', { layer: 'link' }); break; }
      const from = hasOrigin ? origin : new Vector3(ally.x, 0, ally.z);
      if (reduced) { this.arrive(ally, reduced); made++; continue; }
      this.links.push({ from: from.clone(), to: ally.clone(), fromHeight: hasOrigin ? LINK_FROM_HEIGHT : LINK_SKY_HEIGHT,
        arc: hasOrigin ? LINK_ARC : 0, age: 0, arrived: false });
      if (hasOrigin) this.bank.ribbon(new Vector3(from.x, 0, from.z), new Vector3(ally.x, 0, ally.z), 'jade',
        { life: .42, width: .55, taper: .8, wave: .3, height: LINK_FROM_HEIGHT, maxSpan: 5 });
      made++;
    }
    return made;
  }

  tick(dt: number): void {
    const look = cameraLook(this.scene);
    for (let i = this.links.length - 1; i >= 0; i--) this.fly(this.links[i], dt, look);
  }

  clear(): void { for (const link of [...this.links]) this.free(link); }

  private point(link: Link, t: number): Vector3 {
    return new Vector3(link.from.x + (link.to.x - link.from.x) * t,
      linkHeight(t, link.fromHeight, LINK_TO_HEIGHT, link.arc), link.from.z + (link.to.z - link.from.z) * t);
  }

  private fly(link: Link, dt: number, look: Vector3): void {
    link.age += dt;
    if (link.age >= LINK_LIFE) { this.free(link); return; }
    const t = linkProgress(link.age);
    if (!link.arrived && t >= 1) { link.arrived = true; this.arrive(link.to, false); }
    link.mesh ??= this.art.acquire('link');
    if (!link.mesh) return;
    const head = this.point(link, t), ahead = this.point(link, Math.min(1, t + .03));
    const direction = ahead.subtract(head);
    if (direction.lengthSquared() < 1e-6) direction.copyFrom(link.heading ?? link.to.subtract(link.from));
    else link.heading = direction.clone();
    const distance = Math.hypot(link.to.x - link.from.x, link.to.z - link.from.z) + (link.fromHeight - LINK_TO_HEIGHT);
    const shape = linkShape(link.age, distance);
    if (shape.length < .05 || !placePin(link.mesh, head, direction, look, LINK_LENGTH, LINK_WIDTH, shape.length / LINK_LENGTH)) {
      this.free(link);
      return;
    }
    link.mesh.visibility = shape.alpha;
  }

  private arrive(at: Vector3, reduced: boolean): void {
    this.bank.ring(at, 1.3, 'jade', { life: .35, fill: .2, rim: 1, alpha: .75, hold: true, reduced, order: 5 });
    if (!reduced) this.bank.spray('jade').ring(new Vector3(at.x, 0, at.z), .4, 12, .8, 1.2, 2.4);
  }

  private free(link: Link): void {
    resetStrip(link.mesh);
    this.art.release(link.mesh);
    const index = this.links.indexOf(link);
    if (index >= 0) this.links.splice(index, 1);
  }
}
