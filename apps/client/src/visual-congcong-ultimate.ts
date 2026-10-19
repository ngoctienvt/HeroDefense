import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { CONGCONG as C } from '../../../content/congcong-design.js';
import { debug } from './debug.js';
import { actorAlphaIndex, GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, createLoftedRingLayer, type Layer, type RingProfile } from './visual-kit-layers.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BUZHOU_BREAK_SECONDS, blackIceShatter, blackIceSpread, buzhouFrame, CONGCONG_ATLAS, splashFrame, SPLASH_LIFE,
  TSUNAMI_CRASH_END, TSUNAMI_EXPAND, TSUNAMI_LIFE, tsunamiCrash, tsunamiHeight, tsunamiRadius } from './visual-congcong-timeline.js';

/** Standing and crashed wave profiles (dr, z) from the Blender reference; 12 points each. */
const RISE: RingProfile = [[-.9, 0], [-.55, .35], [-.25, .85], [0, 1.35], [.2, 1.62], [.42, 1.56], [.58, 1.3], [.55, 1.05], [.38, .95], [.3, .6], [.35, .2], [.5, 0]];
const CRASH: RingProfile = [[-.9, 0], [-.5, .15], [-.1, .3], [.3, .42], [.75, .45], [1, .36], [1.15, .22], [1.1, .13], [.9, .1], [.8, .08], [.85, .04], [1, 0]];
const MAX_ULTIMATES = 4;
const MOUNTAIN_SCALE = 1.22;
// The mountain billboard faces the camera, so its tall centre sits closer to the camera than its foot.
// Pushed 6 units toward the far side (-Z) its depth stays behind the hero for camera beta 0.70–0.84.
const MOUNTAIN_BEHIND = 6;

type Splash = { sprite: Sprite; age: number };
type Ultimate = {
  source: string; center: Vector3; age: number; windup: number; impactAge?: number; reduced: boolean;
  mountain?: Sprite; crashed: boolean; end: number;
};
type Slot = { telegraph: Layer; feet: Layer; flood: Layer; ice: Layer; wall: Layer; ult?: Ultimate };

/** Nộ Xúc Bất Chu Sơn: windup telegraph, mountain flipbook, shader tsunami and black ice. */
export class CongcongUltimate {
  private slots: Slot[] = [];
  private splashes: Splash[] = [];

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {}

  cast(source: string, center: Vector3, windup: number, reduced: boolean): void {
    const slot = this.slotFor(source);
    if (!slot) { debug('visual.congcong.cap', { layer: 'ultimate' }); return; }
    this.release(slot);
    slot.ult = { source, center: center.clone(), age: 0, windup, reduced, crashed: false, end: windup + .6 };
    if (!reduced) {
      const behind = new Vector3(center.x, 0, center.z - MOUNTAIN_BEHIND);
      slot.ult.mountain = this.flipbooks.spawn(CONGCONG_ATLAS.buzhou, behind, MOUNTAIN_SCALE);
    }
    this.show(slot.telegraph, center, C.waveRadius, .04);
    this.show(slot.feet, center, 2.4, .07);
    slot.telegraph.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2; slot.feet.mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    debug('visual.congcong.cast', { windup, reduced, mountain: Boolean(slot.ult.mountain) });
  }

  impact(source: string, center: Vector3, reduced: boolean): void {
    let slot = this.slots.find(s => s.ult?.source === source);
    if (!slot?.ult) {
      // Lobby practice casts resolve instantly and reconnects may miss the cast: start at the impact.
      this.cast(source, center, C.windup, reduced);
      slot = this.slots.find(s => s.ult?.source === source);
      if (!slot?.ult) return;
      slot.ult.age = slot.ult.windup;
    }
    const ult = slot.ult;
    ult.impactAge = ult.age;
    ult.center = center.clone();
    ult.end = ult.age + Math.max(C.iceVisualSeconds, TSUNAMI_LIFE, BUZHOU_BREAK_SECONDS) + .05;
    this.show(slot.flood, center, C.waveRadius, .06);
    this.show(slot.ice, center, C.waveRadius, .08);
    slot.flood.mesh.alphaIndex = GROUND_ALPHA_INDEX + 4; slot.ice.mesh.alphaIndex = GROUND_ALPHA_INDEX + 5;
    if (!reduced) {
      slot.wall.mesh.position.set(center.x, 0, center.z);
      // One ring mesh can't be split front/back; drawing it just before Cộng Công keeps him crisp at its centre.
      slot.wall.mesh.alphaIndex = actorAlphaIndex(this.scene, center.x, center.z) - 2;
      slot.wall.mesh.setEnabled(true);
      this.splash(new Vector3(center.x, 0, center.z - MOUNTAIN_BEHIND), 1.9);
      this.spray.ring(center, 2.2, 70, 1.2, 7, 7);
    }
  }

