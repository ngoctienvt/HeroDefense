import type { Scene } from '@babylonjs/core/scene.js';
import { VisualMaterials } from './visual-materials.js';
import { debug } from './debug.js';
import { buildIsland } from './visual-terrain-island.js';
import { buildIslandProps } from './visual-terrain-props.js';

/**
 * Builds the floating-island terrain for the arena and returns a disposer that releases what it made.
 * The sky is built once by the battlefield and survives rebuilds.
 */
export function buildTerrain(scene: Scene, palette: VisualMaterials, laneCount: number, zone = 0): () => void {
  const disposeIsland = buildIsland(scene, zone, laneCount);
  const props = buildIslandProps(scene, palette, laneCount);
  debug('terrain.requested', { lanes: laneCount, zone, props: props.length });
  return () => {
    for (const mesh of props) mesh.dispose();
    disposeIsland();
  };
}
