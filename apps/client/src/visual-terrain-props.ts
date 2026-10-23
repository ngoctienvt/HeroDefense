import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { VisualMaterials } from './visual-materials.js';
import { laneCenters } from '../../../packages/game-core/src/battlefield-layout.js';

/**
 * Monster gates (one per lane) and the spirit shrine. They sit on the island rim outside the commandable
 * ARENA, are never pickable, and never block movement; the simulation owns routes and the shrine position.
 * Returns every mesh it created so the caller can dispose exactly these.
 */
export function buildIslandProps(scene: Scene, palette: VisualMaterials, laneCount: number): Mesh[] {
  const created: Mesh[] = [];
  const stone = palette.get('weathered-slate', '#8a7f78');
  const seam = palette.get('path-seam', '#5c4a42');
  const jade = palette.get('spirit-jade', '#81d8b9', .42);
  const gold = palette.get('temple-gold', '#d6b66a', .12);
  const wood = palette.get('temple-wood', '#7a4a38');
  const roof = palette.get('temple-roof', '#3a5a5e');
  const guardianStone = palette.get('island-guardian', '#9b8f86');
  const track = (mesh: Mesh, x: number, y: number, z: number, material: StandardMaterial): Mesh => {
    mesh.position.set(x, y, z); mesh.material = material; mesh.isPickable = false; created.push(mesh);
    return mesh;
  };
  const box = (name: string, x: number, y: number, z: number, width: number, height: number, depth: number, material: StandardMaterial) =>
    track(MeshBuilder.CreateBox(name, { width, height, depth }, scene), x, y, z, material);
  const cylinder = (name: string, x: number, y: number, z: number, diameter: number, height: number, material: StandardMaterial, tessellation = 12) =>
    track(MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, scene), x, y, z, material);

  for (const x of laneCenters(laneCount)) {
    for (const side of [-1, 1]) {
      box('gate-pillar', x + side * 4.7, 2.15, -39, .85, 4.3, .85, stone);
      box('gate-bracket', x + side * 4.7, 4.35, -39, 1.6, .4, 1.5, gold);
    }
    box('immortal-gate', x, 4.7, -39, 11.1, .48, 1.5, roof);
    box('gate-ridge', x, 5.08, -39, 11.8, .26, .48, gold);
  }

  box('shrine-stairs', 0, .18, 31, 15, .36, 5, stone);
  box('shrine-plinth', 0, .65, 37, 17, 1.3, 10, seam);
  for (const x of [-6.5, 6.5]) for (const z of [34, 40]) {
    cylinder('shrine-column', x, 3.7, z, .8, 5, wood, 10);
    cylinder('column-cap', x, 6.32, z, 1.45, .28, gold, 10);
  }
  box('shrine-roof', 0, 6.75, 37, 19, .65, 12, roof);
  box('shrine-ridge', 0, 7.28, 37, 20, .25, 2, gold);
  const heart = track(MeshBuilder.CreatePolyhedron('spirit-heart', { type: 1, size: 2.2 }, scene), 0, 3.5, 37, jade);
  heart.isPickable = false;
  for (const x of [-11, 11]) {
    cylinder('guardian-base', x, .4, 37, 3, .8, stone, 8);
    const guardian = track(MeshBuilder.CreatePolyhedron('guardian-stone', { type: 1, size: 2 }, scene), x, 2.2, 37, guardianStone);
    guardian.scaling.y = 1.3;
  }
  return created;
}

/**
 * Pines on the grass rim, one source tree instanced at every point (cheap, never pickable).
 * Points come from the island mesh, so they always sit on real grass outside the commandable ground.
 */
export function buildRimTrees(scene: Scene, points: { x: number; z: number; scale: number }[]): Mesh[] {
  const parts: { mesh: Mesh; material: StandardMaterial }[] = [];
  const unlit = (name: string, hex: string) => {
    const material = new StandardMaterial(name, scene);
    material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black(); material.disableLighting = true;
    material.emissiveColor = Color3.FromHexString(hex);
    return material;
  };
  const bark = unlit('rim-tree-bark', '#5b4636'), dark = unlit('rim-tree-dark', '#2f5a3a'), light = unlit('rim-tree-light', '#4e8248');
  const piece = (mesh: Mesh, y: number, material: StandardMaterial) => { mesh.position.y = y; mesh.material = material; mesh.isPickable = false; mesh.isVisible = false; parts.push({ mesh, material }); };
  piece(MeshBuilder.CreateCylinder('rim-tree-trunk', { diameter: .6, height: 2.2, tessellation: 6 }, scene), 1.1, bark);
  piece(MeshBuilder.CreateCylinder('rim-tree-low', { diameterTop: 0, diameterBottom: 4.2, height: 3.6, tessellation: 7 }, scene), 3.6, dark);
  piece(MeshBuilder.CreateCylinder('rim-tree-mid', { diameterTop: 0, diameterBottom: 3.2, height: 3.2, tessellation: 7 }, scene), 5.4, light);
  piece(MeshBuilder.CreateCylinder('rim-tree-top', { diameterTop: 0, diameterBottom: 2.2, height: 2.8, tessellation: 7 }, scene), 7.0, dark);
  const created: Mesh[] = parts.map(part => part.mesh);
  for (const point of points) for (const { mesh } of parts) {
    const tree = mesh.createInstance(`${mesh.name}-${created.length}`);
    tree.position.set(point.x, mesh.position.y * point.scale, point.z); tree.scaling.setAll(point.scale); tree.isPickable = false;
    created.push(tree as unknown as Mesh);
  }
  return created;
}
