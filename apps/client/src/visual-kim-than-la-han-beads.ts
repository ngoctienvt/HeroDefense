import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { KH_CAPS } from './visual-kim-than-la-han-timeline.js';
import { debug } from './debug.js';
/** Orthographic painted skin on actual spherical beads; no flat light discs replace amber material. */
export class RelicBeads {
  private texture?: Texture; private material?: StandardMaterial; private live = new Set<Mesh>(); private free: Mesh[] = [];
  constructor(private scene: Scene) {}
  prepare(): void {
    if (this.material) return; configureCombatDrawOrder(this.scene);
    this.texture = new Texture('/assets/vfx-kim-than-la-han-bead.webp', this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kim-than-la-han.bead.ready', {}), (_message, error) => debug('visual.kim-than-la-han.bead.error', { error: String(error ?? 'load') }));
    this.texture.hasAlpha = true; this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const m = new StandardMaterial('painted-amber-sarira', this.scene); m.diffuseTexture = m.emissiveTexture = this.texture;
    m.diffuseColor = m.emissiveColor = Color3.White(); m.specularColor = Color3.Black(); m.disableLighting = m.disableDepthWrite = true;
    m.useAlphaFromDiffuseTexture = true; m.alphaMode = Engine.ALPHA_COMBINE; m.depthFunction = Engine.ALWAYS; m.backFaceCulling = true; this.material = m;
  }
  acquire(): Mesh | undefined {
    this.prepare(); if (!this.texture?.isReady() || this.live.size >= KH_CAPS.beads) return;
    const mesh = this.free.pop() ?? this.build(); mesh.material = this.material!; mesh.setEnabled(true); this.live.add(mesh); return mesh;
  }
  private build(): Mesh {
    const mesh = MeshBuilder.CreateSphere('solid-sarira-bead', { diameter: 1, segments: 12, updatable: true }, this.scene);
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [], uvs: number[] = [];
    for (let i = 0; i < positions.length; i += 3) uvs.push(.5 + positions[i] * .94, .5 + positions[i + 1] * .94);
    mesh.updateVerticesData(VertexBuffer.UVKind, uvs); mesh.isPickable = false; mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill; return mesh;
  }
  place(mesh: Mesh, at: Vector3, scale: number, alpha: number): void { mesh.position.copyFrom(at); mesh.scaling.setAll(scale); mesh.visibility = alpha; }
  release(mesh?: Mesh): void { if (mesh && this.live.delete(mesh)) { mesh.setEnabled(false); this.free.push(mesh); } }
  clear(): void { for (const mesh of [...this.live]) this.release(mesh); }
}
