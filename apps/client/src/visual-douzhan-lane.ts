import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { LANE_LENGTH, LANE_WIDTH } from './visual-douzhan-timeline.js';

const MAX_LANES = 4;
/** One texture tile is this many lane units long; chevrons point along +U = the strike direction. */
const TILE_LENGTH = 2;

/**
 * The 14 x 4.5 lane telegraph of the locked direction (the server's `direction` on the cast event): two bold edge lines and
 * gold chevrons running toward the lane end while the staff gathers. It marks exactly the area the server resolves
 * (`inPanguRift`), nothing around the caster, and is released the moment the staff lands.
 */
export class DouzhanLanes {
  private material: StandardMaterial;
  private texture: DynamicTexture;
  private free: Mesh[] = [];
  private live = new Set<Mesh>();

  constructor(private scene: Scene) {
    this.texture = new DynamicTexture('douzhan-lane-telegraph', { width: 256, height: 128 }, scene, true);
    const ctx = this.texture.getContext() as unknown as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, 256, 128);
    const fill = ctx.createLinearGradient(0, 0, 0, 128);
    fill.addColorStop(0, 'rgba(231,172,68,.34)'); fill.addColorStop(.5, 'rgba(154,91,36,.12)'); fill.addColorStop(1, 'rgba(231,172,68,.34)');
    ctx.fillStyle = fill; ctx.fillRect(0, 0, 256, 128);
    ctx.fillStyle = 'rgba(255,228,160,.95)'; ctx.fillRect(0, 0, 256, 7); ctx.fillRect(0, 121, 256, 7);
    ctx.fillStyle = 'rgba(56,34,24,.55)'; ctx.fillRect(0, 7, 256, 3); ctx.fillRect(0, 118, 256, 3);
    ctx.strokeStyle = 'rgba(255,214,120,.9)'; ctx.lineWidth = 12; ctx.lineJoin = 'round';
    for (const x of [58, 186]) { ctx.beginPath(); ctx.moveTo(x - 22, 30); ctx.lineTo(x + 8, 64); ctx.lineTo(x - 22, 98); ctx.stroke(); }
    this.texture.hasAlpha = true;
    this.texture.wrapU = Texture.WRAP_ADDRESSMODE; this.texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    this.texture.uScale = LANE_LENGTH / TILE_LENGTH;
    this.texture.update();
    const material = new StandardMaterial('douzhan-lane-material', scene);
    material.diffuseTexture = material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = material.disableDepthWrite = true;
    material.backFaceCulling = false;
    material.depthFunction = Engine.ALWAYS;
    this.material = material;
  }

  acquire(): Mesh | undefined {
    if (this.live.size >= MAX_LANES) { debug('visual.douzhan.pool.cap', { pool: 'lane' }); return undefined; }
    const mesh = this.free.pop() ?? MeshBuilder.CreatePlane('douzhan-lane', { size: 1 }, this.scene);
    mesh.material = this.material;
    mesh.isPickable = false;
    mesh.rotation.set(Math.PI / 2, 0, 0);
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 2;
    mesh.setEnabled(true);
    this.live.add(mesh);
    return mesh;
  }

  /** Lane rectangle starting at the caster: local +X along `dir` (yaw = atan2(-dz, dx)), scaled to the server's size. */
  place(mesh: Mesh, origin: Vector3, dir: { x: number; z: number }, alpha: number): void {
    mesh.rotation.y = Math.atan2(-dir.z, dir.x);
    mesh.scaling.set(LANE_LENGTH, LANE_WIDTH, 1);
    mesh.position.set(origin.x + dir.x * LANE_LENGTH / 2, .07, origin.z + dir.z * LANE_LENGTH / 2);
    mesh.visibility = Math.max(0, Math.min(1, alpha));
  }

  /** Chevrons run toward the lane end (the shared texture scrolls, so all live lanes move together). */
  tick(time: number): void { this.texture.uOffset = -time * .9; }

  release(mesh: Mesh | undefined): void {
    if (!mesh || !this.live.delete(mesh)) return;
    mesh.setEnabled(false);
    this.free.push(mesh);
  }

  clear(): void { for (const mesh of [...this.live]) this.release(mesh); }
}
