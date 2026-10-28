import type { GearStatId } from '../packages/contracts/src/types.js';
import { SYNERGIES } from './catalog.js';

/**
 * Bond (duyên phận) effects. Members and thresholds stay in the extracted catalog
 * (`SYNERGIES`); this file only adds what each threshold does.
 * Every number is a draft constant — balancing waits for the final wave count.
 * Design: plans/reports/design-261028-1330-duyen-phan-redesign.md
 */
export type BondProvenance = 'adapted' | 'original';
/** Gear stat channels plus `move-speed`, which only bonds use (read by unitSpeed). */
export type BondStat = GearStatId | 'move-speed';
export type BondStatMods = Partial<Record<BondStat, number>>;

export type BondEffect =
  /** Ratio mods (armor-flat absolute) added to the listed hero ids, or every member when `who` is omitted. */
  | { kind: 'member-stats'; stats: BondStatMods; who?: readonly string[] }
  /** Ratio mods added to every deployed hero of the owner. */
  | { kind: 'team-stats'; stats: BondStatMods }
  /** Named behaviour flag read by combat code for the listed hero ids. */
  | { kind: 'flag'; flag: 'extra-targets' | 'double-strike'; who: readonly string[]; value: number }
  /** Stat that grows with a player bond counter (read from the snapshot, so the client matches). */
  | { kind: 'counter-stats'; counter: BondNumericCounter; stat: BondStat; perStack: number; who?: readonly string[] }
  /** Stats granted once while a counter has reached `atLeast`. */
  | { kind: 'counter-threshold'; counter: BondNumericCounter; atLeast: number; stats: BondStatMods; who?: readonly string[] }
  /** Handler in packages/game-core/src/bonds, keyed by name. */
  | { kind: 'hook'; handler: string };
export type BondNumericCounter = 'souls' | 'longUy' | 'thanVi' | 'tamTai' | 'kiep' | 'dienHai' | 'dienTich';

export interface BondTier {
  /** Distinct deployed members needed; matches a catalog threshold. */
  at: number;
  title?: string;
  text: string;
  provenance: BondProvenance;
  effects: readonly BondEffect[];
}
export interface BondDesign {
  /** Short counter shown on the HUD strip, when the bond keeps one. */
  counter?: 'souls' | 'kiep' | 'longUy' | 'thanVi' | 'dienHai' | 'tamTai';
  tiers: readonly BondTier[];
}

/** Draft tuning constants, kept in one place for balancing. */
export const BOND_TUNING = {
  duyenTu: { rageGain: .10, cooldownReduction: .10, startRage: 15, minBonds: 2 },
  /** Kiếp Nạn gained per event (Thỉnh Kinh / Hậu Tây Du). */
  kiep: { perWave: 1, perChieftain: 1, perBoss: 5, milestones: [9, 18, 36] as readonly number[] },
  souls: { cap: 30, amBinhCost: 10 },
  longUy: { cap: 10 },
  thanVi: { cap: 5 },
  dienHai: { cap: 30 },
} as const;

const a = 'adapted' as const, o = 'original' as const;
const tier = (at: number, text: string, provenance: BondProvenance = a, title?: string): BondTier =>
  ({ at, text, provenance, effects: [], ...(title ? { title } : {}) });