  tick(dt: number, time: number): void {
    for (const slot of this.slots) {
      const ult = slot.ult;
      if (!ult) continue;
      ult.age += dt;
      if (ult.age >= ult.end) { this.release(slot); continue; }
      this.tickWindup(slot, ult, time);
      if (ult.impactAge !== undefined) this.tickWave(slot, ult, ult.age - ult.impactAge, time);
      if (ult.mountain) {
        ult.mountain.cellIndex = buzhouFrame(ult.age, ult.windup, ult.impactAge);
        if (ult.impactAge !== undefined && ult.age - ult.impactAge > BUZHOU_BREAK_SECONDS) {
          this.flipbooks.release(CONGCONG_ATLAS.buzhou, ult.mountain); ult.mountain = undefined;
        }
      }
    }
    for (let i = this.splashes.length - 1; i >= 0; i--) {
      const splash = this.splashes[i];
      splash.age += dt;
      if (splash.age >= SPLASH_LIFE) { this.flipbooks.release(CONGCONG_ATLAS.splash, splash.sprite); this.splashes.splice(i, 1); continue; }
      splash.sprite.cellIndex = splashFrame(splash.age);
    }
  }

  clear(): void {
    for (const slot of this.slots) this.release(slot);
    for (const splash of this.splashes) this.flipbooks.release(CONGCONG_ATLAS.splash, splash.sprite);
    this.splashes.length = 0;
  }

  /** Telegraph darkens to the real wave radius; feet swirl tightens; water is drawn upward. */
  private tickWindup(slot: Slot, ult: Ultimate, time: number): void {
    const charge = Math.min(1, ult.age / Math.max(.05, ult.windup));
    const after = ult.impactAge === undefined ? 0 : ult.age - ult.impactAge;
    const fade = Math.max(0, 1 - after / .22);
    const motion = ult.reduced ? 0 : 1;
    this.uniforms(slot.telegraph.material, time, fade * (.35 + .65 * charge), .85 * charge, charge, 1.4 * motion, .7 * motion);
    this.uniforms(slot.feet.material, time, fade * charge * (ult.reduced ? 0 : 1), .9, .8, 5 * motion, 0);
    if (fade <= 0) { slot.telegraph.mesh.setEnabled(false); slot.feet.mesh.setEnabled(false); }
    if (!ult.reduced && ult.impactAge === undefined && Math.random() < .55) this.spray.rise(ult.center, 2.6, 2);
  }

