import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitSpray } from './visual-kit-spray.js';
import { HASTE_FADE, HASTE_RADIUS, HASTE_SPIN, hasteAlpha, hasteScale, PETAL_GATE, PETAL_RING_URL, WAVE_SECONDS,
  waveAlpha, waveRadius } from './visual-mandon-timeline.js';

/** Up to 4 allies per Mẫu Đơn, ~3 Mẫu Đơn on a four-player board; the cap keeps the decals bounded. */
const MAX_RINGS = 16;
type Ring = { mesh: Mesh; material: StandardMaterial };
type Haste = { ring: Ring; at: Vector3; age: number; sinceMark: number; reduced: boolean; lastPetals: number };
type Wave = { ring: Ring; age: number };

/**
 * The painted petal-ring decal (top-down, under every actor) used twice: the haste ring that turns under an
 * ally while the snapshot holds Mẫu Đơn's buff, and the one-shot petal wave that sweeps out to the heal radius.
 */
export class MandonRings {
  private texture: Texture;
  private free: Ring[] = [];
  private created = 0;
  private hastes = new Map<string, Haste>();
  private waves: Wave[] = [];
  private time = 0;

  constructor(private scene: Scene, private petals: KitSpray) {
    this.texture = new Texture(PETAL_RING_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'mandon-petal-ring' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'mandon-petal-ring', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** The petal wave leaving Mẫu Đơn when the peony opens; skipped under reduced motion (the stream strips still show reach). */
  wave(at: Vector3): void {
    const ring = this.acquire(GROUND_ALPHA_INDEX + 1);
    if (!ring) return;
    ring.mesh.position.set(at.x, .03, at.z);
    ring.mesh.rotation.y = Math.random() * Math.PI * 2;
    ring.mesh.setEnabled(true);
    this.waves.push({ ring, age: 0 });
  }

  /** Snapshot marker `haste` on an ally holding Mẫu Đơn's buff, every frame it holds. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let haste = this.hastes.get(id);
    if (!haste) {
      const ring = this.acquire(GROUND_ALPHA_INDEX + 2);
      if (!ring) return;
      ring.mesh.rotation.y = Math.random() * Math.PI * 2;
      ring.mesh.setEnabled(true);
      haste = { ring, at: at.clone(), age: 0, sinceMark: 0, reduced, lastPetals: this.time };
      this.hastes.set(id, haste);
      debug('visual.mandon.haste.start', { reduced });
    }
    haste.at.copyFrom(at);
    haste.sinceMark = 0;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.age += dt;
      if (wave.age >= WAVE_SECONDS) { this.release(wave.ring); this.waves.splice(i, 1); continue; }
      const size = waveRadius(wave.age) * 2;
      wave.ring.mesh.scaling.set(size, 1, size);
      wave.ring.mesh.rotation.y -= HASTE_SPIN * .6 * dt;
      wave.ring.material.alpha = waveAlpha(wave.age);
    }
    for (const [id, haste] of this.hastes) {
      haste.age += dt; haste.sinceMark += dt;
      if (haste.sinceMark >= HASTE_FADE) { this.release(haste.ring); this.hastes.delete(id); continue; }
      // Marks arrive every frame while the buff holds; the first missed frame starts the wither.
      const sinceLast = Math.max(0, haste.sinceMark - dt * 1.5);
      const size = HASTE_RADIUS * 2 * hasteScale(haste.age);
      haste.ring.mesh.position.set(haste.at.x, .035, haste.at.z);
      haste.ring.mesh.scaling.set(size, 1, size);
      haste.ring.material.alpha = hasteAlpha(haste.age, sinceLast);
      if (haste.reduced) continue;
      haste.ring.mesh.rotation.y -= HASTE_SPIN * dt;
      if (time - haste.lastPetals >= PETAL_GATE) {
        haste.lastPetals = time;
        this.petals.trail(new Vector3(haste.at.x, .5, haste.at.z), new Vector3(0, 1.1, 0), 2);
      }
    }
  }

  clear(): void {
    for (const wave of this.waves) this.release(wave.ring);
    this.waves.length = 0;
    for (const haste of this.hastes.values()) this.release(haste.ring);
    this.hastes.clear();
  }

  private acquire(alphaIndex: number): Ring | undefined {
    const pooled = this.free.pop();
    const ring = pooled ?? this.create();
    if (!ring) return undefined;
    ring.mesh.alphaIndex = alphaIndex; // floor decal: every actor draws over it
    return ring;
  }

  private create(): Ring | undefined {
    if (this.created >= MAX_RINGS) { debug('visual.kit.pool.cap', { pool: 'mandon-ring' }); return undefined; }
    const name = `mandon-ring-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // like kitMaterial: the front of the ring must not slice actors' legs
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    return { mesh, material };
  }

  private release(ring: Ring): void {
    ring.mesh.setEnabled(false);
    this.free.push(ring);
  }
}
