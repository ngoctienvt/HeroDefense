import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { CHUCDUNG as C } from '../../../content/chucdung-design.js';
import { debug } from './debug.js';
import { actorAlphaIndex, GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, createLoftedRingLayer, createShellLayer, LayerPool, type Layer,
  type RingProfile } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { CONE_LIFE, CONE_LIFE_REDUCED, coneCrash, coneDissolve, coneHeight, PLUME_LIFE, plumeAlpha,
  plumeDissolve, plumeRise, ringAlpha, ringRadius, RING_LIFE, STRIKE_RING_LIFE, telegraphCharge } from './visual-chucdung-timeline.js';

/**
 * Volcano profile (dr, z): outer foot → slope → jagged crater lip → inner crater wall. The kitWall
 * shader lights it by height (dark foot, glowing lip and crater) and the crashed profile is the slumped mound.
 */
const STANDING: RingProfile = [[1.7, 0], [1.45, .28], [1.2, .58], [.98, .88], [.78, 1.14], [.6, 1.4], [.46, 1.6],
  [.36, 1.5], [.3, 1.2], [.28, .85], [.26, .5], [.2, .25]];
const SLUMPED: RingProfile = [[1.9, 0], [1.7, .06], [1.5, .1], [1.3, .14], [1.15, .17], [1.0, .19], [.9, .2],
  [.82, .18], [.75, .15], [.7, .12], [.65, .08], [.6, .04]];
/** Volcano base radius (units) and crater height; the plume column rises above the crater. */
const CONE_THICK = 1.4;
const CONE_HEIGHT = 2.6;
const MAX_CASTS = 12;
const MAX_ERUPTIONS = 8;
const MAX_RINGS = 16;

type Telegraph = { layer: Layer; age: number; life: number; reduced: boolean };
type Eruption = { at: Vector3; age: number; life: number; reduced: boolean; cone: Layer; plume?: Layer };
type Ring = { layer: Layer; age: number; life: number; max: number };

/** Windup telegraph, volcano + plume eruption, and the shock rings of the ultimate and basic strikes. */
export class ChucdungEruption {
  private telegraphPool: LayerPool;
  private conePool: LayerPool;
  private plumePool: LayerPool;
  private ringPool: LayerPool;
  private telegraphs: Telegraph[] = [];
  private eruptions: Eruption[] = [];
  private rings: Ring[] = [];
  private serial = 0;