  private tickWave(slot: Slot, ult: Ultimate, age: number, time: number): void {
    const radius = tsunamiRadius(age, C.waveRadius);
    const progress = radius / C.waveRadius;
    // Flood floor follows the crest, then drains; reduced motion shows it briefly at full size.
    const floodAlpha = ult.reduced ? Math.max(0, 1 - age / .35) : Math.max(0, 1 - Math.max(0, age - TSUNAMI_CRASH_END) / (TSUNAMI_LIFE - TSUNAMI_CRASH_END));
    slot.flood.mesh.scaling.setAll(ult.reduced ? C.waveRadius * 2 : radius * 2 + .4);
    this.uniforms(slot.flood.material, time, floodAlpha, .8, ult.reduced ? .6 : 1, ult.reduced ? 0 : .6, 0);
    if (floodAlpha <= 0) slot.flood.mesh.setEnabled(false);
    const ice = slot.ice.material;
    ice.setFloat('uTime', time);
    ice.setFloat('uSpread', ult.reduced ? 1 : blackIceSpread(age - .05));
    ice.setFloat('uShatter', ult.reduced ? 0 : blackIceShatter(age, C.iceVisualSeconds));
    ice.setFloat('uAlpha', Math.min(1, age / .12) * (ult.reduced ? Math.max(0, Math.min(1, (C.iceVisualSeconds - age) / .3)) : 1));
    if (ult.reduced) return;
    const wall = slot.wall.material;
    wall.setFloat('uTime', time);
    wall.setFloat('uRadius', radius);
    wall.setFloat('uThick', C.waveRadius / 4.6 * .9);
    wall.setFloat('uHeight', 2.4 * tsunamiHeight(age)); // crest ≈ 3.9 units: reads as a wave next to a 6.9-unit hero
    wall.setFloat('uCrash', tsunamiCrash(age));
    wall.setFloat('uDissolve', tsunamiCrash(age) * .25
      + (age > TSUNAMI_CRASH_END ? (age - TSUNAMI_CRASH_END) / (TSUNAMI_LIFE - TSUNAMI_CRASH_END) * .7 : 0));
    wall.setFloat('uAlpha', age < TSUNAMI_LIFE ? 1 : 0);
    if (age >= TSUNAMI_LIFE) slot.wall.mesh.setEnabled(false);
    if (age < TSUNAMI_EXPAND && Math.random() < .8) this.spray.ring(ult.center, radius, 4, 2, 4, 5);
    if (!ult.crashed && age >= TSUNAMI_EXPAND - .05 && progress > .95) {
      ult.crashed = true;
      // Crown sprites along the rim read as floating towers; the crash is carried by the wall + dense spray.
      this.spray.ring(ult.center, C.waveRadius, 110, 1.4, 6, 7);
      debug('visual.congcong.crash', { radius: C.waveRadius });
    }
  }

  private splash(at: Vector3, scale: number): void {
    const sprite = this.flipbooks.spawn(CONGCONG_ATLAS.splash, at, scale);
    if (sprite) this.splashes.push({ sprite, age: 0 });
  }

  private uniforms(material: ShaderMaterial, time: number, alpha: number, fill: number, rim: number, swirl: number, rings: number): void {
    material.setFloat('uTime', time); material.setFloat('uAlpha', alpha); material.setFloat('uFill', fill);
    material.setFloat('uRim', rim); material.setFloat('uSwirl', swirl); material.setFloat('uRings', rings);
  }

  private show(layer: Layer, center: Vector3, radius: number, y: number): void {
    layer.mesh.position.set(center.x, y, center.z);
    layer.mesh.scaling.setAll(radius * 2);
    layer.material.setFloat('uAlpha', 0);
    layer.mesh.setEnabled(true);
  }

  private release(slot: Slot): void {
    if (slot.ult?.mountain) this.flipbooks.release(CONGCONG_ATLAS.buzhou, slot.ult.mountain);
    slot.ult = undefined;
    for (const layer of [slot.telegraph, slot.feet, slot.flood, slot.ice, slot.wall]) layer.mesh.setEnabled(false);
  }

  private slotFor(source: string): Slot | undefined {
    const own = this.slots.find(s => s.ult?.source === source) ?? this.slots.find(s => !s.ult);
    if (own) return own;
    if (this.slots.length >= MAX_ULTIMATES) return undefined;
    const index = this.slots.length;
    const flat = (name: string, shader: 'kitGround' | 'kitCrust', palette: 'blackwater' | 'ice'): Layer =>
      createGroundLayer(this.scene, shader, palette, `congcong-${name}-${index}`);
    const slot: Slot = { telegraph: flat('telegraph', 'kitGround', 'blackwater'), feet: flat('feet', 'kitGround', 'blackwater'),
      flood: flat('flood', 'kitGround', 'blackwater'), ice: flat('ice', 'kitCrust', 'ice'),
      wall: createLoftedRingLayer(this.scene, 'blackwater', `congcong-tsunami-${index}`, C.waveRadius, RISE, CRASH) };
    this.slots.push(slot);
    return slot;
  }
}
