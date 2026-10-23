import type { HeroDirection, HeroPose } from './hero-motion.js';

export const MONSTER_MOTION_IDS = ['m001', 'm002', 'm003', 'm004', 'b001'] as const;
export type MonsterMotionId = string;

export type MonsterMotionFrame = {
  page: number;
  rect: [number, number, number, number];
  anchor: [number, number];
  durationMs: number;
};

export type MonsterMotionClip = {
  action: string;
  direction: HeroDirection;
  loop: boolean;
  frames: MonsterMotionFrame[];
};

export type MonsterMotionManifest = {
  schema: 'monster-motion-runtime.v1';
  id: MonsterMotionId;
  displayHeightWorld: number;
  visibleHeightWorld: number;
  movementAction: string;
  directionOrder: HeroDirection[];
  actions: string[];
  frameCounts: Record<string, number>;
  cellSize: [number, number];
  scale: number;
  anchor: [number, number];
  pageSizes: [number, number][];
  pages: string[];
  clips: MonsterMotionClip[];
};

export type MonsterMotionClipFrame = {
  key: string;
  action: string;
  direction: HeroDirection;
  frame: MonsterMotionFrame;
};

const directions: readonly HeroDirection[] = ['south', 'west', 'north', 'east'];
const manifestCache = new Map<string, Promise<MonsterMotionManifest | undefined>>();
const assetIdPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// Temporary fallback for the legacy atlas. New profile manifests contain only
// idle, movement, and attack clips and never use these reaction cells.
const LEGACY_CELL_COUNT = 7;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isPair(value: unknown, positive = false): value is [number, number] {
  return Array.isArray(value) && value.length === 2
    && value.every(item => typeof item === 'number' && Number.isFinite(item)
      && (positive ? item > 0 : item >= 0));
}

function isIntegerPair(value: unknown): value is [number, number] {
  return isPair(value, true) && value.every(Number.isInteger);
}

