import { HERO_BY_ID } from '../../../content/catalog.js';
import type { GameState, Unit } from '../../contracts/src/types.js';
import { nextId } from './rules.js';

export function createUnit(state: GameState, owner: string, heroId: string): Unit {
  const hero = HERO_BY_ID[heroId];
  return {
    id: nextId(state, 'u'), heroId, owner, rank: 1, slot: -1, x: 0, z: 0,
    hp: hero.hp, maxHp: hero.hp, attack: hero.attack, armor: hero.armor, range: hero.range,
    cooldown: 0, abilityCooldown: 0, target: null, destination: null, savedPosition: null,
    stopped: false, equipment: [0, 0, 0], deaths: 0, respawn: 0, shield: 0, zone: 0, kills: 0,
    attackType: hero.attackGeometry?.type ?? 'single',
    onHitTrait: hero.onHitTrait?.type ?? 'crit_pierce',
    orbitTimer: 0,
    followUpCooldown: 0,
    energyType: hero.energyType ?? 'cooldown',
    energy: 0,
    maxEnergy: hero.maxEnergy ?? 100,
    block: hero.block ?? 0,
  };
}
