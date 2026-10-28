import type { GameState, Role } from '../../../packages/contracts/src/types.js';
import { SUMMON_FAIL_PELLETS, SUMMON_PACKS, SUMMON_PITY } from '../../../packages/game-core/src/rules.js';

/**
 * One vocabulary for every HUD surface: tier is "Phẩm", gear level is "+N", rank is ★,
 * the five slots are "Ô 1–5", benched heroes live in the "Bộ sưu tập", the base is "Linh Trụ".
 */
export const BASE_NAME = 'Linh Trụ';
export const ROLE_LABELS: Record<Role, string> = { warrior: 'Chiến sĩ', ranger: 'Xạ thủ', mage: 'Pháp sư', guardian: 'Hộ vệ', support: 'Hỗ trợ' };
export const ELEMENT_LABELS = ['Vô', 'Kim', 'Mộc', 'Thủy', 'Hỏa', 'Thổ'] as const;
export const GEAR_NAMES = ['Vũ khí', 'Giáp', 'Pháp khí'] as const;
export const SLOT_COUNT = 5;

export const TIER_TITLES: Record<number, string> = {
  1: 'Phẩm 1 · Nhân Vật Khởi Đầu',
  2: 'Phẩm 2 · Tiên Nhân',
  3: 'Phẩm 3 · Chân Quân',
  4: 'Phẩm 4 · Kim Tiên',
  5: 'Phẩm 5 · Đại Thánh',
  6: 'Phẩm 6 · Hỗn Độn Chí Tôn',
};

export const RESOURCE_LABELS = { gold: 'Linh Thạch', souls: 'Đạo Duyên', pellets: 'Linh Đan', formationPoints: 'Điểm Trận Pháp' } as const;

export function roleLabel(role: string): string { return ROLE_LABELS[role as Role] ?? role; }
export function elementLabel(element: number): string { return ELEMENT_LABELS[element] ?? ELEMENT_LABELS[0]; }
export function tierLabel(tier: number): string { return `Phẩm ${tier}`; }
export function slotLabel(slot: number): string { return `Ô ${slot + 1}`; }
/** Up to six ranks read as a row of stars; higher ranks collapse to "7★" so cards keep their width. */
export function starText(rank: number): string { return rank <= 6 ? '★'.repeat(Math.max(1, rank)) : `${rank}★`; }
export function gearLabel(category: number, level: number): string { return `${GEAR_NAMES[category] ?? 'Trang bị'} +${level}`; }

export type SummonPackId = keyof typeof SUMMON_PACKS;
export const SUMMON_PACK_IDS = ['phan', 'tien', 'thien'] as const satisfies readonly SummonPackId[];
export const PACK_LABELS: Record<SummonPackId, string> = { phan: 'Phàm Chiêu', tien: 'Tiên Chiêu', thien: 'Thiên Mệnh' };

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Odds lines derived from the server rule table, so the HUD can never drift from SUMMON_PACKS. */
export function packOddsLines(pack: SummonPackId): string[] {
  const rule = SUMMON_PACKS[pack];
  const [low, high] = rule.tiers;
  const lines = [
    `${percent(rule.success)} thành công`,
    `${percent(rule.tierChance)} ${tierLabel(low)} · ${percent(1 - rule.tierChance)} ${tierLabel(high)}`,
    pack === 'phan' ? 'Nhận ngẫu nhiên 1 tướng' : 'Thành công: chọn 1 trong 3 tướng',
  ];
  if (pack !== 'phan') {
    lines.push(`Trượt: nhận tướng ${tierLabel(1)} + ${SUMMON_FAIL_PELLETS[pack]} Linh Đan`);
    lines.push(`Bảo hiểm: trượt ${SUMMON_PITY[pack]} lần thì lần sau chắc chắn thành công`);
  }
  return lines;
}

export function phaseLabel(state: Pick<GameState, 'phase'>, ready: boolean): string {
  switch (state.phase) {
    case 'lobby': return ready ? 'Chờ đồng đội' : 'Chưa sẵn sàng';
    case 'preparation': return 'Chuẩn bị';
    case 'combat': return 'Giao chiến';
    case 'won': return 'Đã vượt kiếp';
    default: return `${BASE_NAME} thất thủ`;
  }
}