  constructor(private scene: Scene, private spray: KitSpray) {
    const id = (name: string): string => `chucdung-${name}-${this.serial++}`;
    this.telegraphPool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'lava', id('telegraph')),
      MAX_CASTS, 'chucdung-telegraph');
    this.conePool = new LayerPool(() => createLoftedRingLayer(scene, 'lava', id('volcano'), 1, STANDING, SLUMPED),
      MAX_ERUPTIONS, 'chucdung-volcano');
    this.plumePool = new LayerPool(() => createShellLayer(scene, 'lava', id('plume'), 18),
      MAX_ERUPTIONS, 'chucdung-plume');
    this.ringPool = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'lava', id('ring')),
      MAX_RINGS, 'chucdung-ring');
  }

  /** `cast` at the target point: the lava radius heats up over the server windup. */
  cast(at: Vector3, windup: number, reduced: boolean, eventId: number): void {
    const layer = this.telegraphPool.acquire();
    if (!layer) return;
    layer.mesh.position.set(at.x, .06, at.z);
    layer.mesh.scaling.setAll(C.lavaRadius * 2);
    layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
    layer.material.setFloat('uAlpha', 0);
    this.telegraphs.push({ layer, age: 0, life: windup + .12, reduced });
    debug('visual.chucdung.cast', { eventId, windup });
  }

  /** `ability skill-h01H`: volcano erupts at the point, shock ring runs out to the lava radius. */
  erupt(at: Vector3, reduced: boolean, eventId: number, targets: number): void {
    this.addRing(at, C.lavaRadius, RING_LIFE);
    const cone = this.conePool.acquire();
    if (!cone) { debug('visual.chucdung.skip', { eventId, reason: 'cone-cap' }); return; }
    cone.mesh.position.set(at.x, 0, at.z);
    // One mesh around the blast centre: drawn just before the actor there so it is never veiled.
    cone.mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 2;
    const eruption: Eruption = { at: at.clone(), age: 0, life: reduced ? CONE_LIFE_REDUCED : CONE_LIFE, reduced, cone };
    if (!reduced) {
      const plume = this.plumePool.acquire();
      if (plume) {
        plume.mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
        eruption.plume = plume;
      }
      this.spray.ring(at, 1.4, 48, 3.2, 3, 10);
      this.spray.ring(at, 4, 30, .4, 6, 5);
    }
    this.eruptions.push(eruption);
    debug('visual.chucdung.impact', { eventId, targets, reduced });
  }

  /** `trait-h01H` / `burst-h01H`: a small shock ring and a few sparks at the splash point. */
  strike(at: Vector3, burst: boolean, reduced: boolean): void {
    this.addRing(at, C.splashRadius, STRIKE_RING_LIFE);
    if (!reduced) this.spray.ring(at, .8, burst ? 22 : 10, .5, burst ? 5 : 3, burst ? 7 : 5);
  }

  tick(dt: number, time: number): void {
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const fx = this.telegraphs[i];
      fx.age += dt;
      if (fx.age >= fx.life) { this.telegraphPool.release(fx.layer); this.telegraphs.splice(i, 1); continue; }
      const charge = telegraphCharge(fx.age, fx.life - .12);
      const m = fx.layer.material;
      m.setFloat('uTime', time); m.setFloat('uAlpha', .35 + .65 * charge); m.setFloat('uFill', .45 + .4 * charge);
      m.setFloat('uRim', .9); m.setFloat('uBand', .72); m.setFloat('uSwirl', fx.reduced ? 0 : 1.2); m.setFloat('uRings', 0); m.setFloat('uSpiral', .3);
    }
    for (let i = this.eruptions.length - 1; i >= 0; i--) {
      const fx = this.eruptions[i];
      fx.age += dt;
      if (fx.age >= fx.life) { this.endEruption(fx); this.eruptions.splice(i, 1); continue; }
      this.tickCone(fx, time);
      if (fx.plume) this.tickPlume(fx, fx.plume, time);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const fx = this.rings[i];
      fx.age += dt;
      if (fx.age >= fx.life) { this.ringPool.release(fx.layer); this.rings.splice(i, 1); continue; }
      fx.layer.mesh.scaling.setAll(ringRadius(fx.age, fx.life, fx.max) * 2);
      const m = fx.layer.material;
      m.setFloat('uTime', time); m.setFloat('uAlpha', ringAlpha(fx.age, fx.life));
    }
  }

  clear(): void {
    this.telegraphs.length = 0; this.eruptions.length = 0; this.rings.length = 0;
    this.telegraphPool.releaseAll(); this.conePool.releaseAll(); this.plumePool.releaseAll(); this.ringPool.releaseAll();
  }

  private tickCone(fx: Eruption, time: number): void {
    const m = fx.cone.material;
    // Reduced motion: the standing volcano, frozen in time, marks the blast point for its short life.
    const age = fx.reduced ? CONE_LIFE * .3 : fx.age;
    m.setFloat('uTime', fx.reduced ? 0 : time);
    m.setFloat('uRadius', 0); m.setFloat('uThick', CONE_THICK);
    m.setFloat('uHeight', CONE_HEIGHT * coneHeight(age));
    m.setFloat('uCrash', coneCrash(age)); m.setFloat('uDissolve', coneDissolve(age)); m.setFloat('uAlpha', 1);
  }

  private tickPlume(fx: Eruption, plume: Layer, time: number): void {
    plume.mesh.position.set(fx.at.x, 2 + 3.2 * plumeRise(fx.age), fx.at.z);
    plume.mesh.scaling.set(1.7, 5.4, 1.7);
    const m = plume.material;
    m.setFloat('uTime', time); m.setFloat('uAlpha', plumeAlpha(fx.age)); m.setFloat('uDissolve', plumeDissolve(fx.age));
    if (fx.age > PLUME_LIFE) { this.plumePool.release(plume); fx.plume = undefined; }
  }

  private endEruption(fx: Eruption): void {
    this.conePool.release(fx.cone);
    if (fx.plume) this.plumePool.release(fx.plume);
  }

  private addRing(at: Vector3, max: number, life: number): void {
    const layer = this.ringPool.acquire();
    if (!layer) return;
    layer.mesh.position.set(at.x, .08, at.z);
    layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 8;
    const m = layer.material;
    // Outline-only ring: foam rim + ink contour, no fill, so it reads as a travelling shock edge.
    m.setFloat('uFill', 0); m.setFloat('uRim', 1); m.setFloat('uBand', 0); m.setFloat('uSwirl', 0); m.setFloat('uRings', 0);
    m.setFloat('uAlpha', 1);
    this.rings.push({ layer, age: 0, life, max });
  }
}
