import { HERO_BY_ID } from '../../../content/catalog.js';
import { GEAR_LINE_POOLS, GEAR_MAX_ENHANCE, GEAR_SALVAGE_DUST, GEAR_UNIQUES, gearEnhanceCost, gearEnhanceSpent, gearRerollCost } from '../../../content/gear-design.js';
import type { Command, CommandResult, GameState, Unit } from '../../contracts/src/types.js';
import { gearRandom, gearStats, grantGearItem, rollGearItem, rollGearLine } from './gear-items.js';
import { refreshStats } from './stats.js';
import { settleGearRecovery } from './gear-recovery.js';

const fail = (message: string): CommandResult => ({ ok: false, message });
export function gearCommand(state: GameState, owner: string, command: Command): CommandResult | null {
  if (!['equip-item', 'unequip-item', 'enhance-item', 'reroll-item', 'salvage-item', 'admin-item'].includes(command.type)) return null;
  const player = state.players[owner];
  if (!player || !player.connected) return fail('Phiên chơi không hợp lệ.');
  if (state.phase === 'won' || state.phase === 'lost') return fail('Trận đấu đã kết thúc.');
  const settleOwner = (): void => {
    for (const unit of Object.values(state.units)) if (unit.owner === owner) settleGearRecovery(state, unit);
  };
  if (command.type === 'admin-item') {
    if (command.unique && (command.slot && command.slot !== GEAR_UNIQUES[command.unique].slot || command.rarity && command.rarity !== 'gold'))
      return fail('Dòng độc nhất không khớp khe hoặc phẩm vàng.');
    settleOwner();
    grantGearItem(state, owner, rollGearItem(state, { source: 'admin', ...command }), 'admin');
  } else {
    if (!('itemId' in command)) return null;
    const item = player.gear.find(entry => entry.id === command.itemId);
    if (!item) return fail('Không sở hữu món trang bị này.');
    if (command.type === 'equip-item') {
      const unit = state.units[command.unitId];
      if (!unit || unit.owner !== owner) return fail('Không thể mặc đồ cho tướng của người khác.');
      if (unit.summonDuration !== undefined || unit.summonerId || unit.summonKind) return fail('Đơn vị triệu hồi không thể mặc đồ.');
      settleOwner();
      for (const equipped of player.gear) if (equipped.unitId === unit.id && equipped.slot === item.slot) equipped.unitId = null;
      item.unitId = unit.id;
    } else if (command.type === 'unequip-item') {
      if (!item.unitId) return fail('Món đồ đang ở kho.');
      settleOwner();
      item.unitId = null;
    } else if (command.type === 'enhance-item') {
      if (item.enhance >= GEAR_MAX_ENHANCE) return fail('Trang bị đã cường hóa tối đa +10.');
      const cost = gearEnhanceCost(item.enhance);
      if (player.gold < cost) return fail('Không đủ Linh Thạch.');
      settleOwner();
      player.gold -= cost;
      item.enhance++;
    } else if (command.type === 'reroll-item') {
      if (!item.lines.length) return fail('Món đồ không có dòng thường để tẩy luyện.');
      const cost = gearRerollCost(item.rerolls);
      if (player.gold < cost.gold || player.gearDust < cost.dust) return fail('Không đủ Linh Thạch hoặc Huyền Tinh.');
      settleOwner();
      const index = Math.floor(gearRandom(state) * item.lines.length);
      const occupied = new Set(item.lines.filter((_, i) => i !== index).map(line => line.stat));
      const pool = GEAR_LINE_POOLS[item.slot].filter(stat => !occupied.has(stat));
      item.lines[index] = rollGearLine(state, pool[Math.floor(gearRandom(state) * pool.length)], item.level);
      player.gold -= cost.gold; player.gearDust -= cost.dust;
      item.rerolls++;
    } else if (command.type === 'salvage-item') {
      if (item.unitId) return fail('Hãy tháo trang bị trước khi phân giải.');
      settleOwner();
      player.gear.splice(player.gear.indexOf(item), 1);
      player.gearDust += GEAR_SALVAGE_DUST[item.rarity];
      player.gold += Math.floor(gearEnhanceSpent(item.enhance) / 2);
    } else return null;
    player.gearVersion++;
  }
  const stats = gearStats(state);
  stats.commands[command.type] = (stats.commands[command.type] ?? 0) + 1;
  refreshStats(state, owner);
  return { ok: true };
}
export function releaseUnitGear(state: GameState, unit: Unit, reason: 'craft' | 'merge' | 'sell' | 'remove'): void {
  const player = state.players[unit.owner];
  if (!player) return;
  let changed = false;
  for (const item of player.gear) {
    if (item.unitId !== unit.id) continue;
    if (item.unique === 'inheritance-seal' && (reason === 'craft' || reason === 'merge')) {
      const hero = HERO_BY_ID[unit.heroId];
      if (hero) {
        const rankScale = 2.4 ** (unit.rank - 1);
        item.absorbedAttack = (item.absorbedAttack ?? 0) + .15 * hero.attack * rankScale;
        item.absorbedHp = (item.absorbedHp ?? 0) + .15 * hero.hp * rankScale;
      }
    }
    item.unitId = null;
    changed = true;
  }
  if (changed) {
    player.gearVersion++;
    const stats = gearStats(state);
    stats.commands[`release-${reason}`] = (stats.commands[`release-${reason}`] ?? 0) + 1;
  }
}
