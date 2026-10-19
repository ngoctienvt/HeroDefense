import { debug } from './debug.js';
import manifest from './visual-kit-atlases.json';

/**
 * Atlas metadata from visual-kit-atlases.json. `ortho` and `targetZ` are the Blender camera values:
 * a sprite of size ortho*scale centred at targetZ*scale puts the authored ground (z=0) exactly on
 * the battlefield floor.
 */
export interface KitAtlas {
  id: string; url: string; frames: number; cell: number; tile: string; size: string;
  capacity: number; ortho: number; targetZ: number; source: string; framesDir: string;
}

/** Returns a list of problems (empty = valid); shared with the manifest test. */
export function validateAtlas(atlas: Partial<KitAtlas>): string[] {
  const problems: string[] = [];
  for (const key of ['id', 'url', 'tile', 'size', 'source', 'framesDir'] as const) {
    if (typeof atlas[key] !== 'string' || atlas[key] === '') problems.push(`${key} missing`);
  }
  for (const key of ['frames', 'cell', 'capacity', 'ortho', 'targetZ'] as const) {
    if (typeof atlas[key] !== 'number' || !Number.isFinite(atlas[key]) || atlas[key] <= 0) problems.push(`${key} must be > 0`);
  }
  const grid = /^(\d+)x(\d+)$/.exec(atlas.tile ?? '');
  if (!grid) problems.push('tile must look like 4x4');
  else if ((atlas.frames ?? 0) > Number(grid[1]) * Number(grid[2])) problems.push('frames exceed tile capacity');
  return problems;
}

/** Valid atlases by id; invalid entries are skipped with a `visual.kit.atlas.invalid` log. */
export const ATLASES = new Map<string, KitAtlas>();
for (const atlas of manifest.atlases as Partial<KitAtlas>[]) {
  const problems = validateAtlas(atlas);
  if (problems.length > 0) { debug('visual.kit.atlas.invalid', { atlas: atlas.id, problems }); continue; }
  ATLASES.set(atlas.id as string, atlas as KitAtlas);
}

