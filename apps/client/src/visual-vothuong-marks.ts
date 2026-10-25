import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { MARK_DIAMETER, MARK_FADE, MARK_RING_URL, MARK_SPIN, markAlpha, markScale } from './visual-vothuong-timeline.js';

/** One pending victim per Vô Thường; a four-player board has a handful of them. */
const MAX_MARKS = 6;
type Ring = { mesh: Mesh; material: StandardMaterial };
type Mark = { ring: Ring; at: Vector3; age: number; sinceMark: number; reduced: boolean };

/**
 * The painted yin-yang death-mark decal under the enemy the snipe will pick, drawn while the snapshot holds the
 * server's crit condition (battlefield-vothuong.ts decides). Ground alpha index: every actor draws over it.
 */
export class VothuongMarks {
  private texture: Texture;
  private free: Ring[] = [];
  private created = 0;
  private marks = new Map<string, Mark>();

  constructor(private scene: Scene) {
    this.texture = new Texture(MARK_RING_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'vothuong-mark-ring' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'vothuong-mark-ring', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** Snapshot marker `mark` on the pending victim, every frame the condition holds. */
  mark(id: string, at: Vector3, reduced: boolean): void {
    let mark = this.marks.get(id);
    if (!mark) {
      const ring = this.free.pop() ?? this.create();
      if (!ring) return;
      ring.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
      ring.mesh.rotation.y = Math.random() * Math.PI * 2;
      ring.mesh.setEnabled(true);
      mark = { ring, at: at.clone(), age: 0, sinceMark: 0, reduced };
      this.marks.set(id, mark);
      debug('visual.vothuong.mark.start', { reduced });
    }
    mark.at.copyFrom(at);
    mark.sinceMark = 0;
  }

  tick(dt: number): void {
    for (const [id, mark] of this.marks) {
      mark.age += dt; mark.sinceMark += dt;
      if (mark.sinceMark >= MARK_FADE) { this.release(mark.ring); this.marks.delete(id); continue; }
      // Marks arrive every frame while the condition holds; the first missed frame starts the wither.
      const sinceLast = Math.max(0, mark.sinceMark - dt * 1.5);
      const size = MARK_DIAMETER * markScale(mark.age);
      mark.ring.mesh.position.set(mark.at.x, .04, mark.at.z);
      mark.ring.mesh.scaling.set(size, 1, size);
      mark.ring.material.alpha = markAlpha(mark.age, sinceLast);
      if (!mark.reduced) mark.ring.mesh.rotation.y -= MARK_SPIN * dt;
    }
  }

  clear(): void {
    for (const mark of this.marks.values()) this.release(mark.ring);
    this.marks.clear();
  }

  private create(): Ring | undefined {
    if (this.created >= MAX_MARKS) { debug('visual.kit.pool.cap', { pool: 'vothuong-mark' }); return undefined; }
    const name = `vothuong-mark-${this.created++}`;
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
