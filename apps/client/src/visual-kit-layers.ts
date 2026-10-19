import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { ShaderMaterial } from '@babylonjs/core/Materials/shaderMaterial.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import type { KitPaletteName } from './visual-kit-palettes.js';
import { kitMaterial, type KitMaterialOptions, type KitShader } from './visual-kit-shaders.js';

/** One mesh with its own material; the unit every pooled shader layer is made of. */
export interface Layer { mesh: Mesh; material: ShaderMaterial }

/** Flat 1x1 ground plane carrying a kit shader (kitGround, kitCrust, kitSlash). Starts disabled. */
export function createGroundLayer(scene: Scene, shader: KitShader, palette: KitPaletteName, name: string,
  options?: KitMaterialOptions): Layer {
  const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, scene);
  const material = kitMaterial(scene, shader, palette, name, options);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}

/** Unit sphere carrying kitShell (ward shell, delivery bolt). Starts disabled. */
export function createShellLayer(scene: Scene, palette: KitPaletteName, name: string, segments: number,
  options?: KitMaterialOptions): Layer {
  const mesh = MeshBuilder.CreateSphere(`kit-${name}`, { diameter: 1, segments }, scene);
  const material = kitMaterial(scene, 'kitShell', palette, name, options);
  material.setFloat('uDissolve', 0);
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}

/** (dr, z) profile points: `dr` radial offset around the ring radius, `z` height. */
export type RingProfile = readonly (readonly [number, number])[];

/**
 * Lofted ring for kitWall. The vertex shader places every vertex from its standing/crashed profile pair
 * and the uniforms, so a hero supplies its own `standing`/`crashed` profile (same point count) to change
 * the wall's silhouette. Starts disabled.
 */
export function createLoftedRingLayer(scene: Scene, palette: KitPaletteName, name: string, radius: number,
  standing: RingProfile, crashed: RingProfile, segments = 128): Layer {
  if (standing.length !== crashed.length) throw new Error('ring profiles need the same point count');
  const positions: number[] = [], uvs: number[] = [], uvs2: number[] = [], uvs3: number[] = [], indices: number[] = [];
  const n = standing.length;
  for (let s = 0; s <= segments; s++) {
    const a = s / segments * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      positions.push(Math.cos(a) * radius, standing[i][1], Math.sin(a) * radius);
      uvs.push(s / segments, i / (n - 1));
      uvs2.push(standing[i][0], standing[i][1]);
      uvs3.push(crashed[i][0], crashed[i][1]);
    }
  }
  for (let s = 0; s < segments; s++) for (let i = 0; i < n - 1; i++) {
    const v = s * n + i, w = (s + 1) * n + i;
    indices.push(v, w, w + 1, v, w + 1, v + 1);
  }
  const data = new VertexData();
  data.positions = positions; data.uvs = uvs; data.uvs2 = uvs2; data.uvs3 = uvs3; data.indices = indices;
  const mesh = new Mesh(`kit-${name}`, scene);
  data.applyToMesh(mesh);
  mesh.alwaysSelectAsActiveMesh = true; // vertices move in the shader; skip stale bounds culling
  const material = kitMaterial(scene, 'kitWall', palette, name);
  material.backFaceCulling = false;
  mesh.material = material;
  mesh.isPickable = false;
  mesh.setEnabled(false);
  return { mesh, material };
}

/**
 * Capped pool of layers. `acquire` returns an enabled layer or undefined at the cap (logged once per
 * zone as visual.kit.pool.cap); `release` disables it and keeps it for reuse.
 */
export class LayerPool<L extends Layer = Layer> {
  private free: L[] = [];
  private active = new Set<L>();
  private capLogged = false;

  constructor(private create: () => L, private cap: number, private label: string) {}

  get size(): number { return this.active.size; }

  acquire(): L | undefined {
    if (this.active.size >= this.cap) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: this.label }); }
      return undefined;
    }
    const layer = this.free.pop() ?? this.create();
    layer.mesh.setEnabled(true);
    this.active.add(layer);
    return layer;
  }

  release(layer: L): void {
    if (!this.active.delete(layer)) return;
    layer.mesh.setEnabled(false);
    this.free.push(layer);
  }

  /** Zone/match change: recycle everything and re-arm the cap log. */
  releaseAll(): void {
    for (const layer of [...this.active]) this.release(layer);
    this.capLogged = false;
  }
}

export interface TouchedEntry<S> { layer: Layer; state: S; touched: boolean }

/**
 * Snapshot-driven layers: `touch(id)` is called every frame the marker is present; `sweep` runs once
 * per tick and recycles entries nobody touched. `visit` may keep an entry alive (return false) to play
 * an exit animation, and must return true when the entry is finished.
 */
export class TouchedLayers<S> {
  private entries = new Map<string, TouchedEntry<S>>();

  constructor(private pool: LayerPool, private makeState: () => S) {}

  /** `restart(state)` true means the existing entry is done: recycle it and start a fresh one. */
  touch(id: string, restart?: (state: S) => boolean): TouchedEntry<S> | undefined {
    let entry = this.entries.get(id);
    if (entry && restart?.(entry.state)) { this.drop(id, entry); entry = undefined; }
    if (!entry) {
      const layer = this.pool.acquire();
      if (!layer) return undefined;
      entry = { layer, state: this.makeState(), touched: false };
      this.entries.set(id, entry);
    }
    entry.touched = true;
    return entry;
  }

  sweep(visit: (entry: TouchedEntry<S>, touched: boolean) => boolean): void {
    for (const [id, entry] of this.entries) {
      const touched = entry.touched;
      entry.touched = false;
      if (visit(entry, touched)) this.drop(id, entry);
    }
  }

  clear(): void {
    for (const [id, entry] of this.entries) this.drop(id, entry);
  }

  private drop(id: string, entry: TouchedEntry<S>): void {
    this.entries.delete(id);
    this.pool.release(entry.layer);
  }
}
