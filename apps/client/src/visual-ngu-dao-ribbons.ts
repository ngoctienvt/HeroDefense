import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { ND_CAPS } from './visual-ngu-dao-timeline.js';
import { debug } from './debug.js';
/** Persistent tiled iron body (no repeated claw heads), two small braided strips per actual pair. */
export class SoulRibbons {
  private material?: StandardMaterial; private texture?: Texture; private free: Mesh[] = []; private live = new Set<Mesh>(); private tiles = new WeakMap<Mesh, number>();
  constructor(private scene: Scene) {}
  prepare(): void {
    if (this.material) return; configureCombatDrawOrder(this.scene);
    this.texture = new Texture('/assets/vfx-ngu-dao-chain.webp', this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.ngu-dao.chain.ready', {}), (_message, error) => debug('visual.ngu-dao.chain.error', { error: String(error ?? 'load') }));
    this.texture.hasAlpha = true; this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const m = new StandardMaterial('samsara-painted-iron-links', this.scene); m.diffuseTexture = m.emissiveTexture = this.texture;
    m.diffuseColor = m.emissiveColor = Color3.White(); m.specularColor = Color3.Black(); m.disableLighting = m.disableDepthWrite = true;
    m.useAlphaFromDiffuseTexture = true; m.backFaceCulling = false; m.alphaMode = Engine.ALPHA_COMBINE; m.depthFunction = Engine.ALWAYS; this.material = m;
  }
  acquire(): Mesh | undefined {
    this.prepare(); if (!this.texture?.isReady() || this.live.size >= ND_CAPS.pairs * 2) return;
    const mesh = this.free.pop() ?? new Mesh('samsara-iron-braid', this.scene); mesh.material = this.material!;
    mesh.isPickable = false; mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill; mesh.setEnabled(true); this.live.add(mesh); return mesh;
  }
  place(mesh: Mesh, from: Vector3, to: Vector3, braid: number, time: number, alpha: number, fold: number, reduced: boolean): void {
    const middle = Vector3.Center(from, to), start = Vector3.Lerp(from, middle, fold * .8).add(new Vector3(0, .7, 0)), end = Vector3.Lerp(to, middle, fold * .8).add(new Vector3(0, .7, 0));
    const delta = end.subtract(start), length = delta.length(); if (length < .02) { mesh.visibility = 0; return; }
    const x = delta.scale(1 / length), camera = this.scene.activeCamera as TargetCamera | null;
    const look = camera && typeof camera.getTarget === 'function' ? camera.getTarget().subtract(camera.position).normalize() : new Vector3(0, -.669, -.743);
    const side = Vector3.Cross(look, x); if (side.lengthSquared() < 1e-6) { mesh.visibility = 0; return; } side.normalize();
    const count = Math.max(1, Math.min(32, Math.ceil(length))), positions: number[] = [], uvs: number[] = [], indices: number[] = [], normals: number[] = [];
    const width = .24 * (1 - fold * .8), phase = braid * Math.PI + (reduced ? 0 : time * 1.4);
    for (let tile = 0; tile < count; tile++) {
      for (const [t, uv] of [[tile / count, .05], [(tile + 1) / count, .7]] as const) {
        const wave = Math.sin(t * Math.PI * 6 + phase) * Math.sin(t * Math.PI) * .075;
        const center = Vector3.Lerp(start, end, t).add(side.scale(wave)).add(look.scale(braid ? .012 : -.012));
        for (const sign of [-1, 1]) { const p = center.add(side.scale(sign * width / 2)); positions.push(p.x, p.y, p.z); uvs.push(uv, sign < 0 ? 0 : 1); }
      }
      const n = tile * 4; indices.push(n, n + 1, n + 2, n + 1, n + 3, n + 2);
    }
    VertexData.ComputeNormals(positions, indices, normals);
    if (this.tiles.get(mesh) === count) {
      mesh.updateVerticesData(VertexBuffer.PositionKind, positions, true); mesh.updateVerticesData(VertexBuffer.NormalKind, normals); mesh.updateVerticesData(VertexBuffer.UVKind, uvs);
    } else { const data = new VertexData(); data.positions = positions; data.uvs = uvs; data.indices = indices; data.normals = normals; data.applyToMesh(mesh, true); this.tiles.set(mesh, count); }
    mesh.visibility = alpha;
  }
  release(mesh?: Mesh): void { if (mesh && this.live.delete(mesh)) { mesh.setEnabled(false); this.free.push(mesh); } }
  clear(): void { for (const mesh of [...this.live]) this.release(mesh); }
}
