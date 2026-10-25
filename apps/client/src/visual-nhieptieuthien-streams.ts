import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { HEAL_DELAY, HEAL_SECONDS, healFrame, NHIEP_ATLAS, NOTE_RIBBON_URL, RIBBON_EXTEND, RIBBON_LIFE, RIBBON_START,
  RIBBON_STAGGER, ribbonAlpha, ribbonPlaneWidth, ribbonReach, ribbonWidth } from './visual-nhieptieuthien-timeline.js';

/** 3 allies per cast, a cast every 9 s per Tiểu Thiến: three overlapping casts is already generous. */
const MAX_RIBBONS = 10;
/** Waist height: the strip sits under every actor (ground alpha index) so bodies stay crisp where it crosses. */
const RIBBON_HEIGHT = 1.1;
/** Leaves her pipa hand, not her centre. */
const HAND_OFFSET = .5;
const HEAL_SCALE = 1;
/** Reduced motion: one still bloom frame and the full strip, briefly, no growth. */
const STILL_HEAL_FRAME = 3;
const STILL_SECONDS = .35;
/** An ally closer than this is Tiểu Thiến herself (she may heal herself): bloom only, no ribbon. */
const SELF_DISTANCE = .3;

type Slot = { mesh: Mesh; material: StandardMaterial; texture: Texture };
type Ribbon = {
  slot?: Slot; delay: number; age: number; from: Vector3; dir: { x: number; z: number }; length: number;
  at: Vector3; self: boolean; heal?: Sprite; struck: boolean; reduced: boolean;
};

/**
 * Note ribbons from Tiểu Thiến to each healed ally (the painted pearl ribbon of notes and small orchids whose
 * right end is a great orchid: it grows head first, holds, thins and fades) and the `nhieptieuthien-heal` orchid
 * bloom on the ally when the head arrives. Allies are the server's `targets`; nothing here decides who is healed.
 */
export class NhiepStreams {
  private base: Texture;
  private free: Slot[] = [];
  private created = 0;
  private ribbons: Ribbon[] = [];
  private capLogged = false;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private flecks: KitSpray) {
    this.base = new Texture(NOTE_RIBBON_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'nhieptieuthien-note-ribbon' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'nhieptieuthien-note-ribbon', message: String(error ?? 'load failed') }));
    this.base.hasAlpha = true;
    this.base.wrapU = this.base.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** `ability skill-h03O`: `origin` = Tiểu Thiến, `targets` = every recipient (herself gets the bloom without a ribbon). */
  cast(origin: Vector3, targets: readonly Vector3[], reduced: boolean): number {
    let started = 0;
    targets.forEach((at, index) => {
      const dx = at.x - origin.x, dz = at.z - origin.z;
      const distance = Math.hypot(dx, dz);
      const self = distance < SELF_DISTANCE;
      const dir = self ? { x: 1, z: 0 } : { x: dx / distance, z: dz / distance };
      const offset = self ? 0 : Math.min(HAND_OFFSET, distance * .3);
      const from = new Vector3(origin.x + dir.x * offset, RIBBON_HEIGHT, origin.z + dir.z * offset);
      this.ribbons.push({ delay: reduced ? 0 : RIBBON_START + index * RIBBON_STAGGER, age: reduced ? RIBBON_EXTEND : 0, from, dir,
        length: self ? 0 : distance - offset, at: at.clone(), self, struck: false, reduced });
      started++;
    });
    return started;
  }

  tick(dt: number): void {
    for (let i = this.ribbons.length - 1; i >= 0; i--) {
      const ribbon = this.ribbons[i];
      if (ribbon.delay > 0) { ribbon.delay -= dt; if (ribbon.delay > 0) continue; }
      if (!ribbon.slot && !ribbon.self) {
        ribbon.slot = this.acquire();
        if (!ribbon.slot) { this.ribbons.splice(i, 1); continue; }
        ribbon.slot.mesh.rotation.y = -Math.atan2(ribbon.dir.z, ribbon.dir.x);
        ribbon.slot.mesh.setEnabled(true);
      }
      ribbon.age += dt;
      if (!ribbon.struck && ribbon.age >= (ribbon.self ? RIBBON_EXTEND * .5 : HEAL_DELAY)) this.strike(ribbon);
      if (ribbon.heal) {
        const healAge = ribbon.age - (ribbon.self ? RIBBON_EXTEND * .5 : HEAL_DELAY);
        if (healAge >= (ribbon.reduced ? STILL_SECONDS : HEAL_SECONDS)) { this.flipbooks.release(NHIEP_ATLAS.heal, ribbon.heal); ribbon.heal = undefined; }
        else ribbon.heal.cellIndex = ribbon.reduced ? STILL_HEAL_FRAME : healFrame(healAge);
      }
      const life = ribbon.reduced ? RIBBON_EXTEND + STILL_SECONDS : RIBBON_LIFE;
      if (ribbon.age >= life && !ribbon.heal) { if (ribbon.slot) this.release(ribbon.slot); this.ribbons.splice(i, 1); continue; }
      this.layout(ribbon, life);
    }
  }

  clear(): void {
    for (const ribbon of this.ribbons) {
      if (ribbon.heal) this.flipbooks.release(NHIEP_ATLAS.heal, ribbon.heal);
      if (ribbon.slot) this.release(ribbon.slot);
    }
    this.ribbons.length = 0;
    this.capLogged = false;
  }

  private layout(ribbon: Ribbon, life: number): void {
    const slot = ribbon.slot;
    if (!slot) return;
    if (ribbon.age >= life) { slot.mesh.setEnabled(false); return; }
    const reach = Math.max(.02, ribbonReach(ribbon.age));
    const shown = ribbon.length * reach;
    slot.mesh.position.set(ribbon.from.x + ribbon.dir.x * shown / 2, RIBBON_HEIGHT, ribbon.from.z + ribbon.dir.z * shown / 2);
    slot.mesh.scaling.set(shown, 1, ribbonPlaneWidth(ribbon.length) * ribbonWidth(ribbon.age));
    // Right end of the painting (the orchid head) always sits at the growing tip.
    slot.texture.uScale = reach;
    slot.texture.uOffset = 1 - reach;
    slot.material.alpha = ribbon.reduced ? ribbonAlpha(Math.min(ribbon.age, RIBBON_EXTEND)) : ribbonAlpha(ribbon.age);
  }

  private strike(ribbon: Ribbon): void {
    ribbon.struck = true;
    ribbon.heal = this.flipbooks.spawn(NHIEP_ATLAS.heal, new Vector3(ribbon.at.x, 0, ribbon.at.z), HEAL_SCALE);
    if (!ribbon.reduced) this.flecks.trail(new Vector3(ribbon.at.x, .7, ribbon.at.z), new Vector3(0, 1.4, 0), 4);
  }

  private acquire(): Slot | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_RIBBONS) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'nhieptieuthien-ribbon' }); }
      return undefined;
    }
    const name = `nhieptieuthien-ribbon-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const texture = this.base.clone();
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableDepthWrite = true; // like kitMaterial: actors drawn later must not be clipped by the quad
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 3;
    mesh.setEnabled(false);
    return { mesh, material, texture };
  }

  private release(slot: Slot): void {
    slot.mesh.setEnabled(false);
    this.free.push(slot);
  }
}