function parseManifest(value: unknown, expectedId: MonsterMotionId): MonsterMotionManifest {
  if (!isRecord(value) || value.schema !== 'monster-motion-runtime.v1' || value.id !== expectedId) {
    throw new Error('Unsupported monster motion manifest or mismatched ID');
  }
  const cellSize = value.cellSize;
  const anchor = value.anchor;
  const pageSizes = value.pageSizes;
  const pages = value.pages;
  const actions = value.actions;
  const frameCounts = value.frameCounts;
  const directionOrder = value.directionOrder;
  const clips = value.clips;
  if (!isIntegerPair(cellSize) || !isPair(anchor) || !isRecord(frameCounts) || !Array.isArray(pageSizes)
      || !Array.isArray(pages) || !Array.isArray(actions) || !Array.isArray(directionOrder)
      || !Array.isArray(clips) || clips.length === 0
      || typeof value.displayHeightWorld !== 'number' || !Number.isFinite(value.displayHeightWorld)
      || value.displayHeightWorld <= 0 || typeof value.visibleHeightWorld !== 'number'
      || !Number.isFinite(value.visibleHeightWorld) || value.visibleHeightWorld <= 0
      || value.visibleHeightWorld > value.displayHeightWorld
      || typeof value.movementAction !== 'string' || !value.movementAction
      || typeof value.scale !== 'number' || !Number.isFinite(value.scale) || value.scale <= 0) {
    throw new Error('Monster motion manifest has invalid dimensions or clip metadata');
  }
  if (directionOrder.length !== directions.length
      || directions.some(direction => !directionOrder.includes(direction))) {
    throw new Error('Monster motion manifest must contain all four authored directions');
  }
  if (actions.some(action => typeof action !== 'string') || new Set(actions).size !== actions.length
      || actions.length !== 3 || !actions.includes('idle') || !actions.includes('attack')
      || !actions.includes(value.movementAction) || value.movementAction === 'idle'
      || value.movementAction === 'attack') {
    throw new Error('Monster motion manifest needs idle, movement, and attack actions');
  }
  if (pages.length === 0 || pages.length !== pageSizes.length
      || pages.some((page, index) => page !== `monster-motion-${expectedId}-${String(index).padStart(2, '0')}.webp`)
      || pageSizes.some(size => !isIntegerPair(size))) {
    throw new Error('Monster motion manifest has invalid atlas page metadata');
  }

  const parsedClips: MonsterMotionClip[] = [];
  const seen = new Set<string>();
  for (const rawClip of clips) {
    if (!isRecord(rawClip) || typeof rawClip.action !== 'string'
        || !directions.includes(rawClip.direction as HeroDirection)
        || typeof rawClip.loop !== 'boolean' || !Array.isArray(rawClip.frames)
        || rawClip.frames.length === 0 || !actions.includes(rawClip.action)) {
      throw new Error('Monster motion manifest contains an invalid clip');
    }
    const direction = rawClip.direction as HeroDirection;
    const key = `${rawClip.action}:${direction}`;
    if (seen.has(key)) throw new Error(`Duplicate monster motion clip ${key}`);
    seen.add(key);
    const expectedFrameCount = frameCounts[rawClip.action];
    const expectedLoop = rawClip.action === value.movementAction;
    if (!isPositiveInteger(expectedFrameCount) || rawClip.frames.length !== expectedFrameCount
        || rawClip.loop !== expectedLoop) {
      throw new Error(`Monster motion clip ${key} disagrees with action frame count or loop`);
    }
    if (rawClip.action === 'idle' && expectedFrameCount !== 1) {
      throw new Error('Idle clips must contain one still frame');
    }
    const frames: MonsterMotionFrame[] = [];
    for (const rawFrame of rawClip.frames) {
      if (!isRecord(rawFrame) || !isPositiveInteger(rawFrame.durationMs)
          || !Number.isInteger(rawFrame.page) || Number(rawFrame.page) < 0
          || Number(rawFrame.page) >= pages.length || !Array.isArray(rawFrame.rect)
          || rawFrame.rect.length !== 4
          || !isNonNegativeInteger(rawFrame.rect[0]) || !isNonNegativeInteger(rawFrame.rect[1])
          || !isPositiveInteger(rawFrame.rect[2]) || !isPositiveInteger(rawFrame.rect[3])
          || !isPair(rawFrame.anchor)) {
        throw new Error(`Monster motion clip ${key} contains an invalid frame`);
      }
      const [x, y, width, height] = rawFrame.rect as number[];
      const [pageWidth, pageHeight] = pageSizes[Number(rawFrame.page)] as [number, number];
      if (width !== cellSize[0] || height !== cellSize[1]
          || x + width > pageWidth || y + height > pageHeight
          || (rawFrame.anchor as number[])[0] !== anchor[0]
          || (rawFrame.anchor as number[])[1] !== anchor[1]) {
        throw new Error(`Monster motion clip ${key} has a frame outside its atlas page`);
      }
      frames.push({ page: Number(rawFrame.page), rect: [x, y, width, height],
        anchor: rawFrame.anchor as [number, number], durationMs: Number(rawFrame.durationMs) });
    }
    parsedClips.push({ action: rawClip.action, direction, loop: rawClip.loop, frames });
  }
  const expectedClipCount = actions.length * directions.length;
  if (seen.size !== expectedClipCount) {
    throw new Error(`Monster motion manifest has ${seen.size} clips; expected ${expectedClipCount}`);
  }
  for (const action of actions as string[]) {
    for (const direction of directions) {
      if (!seen.has(`${action}:${direction}`)) throw new Error(`Missing monster motion clip ${action}:${direction}`);
    }
  }
  return value as unknown as MonsterMotionManifest;
}

export function loadMonsterMotionManifest(id: MonsterMotionId): Promise<MonsterMotionManifest | undefined> {
  if (!isMonsterAssetId(id)) {
    return Promise.reject(new Error(`Invalid monster art ID: ${id}`));
  }
  const cached = manifestCache.get(id);
  if (cached) return cached;
  const request = fetch(`/assets/monster-motion-${id}.json`, { cache: 'force-cache' })
    .then(async response => {
      if (response.status === 404) return undefined;
      if (!response.ok) throw new Error(`Manifest request failed (${response.status})`);
      return parseManifest(await response.json() as unknown, id);
    });
  manifestCache.set(id, request);
  return request;
}

