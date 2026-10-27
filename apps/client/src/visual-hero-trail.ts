import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { COMBAT_DRAW_GROUP } from './visual-kit-draw-order.js';
import type { KitPaletteName } from './visual-kit-palettes.js';
import { kitMaterial } from './visual-kit-shaders.js';
import { catmullRom, trailActive, TRAIL_LIFE, TRAIL_SAMPLES, TRAIL_SUBDIVIDE } from './hero-trail-timeline.js';

/** Ribbon slots: every gap between two samples is split into TRAIL_SUBDIVIDE pieces (Catmull-Rom), so a fast swing
 * sampled once per frame still reads as a smooth arc instead of a polygon. */
const SLOTS = (TRAIL_SAMPLES - 1) * TRAIL_SUBDIVIDE + 1;

/** World position of a socket after the current animation frame (ancestors recomputed root-first). */
function socketPosition(node: TransformNode, out: Vector3): Vector3 {
  const chain: TransformNode[] = [];
  for (let n: TransformNode | null = node; n; n = n.parent as TransformNode | null) chain.push(n);
  for (let i = chain.length - 1; i >= 0; i--) chain[i].computeWorldMatrix(true);
  return out.copyFrom(node.getAbsolutePosition());
}

type Sample = { tip: Vector3; base: Vector3; age: number };

/**
 * Weapon trail of a 3D hero model (kitTrail): the GLB carries `trail_tip_i` / `trail_base_i` empties under the hand
 * joint (tools/studio/export_runtime_glb.py); while the attack clip is between its wind-up and just after the hit, the
 * two sockets are sampled every frame and the last TRAIL_LIFE seconds are drawn as one ribbon in world space.
 * One fixed-size buffer per trail; unused samples collapse onto the oldest one. Drawn in the actor pass without depth
 * writes so it sorts against heroes and monsters. Reduced motion: no trail.
 */
export class HeroTrail {
  private mesh: Mesh;
  private positions: Float32Array;
  private uvs: Float32Array;
  private samples: Sample[] = [];
  private material;
  private scratchTip = new Vector3();
  private scratchBase = new Vector3();

  constructor(scene: Scene, name: string, palette: KitPaletteName, private tip: TransformNode, private base: TransformNode) {
    const n = SLOTS;
    this.positions = new Float32Array(n * 2 * 3);
    this.uvs = new Float32Array(n * 2 * 2);
    const indices: number[] = [];
    for (let i = 0; i < n; i++) {
      this.uvs.set([1, 0, 1, 1], i * 4);
      if (i < n - 1) { const a = i * 2; indices.push(a, a + 1, a + 3, a, a + 3, a + 2); }
    }
    const data = new VertexData();
    data.positions = this.positions; data.uvs = this.uvs; data.indices = indices;
    this.mesh = new Mesh(`hero-trail-${name}`, scene);
    data.applyToMesh(this.mesh, true); // updatable positions + uvs
    this.mesh.alwaysSelectAsActiveMesh = true; // world-space vertices: the bounding box is never refreshed
    this.mesh.isPickable = false;
    this.mesh.renderingGroupId = COMBAT_DRAW_GROUP.hero;
    this.material = kitMaterial(scene, 'kitTrail', palette, `hero-trail-${name}`);
    this.mesh.material = this.material;
    this.mesh.setEnabled(false);
  }

  /** Every model update: `clip`/`progress` of the sampled clip and the model's attack phases. */
  update(clip: string, progress: number, raised: number, impact: number, dt: number, time: number, reduced: boolean): void {
    for (const s of this.samples) s.age += dt;
    while (this.samples.length && this.samples[this.samples.length - 1].age > TRAIL_LIFE) this.samples.pop();
    if (!reduced && trailActive(clip, progress, raised, impact)) {
      const tip = socketPosition(this.tip, this.scratchTip), base = socketPosition(this.base, this.scratchBase);
      const last = this.samples[0];
      // skip a sample when the weapon has not moved (held still between frames)
      if (!last || Vector3.DistanceSquared(last.tip, tip) > 1e-4) {
        this.samples.unshift({ tip: tip.clone(), base: base.clone(), age: 0 });
        if (this.samples.length > TRAIL_SAMPLES) this.samples.length = TRAIL_SAMPLES;
      }
    }
    if (this.samples.length < 2) { this.mesh.setEnabled(false); return; }
    const p = this.positions, uv = this.uvs, list = this.samples, last = list.length - 1;
    const at = (i: number) => list[Math.max(0, Math.min(last, i))];
    for (let slot = 0; slot < SLOTS; slot++) {
      const seg = Math.floor(slot / TRAIL_SUBDIVIDE), t = slot / TRAIL_SUBDIVIDE - seg;
      if (seg >= last) { // collapsed slots sit on the oldest sample, fully faded
        const s = list[last];
        p.set([s.base.x, s.base.y, s.base.z, s.tip.x, s.tip.y, s.tip.z], slot * 6);
        uv[slot * 4] = slot === last * TRAIL_SUBDIVIDE ? Math.min(1, s.age / TRAIL_LIFE) : 1; uv[slot * 4 + 2] = uv[slot * 4];
        continue;
      }
      const a = at(seg - 1), b = at(seg), c = at(seg + 1), d = at(seg + 2);
      catmullRom(a.base, b.base, c.base, d.base, t, p, slot * 6);
      catmullRom(a.tip, b.tip, c.tip, d.tip, t, p, slot * 6 + 3);
      const age = Math.min(1, (b.age + (c.age - b.age) * t) / TRAIL_LIFE);
      uv[slot * 4] = age; uv[slot * 4 + 2] = age;
    }
    this.mesh.updateVerticesData('position', p, false, false);
    this.mesh.updateVerticesData('uv', uv, false, false);
    this.material.setFloat('uAlpha', 1);
    this.material.setFloat('uTime', time);
    this.mesh.setEnabled(true);
  }

  clear(): void { this.samples.length = 0; this.mesh.setEnabled(false); }

  dispose(): void { this.mesh.dispose(); this.material.dispose(); }
}
