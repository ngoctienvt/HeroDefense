import type { CarryPassiveConfig } from './types.js';

/** Fervor stacks and kill momentum last this long without a new basic attack. */
export const CARRY_STACK_SECONDS = 3;
/** Execute bonus applies below this HP ratio of the primary target. */
export const CARRY_EXECUTE_THRESHOLD = 0.3;
/** Crowd guard needs at least this many living enemies inside the radius. */
export const CARRY_CROWD_COUNT = 3;
export const CARRY_CROWD_RADIUS = 3;

const fervor = (perStack: number, maxStacks: number) => ({ perStack, maxStacks });
const focus = (perStack: number, maxStacks: number) => ({ perStack, maxStacks });
const longShot = (bonus: number, minDistance: number) => ({ bonus, minDistance });

/**
 * Web-original hand-attack passives for melee carries (keep their cleave) and ranged carries.
 * Mages, supports and guardians have none: their strength lives in skills, auras and blocking.
 */
export const HERO_CARRY_PASSIVES: Readonly<Record<string, CarryPassiveConfig>> = {
  // --- Melee carries ---
  h003: { name: 'Câu Hồn Liêm', lifesteal: .08, momentum: .2 },
  h004: { name: 'Thiên Quân Trận Bộ', fervor: fervor(.05, 4), crowdGuard: .1 },
  h008: { name: 'Địa Mạch Cường Thân', lifesteal: .06, crowdGuard: .12 },
  h00A: { name: 'Song Kiếm Liên Hoàn', fervor: fervor(.06, 5), lifesteal: .08 },
  h00C: { name: 'Hỏa Nhi Bất Diệt', lifesteal: .08, crowdGuard: .1 },
  h00O: { name: 'Sinh Tử Bộ', execute: .3, lifesteal: .1 },
  h00P: { name: 'Đại Lực Ngưu Ma', crowdGuard: .15, lifesteal: .1 },
  h03Q: { name: 'Phách Sơn Chí', fervor: fervor(.06, 5), lifesteal: .08 },
  h00R: { name: 'Tề Thiên Đại Thánh', lifesteal: .1, bossBonus: .2 },
  h00U: { name: 'Thiên Nhãn Phá Ma', focus: focus(.06, 5), lifesteal: .08 },
  h00V: { name: 'Liên Hoa Hóa Thân', fervor: fervor(.07, 5), crowdGuard: .12 },
  h011: { name: 'Bất Khuất Chi Khu', crowdGuard: .15, execute: .25 },
  h012: { name: 'Kim Cang Chiến Phật', lifesteal: .12, bossBonus: .2 },
  h016: { name: 'Bằng Dực Cuồng Phong', fervor: fervor(.07, 5), lifesteal: .1 },
  h03Y: { name: 'Lục Nhĩ Tỏa Địch', focus: focus(.06, 5), lifesteal: .1 },
  h01B: { name: 'Khai Thiên Thần Lực', lifesteal: .12, crowdGuard: .15 },
  h03Z: { name: 'Thi Tổ Cuồng Huyết', fervor: fervor(.08, 5), execute: .25 },
  h01I: { name: 'Thái Dương Đế Uy', bossBonus: .25, focus: focus(.05, 6) },

  // --- Ranged carries ---
  h001: { name: 'Thiên Lý Truy Tung', longShot: longShot(.2, 6), focus: focus(.04, 5) },
  h002: { name: 'Phong Thanh Tốc Xạ', fervor: fervor(.05, 4) },
  h005: { name: 'Trọng Cung Bách Bộ', longShot: longShot(.15, 6), focus: focus(.05, 4) },
  h00B: { name: 'Ba Tiêu Cuồng Vũ', fervor: fervor(.06, 4) },
  h00H: { name: 'Câu Hồn Liên Đoạt', momentum: .25, focus: focus(.05, 5) },
  h00I: { name: 'Vong Xuyên Dẫn Hồn', fervor: fervor(.05, 5) },
  h00L: { name: 'Long Ngâm Liên Xạ', fervor: fervor(.06, 5) },
  h00M: { name: 'Tinh Vệ Điền Hải', focus: focus(.06, 5), longShot: longShot(.15, 6) },
  h00X: { name: 'Hồ Mị Đoạt Phách', momentum: .25 },
  h00Z: { name: 'Ứng Long Phá Không', fervor: fervor(.06, 5), longShot: longShot(.15, 6) },
  h03V: { name: 'Thiên Long Bát Bộ', fervor: fervor(.06, 5) },
  h017: { name: 'Xạ Nhật Thần Nhãn', longShot: longShot(.25, 7), bossBonus: .15 },
  h01A: { name: 'Dao Trì Kim Trâm', fervor: fervor(.07, 5) },
  h01F: { name: 'Hiên Viên Đế Kiếm', focus: focus(.05, 6), bossBonus: .15 },
  h041: { name: 'Phượng Vũ Cửu Thiên', fervor: fervor(.07, 5), longShot: longShot(.2, 7) },
};

const percent = (value: number) => `${Math.round(value * 100)}%`;
const decimal = (value: number) => String(value).replace('.', ',');

/** Player-facing Vietnamese summary generated from the same numbers the server uses. */
export function describeCarryPassive(passive: CarryPassiveConfig): string {
  const parts: string[] = [];
  if (passive.lifesteal) parts.push(`hút máu ${percent(passive.lifesteal)} sát thương đòn thường lên mục tiêu chính`);
  if (passive.fervor) parts.push(`mỗi đòn thường +${percent(passive.fervor.perStack)} tốc đánh, tối đa ${passive.fervor.maxStacks} tầng, mất sau ${CARRY_STACK_SECONDS} giây không đánh`);
  if (passive.focus) parts.push(`đánh liên tiếp cùng mục tiêu +${percent(passive.focus.perStack)} sát thương mỗi đòn, tối đa ${passive.focus.maxStacks} tầng`);
  if (passive.longShot) parts.push(`+${percent(passive.longShot.bonus)} sát thương khi mục tiêu cách từ ${decimal(passive.longShot.minDistance)} đơn vị`);
  if (passive.execute) parts.push(`+${percent(passive.execute)} sát thương lên mục tiêu dưới ${percent(CARRY_EXECUTE_THRESHOLD)} Máu`);
  if (passive.bossBonus) parts.push(`+${percent(passive.bossBonus)} sát thương lên Boss`);
  if (passive.crowdGuard) parts.push(`giảm ${percent(passive.crowdGuard)} sát thương nhận khi có từ ${CARRY_CROWD_COUNT} quái trong ${CARRY_CROWD_RADIUS} đơn vị`);
  if (passive.momentum) parts.push(`hạ mục tiêu bằng đòn thường +${percent(passive.momentum)} tốc đánh trong ${CARRY_STACK_SECONDS} giây`);
  return `${passive.name}: ${parts.join('; ')}.`;
}
