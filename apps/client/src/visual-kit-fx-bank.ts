import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { ATLASES } from './visual-kit-atlas-manifest.js';
import { actorAlphaIndex, GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { createGroundLayer, createShellLayer, LayerPool } from './visual-kit-layers.js';
import { setPalette, type KitPaletteName } from './visual-kit-palettes.js';
import { flipScale, flipState, holdState, ringState, slashPlaneSize, streakSweep } from './visual-kit-recipe-timeline.js';
import { KitSpray, type SprayPresetName } from './visual-kit-spray.js';
import { fadeOut, sweep } from './visual-kit-timeline.js';

const MAX_GROUND = 40, MAX_RIBBONS = 24, MAX_SLASHES = 12, MAX_DOMES = 16, MAX_DELAYED = 48;

interface Timed { age: number; life: number; apply(age: number): void; end(): void }

export interface RingOptions {
  life: number; fill?: number; rim?: number; swirl?: number; alpha?: number;
  /** Stay at full radius and cool out (cracks, scorch) instead of expanding. */
  hold?: boolean; reduced?: boolean; order?: number;
}
export interface RibbonOptions {
  life: number; width: number; wave?: number; taper?: number; height?: number; reduced?: boolean;
  /** Longest visible stretch (world units): long shots read as a travelling streak, not a rope across the field. */
  maxSpan?: number;
}
export interface FlipOptions { tint?: readonly [number, number, number]; perFrame?: number }

/**
 * The shared "one impact = three layers" toolbox of the data-driven recipes: ground rings/decals, ribbons
 * (bolt, thrust, chain), slash crescents, Blender library flipbooks and one spray per material, all pooled,
 * capped and returned on `clear()`. Heroes never create meshes or materials themselves.
 */
export class KitFxBank {
  private ground: LayerPool;
  private ribbons: LayerPool;
  private slashes: LayerPool;
  private domes: LayerPool;
  private sprays = new Map<SprayPresetName, KitSpray>();
  private delayed: { left: number; run: () => void }[] = [];
  private timed: Timed[] = [];
  private serial = 0;
  private time = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks) {
    this.ground = new LayerPool(() => createGroundLayer(scene, 'kitGround', 'jade', `fx-ground-${this.serial++}`),
      MAX_GROUND, 'fx-ground');
    this.ribbons = new LayerPool(() => this.overlay(createGroundLayer(scene, 'kitLink', 'gold', `fx-ribbon-${this.serial++}`)),
      MAX_RIBBONS, 'fx-ribbon');
    this.slashes = new LayerPool(() => this.overlay(createGroundLayer(scene, 'kitSlash', 'gold', `fx-slash-${this.serial++}`)),
      MAX_SLASHES, 'fx-slash');
    this.domes = new LayerPool(() => createShellLayer(scene, 'gold', `fx-dome-${this.serial++}`, 16), MAX_DOMES, 'fx-dome');
  }

  /** Short-lived swings must read in front of the hero billboard (same rule as the Cộng Công cleave). */
  private overlay<L extends { material: { depthFunction: number } }>(layer: L): L {
    layer.material.depthFunction = Constants.ALWAYS;
    return layer;
  }

  ensureAtlases(ids: readonly string[]): void { for (const id of ids) this.flipbooks.ensure(id); }

  spray(name: SprayPresetName): KitSpray {
    let spray = this.sprays.get(name);
    if (!spray) { spray = new KitSpray(this.scene, name); this.sprays.set(name, spray); }
    return spray;
  }

  /** Ground ring or decal drawn before every actor. */
  ring(at: Vector3, radius: number, palette: KitPaletteName, options: RingOptions): void {
    const layer = this.ground.acquire();
    if (!layer) return;
    const { mesh, material: m } = layer;
    setPalette(m, palette);
    m.setFloat('uFill', options.fill ?? 0); m.setFloat('uRim', options.rim ?? 1);
    m.setFloat('uBand', 0); m.setFloat('uRings', 0); m.setFloat('uSpiral', 0); m.setFloat('uSwirl', options.swirl ?? 0);
    mesh.position.set(at.x, .05, at.z);
    mesh.alphaIndex = GROUND_ALPHA_INDEX + (options.order ?? 4);
    const state = options.hold ? holdState : ringState;
    this.start(options.life, options.reduced ? options.life * .3 : 0, age => {
      const { scale, alpha } = state(age, options.life);
      mesh.scaling.setAll(radius * 2 * (options.reduced ? 1 : scale));
      m.setFloat('uTime', options.reduced ? 0 : this.time); m.setFloat('uAlpha', alpha * (options.alpha ?? .9));
    }, () => this.ground.release(layer));
  }

  /** Ribbon from A to B at `height`: head sweeps out, tail follows. */
  ribbon(from: Vector3, to: Vector3, palette: KitPaletteName, options: RibbonOptions): void {
    const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz);
    if (length < .2) return;
    const layer = this.ribbons.acquire();
    if (!layer) return;
    const { mesh, material: m } = layer;
    setPalette(m, palette);
    m.setFloat('uWave', options.wave ?? 0); m.setFloat('uTaper', options.taper ?? 0);
    mesh.scaling.set(length, 1, options.width);
    mesh.position.set((from.x + to.x) / 2, options.height ?? 1, (from.z + to.z) / 2);
    mesh.rotation.y = -Math.atan2(dz, dx);
    this.start(options.life, options.reduced ? options.life * .5 : 0, age => {
      const sweepNow = streakSweep(age, options.life);
      const { head, alpha } = sweepNow;
      const tail = Math.max(sweepNow.tail, head - (options.maxSpan ?? 3) / length);
      m.setFloat('uHead', head); m.setFloat('uTail', tail); m.setFloat('uAlpha', alpha); m.setFloat('uTime', this.time);
    }, () => this.ribbons.release(layer));
  }

  /** Crescent swing centred on the caster toward `dir`, band on `reach`, half-angle `arc` (rad). */
  slash(origin: Vector3, dir: { x: number; z: number }, reach: number, arc: number, palette: KitPaletteName,
    life: number, reduced: boolean): void {
    const layer = this.slashes.acquire();
    if (!layer) return;
    const { mesh, material: m } = layer;
    setPalette(m, palette);
    m.setFloat('uArc', arc);
    mesh.scaling.setAll(slashPlaneSize(reach));
    mesh.position.set(origin.x, 1, origin.z);
    mesh.rotation.y = Math.atan2(dir.x, dir.z);
    this.start(life, reduced ? life * .5 : 0, age => {
      m.setFloat('uHead', sweep(age, 0, life * .53)); m.setFloat('uTail', sweep(age, life * .235, life * .765));
      m.setFloat('uAlpha', fadeOut(age, life * .7, life * .3)); m.setFloat('uTime', this.time);
    }, () => this.slashes.release(layer));
  }


  /** Fresnel dome around one actor (ward, bell, mist shield): drawn just before that actor so the hero stays crisp. */
  dome(at: Vector3, palette: KitPaletteName, size: { x: number; y: number }, life: number, reduced = false): void {
    const layer = this.domes.acquire();
    if (!layer) return;
    const { mesh, material: m } = layer;
    setPalette(m, palette);
    mesh.position.set(at.x, size.y * .6, at.z);
    mesh.scaling.set(size.x, size.y, size.x);
    mesh.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
    this.start(life, reduced ? life * .3 : 0, age => {
      const { scale, alpha } = ringState(age, life);
      m.setFloat('uTime', this.time); m.setFloat('uAlpha', alpha * .9);
      m.setFloat('uDissolve', 1 - alpha);
      mesh.scaling.set(size.x * (.8 + .2 * scale), size.y * (.8 + .2 * scale), size.x * (.8 + .2 * scale));
    }, () => this.domes.release(layer));
  }

  /** Runs `run` after `seconds`; dropped (never run) on clear(), so nothing fires into the next zone. */
  after(seconds: number, run: () => void): void {
    if (this.delayed.length >= MAX_DELAYED) return;
    this.delayed.push({ left: seconds, run });
  }

  /** Library flipbook at `at`; false when the atlas is not loaded or at cap (callers keep their other layers). */
  flip(atlas: string, at: Vector3, scale: number, options: FlipOptions = {}): boolean {
    const frames = ATLASES.get(atlas)?.frames ?? 0;
    const sprite: Sprite | undefined = frames > 0 ? this.flipbooks.spawn(atlas, at, scale) : undefined;
    if (!sprite) return false;
    const perFrame = options.perFrame ?? .05, life = frames * perFrame;
    const [r, g, b] = options.tint ?? [1, 1, 1];
    sprite.color = new Color4(r, g, b, 1);
    this.start(life, 0, age => {
      sprite.cellIndex = flipState(age, frames, perFrame).frame;
      this.flipbooks.place(atlas, sprite, at, scale * flipScale(age, life));
    }, () => this.flipbooks.release(atlas, sprite));
    return true;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (let i = this.delayed.length - 1; i >= 0; i--) {
      const entry = this.delayed[i];
      entry.left -= dt;
      if (entry.left <= 0) { this.delayed.splice(i, 1); entry.run(); }
    }
    for (let i = this.timed.length - 1; i >= 0; i--) {
      const entry = this.timed[i];
      entry.age += dt;
      if (entry.age >= entry.life) { entry.end(); this.timed.splice(i, 1); continue; }
      entry.apply(entry.age);
    }
  }

  clear(): void {
    for (const entry of this.timed) entry.end();
    this.timed.length = 0;
    this.delayed.length = 0;
    this.ground.releaseAll(); this.ribbons.releaseAll(); this.slashes.releaseAll(); this.domes.releaseAll();
    this.flipbooks.clear();
    for (const spray of this.sprays.values()) spray.clear();
  }

  private start(life: number, startAge: number, apply: (age: number) => void, end: () => void): void {
    apply(startAge);
    this.timed.push({ age: startAge, life, apply, end });
  }
}
