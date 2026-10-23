import type { PaletteKey } from './ui-palette.js';

/**
 * Overhead bar colour says whose unit it is; the bar length says how hurt it is. Low HP darkens
 * the same hue instead of switching to red, so an ally at 20% never looks like an enemy.
 */
export type BarFaction = 'self' | 'ally' | 'enemy' | 'elite';
export interface BarEntity { hero: boolean; owner?: string; kind?: string; rank?: string }

export const LOW_HP_RATIO = .35;

export function barFaction(entity: BarEntity, selfId: string): BarFaction {
  if (entity.hero) return entity.owner === selfId ? 'self' : 'ally';
  return entity.kind === 'boss' || entity.rank === 'boss' || entity.rank === 'chieftain' ? 'elite' : 'enemy';
}

export function barColorKey(faction: BarFaction, hpRatio: number): PaletteKey {
  return hpRatio <= LOW_HP_RATIO ? `faction-${faction}-low` : `faction-${faction}`;
}
