import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import { VisualMaterials } from './visual-materials.js';
import { debug } from './debug.js';
import { ARENA, laneCenters } from '../../../packages/game-core/src/battlefield-layout.js';

export function buildTerrain(scene: Scene, palette: VisualMaterials, count: number): () => void {
  const before = new Set(scene.meshes);
  const earth = palette.terrainGround();
  const stone = palette.get('weathered-slate', '#657b76');
  const seam = palette.get('path-seam', '#283e3e');
  const jade = palette.get('spirit-jade', '#81d8b9', .42);
  const gold = palette.get('temple-gold', '#c5ad72', .12);
  const wood = palette.get('temple-wood', '#503b3b');
  const roof = palette.get('temple-roof', '#243f42');
  const mountain = palette.get('mist-mountain', '#506865');
  const leaf = palette.get('bamboo-leaf', '#5b9676');
  const ground = MeshBuilder.CreateGround('jade-valley', { width: 136, height: 120 }, scene);
  ground.material = earth;

  const box = (name: string, x: number, y: number, z: number, width: number, height: number, depth: number, material: typeof earth) => {
    const mesh = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
    mesh.position.set(x, y, z); mesh.material = material; mesh.isPickable = false;
    return mesh;
  };
  const cylinder = (name: string, x: number, y: number, z: number, diameter: number, height: number, material: typeof earth, tessellation = 12) => {
    const mesh = MeshBuilder.CreateCylinder(name, { diameter, height, tessellation }, scene);
    mesh.position.set(x, y, z); mesh.material = material; mesh.isPickable = false;
    return mesh;
  };

  // Low stone bands mark the playable valley without blocking movement or clicks.
  for (const side of [-1, 1]) {
    box('valley-edge', side * (ARENA.maxX + 1.5), .08, -4, .28, .16, 69, seam);
    for (const z of [-43, -30, -15, 2, 19, 38]) {
      const peak = MeshBuilder.CreatePolyhedron('distant-peak', { type: 1, size: 5 + Math.abs(z % 3) }, scene);
      peak.position.set(side * (61 + Math.abs(z % 4)), 2.3, z);
      peak.scaling.set(1.25, 1.5, 1.4); peak.material = mountain; peak.isPickable = false;
      const trunk = cylinder('bamboo', side * 48, 1.65, z + 3, .28, 3.3, wood, 7);
      trunk.rotation.z = side * .07;
      for (const height of [2.15, 2.85, 3.45]) {
        const crown = MeshBuilder.CreatePolyhedron('bamboo-crown', { type: 1, size: .85 }, scene);
        crown.position.set(side * 48, height, z + 3);
        crown.scaling.set(1.8, .34, .85); crown.material = leaf; crown.isPickable = false;
      }
    }
  }

  // Enemy routes stay in the simulation; actors move directly over the painted ground.
  for (const x of laneCenters(count)) {
    for (const side of [-1, 1]) {
      box('gate-pillar', x + side * 4.7, 2.15, -39, .85, 4.3, .85, stone);
      box('gate-bracket', x + side * 4.7, 4.35, -39, 1.6, .4, 1.5, gold);
    }
    box('immortal-gate', x, 4.7, -39, 11.1, .48, 1.5, roof);
    box('gate-ridge', x, 5.08, -39, 11.8, .26, .48, gold);
  }

  // The spirit shrine sits beyond the commandable ground, leaving its approach clear.
  box('shrine-stairs', 0, .18, 31, 15, .36, 5, stone);
  box('shrine-plinth', 0, .65, 37, 17, 1.3, 10, seam);
  for (const x of [-6.5, 6.5]) for (const z of [34, 40]) {
    cylinder('shrine-column', x, 3.7, z, .8, 5, wood, 10);
    cylinder('column-cap', x, 6.32, z, 1.45, .28, gold, 10);
  }
  box('shrine-roof', 0, 6.75, 37, 19, .65, 12, roof);
  box('shrine-ridge', 0, 7.28, 37, 20, .25, 2, gold);
  const heart = MeshBuilder.CreatePolyhedron('spirit-heart', { type: 1, size: 2.2 }, scene);
  heart.position.set(0, 3.5, 37); heart.material = jade; heart.isPickable = false;
  for (const x of [-11, 11]) {
    cylinder('guardian-base', x, .4, 37, 3, .8, stone, 8);
    const guardian = MeshBuilder.CreatePolyhedron('guardian-stone', { type: 1, size: 2 }, scene);
    guardian.position.set(x, 2.2, 37); guardian.scaling.y = 1.3; guardian.material = mountain; guardian.isPickable = false;
  }

  debug('terrain.built', { lanes: count, surface: 'painted-ground', spawnMarkers: false });

  return () => { for (const mesh of [...scene.meshes]) if (!before.has(mesh)) mesh.dispose(); };
}