const BASE_DESIGN: Readonly<Record<number, BondDesign>> = {
  1: { tiers: [
    tier(2, 'Lốc của Thiết Phiến nảy qua quái đang cháy sẽ lan Bỏng sang mục tiêu kế tiếp. Hồng Hài Nhi gây thêm 25% sát thương lên quái đang cháy.'),
    tier(3, 'Cú giẫm của Ngưu Ma Vương để lại vùng lửa 4 giây. Hồng Hài Nhi dưới 30% máu được Ngưu Ma Vương che khiên 25% máu tối đa (một lần mỗi đợt).'),
  ] },
  2: { tiers: [
    tier(2, 'Khi một người nhà Lý thi triển kỹ năng, mọi người nhà Lý khác nhận +15 Nộ hoặc giảm 1,5 giây hồi chiêu.', a, 'Huynh Đệ Đồng Tâm'),
    tier(3, 'Khiên Kim Tra mạnh thêm 40% khi đặt lên người nhà Lý. Quái bị Mộc Tra trói chịu thêm 25% sát thương từ người nhà Lý.'),
    tier(4, 'Lần đầu mỗi đợt, người nhà Lý sắp tử trận được miễn sát thương 2,5 giây và hồi 50% máu. Na Tra tự hồi sinh tại chỗ một lần mỗi đợt.', a, 'Linh Lung Bảo Tháp'),
  ] },
  3: { counter: 'souls', tiers: [
    tier(2, 'Mỗi quái do thành viên hạ gục cho 1 Hồn (tối đa 30, reset mỗi đợt). Mỗi Hồn cho thành viên +1% tốc đánh. Vô Thường gây thêm 30% sát thương lên quái đang bị Mạnh Bà làm chậm.', a, 'Câu Hồn'),
    tier(3, 'Cứ 8 giây, Phán Quan Kết Án: gây sát thương 300% Công lên tinh anh hoặc đầu lĩnh nhiều máu nhất. Quái thường dưới 12% máu bị thành viên đánh trúng thì chết ngay.', a, 'Sinh Tử Bộ'),
    tier(4, 'Khi có 10 Hồn, bấm nút Gọi Quỷ Sai cạnh dock để tiêu 10 Hồn gọi một Quỷ Sai chiến đấu đến hết đợt (Chung Quỳ phải ra trận). Không bấm thì Hồn vẫn tăng tốc đánh.', a, 'Âm Binh'),
    tier(5, 'Thành viên tử trận khi có từ 15 Hồn: tiêu hết Hồn để hồi sinh ngay với 40% máu (có nút bật/tắt Luân Hồi tự động). Lượng hồi của Ngũ Đạo Tướng Quân tăng 1% mỗi Hồn.', a, 'Ngũ Đạo Luân Hồi'),
  ] },
  4: { counter: 'kiep', tiers: [
    tier(2, 'Bát Giới gánh 30% sát thương Đường Tăng nhận. Sa Tăng ưu tiên hồi máu cho Đường Tăng. Mỗi Kiếp Nạn cho thành viên +0,5% Công.', a, 'Hộ Giá Sư Phụ'),
    tier(3, 'Kỹ năng của Đường Tăng gây thêm sát thương 150% Công lên quái quanh mục tiêu. Đường Tăng tử trận thì Ngộ Không +50% Công trong 8 giây.', a, 'Khẩn Cô Chú'),
    tier(4, 'Đủ 9 Kiếp: mỗi lần thi triển, Ngộ Không gọi 1 Kim Thân Hầu Vương ở lại đến hết đợt. Đủ 18 Kiếp: thành viên +20% tốc chạy.'),
    tier(5, 'Đủ 36 Kiếp: thành viên +20% sát thương kỹ năng.'),
  ] },
  5: { counter: 'kiep', tiers: [
    tier(2, 'Dùng tiếp bộ đếm Kiếp Nạn và nhận toàn bộ buff Kiếp của Thỉnh Kinh.', a, 'Chính Quả'),
    tier(3, 'Mỗi thành viên, một lần mỗi đợt, khi xuống dưới 30% máu được miễn sát thương 2 giây.', a, 'Kim Thân Bất Hoại'),
    tier(4, 'Bát Bộ Thiên Long và Tịnh Đàn Sứ Giả gây thêm 30% sát thương lên quái trong bát vàng của Kim Thiền Tử.'),
    tier(5, 'Đấu Chiến Thắng Phật gọi 4 Kim Thân Hầu Vương thay vì 3. Mọi cột mốc Kiếp Nạn áp cho cả 5 thành viên.', a, 'Ngũ Thánh'),
  ] },
  6: { tiers: [
    tier(2, 'Lượng hồi máu thừa của thành viên biến thành khiên, tối đa 20% máu tối đa người nhận.', a, 'Tiên Lộ'),
    tier(3, 'Đồng minh đang có khiên Tiên Lộ được +15% Công.'),
    tier(4, 'Mỗi lần thành viên hồi máu, người được hồi nhận thêm 8 Nộ.'),
  ] },
  7: { tiers: [
    tier(2, 'Đòn thường của Hậu Nghệ bắn thêm 4 mũi phụ, mỗi mũi 40% sát thương. Quái đang bị Hằng Nga đóng băng mà trúng Hậu Nghệ thì chắc chắn chí mạng. Khiên Ánh Trăng đặt lên Hậu Nghệ mạnh thêm 50%.', a, 'Nhật Nguyệt'),
  ] },
  8: { counter: 'thanVi', tiers: [
    tier(2, 'Dương Tiễn và Na Tra có 30% đánh hai lần.'),
    tier(3, 'Thiên Lôi của Lôi Chấn Tử nảy thêm 3 mục tiêu và mạnh thêm 20%.'),
    tier(4, 'Mỗi lần thi triển, Khương Tử Nha niêm phong 2 giây và làm choáng 1,2 giây tinh anh hoặc đầu lĩnh nhiều máu nhất trong vùng. Nếu nó chết trong 6 giây, cả nhóm nhận 1 tầng Thần Vị (+6% Công, tối đa 5, reset mỗi đợt).', a, 'Phong Thần Bảng'),
  ] },
  9: { tiers: [
    tier(2, 'Thành viên hút máu 8%.'),
    tier(3, 'Ảo tiễn của Đát Kỷ giảm 25% Công của quái trong 3 giây.', a, 'Hồ Mị'),
    tier(4, 'Mỗi lần thành viên hạ quái, mọi thành viên hồi 2% máu. Kim Sí Đại Bằng +5% chí mạng cho mỗi quái hạ trong 5 giây gần nhất (tối đa 25%).', a, 'Yêu Vương Tụ Hội'),
  ] },
  10: { tiers: [
    tier(2, 'Thành viên nhận ít hơn 15% sát thương.', o, 'Kim Cang Bất Hoại'),
    tier(3, 'Mỗi lần một thành viên thi triển, mọi tướng trong đội hồi 4% máu tối đa và quái trúng kỹ năng đó chịu thêm sát thương 100% Công của người thi triển.', o, 'Phổ Độ'),
  ] },
  11: { tiers: [
    tier(2, 'Mỗi khi thành viên tạo khiên hoặc tăng giáp cho đồng minh, mọi thành viên Thiên Đình nhận +4 giáp trong 5 giây (làm mới, không cộng dồn).', a, 'Thiên Quy'),
    tier(3, 'Đầu mỗi đợt gọi 2 Thiên Binh chiến đấu đến hết đợt.', a, 'Thiên Binh Thiên Tướng'),
    tier(4, 'Kỹ năng của Thái Bạch tăng 10% giáp cho mục tiêu. Thái Bạch hồi sinh đồng minh nhanh hơn 30%.'),
    tier(5, 'Đòn thường của Tây Vương Mẫu đánh 5 mục tiêu. Thiên Binh gọi ra +50% chỉ số.'),
  ] },
  12: { tiers: [
    tier(2, 'Mỗi khi thành viên thi triển, mọi tướng trong đội nhận +10 Nộ hoặc giảm 1 giây hồi chiêu.', a, 'Ân Điển'),
    tier(3, 'Khiên và lượng hồi do thành viên tạo cho đồng minh mạnh thêm 30%. Buff của Tây Vương Mẫu kéo dài thêm 50%.', a, 'Mẫu Nghi'),
    tier(4, 'Nữ Oa hồi đầy máu khi xuống dưới 50% (hồi chiêu 45 giây). Cứ 20 giây, Hằng Nga giáng một đòn địa chấn 500% Công diện rộng và làm choáng 2 giây (boss chỉ 0,5 giây).', o, 'Sáng Thế'),
  ] },
  13: { counter: 'longUy', tiers: [
    tier(2, 'Mỗi lần thành viên thi triển cho 1 tầng Long Uy (tối đa 10, reset mỗi đợt). Mỗi tầng +2% sát thương kỹ năng cho thành viên.'),
    tier(3, 'Đủ 10 tầng, bấm nút Long Ngâm cạnh dock để tiêu hết tầng và cả nhóm thi triển ngay; chưa bấm thì tầng vẫn tăng sát thương kỹ năng.', a, 'Long Ngâm'),
    tier(4, 'Khi Long Ngâm kích hoạt, Ứng Long thi triển thêm 2 lần. Quái trúng kỹ năng Chúc Long có 15% mất thêm 8% máu tối đa (không áp cho boss; đầu lĩnh tối đa 3%).'),
  ] },
  14: { tiers: [
    tier(2, 'Bỏng do thành viên gây kéo dài thêm 50%. Thành viên gây thêm 20% sát thương lên quái đang cháy.'),
    tier(3, 'Tướng đang có khiên của Xích Tùng Tử gây Bỏng bằng đòn thường.'),
    tier(4, 'Quái chết khi đang cháy nổ 15% máu tối đa của chính nó lên quái xung quanh và gây Bỏng (tối đa 2 bước nảy; boss không nổ). Hỏa Lưu Tinh của Chúc Dung +20% tỉ lệ kích hoạt.', a, 'Phần Thiên'),
  ] },
  15: { tiers: [
    tier(2, 'Làm chậm do thành viên gây kéo dài thêm 50%. Thành viên gây thêm 20% sát thương lên quái đang bị chậm.'),
    tier(3, 'Long Vương và Cộng Công khi bị đánh có 35% phản kích 125% Công. Sóng thần của Cộng Công đóng băng 1,5 giây quái đang bị chậm.', o, 'Nộ Hải'),
  ] },
  16: { tiers: [
    tier(2, 'Mỗi khi Khương Tử Nha hoặc Phục Hy thi triển, Lã Động Tân phóng 3 kiếm hỏa vào mục tiêu của kỹ năng đó.', a, 'Kiếm Tùy Pháp'),
    tier(3, 'Kỹ năng của Khương Tử Nha gây thêm 50% sát thương lên quái đang bị Bát Quái của Phục Hy liên kết. Mỗi lần Khương Tử Nha thi triển, Phục Hy hồi 30% máu.', a, 'Thiên Cơ'),
  ] },
  17: { counter: 'dienHai', tiers: [
    tier(2, 'Tinh Vệ đánh 6 mục tiêu, +12% tốc đánh, đòn xuyên, và gây độc của Thần Nông. Mỗi quái chết khi đang trúng độc cho Tinh Vệ 1 tầng Điền Hải (+1% Công, giữ suốt trận, tối đa 30). Mộc Linh khi biến mất hồi 20% máu cho Thần Nông.'),
  ] },
  18: { tiers: [
    tier(2, 'Mỗi khi Hiên Viên tung tuyệt kỹ, Ứng Long thi triển ngay kỹ năng của mình vào cùng mục tiêu. Cự kiếm Hiên Viên +30% sát thương chí mạng. Mỗi lần Hiên Viên chí mạng, Ứng Long nhận +10 Nộ.'),
  ] },
  19: { tiers: [
    tier(2, 'Cả hai +30% sát thương lên boss và đầu lĩnh. Bách Bộ Xuyên Dương để lại Bỏng 100% Công mỗi giây trong 5 giây. Đế Tuấn khiêu khích đầu lĩnh hoặc boss gần nhất 3 giây (mỗi 15 giây). Mỗi khi đội hạ đầu lĩnh hoặc boss, cả đội +20% tốc đánh trong 8 giây.'),
  ] },
  20: { tiers: [
    tier(2, 'Mỗi đòn của Hình Thiên gây thêm sát thương chuẩn bằng 25% Công. Khai Thiên của Bàn Cổ +25% sát thương. Chiến Ý của Hình Thiên mở rộng phạm vi. Khi một trong hai tử trận, người còn lại đầy Nộ ngay.'),
  ] },
  21: { tiers: [
    tier(2, 'Kỹ năng của Trầm Hương cho Dương Tiễn +30% Công và giáp trong 10 giây. Quái trúng Tam Tiêm của Dương Tiễn chịu thêm sát thương 150% Công của Dương Tiễn.'),
  ] },
  22: { tiers: [
    tier(2, 'Kim Thân Hầu Vương nhận 100% chỉ số bản thể. Mỗi lần thi triển, Ngộ Không gọi 1 Kim Thân Hầu Vương ở lại đến hết đợt.'),
    tier(3, 'Khi Ngộ Không hoặc Đấu Chiến thi triển, Lục Nhĩ thi triển ngay kỹ năng của chính mình.', a, 'Chân Giả Mỹ Hầu Vương'),
  ] },
  23: { tiers: [
    tier(2, 'Sát thương kỹ năng của thành viên +10%.'),
    tier(3, 'Kỹ năng của Long Vương và Kim Sí Đại Bằng làm chậm 30% trong 3 giây. Kỹ năng của Lôi Chấn Tử và Trương Đạo Lăng gây thêm 30% sát thương lên quái đang bị chậm.', o, 'Phong Vũ'),
    tier(4, 'Mỗi đòn đánh của Trương Đạo Lăng cộng 1 điện tích; mỗi điện tích +5% sát thương của Kim Sí Đại Bằng (tối đa 50%, hết khi Kim Sí thi triển).', o),
  ] },
  24: { counter: 'tamTai', tiers: [
    tier(2, 'Thần Lôi Phù của Trương Đạo Lăng rộng thêm 20% và có 30% chí mạng.'),
    tier(3, 'Sau khi cả 3 thành viên đều đã thi triển ít nhất một lần, Trương Đạo Lăng lập tức thi triển thêm một lần với +50% sức mạnh, rồi bộ đếm reset.', a, 'Tam Tài Quy Nhất'),
  ] },
  25: { tiers: [
    tier(2, 'Khi đang giao tranh, thành viên mất 1% máu mỗi giây nhưng được +30% Công và +50% lượng hồi nhận được.'),
    tier(3, 'Huyết Thi của Tương Thần +50% Công và máu. Thành viên tử trận để lại 1 Huyết Thi ở lại đến hết đợt. Kỹ năng Chúc Long gây Bỏng 6% máu tối đa của quái (không áp cho boss).'),
  ] },
  26: { tiers: [
    tier(2, 'Khổng Tước hồi máu thêm 30%. Mỗi lần Kim Sí Đại Bằng bị đánh cộng +5% sát thương Tật Phong (tối đa 50%, hết khi thi triển).'),
    tier(3, 'Phượng Hoàng tử trận thì hồi sinh tại chỗ sau 2 giây với 50% máu và nổ lửa 300% Công (một lần mỗi đợt). Chân Hỏa của Phượng Hoàng có 30% liên kích hai lần.', a, 'Niết Bàn'),
  ] },
  27: { tiers: [
    tier(2, 'Thành viên gây thêm 30% sát thương lên quái đang cháy. Biển dung nham và thảm lửa tồn tại lâu hơn 50%. Cứ 35 giây, Phượng Hoàng tự thi triển thêm kỹ năng của mình với 50% sức mạnh.'),
  ] },
};

