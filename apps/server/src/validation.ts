import type { Command, CommandEnvelope, Difficulty } from '../../../packages/contracts/src/types.js';
import { withinArena } from '../../../packages/game-core/src/battlefield-layout.js';

export const difficulties: Difficulty[] = ['normal', 'nightmare', 'hell', 'supreme'];
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const identifier = (value: unknown) => typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
const integer = (value: unknown, min: number, max: number) => typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max;
export function playerName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim();
  return name.length >= 1 && name.length <= 24 && !/[\x00-\x1f\x7f<>]/.test(name) ? name : null;
}
export function commandEnvelope(value: unknown): CommandEnvelope | null {
  if (!record(value) || !integer(value.id, 1, Number.MAX_SAFE_INTEGER) || Object.keys(value).some(k => !['id', 'command'].includes(k))) return null;
  const c = value.command;
  if (!record(c) || typeof c.type !== 'string') return null;
  let keys: string[] = [];
  let valid = true;
  switch (c.type) {
    case 'start': case 'next-wave': break;
    case 'ready': keys = ['ready']; valid = typeof c.ready === 'boolean'; break;
    case 'difficulty': keys = ['difficulty']; valid = difficulties.includes(c.difficulty as Difficulty); break;
    case 'summon': keys = ['pack']; valid = c.pack === undefined || ['phan', 'tien', 'thien'].includes(c.pack as string); break;
    case 'choose-hero': keys = ['heroId']; valid = identifier(c.heroId); break;
    case 'redeem': keys = ['item']; valid = ['chest-1', 'chest-2', 'embryo-3', 'embryo-4'].includes(c.item as string); break;
    case 'craft': keys = ['heroId']; valid = identifier(c.heroId); break;
    case 'deploy': keys = ['unitId', 'slot']; valid = identifier(c.unitId) && integer(c.slot, 0, 4); break;
    case 'equip': keys = ['unitId', 'category']; valid = identifier(c.unitId) && integer(c.category, 0, 2); break;
    case 'cast': keys = ['unitId', 'target']; valid = identifier(c.unitId) && (c.target === undefined || identifier(c.target)); break;
    case 'move': keys = ['unitId', 'x', 'z']; valid = identifier(c.unitId) && typeof c.x === 'number' && typeof c.z === 'number' && withinArena(c.x, c.z); break;
    case 'attack': keys = ['unitId', 'target']; valid = identifier(c.unitId) && identifier(c.target); break;
    case 'order': {
      keys = ['unitIds', 'order', 'x', 'z', 'target'];
      const ids = c.unitIds;
      valid = Array.isArray(ids) && ids.length >= 1 && ids.length <= 5 && ids.every(identifier) && new Set(ids).size === ids.length;
      valid &&= ['move', 'attack-move', 'attack', 'stop', 'hold'].includes(c.order as string);
      if (c.order === 'move' || c.order === 'attack-move') valid &&= typeof c.x === 'number' && typeof c.z === 'number' && withinArena(c.x, c.z) && c.target === undefined;
      else if (c.order === 'attack') valid &&= identifier(c.target) && c.x === undefined && c.z === undefined;
      else valid &&= c.x === undefined && c.z === undefined && c.target === undefined;
      break;
    }
    case 'save-position': keys = ['unitId', 'clear']; valid = identifier(c.unitId) && (c.clear === undefined || typeof c.clear === 'boolean'); break;
    case 'formation': case 'upgrade-formation': keys = ['formation']; valid = integer(c.formation, 1, 8); break;
    case 'speed': keys = ['speed']; valid = typeof c.speed === 'number' && [1, 2, 4].includes(c.speed); break;
    case 'bench': case 'merge': case 'sell': case 'stop': keys = ['unitId']; valid = identifier(c.unitId); break;
    case 'admin-get-hero':
      keys = ['heroId', 'rank', 'deploy'];
      valid = identifier(c.heroId) &&
        (c.rank === undefined || integer(c.rank, 1, 10)) &&
        (c.deploy === undefined || typeof c.deploy === 'boolean');
      break;
    case 'admin-resources':
      keys = ['gold', 'souls', 'pellets', 'formationPoints'];
      valid = (c.gold === undefined || integer(c.gold, 0, 10_000_000)) &&
        (c.souls === undefined || integer(c.souls, 0, 10_000_000)) &&
        (c.pellets === undefined || integer(c.pellets, 0, 10_000_000)) &&
        (c.formationPoints === undefined || integer(c.formationPoints, 0, 100));
      break;
    default: return null;
  }
  return valid && Object.keys(c).every(k => k === 'type' || keys.includes(k)) ? { id: value.id as number, command: c as Command } : null;
}

export class RateLimit {
  private tokens: number;
  private at = Date.now();
  constructor(private capacity: number, private perSecond: number) { this.tokens = capacity; }
  take(): boolean {
    const now = Date.now();
    this.tokens = Math.min(this.capacity, this.tokens + (now - this.at) / 1000 * this.perSecond);
    this.at = now;
    if (this.tokens < 1) return false;
    this.tokens--; return true;
  }
}
