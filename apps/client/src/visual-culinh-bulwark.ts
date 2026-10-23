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
import { BULWARK_DIAMETER, BULWARK_FADE_OUT, BULWARK_URL, bulwarkAlpha, bulwarkKick, bulwarkScale, CULINH_ATLAS,
  GUARD_SECONDS, guardFrame, WORN_ALPHA, WORN_SCALE, wornBlend } from './visual-culinh-timeline.js';

const MAX_RINGS = 10;
const MAX_GUARDS = 10;
/** Reduced motion: plates standing mid-thrust (frame 4) for a moment, then the static ring only. */
const STILL_GUARD = 4;
const STILL_GUARD_SECONDS = .3;

type Ring = { mesh: Mesh; material: StandardMaterial; at: Vector3; age: number; sinceMark: number; sinceHit: number; wornFor: number; worn: boolean };
type Guard = { sprite?: Sprite; age: number; reduced: boolean };

/**
 * The wall half of Thiết Bích Trấn on every protected ally: small iron plates thrust up around the feet
 * (guard flipbook, one per recipient) and settle flush into a painted top-down ring of plates that stays
 * under the ally for as long as the snapshot holds their ward (ground decal, under every actor).
 */
export class CulinhBulwark {
  private guards: Guard[] = [];
  private rings = new Map<string, Ring>();
  private free: Ring[] = [];
  private texture: Texture;
  private created = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.texture = new Texture(BULWARK_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'culinh-bulwark' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'culinh-bulwark', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** `ability skill-h00E`: plates rise around each recipient (`positions`, one per ally in range). */
  raise(positions: readonly Vector3[], reduced: boolean): void {
    for (const at of positions) {
      if (this.guards.length >= MAX_GUARDS) { debug('visual.kit.pool.cap', { pool: 'culinh-guard' }); break; }
      this.guards.push({ sprite: this.flipbooks.spawn(CULINH_ATLAS.guard, at, 1), age: 0, reduced });
      if (!reduced) this.spray.ring(at, BULWARK_DIAMETER * .4, 5, .2, 1.8, 2);
    }
    debug('visual.culinh.guard', { allies: positions.length, reduced });
  }

  /** Snapshot marker `bulwark`, every frame the unit still holds Cự Linh's ward. */
  mark(id: string, at: Vector3, worn: boolean): void {
    let ring = this.rings.get(id);
    if (!ring) {
      const created = this.acquire();
      if (!created) return;
      ring = created;
      ring.age = 0; ring.sinceHit = 1; ring.wornFor = 0; ring.worn = false;
      ring.mesh.setEnabled(true);
      this.rings.set(id, ring);
      debug('visual.culinh.bulwark.start', { active: this.rings.size });
    }
    ring.at.copyFrom(at);
    ring.sinceMark = 0;
    if (worn && !ring.worn) debug('visual.culinh.bulwark.worn', { id: 'ring' });
    ring.worn = worn;
  }

  /** Snapshot shield dropped on a ringed unit (it absorbed a blow): the ring rings outward and sparks. */
  hit(id: string, reduced: boolean): void {
    const ring = this.rings.get(id);
    if (!ring) return;
    ring.sinceHit = 0;
    if (!reduced) this.spray.ring(ring.at, BULWARK_DIAMETER * .42, 3, .15, 1.6, 1.4);
  }

  tick(dt: number): void {
    for (let i = this.guards.length - 1; i >= 0; i--) {
      const guard = this.guards[i];
      guard.age += dt;
      const life = guard.reduced ? STILL_GUARD_SECONDS : GUARD_SECONDS;
      if (guard.sprite) guard.sprite.cellIndex = guard.reduced ? STILL_GUARD : guardFrame(guard.age);
      if (guard.age >= life) { this.flipbooks.release(CULINH_ATLAS.guard, guard.sprite); this.guards.splice(i, 1); }
    }
    for (const [id, ring] of this.rings) {
      ring.age += dt; ring.sinceMark += dt; ring.sinceHit += dt;
      ring.wornFor = ring.worn ? ring.wornFor + dt : 0;
      if (ring.sinceMark >= BULWARK_FADE_OUT) { this.release(ring); this.rings.delete(id); continue; }
      // Marks arrive every frame while the ward holds; the first missed frame starts the fade.
      const sinceLastMark = Math.max(0, ring.sinceMark - dt * 1.5);
      const worn = wornBlend(ring.wornFor);
      const size = BULWARK_DIAMETER * bulwarkScale(ring.age) * (1 - (1 - WORN_SCALE) * worn) * bulwarkKick(ring.sinceHit);
      ring.mesh.position.set(ring.at.x, .04, ring.at.z);
      ring.mesh.scaling.set(size, 1, size);
      ring.material.alpha = bulwarkAlpha(ring.age, sinceLastMark) * (1 - (1 - WORN_ALPHA) * worn);
    }
  }

  clear(): void {
    for (const guard of this.guards) this.flipbooks.release(CULINH_ATLAS.guard, guard.sprite);
    this.guards.length = 0;
    for (const ring of this.rings.values()) this.release(ring);
    this.rings.clear();
  }

  private acquire(): Ring | undefined {
    const pooled = this.free.pop();
    if (pooled) return pooled;
    if (this.created >= MAX_RINGS) { debug('visual.kit.pool.cap', { pool: 'culinh-bulwark' }); return undefined; }
    const name = `culinh-bulwark-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // like kitMaterial: the front of the ring must not slice the ally's legs
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 1; // floor decal: every actor draws over it
    mesh.setEnabled(false);
    return { mesh, material, at: Vector3.Zero(), age: 0, sinceMark: 0, sinceHit: 1, wornFor: 0, worn: false };
  }

  private release(ring: Ring): void {
    ring.mesh.setEnabled(false);
    this.free.push(ring);
  }
}
