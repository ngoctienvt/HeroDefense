import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { billboardCenter, farDirection, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import { GROUND_SIZE, groundPose, MOUNTAIN_ANCHOR_Y, MOUNTAIN_FAR_OFFSET, MOUNTAIN_SIZE,
  mountainFrame, zoneAlpha, zoneExiting, zoneStartAge } from './visual-nhu-lai-timeline.js';

type Zone = { rim: Layer; ground?: Mesh; rear?: Mesh; at: Vector3; remaining: number;
  age: number; touched: boolean; reduced: boolean; collapsed: boolean };
const MAX_ZONES = 6;

/**
 * Ngũ Chỉ Sơn: the server `five-finger` ground effect (5 s, radius 9.5, slow + armour break, no damage).
 * Stone-imprint decal on the floor sized so its outer ring lands on the real radius; the five-ridge stone range (rear sheet) rises on the far rim of the zone, holds, and collapses with debris over the last 0.5 s.
 * Never rises over the middle of the zone, so monsters inside stay readable.
 */
export class NhuLaiZone {
  private rims: LayerPool;
  private zones = new Map<string, Zone>();

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'gold', `nhulai-zone-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_ZONES, 'nhulai-zones');
  }

  prepare(): void {
    this.art.prepare('ground', '/assets/vfx-nhulai-ground.webp');
    this.art.prepare('rear', '/assets/vfx-nhulai-rear.webp');
  }

  markZone(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare();
    let zone = this.zones.get(id);
    if (!zone) {
      if (this.zones.size >= MAX_ZONES) return;
      const rim = this.rims.acquire();
      if (!rim) return;
      zone = { rim, at: at.clone(), remaining, age: zoneStartAge(remaining), touched: true, reduced, collapsed: false };
      this.zones.set(id, zone);
      debug('visual.nhulai.zone', { remaining: +remaining.toFixed(2), reduced });
      if (!reduced && zone.age < .1) this.dust(zone.at, 8, 5);
    }
    zone.touched = true; zone.remaining = remaining; zone.reduced = reduced; zone.at.copyFrom(at);
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (const [id, zone] of this.zones) {
      if (!zone.touched) { this.free(zone); this.zones.delete(id); continue; }
      zone.touched = false; zone.age += dt;
      this.place(zone, up, time);
    }
  }

  clear(): void {
    for (const zone of this.zones.values()) this.free(zone);
    this.zones.clear();
    this.rims.releaseAll();
  }

  /** Earth dust along the base of the range: used on the rise and again when the peaks collapse. */
  private dust(at: Vector3, count: number, power: number): void {
    const base = at.add(farDirection(this.scene).scale(MOUNTAIN_FAR_OFFSET));
    this.bank.spray('earth').ring(base, 5, count * 4, .4, power * .5, power);
  }

  private place(zone: Zone, up: Vector3, time: number): void {
    zone.ground ??= this.art.acquire('ground', true);
    zone.rear ??= this.art.acquire('rear');
    const pose = groundPose(zone.age, zone.remaining, zone.reduced);
    const { mesh: rim, material: m } = zone.rim;
    rim.position.set(zone.at.x, .05, zone.at.z);
    rim.scaling.set(N.skillRadius * 2, 1, N.skillRadius * 2);
    m.setFloat('uTime', time); m.setFloat('uAlpha', .45 * pose.alpha); m.setFloat('uFill', 0);
    m.setFloat('uRim', .9); m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSwirl', 0);
    if (zone.ground) {
      zone.ground.position.set(zone.at.x, .06, zone.at.z);
      zone.ground.scaling.setAll(GROUND_SIZE * pose.scale);
      zone.ground.visibility = pose.alpha;
    }
    const far = farDirection(this.scene);
    const frame = mountainFrame(zone.age, zone.remaining, zone.reduced);
    const alpha = zoneAlpha(zone.remaining);
    const rearFeet = zone.at.add(far.scale(MOUNTAIN_FAR_OFFSET));
    this.mountain(zone.rear, rearFeet, up, frame, alpha);
    // The range is drawn before every actor: monsters and heroes always paint over it.
    if (!zone.collapsed && zoneExiting(zone.remaining)) {
      zone.collapsed = true;
      if (!zone.reduced) this.dust(zone.at, 10, 6);
    }
  }

  private mountain(mesh: Mesh | undefined, feet: Vector3, up: Vector3, frame: number, alpha: number): void {
    if (!mesh) return;
    mesh.position.copyFrom(billboardCenter(feet, MOUNTAIN_SIZE, MOUNTAIN_ANCHOR_Y, up));
    mesh.scaling.setAll(MOUNTAIN_SIZE);
    mesh.visibility = alpha;
    this.art.frame(mesh, frame, 4, 4);
  }

  private free(zone: Zone): void {
    this.art.release(zone.ground); this.art.release(zone.rear);
    this.rims.release(zone.rim);
    zone.ground = zone.rear = undefined;
  }
}
