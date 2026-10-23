import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { VertexData } from '@babylonjs/core/Meshes/mesh.vertexData.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { createIslandGround } from './visual-terrain-ground.js';
import { buildIslandRim, type RimFall, type RimRock } from './visual-terrain-rim.js';

/** Runtime island mesh exported by assets/terrain/island_geometry.py (flat top at y = 0, stratified cliff). */
interface IslandPart { positions: number[]; indices: number[]; uvs?: number[]; uvs2?: number[]; colors?: number[] }
interface IslandData { top: IslandPart; cliff: IslandPart; rocks?: RimRock[]; meta: { name: string; waterfalls?: RimFall[] } }

const isNumbers = (value: unknown, multiple: number): value is number[] =>
  Array.isArray(value) && value.length > 0 && value.length % multiple === 0 && value.every(Number.isFinite);

function parseIsland(raw: unknown): IslandData {
  const data = raw as Partial<IslandData>;
  for (const part of ['top', 'cliff'] as const) {
    const p = data?.[part];
    if (!p || !isNumbers(p.positions, 3) || !isNumbers(p.indices, 3)) throw new Error(`island ${part} geometry is invalid`);
    const vertices = p.positions.length / 3;
    if (p.indices.some(i => !Number.isInteger(i) || i < 0 || i >= vertices)) throw new Error(`island ${part} indices out of range`);
  }
  if (!isNumbers(data.top!.uvs2, 2) || !isNumbers(data.cliff!.colors, 4)) throw new Error('island attributes are missing');
  return data as IslandData;
}

function toMesh(scene: Scene, name: string, part: IslandPart, computeNormals: boolean): Mesh {
  const mesh = new Mesh(name, scene);
  const data = new VertexData();
  data.positions = part.positions; data.indices = part.indices;
  if (part.uvs) data.uvs = part.uvs;
  if (part.uvs2) data.uvs2 = part.uvs2;
  if (part.colors) data.colors = part.colors;
  if (computeNormals) { data.normals = []; VertexData.ComputeNormals(data.positions, data.indices, data.normals); }
  data.applyToMesh(mesh);
  return mesh;
}

/** Cliff colours are baked (cel ramp toward the sun), so the material ignores scene lights. */
function cliffMaterial(scene: Scene): StandardMaterial {
  const material = new StandardMaterial('island-cliff', scene);
  material.diffuseColor = Color3.White(); material.specularColor = Color3.Black();
  material.disableLighting = true; material.backFaceCulling = false;
  // With lighting disabled only the emissive term shows, and it is multiplied by the baked vertex colour.
  material.emissiveColor = Color3.White();
  return material;
}

/** Plain earth plane so the game stays playable while the model loads or if it fails. */
function fallbackGround(scene: Scene): Mesh {
  const mesh = MeshBuilder.CreateGround('island-top', { width: 104, height: 96 }, scene);
  mesh.position.set(0, 0, -2);
  const material = new StandardMaterial('island-fallback', scene);
  material.diffuseColor = Color3.FromHexString('#8f6a44'); material.specularColor = Color3.Black();
  material.disableLighting = true; material.backFaceCulling = false; material.emissiveColor = Color3.FromHexString('#8f6a44');
  mesh.material = material;
  return mesh;
}

/**
 * Builds the main arena island and returns its disposer.
 * Only `island-top` is pickable: clicks on cliffs, clouds or sky fall through to the y = 0 plane and are
 * clamped to the arena by the caller.
 */
export function buildIsland(scene: Scene, zone: number, laneCount: number): () => void {
  const name = 'main';
  const ground = createIslandGround(scene, laneCount, zone);
  const owned: Mesh[] = [fallbackGround(scene)];
  const cliff = cliffMaterial(scene);
  let disposed = false;
  let disposeRim = () => {};
  const started = performance.now();

  fetch(`/assets/terrain/island-${name}.json`)
    .then(response => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); })
    .then(raw => {
      if (disposed) return;
      const data = parseIsland(raw);
      const top = toMesh(scene, 'island-top', data.top, false);
      top.material = ground.material; top.isPickable = true;
      const rock = toMesh(scene, 'island-cliff', data.cliff, true);
      rock.material = cliff; rock.isPickable = false;
      for (const mesh of owned.splice(0)) mesh.dispose(false, true);
      owned.push(top, rock);
      disposeRim = buildIslandRim(scene, data, 0).dispose;
      debug('terrain.built', { zone: 0, island: name, lanes: laneCount, groundTile: 'ground-dirt', loadMs: Math.round(performance.now() - started),
        topTriangles: data.top.indices.length / 3, cliffTriangles: data.cliff.indices.length / 3 });
    })
    .catch(error => debug('terrain.model-fallback', { zone: 0, island: name, message: error instanceof Error ? error.message : String(error) }));

  return () => {
    disposed = true;
    disposeRim();
    for (const mesh of owned) mesh.dispose(false, true);
    owned.length = 0;
    cliff.dispose(); ground.dispose();
    debug('terrain.disposed', { zone: 0, island: name });
  };
}
