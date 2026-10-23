import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { VertexBuffer } from '@babylonjs/core/Buffers/buffer.js';
import { COMBAT_DRAW_GROUP, configureCombatDrawOrder } from './visual-kit-draw-order.js';

/** Atlas coordinates for a mesh using a top-to-bottom, row-major source sheet. */
export function paintedFrameUvs(base: readonly number[], index: number, columns: number, rows: number): number[] | undefined {
  if (![index,columns,rows].every(Number.isInteger) || columns < 1 || rows < 1 || index < 0 || index >= columns*rows) return;
  const col = index%columns, row = Math.floor(index/columns);
  return base.map((v,i) => i%2 === 0 ? (col+v)/columns : (rows-1-row+v)/rows);
}

/** Full-colour pooled planes; optional foreground pass preserves heroes and health above skill art. */
export class KitPainted {
  private materials = new Map<string, StandardMaterial>();
  private free = new Map<string, Mesh[]>();
  private live = new Map<Mesh, string>();
  private capLogged = false;
  private foreground = new Set<string>();
  private overlay = new Set<string>();
  private uvs = new WeakMap<Mesh, number[]>();

  constructor(private scene: Scene, private capacity: number, private name: string) {}

  /**
   * `overlay`: drawn in the health pass, i.e. over heroes (front layer of a shell around an actor). Its alphaIndex
   * stays at the ground floor so it still sorts before the health bars it shares the pass with.
   * `tint`: multiplies the texture (neutral shared status marks coloured per use: buff gold, debuff red).
   * `depthAlways`: world pass (actors still draw over it) but never clipped by the ground; for billboards whose
   * painted ground contact (crack, dust) dips below y = 0 when the plane leans back toward screen-up.
   */
  prepare(id: string, url: string, options: { foreground?: boolean; overlay?: boolean; tint?: readonly [number, number, number];
    depthAlways?: boolean } = {}): void {
    if (this.materials.has(id)) return;
    const material = new StandardMaterial(`kit-painted-${this.name}-${id}`, this.scene);
    const texture = new Texture(url, this.scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: id }),
      (_message, error) => debug('visual.kit.asset.error', { asset: id, message: String(error ?? 'load failed') }));
    texture.hasAlpha = true;
    texture.wrapU = texture.wrapV = Texture.CLAMP_ADDRESSMODE;
    material.diffuseTexture = material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = options.tint ? new Color3(...options.tint) : Color3.White();
    material.specularColor = Color3.Black();
    material.useAlphaFromDiffuseTexture = true;
    material.alphaMode = Engine.ALPHA_COMBINE;
    material.disableLighting = material.disableDepthWrite = true;
    material.backFaceCulling = false;
    if (options.depthAlways) material.depthFunction = Engine.ALWAYS;
    if (options.foreground || options.overlay) {
      configureCombatDrawOrder(this.scene);
      material.depthFunction = Engine.ALWAYS;
      (options.overlay ? this.overlay : this.foreground).add(id);
    }
    this.materials.set(id, material);
  }

  acquire(id: string, ground = false): Mesh | undefined {
    const material = this.materials.get(id);
    // Keep the caller's shader telegraph when art hasn't loaded yet.
    if (!material?.diffuseTexture?.isReady()) return undefined;
    if (this.live.size >= this.capacity) {
      if (!this.capLogged) debug('visual.kit.pool.cap', { pool: this.name });
      this.capLogged = true;
      return undefined;
    }
    const key = `${id}:${ground}`;
    const mesh = this.free.get(key)?.pop() ?? MeshBuilder.CreatePlane(`kit-painted-${key}`, { size: 1, updatable: true }, this.scene);
    if (!this.uvs.has(mesh)) this.uvs.set(mesh, Array.from(mesh.getVerticesData(VertexBuffer.UVKind) ?? []));
    mesh.renderingGroupId = this.overlay.has(id) ? COMBAT_DRAW_GROUP.health
      : this.foreground.has(id) ? COMBAT_DRAW_GROUP.skill : COMBAT_DRAW_GROUP.world;
    mesh.updateVerticesData(VertexBuffer.UVKind,this.uvs.get(mesh) ?? []);
    mesh.material = material;
    mesh.isPickable = false;
    mesh.billboardMode = ground ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL;
    mesh.rotation.set(ground ? Math.PI / 2 : 0, 0, 0);
    mesh.scaling.setAll(1);
    mesh.visibility = 1;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + (ground ? 3 : 8);
    mesh.setEnabled(true);
    this.live.set(mesh, key);
    return mesh;
  }

  frame(mesh: Mesh, index: number, columns: number, rows: number): void {
    const base = this.uvs.get(mesh);
    const uvs = base ? paintedFrameUvs(base,index,columns,rows) : undefined;
    if (uvs) mesh.updateVerticesData(VertexBuffer.UVKind,uvs);
  }

  /** Replaces the plane's UVs with `map(base)` (rotated strips, partial reveals); reset on the next acquire. */
  mapUvs(mesh: Mesh, map: (base: readonly number[]) => number[]): void {
    const base = this.uvs.get(mesh);
    if (base) mesh.updateVerticesData(VertexBuffer.UVKind, map(base));
  }

  release(mesh: Mesh | undefined): void {
    if (!mesh) return;
    const key = this.live.get(mesh);
    if (!key) return;
    mesh.setEnabled(false);
    this.live.delete(mesh);
    if (!this.free.has(key)) this.free.set(key, []);
    this.free.get(key)?.push(mesh);
  }

  clear(): void {
    for (const mesh of this.live.keys()) this.release(mesh);
    this.capLogged = false;
  }
}
