import { Engine } from '@babylonjs/core/Engines/engine.js';
import type { TargetCamera } from '@babylonjs/core/Cameras/targetCamera.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { farDirection } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { buildStaffGeometry, lookFromFar, staffAxis, staffBasis, type StaffGeometry, type Vec3 } from './visual-douzhan-staff-geometry.js';
import { pivotHeight, PIVOT_OFFSET, type StaffPose } from './visual-douzhan-timeline.js';

/** Cap on staffs alive at once (3 simultaneous casts plus their fade). */
const MAX_STAFFS = 6;
/** One flat gold texel on the top ring band of vfx-douzhan-staff.webp (active-inventory.json `capV`). */
const CAP_V = .9944;

/** Flip the triangle winding when Babylon's own normals disagree with the intended outward radial normals. */
function orient(geometry: StaffGeometry): void {
  const normals: number[] = [];
  VertexData.ComputeNormals(geometry.positions, geometry.indices, normals);
  const facing = normals[0] * geometry.normals[0] + normals[1] * geometry.normals[1] + normals[2] * geometry.normals[2];
  if (facing >= 0) return;
  for (let i = 0; i < geometry.indices.length; i += 3) {
    const keep = geometry.indices[i + 1]; geometry.indices[i + 1] = geometry.indices[i + 2]; geometry.indices[i + 2] = keep;
  }
}

/**
 * Pooled solid Thiết Bổng: a real cylinder mesh carrying the Codex painted surface (one clamped wrap, seam turned to the far
 * side, never tiled). It draws in the skill pass with the depth test off, so it reads over monsters and under heroes/HP;
 * the mesh is convex and back faces are culled, so it still sorts against itself.
 */
export class DouzhanStaffs {
  private material: StandardMaterial;
  private texture: Texture;
  private free: Mesh[] = [];
  private live = new Set<Mesh>();
  private capLogged = false;

  constructor(private scene: Scene) {
    configureCombatDrawOrder(scene);
    this.texture = new Texture('/assets/vfx-douzhan-staff.webp', scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'douzhan-staff' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'douzhan-staff', message: String(error ?? 'load failed') }));
    this.texture.wrapU = this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    const material = new StandardMaterial('douzhan-staff-surface', scene);
    material.diffuseTexture = material.emissiveTexture = this.texture;
    material.diffuseColor = new Color3(.8, .8, .8);
    material.emissiveColor = new Color3(.5, .5, .5);
    material.specularColor = new Color3(.55, .5, .35);
    material.specularPower = 24;
    material.backFaceCulling = true;
    material.disableDepthWrite = true;
    material.depthFunction = Engine.ALWAYS;
    this.material = material;
  }

  /** undefined until the painted surface has loaded (the caller retries next frame) or at the cap. */
  acquire(): Mesh | undefined {
    if (!this.texture.isReady()) return undefined;
    if (this.live.size >= MAX_STAFFS) {
      if (!this.capLogged) debug('visual.douzhan.pool.cap', { pool: 'staff' });
      this.capLogged = true;
      return undefined;
    }
    const mesh = this.free.pop() ?? this.build();
    mesh.setEnabled(true);
    this.live.add(mesh);
    return mesh;
  }

  release(mesh: Mesh | undefined): void {
    if (!mesh || !this.live.delete(mesh)) return;
    mesh.setEnabled(false);
    mesh.visibility = 1;
    this.free.push(mesh);
  }

  clear(): void {
    for (const mesh of [...this.live]) this.release(mesh);
    this.capLogged = false;
  }

  /** Staff on the pivot in front of `origin`, lifted `angle` above the ground along `dir`, seam on the camera's far side. */
  pose(mesh: Mesh, origin: Vector3, dir: { x: number; z: number }, pose: StaffPose): void {
    const basis = staffBasis(staffAxis(dir, pose.angle), this.look());
    const euler = Vector3.RotationFromAxis(new Vector3(basis.x.x, basis.x.y, basis.x.z),
      new Vector3(basis.y.x, basis.y.y, basis.y.z), new Vector3(basis.z.x, basis.z.y, basis.z.z));
    mesh.rotationQuaternion = null;
    mesh.rotation.copyFrom(euler);
    mesh.position.set(origin.x + dir.x * PIVOT_OFFSET, pivotHeight(pose.angle), origin.z + dir.z * PIVOT_OFFSET);
    mesh.scaling.setAll(Math.max(.01, pose.scale));
    mesh.visibility = Math.max(0, Math.min(1, pose.alpha));
  }

  private look(): Vec3 {
    const camera = this.scene.activeCamera as TargetCamera | null;
    if (camera && typeof camera.getTarget === 'function') {
      const look = camera.getTarget().subtract(camera.position);
      if (look.lengthSquared() > 1e-6) return look.normalize();
    }
    const far = farDirection(this.scene);
    return lookFromFar({ x: far.x, z: far.z });
  }

  private build(): Mesh {
    const geometry = buildStaffGeometry(CAP_V);
    orient(geometry);
    const data = new VertexData();
    data.positions = geometry.positions; data.uvs = geometry.uvs; data.normals = geometry.normals; data.indices = geometry.indices;
    const mesh = new Mesh('douzhan-staff', this.scene);
    data.applyToMesh(mesh);
    mesh.material = this.material;
    mesh.isPickable = false;
    mesh.alwaysSelectAsActiveMesh = true;
    mesh.renderingGroupId = COMBAT_DRAW_GROUP.skill;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 5;
    return mesh;
  }
}
