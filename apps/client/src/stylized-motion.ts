import type { HeroDirection, HeroPose } from './hero-motion.js';
import layout from './stylized-layout.json';

/** Installed only after all requested generated bundles are published. */
export const STYLIZED_HEROES = ['h001', 'h002', 'h003', 'h004', 'h005', 'h006', 'h007', 'h008',
  'h009', 'h00A', 'h00B', 'h00C', 'h00D', 'h00E', 'h00F', 'h00G', 'h00H', 'h00I', 'h03O', 'h03P'] as const;
const heroes = new Set<string>(STYLIZED_HEROES);
export const hasStylizedMotion = (heroId: string): boolean => heroes.has(heroId);
export const STYLIZED_PLANE_HEIGHT = 6;
export const STYLIZED_ANCHOR_Y = (.875 - .5) * STYLIZED_PLANE_HEIGHT;
export const STYLIZED_REST_Y = .12;
const sizes: Readonly<Record<string, { planeHeight: number }>> = layout;
export function stylizedDimensions(heroId: string): { height: number; anchorY: number } {
  const height = sizes[heroId]?.planeHeight ?? STYLIZED_PLANE_HEIGHT;
  return { height, anchorY: (.875 - .5) * height };
}
const directions: HeroDirection[] = ['south', 'west', 'north', 'east'];
const attackDurations = [150, 100, 100, 150];

/** 36 cells: each direction has one still, four walking and four attacking poses. */
export function stylizedFrame(direction: HeroDirection, pose: HeroPose, elapsedMs = 0, progress = 0, reduced = false):
  { key: string; uv: number[] } {
  const walking = pose === 'walk-a' || pose === 'walk-b';
  const attacking = pose === 'attack' || pose === 'cast';
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const phase = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  let index = 0;
  if (walking && !reduced) index = Math.floor(time % 600 / 150);
  if (attacking) {
    let remaining = Math.min(499, phase * 500);
    while (index < 3 && remaining >= attackDurations[index]) remaining -= attackDurations[index++];
    if (reduced) index = 2;
    if (pose === 'cast') index = 1;
  }
  const action = walking ? 'walk' : attacking ? 'attack' : 'idle';
  const cell = directions.indexOf(direction) * 9 + (walking ? 1 + index : attacking ? 5 + index : 0);
  const x = cell % 6 * 256, y = Math.floor(cell / 6) * 256;
  const u0 = (x + .5) / 1536, u1 = (x + 255.5) / 1536;
  const v0 = 1 - (y + 255.5) / 1536, v1 = 1 - (y + .5) / 1536;
  return { key: `${direction}.${action}.${index}`, uv: [u0, v0, u1, v0, u1, v1, u0, v1] };
}
