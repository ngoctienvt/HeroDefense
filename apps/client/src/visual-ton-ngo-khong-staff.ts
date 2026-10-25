import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { debug } from './debug.js';
import { MONKEY_CAPS, MONKEY, type Point } from './visual-ton-ngo-khong-timeline.js';
import profile from './visual-ton-ngo-khong-staff-profile.json';

/** Surface of revolution measured from the actual cloud-gold end caps, not a constant thin cylinder. */
export function monkeyStaffGeometry() {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [], normals: number[] = [], segments = 20;
  for (let i = 0; i < profile.length; i++) for (let s = 0; s <= segments; s++) {
    const angle = s / segments * Math.PI * 2, radius = profile[i];
    positions.push(i / (profile.length - 1) * MONKEY.length, Math.cos(angle) * radius, Math.sin(angle) * radius);
    uvs.push(i / (profile.length - 1), s / segments);
    if (i < profile.length - 1 && s < segments) {
      const a = i * (segments + 1) + s, b = a + segments + 1;
      indices.push(a, a + 1, b, a + 1, b + 1, b);
    }
  }
  for (const end of [0, profile.length - 1]) {
    const center = positions.length / 3, ring = end * (segments + 1), x = end / (profile.length - 1) * MONKEY.length;
    positions.push(x, 0, 0); uvs.push(end === 0 ? .015 : .985, .5);
    for (let s = 0; s < segments; s++) end === 0 ? indices.push(center, ring + s + 1, ring + s) : indices.push(center, ring + s, ring + s + 1);
  }
  // Babylon LH normals use the opposite winding to the mathematical cross product.
  for (let i = 0; i < indices.length; i += 3) { const b = indices[i + 1]; indices[i + 1] = indices[i + 2]; indices[i + 2] = b; }
  VertexData.ComputeNormals(positions, indices, normals);
  return { positions, indices, normals, uvs };
}
export class MonkeyStaffs {
  private material: StandardMaterial; private texture: Texture; private live = new Set<Mesh>(); private free: Mesh[] = [];
  constructor(private scene: Scene) {
    configureCombatDrawOrder(scene);
    this.texture = new Texture('/assets/vfx-ton-ngo-khong-staff.webp', scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.ton-ngo-khong.staff.ready', {}), (_message, error) => debug('visual.ton-ngo-khong.staff.error', { error: String(error ?? 'load') }));
    this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.material = new StandardMaterial('monkey-red-lacquer-cloud-gold', scene);
    this.material.diffuseTexture = this.material.emissiveTexture = this.texture;
    this.material.diffuseColor = new Color3(.7, .7, .7); this.material.emissiveColor = new Color3(.48, .45, .4);
    this.material.specularColor = new Color3(.55, .4, .18); this.material.specularPower = 28;
    this.material.backFaceCulling = true; this.material.disableDepthWrite = true; this.material.depthFunction = Engine.ALWAYS;
  }
  acquire(): Mesh | undefined {
    if (!this.texture.isReady() || this.live.size >= MONKEY_CAPS.staffs) return;
    let mesh = this.free.pop();
    if (!mesh) {
      mesh = new Mesh('monkey-solid-ruyi', this.scene); const data = new VertexData(); Object.assign(data, monkeyStaffGeometry()); data.applyToMesh(mesh);
      mesh.material = this.material; mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill; mesh.isPickable = false;
    }
    mesh.setEnabled(true); mesh.visibility = 1; this.live.add(mesh); return mesh;
  }
  pose(mesh: Mesh, at: Vector3, dir: Point, angle: number, alpha: number): void {
    // Local X follows the staff, Y stays in its vertical swing plane, Z is transverse.
    const c = Math.cos(angle), s = Math.sin(angle);
    mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(Vector3.RotationFromAxis(new Vector3(dir.x * c, s, dir.z * c),
      new Vector3(-dir.x * s, c, -dir.z * s), new Vector3(-dir.z, 0, dir.x)));
    mesh.position.set(at.x, Math.max(...profile) + .06, at.z); mesh.visibility = alpha;
  }
  release(mesh?: Mesh): void { if (mesh && this.live.delete(mesh)) { mesh.setEnabled(false); this.free.push(mesh); } }
  clear(): void { for (const mesh of [...this.live]) this.release(mesh); }
}