export function isMonsterAssetId(id: string): boolean {
  return assetIdPattern.test(id);
}

function clipAt(manifest: MonsterMotionManifest, action: string, direction: HeroDirection): MonsterMotionClip | undefined {
  return manifest.clips.find(clip => clip.action === action && clip.direction === direction);
}

export function monsterMotionClipFrame(
  manifest: MonsterMotionManifest,
  pose: HeroPose,
  direction: HeroDirection,
  elapsedMs: number,
  progress: number,
  reduced: boolean,
): MonsterMotionClipFrame {
  let action = pose === 'walk-a' || pose === 'walk-b' ? manifest.movementAction
    : pose === 'attack' || pose === 'cast' ? 'attack' : 'idle';
  if (reduced && action === manifest.movementAction) action = 'idle';
  const clip = clipAt(manifest, action, direction) ?? clipAt(manifest, 'idle', direction);
  if (!clip) throw new Error(`No idle fallback clip for direction ${direction}`);
  if (clip.action === 'idle' || pose === 'cast') {
    return { key: `${clip.action}:${direction}:0`, action: clip.action, direction, frame: clip.frames[0] };
  }
  const totalDuration = clip.frames.reduce((total, frame) => total + frame.durationMs, 0);
  const safeElapsed = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const safeProgress = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const time = clip.loop ? safeElapsed % totalDuration : safeProgress * totalDuration;
  let remaining = time;
  let index = clip.frames.length - 1;
  for (let frameIndex = 0; frameIndex < clip.frames.length; frameIndex++) {
    if (remaining < clip.frames[frameIndex].durationMs || frameIndex === clip.frames.length - 1) {
      index = frameIndex;
      break;
    }
    remaining -= clip.frames[frameIndex].durationMs;
  }
  return { key: `${clip.action}:${direction}:${index}`, action: clip.action,
    direction, frame: clip.frames[index] };
}

export function monsterMotionManifestUv(manifest: MonsterMotionManifest, frame: MonsterMotionFrame): number[] {
  const [pageWidth, pageHeight] = manifest.pageSizes[frame.page];
  const [x, y, width, height] = frame.rect;
  const u0 = (x + 0.5) / pageWidth;
  const u1 = (x + width - 0.5) / pageWidth;
  const v0 = 1 - (y + height - 0.5) / pageHeight;
  const v1 = 1 - (y + 0.5) / pageHeight;
  return [u0, v0, u1, v0, u1, v1, u0, v1];
}

/** Legacy atlas selector retained until its replacement art bundle is integrated. */
export function monsterMotionFrame(pose: HeroPose, elapsedMs: number, progress: number, reduced: boolean): number {
  const time = Number.isFinite(elapsedMs) ? Math.max(0, elapsedMs) : 0;
  const phase = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  if (pose === 'walk-a' || pose === 'walk-b') {
    return reduced ? 0 : 1 + Math.floor(time / 135) % 2;
  }
  if (pose === 'attack') return phase < .52 && !reduced ? 3 : 4;
  if (pose === 'cast') return 3;
  if (pose === 'hit') return 5;
  if (pose === 'death') return 6;
  return 0;
}

export function monsterMotionUv(frame: number): number[] {
  const safe = Number.isFinite(frame) ? Math.max(0, Math.min(LEGACY_CELL_COUNT - 1, Math.floor(frame))) : 0;
  const u0 = (safe + .006) / LEGACY_CELL_COUNT;
  const u1 = (safe + .994) / LEGACY_CELL_COUNT;
  return [u0, .002, u1, .002, u1, .998, u0, .998];
}

/** Legacy sheets depict one three-quarter pose; authored manifests select each direction. */
export function monsterMotionMirror(direction: HeroDirection): number {
  return direction === 'east' ? -1 : 1;
}
