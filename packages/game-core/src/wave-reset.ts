import type { GameState, Unit } from '../../contracts/src/types.js';
import { slotPosition } from './rules.js';

/** Every temporary hero status/counter ends with its wave, including passive cooldowns. */
const TRANSIENT_FIELDS = [
  'stun', 'ward', 'haste', 'critBlessing', 'fuxiBlessing', 'thunderBlessing',
  'bodhiBlessing', 'primordialBlessing', 'lanternShield', 'divineShield', 'divineImmortal',
  'empower', 'pendingAbility', 'shadowAssault', 'attackCount', 'comboTarget', 'comboCount',
  'orbitTimer', 'followUpCooldown', 'bonusArmor', 'blockBonus', 'reflect', 'mistShield',
  'frostShield', 'berserk', 'heatStacks', 'carryFervor', 'carryFocus', 'carryMomentum',
  'bloodDeathCount', 'phoenixCycle', 'phoenixEgg', 'starGuardCooldown', 'tierShield',
  'tierGoldShields', 'nuwaShields', 'tierBuff', 'tierImmortal', 'tierSoulCount', 'tierPetTimer',
] as const satisfies readonly (keyof Unit)[];

export function resetWaveCombat(state: GameState): void {
  state.groundEffects = [];
  state.boomerangs = [];
  state.tierPulses = [];
  state.solarPhases = [];
  for (const unit of Object.values(state.units)) {
    if (unit.summonDuration !== undefined || unit.summonerId !== undefined || unit.heroId === 'summon_plant') {
      delete state.units[unit.id];
      continue;
    }
    if (unit.hp <= 0 || unit.respawn > 0) {
      unit.zone = 0;
      if (unit.slot >= 0) Object.assign(unit, unit.savedPosition ?? slotPosition(state, unit.owner, unit.slot));
    }
    for (const field of TRANSIENT_FIELDS) delete unit[field];
    unit.hp = unit.maxHp;
    unit.cooldown = 0;
    unit.abilityCooldown = 0;
    unit.energy = 0;
    unit.waveDeaths = 0;
    unit.respawn = 0;
    unit.shield = 0;
    unit.target = null;
    unit.destination = null;
    unit.engageAt = null;
    unit.stopped = false;
    unit.orderMode = 'auto';
    unit.guardPosition = { x: unit.x, z: unit.z };
  }
  // Snapshots may skip the preparation phase; keep a durable event boundary for VFX cleanup.
  state.combatResetEventId = state.serial;
}
