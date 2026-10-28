import { CRAFT_RECIPES, HERO_BY_ID } from '../../../content/catalog.js';
import type { Command, CommandResult, GameState, Unit } from '../../contracts/src/types.js';
import { sellRefund, slotPosition } from './rules.js';
import { releaseUnitGear } from './gear-commands.js';
import { refreshStats } from './stats.js';
import { summonCommand } from './summoning.js';
import { createUnit } from './unit-factory.js';

const fail = (message: string): CommandResult => ({ ok: false, message });
export function rosterCommand(state: GameState, id: string, command: Command): CommandResult | null {
  const player = state.players[id];
  const owned = Object.values(state.units).filter(u => u.owner === id);
  const unit = 'unitId' in command ? state.units[command.unitId] : undefined;
  if ('unitId' in command && (!unit || unit.owner !== id)) return fail('Không thể điều khiển nhân vật của người khác.');
  const summoned = summonCommand(state, id, command);
  if (summoned) return summoned;
  if (command.type === 'craft') {
    const recipe = CRAFT_RECIPES.find(item => item.heroId === command.heroId);
    if (!recipe) return fail('Không có công thức ghép cho nhân vật này.');
    const chosen: Unit[] = [];
    const missing: string[] = [];
    for (const heroId of recipe.ingredients) {
      const ingredient = owned.find(u => u.heroId === heroId && u.rank === 1 && u.zone === 0 && !chosen.includes(u));
      if (ingredient) chosen.push(ingredient);
      else missing.push(heroId);
    }
    if (missing.length > 1) return fail('Chưa đủ nguyên liệu theo công thức.');
    const missingTier = missing.length ? HERO_BY_ID[missing[0]]?.tier : 0;
    if (missing.length && !(missingTier === 3 && player.embryos.tier3 > 0 || missingTier === 4 && player.embryos.tier4 > 0)) return fail('Chưa đủ nguyên liệu hoặc Linh Phôi cùng bậc.');
    const crafted = createUnit(state, id, recipe.heroId);
    for (const ingredient of chosen) { releaseUnitGear(state, ingredient, 'craft'); delete state.units[ingredient.id]; }
    if (missingTier === 3) player.embryos.tier3--;
    if (missingTier === 4) player.embryos.tier4--;
    state.units[crafted.id] = crafted;
    refreshStats(state, id);
    return { ok: true, message: `Ghép thành công ${HERO_BY_ID[recipe.heroId].name}${missingTier ? ` bằng Linh Phôi bậc ${missingTier}` : ''}. Nhân vật mới ở bộ sưu tập.` };
  }
  if (!unit) return null;
  if (command.type === 'deploy') {
    if (!Number.isInteger(command.slot) || command.slot < 0 || command.slot > 4) return fail('Ô đội hình phải từ 1 đến 5.');
    if (unit.zone !== 0) return fail('Hãy trở về từ phụ bản trước.');
    if (unit.rank > 1 && owned.some(u => u.id !== unit.id && u.slot >= 0 && u.heroId === unit.heroId && u.rank > 1)) return fail('Không được ra trận hai bản sao từ bậc 2.');
    const previous = owned.find(u => u.slot === command.slot && u.id !== unit.id);
    if (previous?.zone) return fail('Nhân vật ở ô này đang trong phụ bản.');
    if (previous) previous.slot = unit.slot;
    unit.slot = command.slot;
    for (const u of [unit, previous]) if (u && u.slot >= 0) {
      Object.assign(u, slotPosition(state, id, u.slot)); u.target = null; u.destination = null; u.stopped = false; u.orderMode = 'auto'; u.engageAt = null; u.guardPosition = null;
    }
    refreshStats(state, id); return { ok: true };
  }
  if (command.type === 'bench') {
    if (unit.zone) return fail('Hãy trở về từ phụ bản trước.');
    if (unit.slot < 0) return fail('Nhân vật đã ở dự bị.');
    unit.slot = -1; unit.target = null; unit.destination = null; unit.orderMode = 'auto'; unit.engageAt = null; unit.guardPosition = null; refreshStats(state, id); return { ok: true };
  }
  if (command.type === 'merge') {
    if (unit.rank >= 10) return fail('Đã đạt bậc tối đa (10★).');
    if (unit.zone) return fail('Không hợp nhất trong phụ bản.');
    const copies = owned.filter(u => u.id !== unit.id && u.heroId === unit.heroId && u.rank === unit.rank && !u.zone).slice(0, 2);
    if (copies.length !== 2) return fail('Cần 3 bản sao cùng nhân vật và cùng bậc.');
    if (unit.slot >= 0 && owned.some(u => !copies.includes(u) && u.id !== unit.id && u.slot >= 0 && u.heroId === unit.heroId && u.rank > 1)) return fail('Đội hình đã có bản sao bậc cao.');
    copies.forEach(u => { releaseUnitGear(state, u, 'merge'); delete state.units[u.id]; });
    unit.rank++; refreshStats(state, id); unit.hp = unit.maxHp; unit.respawn = 0;
    return { ok: true, message: `Hợp nhất thành công: bậc ${unit.rank}.` };
  }
  if (command.type === 'sell') {
    if (unit.zone) return fail('Không bán nhân vật trong phụ bản.');
    const refund = sellRefund(unit);
    player.souls += refund.souls;
    player.gold += refund.gold;
    releaseUnitGear(state, unit, 'sell');
    delete state.units[unit.id]; refreshStats(state, id); return { ok: true };
  }
  return null;
}
