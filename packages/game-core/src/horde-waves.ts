import type { Enemy } from '../../contracts/src/types.js';

type MonsterId = NonNullable<Enemy['monsterId']>;
type Spawn = { id: MonsterId; count: number; hp: number; attack: number; armor: number; speed: number;
  range: number; interval: number; leak: number; lifestealOnHit?: number };
export type HordeWave = { name: string; duration: number; rowInterval: number; rowSize: number; spawns: readonly Spawn[] };

// Per-lane authored encounters. Keep these separate from map-extracted catalog data.
export const HORDE_WAVES: readonly HordeWave[] = [
  { name: 'Lang Đàn Xuất Động', duration: 75, rowInterval: .4, rowSize: 5,
    spawns: [{ id: 'm001', count: 30, hp: 280, attack: 4, armor: 0, speed: 1.5, range: 1.5, interval: 1.4, leak: 1 }] },
  { name: 'Mưa Tên Hắc Sơn', duration: 75, rowInterval: .4, rowSize: 5,
    spawns: [
      { id: 'm001', count: 25, hp: 360, attack: 5, armor: 1, speed: 1.5, range: 1.5, interval: 1.4, leak: 1 },
      { id: 'm002', count: 15, hp: 240, attack: 6, armor: 0, speed: 1.45, range: 6, interval: 1.5, leak: 1 },
    ] },
  { name: 'Trọng Giáp Nghiền Ép', duration: 75, rowInterval: .4, rowSize: 5,
    spawns: [
      { id: 'm003', count: 10, hp: 1150, attack: 10, armor: 8, speed: 1.25, range: 1.8, interval: 1.6, leak: 2 },
      { id: 'm001', count: 15, hp: 420, attack: 6, armor: 1, speed: 1.5, range: 1.5, interval: 1.4, leak: 1 },
      { id: 'm002', count: 10, hp: 290, attack: 7, armor: 0, speed: 1.45, range: 6, interval: 1.5, leak: 1 },
    ] },
  { name: 'Cơn Lốc Huyết Dơi', duration: 75, rowInterval: .3, rowSize: 5,
    spawns: [{ id: 'm004', count: 65, hp: 380, attack: 4, armor: 0, speed: 2, range: 1.5, interval: 1.1, leak: 1, lifestealOnHit: 8 }] },
  { name: 'Hắc Phong Đại Quân', duration: 90, rowInterval: .38, rowSize: 5,
    spawns: [
      { id: 'm003', count: 10, hp: 1400, attack: 12, armor: 10, speed: 1.25, range: 1.8, interval: 1.6, leak: 2 },
      { id: 'm001', count: 25, hp: 480, attack: 6, armor: 2, speed: 1.5, range: 1.5, interval: 1.4, leak: 1 },
      { id: 'b001', count: 1, hp: 12000, attack: 28, armor: 10, speed: 1.15, range: 2.5, interval: 1.5, leak: 10 },
      { id: 'm002', count: 15, hp: 350, attack: 8, armor: 1, speed: 1.45, range: 6, interval: 1.5, leak: 1 },
    ] },
] as const;

const NAMES: Record<MonsterId, string> = {
  m001: 'Thanh Lang Tiểu Yêu', m002: 'Hắc Sơn Cốt Cung Thủ', m003: 'Trư Yêu Thiết Giáp',
  m004: 'Huyết Dơi Yêu', b001: 'Hắc Phong Hùng Vương',
};

export function hordeSpawn(wave: HordeWave, index: number): Spawn | undefined {
  let offset = index;
  for (const spawn of wave.spawns) {
    if (offset < spawn.count) return spawn;
    offset -= spawn.count;
  }
  return undefined;
}

export function monsterName(id: MonsterId): string { return NAMES[id]; }
