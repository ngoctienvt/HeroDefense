import atlas from './pangu-atlas.json';
import type { HeroDirection, HeroPose } from './hero-motion.js';

export const PANGU_HERO_ID = 'h01B';
export const PANGU_PLANE_HEIGHT = 6.4;
export const PANGU_ANCHOR_OFFSET_Y = (atlas.meta.anchor[1] / atlas.meta.cellSize - .5) * PANGU_PLANE_HEIGHT;
export const PANGU_REST_Y = .12;

type Frame = { frame: { x: number; y: number; w: number; h: number } };
type Clip = { frames: string[]; durationsMs: number[]; loop: boolean };
const frames: Record<string, Frame> = atlas.frames;
const clips: Record<string, Clip> = atlas.animations;

export function panguAction(pose: HeroPose): 'idle' | 'walk' | 'attack' {
  if (pose === 'walk-a' || pose === 'walk-b') return 'walk';
  return pose === 'attack' || pose === 'cast' ? 'attack' : 'idle';
}

/** Action progress follows the existing visual event window, never combat timing. */
export function panguFrame(direction: HeroDirection, pose: HeroPose, elapsedMs = 0, progress = 0, reduced = false):
  { key: string; uv: number[] } {
  const action = panguAction(pose);
  const clip = clips[`${direction}.${action}`];
  const duration = clip.durationsMs.reduce((total, ms) => total + ms, 0);
  const elapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const actionProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  let time = clip.loop ? elapsed % duration : Math.min(duration - 1, actionProgress * duration);
  if (reduced || action === 'idle') time = 0;
  let index = 0;
  while (index < clip.frames.length - 1 && time >= clip.durationsMs[index]) time -= clip.durationsMs[index++];
  if (reduced && action === 'attack') index = 2;
  const key = clip.frames[index];
  const { x, y, w, h } = frames[key].frame;
  // Half-pixel inset keeps bilinear samples inside this cell.
  const u0 = (x + .5) / atlas.meta.size.w, u1 = (x + w - .5) / atlas.meta.size.w;
  const v0 = 1 - (y + h - .5) / atlas.meta.size.h, v1 = 1 - (y + .5) / atlas.meta.size.h;
  return { key, uv: [u0, v0, u1, v0, u1, v1, u0, v1] };
}
