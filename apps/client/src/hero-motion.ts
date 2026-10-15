import { PANGU_HERO_ID, panguFrame } from './pangu-motion.js';

export const MOTION_HEROES = ['h001', 'h003', 'h006', 'h007', 'h00F', 'h00B', 'h018', 'h01A', 'h01C', 'h03W', 'h01B'] as const;
const motionHeroes = new Set<string>(MOTION_HEROES);

export type HeroDirection = 'south' | 'west' | 'north' | 'east';
export type HeroPose = 'idle' | 'walk-a' | 'walk-b' | 'attack' | 'cast' | 'hit' | 'death';

const directions: HeroDirection[] = ['south', 'west', 'north', 'east'];
const poses: HeroPose[] = ['idle', 'walk-a', 'walk-b', 'attack', 'cast', 'hit', 'death'];
// Generated figures do not land on mathematically even grid lines. These gutters
// keep the next pose's head out of one frame and restore the current pose's feet.
const paintedSheetBounds: Record<string, { x: number[]; y: number[] }> = {
  h00B: { x: [0, 252, 480, 711, 948], y: [0, 278, 517, 753, 964, 1231, 1475, 1659] },
  h018: { x: [0, 249, 482, 713, 948], y: [0, 266, 495, 725, 955, 1247, 1475, 1659] },
  h01A: { x: [0, 237, 472, 710, 948], y: [0, 261, 505, 752, 987, 1229, 1478, 1659] },
  h01C: { x: [0, 241, 474, 699, 948], y: [0, 252, 485, 721, 963, 1243, 1459, 1659] },
  h03W: { x: [0, 244, 473, 705, 948], y: [0, 272, 515, 747, 969, 1247, 1484, 1659] },
};

export function hasHeroMotion(heroId: string): boolean { return motionHeroes.has(heroId); }
export function motionCellAspect(heroId: string): number { return heroId === 'h001' || heroId === 'h003' ? 7 / 6 : 1; }

/** Camera-relative facing keeps the drawn front/back/side aligned when the view rotates. */
export function heroDirection(facingX: number, facingZ: number, cameraX: number, cameraZ: number): HeroDirection {
  const cameraLength = Math.hypot(cameraX, cameraZ) || 1;
  const front = (facingX * cameraX + facingZ * cameraZ) / cameraLength;
  // LH view right = up × (target - camera); cameraX/Z point the other way.
  const right = (facingZ * cameraX - facingX * cameraZ) / cameraLength;
  return Math.abs(front) >= Math.abs(right) ? (front >= 0 ? 'south' : 'north') : (right >= 0 ? 'east' : 'west');
}

export function motionFrameUv(heroId: string, direction: HeroDirection, pose: HeroPose): number[] {
  if (heroId === PANGU_HERO_ID) return panguFrame(direction, pose).uv;
  const col = directions.indexOf(direction);
  const row = poses.indexOf(pose);
  const bounds = paintedSheetBounds[heroId];
  const u0 = bounds ? (bounds.x[col] + 3) / 948 : (col + .006) / 4;
  const u1 = bounds ? (bounds.x[col + 1] - 3) / 948 : (col + .994) / 4;
  const v0 = bounds ? 1 - (bounds.y[row + 1] - 3) / 1659 : 1 - (row + .994) / 7;
  const v1 = bounds ? 1 - (bounds.y[row] + 3) / 1659 : 1 - (row + .006) / 7;
  return [u0, v0, u1, v0, u1, v1, u0, v1];
}

