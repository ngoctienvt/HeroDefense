import { BOND_DESIGN, BOND_TUNING, type BondDesign } from '../../../content/bond-design.js';
import type { BondState, Player } from '../../../packages/contracts/src/types.js';
import type { Command } from '../../../packages/contracts/src/types.js';
import { button, el } from './ui.js';

export type BondCounterKey = NonNullable<BondDesign['counter']>;
export interface BondCounterItem { key: BondCounterKey; label: string; value: number; cap?: number; hint: string }

const COUNTER_INFO: Record<BondCounterKey, { label: string; cap?: number; hint: string }> = {
  souls: { label: 'Hồn', cap: BOND_TUNING.souls.cap, hint: 'U Minh: Hồn thu được trong đợt này' },
  kiep: { label: 'Kiếp Nạn', hint: `Thỉnh Kinh / Hậu Tây Du: cột mốc ${BOND_TUNING.kiep.milestones.join(' / ')}` },
  longUy: { label: 'Long Uy', cap: BOND_TUNING.longUy.cap, hint: 'Long Tộc: đủ tầng thì Long Ngâm' },
  thanVi: { label: 'Thần Vị', cap: BOND_TUNING.thanVi.cap, hint: 'Phong Thần: +6% Công mỗi tầng' },
  dienHai: { label: 'Điền Hải', cap: BOND_TUNING.dienHai.cap, hint: 'Viêm Đế: +1% Công mỗi tầng, giữ cả trận' },
  tamTai: { label: 'Tam Tài', cap: 3, hint: 'Thiên Địa Nhân: số thành viên đã thi triển' },
};

/** Counters of active bonds only, one entry per counter even when two bonds share it. */
export function bondCounterItems(player: Pick<Player, 'activeSynergies' | 'bondState'>): BondCounterItem[] {
  const keys = new Set<BondCounterKey>();
  for (const active of player.activeSynergies) {
    const counter = BOND_DESIGN[active.id]?.counter;
    if (counter) keys.add(counter);
  }
  return [...keys].map(key => ({ key, ...COUNTER_INFO[key], value: readCounter(player.bondState, key) }));
}

function readCounter(state: BondState | undefined, key: BondCounterKey): number {
  return Math.max(0, Math.floor(state?.[key] ?? 0));
}

export interface BondActionItem { label: string; hint: string; command: Command; disabled: boolean; active?: boolean }

/**
 * Spending is the player's choice: buttons for the actions the active bonds offer. Availability here is only
 * a hint (greyed when the resource is short); the server checks everything again.
 */
export function bondActionItems(player: Pick<Player, 'activeSynergies' | 'bondState'>): BondActionItem[] {
  const state = player.bondState, count = (id: number) => player.activeSynergies.find(active => active.id === id)?.count ?? 0;
  const items: BondActionItem[] = [];
  if (count(3) >= 4) items.push({ label: `Gọi Quỷ Sai (${BOND_TUNING.souls.amBinhCost} Hồn)`, disabled: (state?.souls ?? 0) < BOND_TUNING.souls.amBinhCost,
    hint: 'U Minh: tiêu Hồn gọi một Quỷ Sai chiến đấu đến hết đợt. Không bấm thì giữ Hồn để tăng tốc đánh.',
    command: { type: 'bond-action', action: 'am-binh' } });
  if (count(13) >= 3) items.push({ label: 'Long Ngâm', disabled: (state?.longUy ?? 0) < BOND_TUNING.longUy.cap,
    hint: 'Long Tộc: đủ Long Uy thì cả nhóm thi triển ngay. Chưa bấm thì Long Uy vẫn tăng sát thương kỹ năng.',
    command: { type: 'bond-action', action: 'long-ngam' } });
  if (count(3) >= 5) {
    const on = !state?.rebirthOff;
    items.push({ label: `Luân Hồi tự động: ${on ? 'Bật' : 'Tắt'}`, disabled: false, active: on,
      hint: 'U Minh: khi tướng tử trận và có từ 15 Hồn, tự tiêu hết Hồn để hồi sinh. Tắt để giữ Hồn.',
      command: { type: 'bond-action', action: 'luan-hoi-auto', enabled: !on } });
  }
  return items;
}

/** Small strip next to the dock; null while no active bond keeps a counter or offers an action. */
export function renderBondCounters(player: Player | undefined, send?: (command: Command) => void): HTMLElement | null {
  const items = player ? bondCounterItems(player) : [];
  const actions = player && send ? bondActionItems(player) : [];
  if (!items.length && !actions.length) return null;
  const strip = el('div', 'bond-counters');
  strip.setAttribute('aria-label', 'Bộ đếm duyên phận');
  for (const item of items) {
    const node = el('span', `bond-counter${item.cap !== undefined && item.value >= item.cap ? ' is-full' : ''}`);
    node.title = item.hint;
    node.append(el('span', 'bond-counter-label', item.label), el('strong', '', item.cap ? `${item.value}/${item.cap}` : String(item.value)));
    strip.append(node);
  }
  for (const action of actions) {
    const node = button(action.label, () => send?.(action.command), `bond-action small ${action.active ? 'is-on' : ''}`.trim(), action.disabled);
    node.title = action.hint;
    strip.append(node);
  }
  return strip;
}
