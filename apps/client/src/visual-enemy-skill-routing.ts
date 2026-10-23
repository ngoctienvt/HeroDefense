import type { EnemyRank, EnemyTelegraphShape, GameEvent } from '../../../packages/contracts/src/types.js';

export type EnemyTelegraphSpec = {
  shape: EnemyTelegraphShape;
  x: number;
  z: number;
  originX: number;
  originZ: number;
  dirX: number;
  dirZ: number;
  duration: number;
  radius: number;
  length: number;
  width: number;
  angle: number;
  color: string;
};

export type EnemyVfxRoute =
  | { kind: 'boss-earth'; mode: 'shield-warning' | 'shield' | 'quake-warning' | 'quake'; color: string; radius: number }
  | {
    kind: 'hero-adapter';
    heroId: 'h00P' | 'h00B' | 'h011' | 'h01H' | 'h01G';
    phase: 'cast' | 'ability';
    mappedSkillId: string;
    accentColor: string;
    radius: number;
  }
  | {
    kind: 'chieftain-skill';
    template: 'slam' | 'heavy-slam' | 'pierce' | 'leap' | 'heavy-leap' | 'warcry';
    phase: 'cast' | 'ability';
    color: string;
    radius: number;
  }
  | {
    kind: 'boss-enrage';
    color: string;
    radius: number;
  };

const RANK_SCALES: Readonly<Record<EnemyRank, number>> = {
  minion: 0.95,
  elite: 1.1,
  chieftain: 1.25,
  boss: 1.5,
};

/** Visual scale multiplier for hero-skinned enemies by rank. */
export function enemyRankScale(rank?: EnemyRank): number {
  return rank ? RANK_SCALES[rank] : 1;
}

/** True when a GameEvent skillId belongs to a chieftain or boss skill/windup/enrage. */
export function isEnemySkillEvent(skillId?: string): boolean {
  if (!skillId) return false;
  return skillId.startsWith('enemy-') || skillId.startsWith('boss-');
}

const TELEGRAPH_COLORS: Readonly<Record<string, string>> = {
  'enemy-slam-windup': '#f97316',
  'enemy-heavy-slam-windup': '#ef4444',
  'enemy-pierce-windup': '#38bdf8',
  'enemy-leap-windup': '#f59e0b',
  'enemy-heavy-leap-windup': '#ef4444',
  'enemy-warcry-windup': '#eab308',
  'boss-stone-shield-windup': '#e2d2a6',
  'boss-earthquake-windup': '#f3b579',
  'boss-bull-charge-windup': '#f97316',
  'boss-earth-splitter-windup': '#f59e0b',
  'boss-fan-gale-windup': '#34d399',
  'boss-fire-tempest-windup': '#fb7185',
  'boss-axe-cleave-windup': '#ef4444',
  'boss-shield-bash-windup': '#f97316',
  'boss-defiant-roar-windup': '#dc2626',
  'boss-meteor-cataclysm-windup': '#ff5a26',
  'boss-blazing-spear-windup': '#fb923c',
  'boss-abyssal-deluge-windup': '#0ea5e9',
  'boss-monolith-ram-windup': '#38bdf8',
};

/**
 * Extracts a ground telegraph specification from an enemy `cast` event.
 * Returns `undefined` when the event is not a telegraphed enemy windup.
 */
export function resolveEnemyTelegraph(
  event: GameEvent,
  origin: { x: number; z: number },
  fallbackTarget?: { x: number; z: number },
): EnemyTelegraphSpec | undefined {
  if (event.kind !== 'cast' || !isEnemySkillEvent(event.skillId)) return undefined;
  const shape: EnemyTelegraphShape | undefined = event.telegraph
    ?? (event.length !== undefined && event.width !== undefined ? 'line'
      : event.angle !== undefined ? 'cone'
      : event.radius !== undefined ? 'circle' : undefined);
  if (!shape) return undefined;

  const targetX = event.x ?? fallbackTarget?.x ?? origin.x;
  const targetZ = event.z ?? fallbackTarget?.z ?? origin.z;
  const rawDx = event.direction?.x ?? (targetX - origin.x);
  const rawDz = event.direction?.z ?? (targetZ - origin.z);
  const len = Math.hypot(rawDx, rawDz);
  const dirX = len > 1e-4 ? rawDx / len : 0;
  const dirZ = len > 1e-4 ? rawDz / len : 1;

  return {
    shape,
    x: targetX,
    z: targetZ,
    originX: origin.x,
    originZ: origin.z,
    dirX,
    dirZ,
    duration: Math.max(0.18, event.windup ?? 0.6),
    radius: Math.max(1.2, event.radius ?? 3.5),
    length: Math.max(2.0, event.length ?? 8.0),
    width: Math.max(1.0, event.width ?? 2.4),
    angle: Math.max(25, Math.min(180, event.angle ?? 80)),
    color: TELEGRAPH_COLORS[event.skillId ?? ''] ?? '#ef4444',
  };
}

