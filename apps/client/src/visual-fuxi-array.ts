import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, groundScale, type FuxiArtId } from './visual-fuxi-assets.js';
import { baguaPhase } from './visual-fuxi-remaining.js';
import { currentFrame, holdAlpha, isLateZone, releaseFrame, retractAlpha, RETRACT_SECONDS } from './visual-fuxi-timeline.js';

type Zone = { id: string; at: Vector3; radius: number; remaining: number; age: number; late: boolean; reduced: boolean;
  touched: boolean; missing: number; closeStarted: boolean; flat?: Mesh; flatArt?: FuxiArtId; rim?: Layer };
const MAX_ZONES = 3;

/**
 * The held Bát Quái of `fuxi-bagua` (snapshot `radius` / `remaining`, 6 s): the flat top-down array with qi threads spiralling
 * to the centre (inward-current sheet, looped) over a shader rim that keeps the real radius, plus a slow stream of jade flecks
 * drawn inward. Snapshot time controls the end: in the last 0.4 s the release sheet unthreads the array and flecks settle;
 * a zone that vanishes early retracts in 0.25 s. A zone first seen deep into its life (reconnect, lobby) fades in quickly and
 * does not replay the opening. The array lies under every actor: it is the battlefield, not an overlay.
 */
export class FuxiArray {
  private zones = new Map<string, Zone>();
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(this.scene, 'kitGround', 'bagua', `fuxi-hold-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', .35); layer.material.setFloat('uBand', 0);
      return layer;
    }, MAX_ZONES, 'fuxi-hold');
  }

  /** Called every frame the snapshot carries the zone. */
  mark(id: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    if (!baguaPhase(radius, remaining)) return;
    let zone = this.zones.get(id);
    if (!zone) {
      if (this.zones.size >= MAX_ZONES) { debug('visual.fuxi.cap', { layer: 'zones' }); return; }
      const late = isLateZone(remaining);
      zone = { id, at: at.clone(), radius, remaining, age: 0, late, reduced, touched: true, missing: 0, closeStarted: false,
        rim: this.rims.acquire() };
      this.zones.set(id, zone);
      debug('visual.fuxi.zone.start', { radius, remaining, late, reduced });
    }
    zone.at.copyFrom(at); zone.radius = radius; zone.remaining = remaining; zone.reduced = reduced;
    zone.touched = true; zone.missing = 0;
  }

  tick(dt: number, time: number): void {
    for (const [id, zone] of this.zones) {
      zone.age += dt;
      if (!zone.touched) {
        zone.missing += dt;
        if (zone.missing >= RETRACT_SECONDS) { this.drop(id, zone, 'snapshot-ended'); continue; }
      }
      zone.touched = false;
      this.place(zone, time);
      this.stream(zone, dt);
    }
  }

  clear(): void {
    for (const [id, zone] of this.zones) this.drop(id, zone, 'clear');
    this.rims.releaseAll();
  }

  private stream(zone: Zone, dt: number): void {
    if (zone.reduced || zone.missing > 0) return;
    const spray = this.bank.spray('bagua');
    if (zone.remaining <= .4) {
      if (!zone.closeStarted) { zone.closeStarted = true; spray.ring(zone.at, zone.radius * .85, 16, .2, .8, 1.4); }
      return;
    }
    if (Math.random() < dt * 9) spray.ring(zone.at, zone.radius * .9, 1, .3, -3.2, 1.6);
  }

  private wantedArt(zone: Zone): FuxiArtId {
    if (zone.remaining <= .4) return 'release';
    return zone.reduced ? 'array' : 'current';
  }

  private place(zone: Zone, time: number): void {
    const wanted = this.wantedArt(zone);
    if (zone.flatArt !== wanted) {
      this.art.release(zone.flat);
      zone.flat = this.art.acquire(wanted, true); zone.flatArt = wanted;
    }
    const closing = wanted === 'release';
    const fade = holdAlpha(zone.age, zone.late) * (zone.missing > 0 ? retractAlpha(zone.missing) : 1);
    if (zone.flat) {
      const meta = artMeta(wanted);
      const scale = groundScale(wanted, 2 * zone.radius);
      zone.flat.scaling.set(scale.x, scale.y, 1);
      zone.flat.position.set(zone.at.x, .05, zone.at.z);
      if (meta) this.art.frame(zone.flat, closing ? releaseFrame(zone.remaining, zone.reduced)
        : wanted === 'current' ? currentFrame(time, false) : 0, meta.columns, meta.rows);
      zone.flat.visibility = fade * .96;
    }
    const rim = zone.rim;
    if (rim) {
      rim.mesh.position.set(zone.at.x, .045, zone.at.z);
      rim.mesh.scaling.set(2 * zone.radius, 1, 2 * zone.radius);
      const m = rim.material;
      m.setFloat('uTime', zone.reduced ? 0 : time);
      m.setFloat('uAlpha', fade * (closing ? Math.max(0, zone.remaining / .4) : 1) * .55);
      m.setFloat('uFill', .04); m.setFloat('uRim', .8);
      m.setFloat('uRings', zone.reduced ? 0 : .35); m.setFloat('uSwirl', zone.reduced ? 0 : -1.1);
    }
  }

  private drop(id: string, zone: Zone, reason: string): void {
    this.art.release(zone.flat);
    if (zone.rim) this.rims.release(zone.rim);
    this.zones.delete(id);
    debug('visual.fuxi.zone.end', { reason, age: Number(zone.age.toFixed(2)) });
  }
}
