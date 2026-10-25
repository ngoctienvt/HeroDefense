import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';

/**
 * Distant misty rock pillars rising out of the cloud sea (the "Wuxia mountain" backdrop).
 * Atmospheric perspective: the farther the pillar, the paler and bluer its rock, until it melts into
 * the horizon haze. Unlit, never pickable, always outside the island and far below the camera.
 */
const rngFrom = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

export function buildDistantSpires(scene: Scene): { dispose(): void } {
  const rnd = rngFrom(53);
  const near = Color3.FromHexString('#8fa3b0'), far = Color3.FromHexString('#d6e4ee'), moss = Color3.FromHexString('#6c8760');
  const meshes: Mesh[] = [], materials: StandardMaterial[] = [];
  const count = 22;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + rnd() * .25, distance = 300 + rnd() * 200, haze = Math.min(1, (distance - 220) / 300);
    const height = 90 + rnd() * 120, width = 24 + rnd() * 30;
    const spire = MeshBuilder.CreateCylinder(`island-spire-${i}`, { diameterTop: width * .45, diameterBottom: width, height, tessellation: 7 }, scene);
    spire.position.set(Math.cos(angle) * distance, -60 + height / 2 - rnd() * 20, Math.sin(angle) * distance - 5);
    spire.scaling.x = .8 + rnd() * .6; spire.rotation.y = rnd() * 3;
    const material = new StandardMaterial(`island-spire-${i}`, scene);
    const rock = Color3.Lerp(near, far, haze), tint = i % 3 === 0 ? Color3.Lerp(rock, moss, .35 * (1 - haze)) : rock;
    material.diffuseColor = Color3.Black(); material.specularColor = Color3.Black(); material.emissiveColor = tint;
    material.disableLighting = true;
    spire.material = material; spire.isPickable = false; spire.applyFog = false;
    meshes.push(spire); materials.push(material);
  }
  return { dispose() { for (const m of meshes) m.dispose(false, false); for (const m of materials) m.dispose(); } };
}