/** Data-driven effects, keyed `<bond id>:<tier threshold>`. Event-driven effects live in bonds/*.ts. */
const TIER_EFFECTS: Readonly<Record<string, readonly BondEffect[]>> = {
  '3:2': [{ kind: 'counter-stats', counter: 'souls', stat: 'attack-speed', perStack: .01 }],
  '9:2': [{ kind: 'member-stats', stats: { lifesteal: .08 } }],
  '15:2': [{ kind: 'member-stats', stats: { 'status-duration': .5 } }],
  '19:2': [{ kind: 'member-stats', stats: { 'boss-damage': .3 } }],
  '4:2': [{ kind: 'counter-stats', counter: 'kiep', stat: 'attack-percent', perStack: .005 }],
  '4:4': [{ kind: 'counter-threshold', counter: 'kiep', atLeast: 18, stats: { 'move-speed': .2 } }],
  '4:5': [{ kind: 'counter-threshold', counter: 'kiep', atLeast: 36, stats: { 'skill-damage': .2 } }],
  '5:2': [
    { kind: 'counter-stats', counter: 'kiep', stat: 'attack-percent', perStack: .005 },
    { kind: 'counter-threshold', counter: 'kiep', atLeast: 18, stats: { 'move-speed': .2 } },
    { kind: 'counter-threshold', counter: 'kiep', atLeast: 36, stats: { 'skill-damage': .2 } },
  ],
  '8:4': [{ kind: 'counter-stats', counter: 'thanVi', stat: 'attack-percent', perStack: .06 }],
  '10:2': [{ kind: 'member-stats', stats: { 'damage-reduction': .15 } }],
  '14:2': [{ kind: 'member-stats', stats: { 'status-duration': .5 } }],
  '17:2': [
    { kind: 'member-stats', stats: { 'attack-speed': .12 }, who: ['h00M'] },
    { kind: 'counter-stats', counter: 'dienHai', stat: 'attack-percent', perStack: .01, who: ['h00M'] },
  ],
  '13:2': [{ kind: 'counter-stats', counter: 'longUy', stat: 'skill-damage', perStack: .02 }],
  '18:2': [{ kind: 'member-stats', stats: { 'crit-damage': .3 }, who: ['h01F'] }],
  '23:2': [{ kind: 'member-stats', stats: { 'skill-damage': .1 } }],
  '24:2': [{ kind: 'member-stats', stats: { 'crit-chance': .3 }, who: ['h040'] }],
  '25:2': [{ kind: 'member-stats', stats: { 'attack-percent': .3 } }],
  '20:2': [{ kind: 'member-stats', stats: { 'skill-damage': .25 }, who: ['h01B'] }],
};

/**
 * The live roster can be smaller than the designed one: five replaced identities (h03W, h03X, h01I, h01J, h014)
 * are removed from every synergy in catalog.ts, which drops thresholds that can no longer be reached.
 * Only tiers the live catalog still offers are published, so the UI never promises an unreachable effect.
 */
export const BOND_DESIGN: Readonly<Record<number, BondDesign>> = Object.fromEntries(
  Object.entries(BASE_DESIGN).map(([id, design]) => {
    const thresholds = SYNERGIES.find(s => s.id === Number(id))?.thresholds ?? [];
    return [id, {
      ...design,
      tiers: design.tiers.filter(t => thresholds.includes(t.at))
        .map(t => ({ ...t, effects: TIER_EFFECTS[`${id}:${t.at}`] ?? t.effects })),
    }];
  }));