/**
 * Maps an enemy skill `cast`, `ability`, or `trait` event to its visual handler route.
 */
export function resolveEnemySkillVfx(event: GameEvent): EnemyVfxRoute | undefined {
  const id = event.skillId;
  if (!id) return undefined;

  switch (id) {
    // Boss 1: Hắc Phong Sơn Chủ (b001)
    case 'boss-stone-shield-windup':
      return { kind: 'boss-earth', mode: 'shield-warning', color: '#e2d2a6', radius: event.radius ?? 3.2 };
    case 'boss-stone-shield':
      return { kind: 'boss-earth', mode: 'shield', color: '#e2d2a6', radius: 3.2 };
    case 'boss-earthquake-windup':
      return { kind: 'boss-earth', mode: 'quake-warning', color: '#f3b579', radius: event.radius ?? 6.5 };
    case 'boss-earthquake':
      return { kind: 'boss-earth', mode: 'quake', color: '#f3b579', radius: 6.5 };

    // Boss 2A: Ngưu Ma Vương (h00P)
    case 'boss-bull-charge-windup':
    case 'boss-earth-splitter-windup':
      return {
        kind: 'hero-adapter',
        heroId: 'h00P',
        phase: 'cast',
        mappedSkillId: 'skill-h00P',
        accentColor: '#f97316',
        radius: event.radius ?? 5.2,
      };
    case 'boss-bull-charge':
    case 'boss-earth-splitter':
      return {
        kind: 'hero-adapter',
        heroId: 'h00P',
        phase: 'ability',
        mappedSkillId: 'skill-h00P',
        accentColor: '#f59e0b',
        radius: id === 'boss-earth-splitter' ? 5.2 : 3.5,
      };

    // Boss 2B: Thiết Phiến Công Chúa (h00B)
    case 'boss-fan-gale-windup':
    case 'boss-fire-tempest-windup':
      return {
        kind: 'hero-adapter',
        heroId: 'h00B',
        phase: 'cast',
        mappedSkillId: 'skill-h00B',
        accentColor: id === 'boss-fan-gale-windup' ? '#34d399' : '#fb7185',
        radius: event.radius ?? 4.5,
      };
    case 'boss-fan-gale':
    case 'boss-fire-tempest':
      return {
        kind: 'hero-adapter',
        heroId: 'h00B',
        phase: 'ability',
        mappedSkillId: 'skill-h00B',
        accentColor: id === 'boss-fan-gale' ? '#34d399' : '#fb7185',
        radius: id === 'boss-fan-gale' ? 7.5 : 4.5,
      };

    // Boss 3: Hình Thiên (h011)
    case 'boss-axe-cleave-windup':
    case 'boss-shield-bash-windup':
    case 'boss-defiant-roar-windup':
      return {
        kind: 'hero-adapter',
        heroId: 'h011',
        phase: 'cast',
        mappedSkillId: 'skill-h011',
        accentColor: '#ef4444',
        radius: event.radius ?? 5.5,
      };
    case 'boss-axe-cleave':
    case 'boss-defiant-roar':
      return {
        kind: 'hero-adapter',
        heroId: 'h011',
        phase: 'ability',
        mappedSkillId: 'skill-h011',
        accentColor: '#ef4444',
        radius: id === 'boss-defiant-roar' ? 7.0 : 5.5,
      };
    case 'boss-shield-bash':
      return {
        kind: 'hero-adapter',
        heroId: 'h011',
        phase: 'ability',
        mappedSkillId: 'fire-wave-h011',
        accentColor: '#f97316',
        radius: 4.5,
      };

    // Boss 4A: Chúc Dung (h01H)
    case 'boss-meteor-cataclysm-windup':
    case 'boss-blazing-spear-windup':
      return {
        kind: 'hero-adapter',
        heroId: 'h01H',
        phase: 'cast',
        mappedSkillId: 'skill-h01H',
        accentColor: '#ff5a26',
        radius: event.radius ?? 5.5,
      };
    case 'boss-meteor-cataclysm':
      return {
        kind: 'hero-adapter',
        heroId: 'h01H',
        phase: 'ability',
        mappedSkillId: 'skill-h01H',
        accentColor: '#ff5a26',
        radius: 5.5,
      };
    case 'boss-blazing-spear':
      return {
        kind: 'hero-adapter',
        heroId: 'h01H',
        phase: 'ability',
        mappedSkillId: 'trait-h01H',
        accentColor: '#fb923c',
        radius: 3.6,
      };

    // Boss 4B: Cộng Công (h01G)
    case 'boss-abyssal-deluge-windup':
    case 'boss-monolith-ram-windup':
      return {
        kind: 'hero-adapter',
        heroId: 'h01G',
        phase: 'cast',
        mappedSkillId: 'skill-h01G',
        accentColor: '#0ea5e9',
        radius: event.radius ?? 5.5,
      };
    case 'boss-abyssal-deluge':
      return {
        kind: 'hero-adapter',
        heroId: 'h01G',
        phase: 'ability',
        mappedSkillId: 'skill-h01G',
        accentColor: '#0ea5e9',
        radius: 5.5,
      };
    case 'boss-monolith-ram':
      return {
        kind: 'hero-adapter',
        heroId: 'h01G',
        phase: 'ability',
        mappedSkillId: 'trait-h01G',
        accentColor: '#38bdf8',
        radius: 4.2,
      };

    // Boss Enrages
    case 'boss-twin-enrage':
    case 'boss-hinhthien-enrage':
      return { kind: 'boss-enrage', color: '#ef4444', radius: 4.8 };

    // Chieftain skill templates
    case 'enemy-slam-windup':
      return { kind: 'chieftain-skill', template: 'slam', phase: 'cast', color: '#f97316', radius: event.radius ?? 3.5 };
    case 'enemy-slam':
      return { kind: 'chieftain-skill', template: 'slam', phase: 'ability', color: '#f97316', radius: 3.5 };
    case 'enemy-heavy-slam-windup':
      return { kind: 'chieftain-skill', template: 'heavy-slam', phase: 'cast', color: '#ef4444', radius: event.radius ?? 4.2 };
    case 'enemy-heavy-slam':
      return { kind: 'chieftain-skill', template: 'heavy-slam', phase: 'ability', color: '#ef4444', radius: 4.2 };
    case 'enemy-pierce-windup':
      return { kind: 'chieftain-skill', template: 'pierce', phase: 'cast', color: '#38bdf8', radius: 2.2 };
    case 'enemy-pierce':
      return { kind: 'chieftain-skill', template: 'pierce', phase: 'ability', color: '#38bdf8', radius: 2.2 };
    case 'enemy-leap-windup':
      return { kind: 'chieftain-skill', template: 'leap', phase: 'cast', color: '#f59e0b', radius: event.radius ?? 3.2 };
    case 'enemy-leap':
      return { kind: 'chieftain-skill', template: 'leap', phase: 'ability', color: '#f59e0b', radius: 3.2 };
    case 'enemy-heavy-leap-windup':
      return { kind: 'chieftain-skill', template: 'heavy-leap', phase: 'cast', color: '#ef4444', radius: event.radius ?? 3.8 };
    case 'enemy-heavy-leap':
      return { kind: 'chieftain-skill', template: 'heavy-leap', phase: 'ability', color: '#ef4444', radius: 3.8 };
    case 'enemy-warcry-windup':
      return { kind: 'chieftain-skill', template: 'warcry', phase: 'cast', color: '#eab308', radius: event.radius ?? 6.0 };
    case 'enemy-warcry':
      return { kind: 'chieftain-skill', template: 'warcry', phase: 'ability', color: '#eab308', radius: 6.0 };

    default:
      return undefined;
  }
}
