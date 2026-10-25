import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { farDirection, screenUp } from './visual-kit-billboard.js';
import { debug } from './debug.js';
import { XT_CAPS } from './visual-xich-tung-tu-timeline.js';
import layout from './visual-xich-tung-tu-layout.json';
/** Curved, closed volume from the measured painted prop contour, including the original tassel. */
export class DewGourd {
  private material?: StandardMaterial; private texture?: Texture; private free: Mesh[] = []; private live = new Set<Mesh>();
  constructor(private scene: Scene) {}
  prepare(): void {
    if (this.material) return; configureCombatDrawOrder(this.scene);
    this.texture = new Texture('/assets/vfx-xich-tung-tu-gourd.webp', this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.xich-tung-tu.gourd.ready', {}), (_msg, error) => debug('visual.xich-tung-tu.gourd.error', { error: String(error ?? 'load') }));
    this.texture.hasAlpha = true; this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const m = new StandardMaterial('red-jade-painted-gourd', this.scene); m.diffuseTexture = m.emissiveTexture = this.texture;
    m.diffuseColor = m.emissiveColor = Color3.White(); m.specularColor = Color3.Black(); m.disableLighting = m.disableDepthWrite = true;
    m.useAlphaFromDiffuseTexture = true; m.alphaMode = Engine.ALPHA_COMBINE; m.depthFunction = Engine.ALWAYS; m.backFaceCulling = true; this.material = m;
  }
  acquire(): Mesh | undefined {
    this.prepare(); if (!this.texture?.isReady() || this.live.size >= XT_CAPS.casts) return;
    const mesh = this.free.pop() ?? this.build(); mesh.material = this.material!; mesh.setEnabled(true); this.live.add(mesh); return mesh;
  }
  private build(): Mesh {
    const mesh = new Mesh('painted-jade-gourd-volume', this.scene), positions: number[] = [], uvs: number[] = [], indices: number[] = [], normals: number[] = [];
    const outline = layout.gourd.outline, n = outline.length, center = [.52, .46], rings = [[1, 0], [.72, .16], [.32, .24], [0, .27]];
    for (const sign of [-1, 1]) {
      const base = positions.length / 3;
      for (const [scale, depth] of rings) for (const [u, v] of outline) {
        const x = center[0] + (u - center[0]) * scale, y = center[1] + (v - center[1]) * scale;
        positions.push((x - .5) * .95, (.5 - y) * 1.22, depth * sign); uvs.push(x, 1 - y);
      }
      for (let r = 0; r < rings.length - 1; r++) for (let j = 0; j < n; j++) {
        const a = base + r * n + j, b = base + r * n + (j + 1) % n, c = a + n, d = b + n;
        if (sign < 0) indices.push(a, c, b, b, c, d); else indices.push(a, b, c, b, d, c);
      }
    }
    VertexData.ComputeNormals(positions, indices, normals); const data = new VertexData(); data.positions = positions; data.uvs = uvs; data.indices = indices; data.normals = normals; data.applyToMesh(mesh);
    mesh.isPickable = false; mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill; return mesh;
  }
  place(mesh: Mesh, at: Vector3, scale: number, turn: number, alpha: number): void {
    const far = farDirection(this.scene), right = new Vector3(-far.z, 0, far.x), up = screenUp(this.scene), normal = Vector3.Cross(right, up).normalize();
    mesh.position.copyFrom(at.add(right.scale(.85)).add(up.scale(1.65)));
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(right, up, normal)); mesh.rotation.z += turn; mesh.rotation.y += .18;
    mesh.scaling.setAll(scale); mesh.visibility = alpha;
  }
  release(mesh?: Mesh): void { if (mesh && this.live.delete(mesh)) { mesh.setEnabled(false); this.free.push(mesh); } }
  clear(): void { for (const mesh of [...this.live]) this.release(mesh); }
}
