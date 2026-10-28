import { HERO_BY_ID } from './catalog.js';
import type { GearItem, GearLine, GearRarity, GearSlot, GearStatId, GearUniqueId } from '../packages/contracts/src/gear-types.js';

export const GEAR_RUN_WAVES = 20;
export const GEAR_KILL_DROP_CHANCE = .05;
export const GEAR_DROUGHT_WAVES = 3;
export const GEAR_MAX_ENHANCE = 10;
export const GEAR_RARITY_NAMES: Record<GearRarity, string> = { white: 'Trắng', blue: 'Xanh', purple: 'Tím', gold: 'Vàng' };
export const GEAR_SLOT_NAMES: Record<GearSlot, string> = { weapon: 'Vũ khí', armor: 'Giáp', talisman: 'Pháp khí' };
export const GEAR_LINE_COUNTS: Record<GearRarity, readonly [number, number]> = { white: [0, 0], blue: [1, 2], purple: [3, 4], gold: [5, 6] };
export const GEAR_SALVAGE_DUST: Record<GearRarity, number> = { white: 1, blue: 2, purple: 5, gold: 12 };
export const gearLevelScale = (level: number): number => .5 + .5 * Math.min(1.2, Math.max(1, level) / GEAR_RUN_WAVES);
export const gearEnhanceScale = (enhance: number): number => 1 + .06 * Math.max(0, Math.min(GEAR_MAX_ENHANCE, enhance));
/** Current run earns 12,500 stones; +10 costs 1,155, so all fifteen slots still require a choice. */
export const gearEnhanceCost = (enhance: number): number => 3 * (enhance + 1) ** 2;
export const gearEnhanceSpent = (enhance: number): number => 3 * enhance * (enhance + 1) * (2 * enhance + 1) / 6;
export const gearRerollCost = (rerolls: number): { dust: number; gold: number } => ({ dust: 2 + rerolls, gold: 50 * (rerolls + 1) });
export const GEAR_BASE_STATS: Record<GearSlot, readonly GearLine[]> = {
  weapon: [{ stat: 'attack-percent', value: 40 }],
  armor: [{ stat: 'health-percent', value: 45 }, { stat: 'armor-flat', value: 6 }],
  talisman: [{ stat: 'attack-speed', value: 8 }, { stat: 'skill-damage', value: 20 }],
};
export interface GearLineDesign { name: string; min: number; max: number; integer?: boolean; mechanic?: string }
export const GEAR_LINES: Record<GearStatId, GearLineDesign> = {
  'attack-percent': { name: 'Công', min: 6, max: 20 },
  'crit-chance': { name: 'Tỷ lệ chí mạng', min: 4, max: 12 },
  'crit-damage': { name: 'Sát thương chí mạng', min: 15, max: 45 },
  'armor-pierce': { name: 'Xuyên Giáp', min: 8, max: 25 },
  'boss-damage': { name: 'Sát thương lên Boss', min: 8, max: 30 },
  'execute-damage': { name: 'Sát thương lên mục tiêu dưới 30% Máu', min: 10, max: 35 },
  lifesteal: { name: 'Hút máu', min: 2, max: 6 },
  'pierce-length': { name: 'Độ dài đòn xuyên', min: 15, max: 40, mechanic: 'Đòn xuyên hoặc khứ hồi' },
  'cleave-radius': { name: 'Bán kính chém quét', min: 10, max: 30, mechanic: 'Chém quét' },
  'health-percent': { name: 'Máu', min: 8, max: 25 },
  'armor-flat': { name: 'Giáp', min: 3, max: 10 },
  'damage-reduction': { name: 'Giảm sát thương nhận', min: 3, max: 10 },
  'health-regen': { name: 'Máu hồi mỗi giây', min: .2, max: .8 },
  'respawn-reduction': { name: 'Giảm thời gian hồi sinh', min: 10, max: 35 },
  'wave-shield': { name: 'Khiên đầu wave theo Máu', min: 8, max: 25 },
  'melee-reflect': { name: 'Phản sát thương cận chiến', min: 8, max: 25 },
  'attack-speed': { name: 'Tốc đánh', min: 5, max: 15 },
  'skill-damage': { name: 'Sát thương kỹ năng', min: 8, max: 25 },
  'cooldown-reduction': { name: 'Giảm hồi chiêu', min: 5, max: 15, mechanic: 'Kỹ năng dùng hồi chiêu' },
  'rage-gain': { name: 'Nộ nhận vào', min: 10, max: 30, mechanic: 'Tướng dùng Nộ' },
  'status-duration': { name: 'Thời gian bỏng, độc, chậm, phá giáp', min: 15, max: 40 },
  'dot-damage': { name: 'Sát thương bỏng và độc', min: 15, max: 40 },
  'summon-duration': { name: 'Thời gian tồn tại đơn vị triệu hồi', min: 20, max: 50, mechanic: 'Tướng triệu hồi' },
};
export const GEAR_LINE_POOLS: Record<GearSlot, readonly GearStatId[]> = {
  weapon: ['attack-percent', 'crit-chance', 'crit-damage', 'armor-pierce', 'boss-damage', 'execute-damage', 'lifesteal', 'pierce-length', 'cleave-radius'],
  armor: ['health-percent', 'armor-flat', 'damage-reduction', 'health-regen', 'respawn-reduction', 'wave-shield', 'melee-reflect'],
  talisman: ['attack-speed', 'skill-damage', 'cooldown-reduction', 'rage-gain', 'status-duration', 'dot-damage', 'summon-duration'],
};
export const GEAR_UNIQUES: Record<GearUniqueId, { name: string; slot: GearSlot; description: string }> = {
  'heaven-earth-reversal': { name: 'Càn Khôn Đảo Chuyển', slot: 'armor', description: 'Cộng Công bằng 6% Máu tối đa.' },
  'sea-anchor': { name: 'Định Hải Thần Châm', slot: 'armor', description: 'Miễn choáng và đẩy lùi.' },
  'time-reversal': { name: 'Thời Quang Hồi Tố', slot: 'armor', description: 'Một lần mỗi wave khi Máu dưới 20%, hồi về Máu đầu wave, xóa hồi chiêu và đầy Nộ, kể cả đòn chí tử.' },
  'eight-trigram-mirror': { name: 'Bát Quái Kính', slot: 'armor', description: '25% chặn đòn quái đánh xa hoặc Boss, phản 150% Công.' },
  'inheritance-seal': { name: 'Truyền Thừa Ấn', slot: 'armor', description: 'Khi tướng bị dùng để ghép/hợp nhất, giữ vĩnh viễn 15% Công và Máu gốc theo sao; bán không hấp thụ.' },
  'fate-defiance': { name: 'Nghịch Thiên Cải Mệnh', slot: 'weapon', description: 'Thay đòn thường riêng bằng đòn nảy 3 lần, bán kính 5, mỗi lần giảm 15%.' },
  'star-absorption': { name: 'Hấp Tinh Đại Pháp', slot: 'weapon', description: 'Mỗi quái hạ tăng 0,25% Công, Boss tính 20 quái, tối đa 60%; tầng giữ trên món.' },
  'blood-pact': { name: 'Huyết Khế', slot: 'weapon', description: 'Hồi máu, khiên và hút máu nhận vào giảm 60%; mỗi 1% Máu mất tăng 1,2% sát thương. Đầy Máu đầu wave.' },
  'demon-heart': { name: 'Ma Tâm', slot: 'weapon', description: '+80% tốc đánh; mất 1,5% Máu tối đa mỗi giây khi có mục tiêu, có thể tự chết.' },
  'seven-kills': { name: 'Thất Sát', slot: 'weapon', description: 'Mỗi đòn thứ 7 tung kỹ năng 40% sức mạnh miễn phí; tướng không có kỹ năng gây ×3 sát thương.' },
  'lightning-talisman': { name: 'Dẫn Lôi Phù', slot: 'weapon', description: 'Đòn chí mạng phóng sét qua 3 quái trong bán kính 5, mỗi lần 50% sát thương đòn đó.' },
  'seated-oblivion': { name: 'Tọa Vong', slot: 'talisman', description: 'Không thể di chuyển; +60% tầm và +40% Công.' },
  'yin-yang': { name: 'Lưỡng Nghi', slot: 'talisman', description: 'Luân phiên Dương +50% sát thương và Âm hồi 30% sát thương cho đồng minh thấp % Máu nhất trong bán kính 8.' },
  'heaven-devouring-gourd': { name: 'Thôn Thiên Hồ Lô', slot: 'talisman', description: 'Quái chết trong bán kính 6 cho linh hồn; đủ 25 nổ bán kính 5 gây 60% Công ×25.' },
  'treasure-basin': { name: 'Tụ Bảo Bồn', slot: 'talisman', description: 'Quái tự hạ có 4% cho 15 Linh Thạch; −25% Công.' },
  'celestial-net': { name: 'Thiên La Địa Võng', slot: 'talisman', description: 'Quái tự hạ để lại bẫy 20 giây, tối đa 6; quái chạm trong 1,3 chịu 80% Công và chậm 50% trong 2 giây.' },
  'wind-fire-wheels': { name: 'Phong Hỏa Luân', slot: 'talisman', description: 'Tốc chạy ×2; mỗi 3 đơn vị để lại lửa bán kính 1,4 trong 4 giây, 40% Công/giây; tối đa 8 vệt.' },
};
export const GEAR_UNIQUE_POOLS: Record<GearSlot, GearUniqueId[]> = {
  weapon: ['fate-defiance', 'star-absorption', 'blood-pact', 'demon-heart', 'seven-kills', 'lightning-talisman'],
  armor: ['heaven-earth-reversal', 'sea-anchor', 'time-reversal', 'eight-trigram-mirror', 'inheritance-seal'],
  talisman: ['seated-oblivion', 'yin-yang', 'heaven-devouring-gourd', 'treasure-basin', 'celestial-net', 'wind-fire-wheels'],
};
const itemNames: Record<GearSlot, Record<GearRarity, string>> = {
  weapon: { white: 'Thiết Kiếm', blue: 'Thanh Phong Kiếm', purple: 'Tử Vân Kiếm', gold: 'Thiên Mệnh Thần Binh' },
  armor: { white: 'Bố Giáp', blue: 'Thanh Lân Giáp', purple: 'Tử Hà Bảo Giáp', gold: 'Càn Khôn Thần Giáp' },
  talisman: { white: 'Mộc Phù', blue: 'Thanh Linh Phù', purple: 'Tử Ngọc Pháp Ấn', gold: 'Thái Hư Thần Khí' },
};
export const gearItemName = (item: Pick<GearItem, 'slot' | 'rarity'>): string => itemNames[item.slot][item.rarity];
export const gearLineValue = (line: GearLine, enhance = 0): number => line.value * (GEAR_LINES[line.stat].integer ? 1 : gearEnhanceScale(enhance));
export function formatGearLine(line: GearLine, enhance = 0): string {
  const value = gearLineValue(line, enhance);
  return `+${Number(value.toFixed(2)).toLocaleString('vi-VN')}${line.stat === 'armor-flat' ? '' : '%'} ${GEAR_LINES[line.stat].name}`;
}
// These heroes dispatch directly to their own attack module before shared geometry.
const customAttacks = new Set(['h01B', 'h011', 'h012', 'h013', 'h018', 'h01C', 'h015', 'h01F', 'h01E', 'h01K', 'h01D', 'h03Z', 'h041', 'h040', 'h03W', 'h03X', 'h01I', 'h01J', 'h014', 'h017', 'h016', 'h019', 'h01G', 'h01A', 'h03Y']);
const summoners = new Set(['h012', 'h01E', 'h03Z', 'h03P', 'h00R']);
/** null = common line, true/false = whether a mechanic-specific line applies. */
export function gearLineFits(stat: GearStatId, heroId: string): boolean | null {
  if (!GEAR_LINES[stat].mechanic) return null;
  const hero = HERO_BY_ID[heroId];
  if (!hero) return false;
  if (stat === 'pierce-length') return !customAttacks.has(heroId) && ['linear_pierce', 'boomerang'].includes(hero.attackGeometry?.type ?? '');
  if (stat === 'cleave-radius') return !customAttacks.has(heroId) && hero.attackGeometry?.type === 'frontal_cleave';
  if (stat === 'cooldown-reduction') return !!hero.ability && (hero.energyType ?? 'cooldown') === 'cooldown';
  if (stat === 'rage-gain') return hero.energyType === 'rage_on_attack' || hero.energyType === 'rage_on_hit';
  return summoners.has(heroId);
}
