import type { IconName } from './ui-icons.js';
import type { Panel, PanelTab } from './panel-context.js';

/**
 * Single source for panel shortcuts, rail buttons and the Cẩm Nang controls list, so the guide
 * can never describe a key the game does not handle. `k` opens Admin but is deliberately absent
 * from the rail and the guide.
 */
export interface PanelKey { panel: Panel; tab?: PanelTab }
export const PANEL_KEYS: Record<string, PanelKey> = {
  b: { panel: 'shop' },
  c: { panel: 'craft' },
  p: { panel: 'roster' },
  t: { panel: 'bonds', tab: 'synergy' },
  f: { panel: 'bonds', tab: 'formation' },
  k: { panel: 'admin' },
  '?': { panel: 'guide', tab: 'controls' },
  '/': { panel: 'guide', tab: 'controls' },
  f1: { panel: 'guide', tab: 'controls' },
};

export interface RailItem { panel: Panel; label: string; keys: string; icon: IconName; tab?: PanelTab }
export const RAIL_ITEMS: readonly RailItem[] = [
  { panel: 'shop', label: 'Chiêu Mộ', keys: 'B', icon: 'chieu-mo' },
  { panel: 'craft', label: 'Ghép Tướng', keys: 'C', icon: 'ghep-tuong' },
  { panel: 'roster', label: 'Đội Hình', keys: 'P', icon: 'doi-hinh' },
  { panel: 'bonds', label: 'Duyên & Trận', keys: 'T', icon: 'duyen-tran', tab: 'synergy' },
  { panel: 'guide', label: 'Cẩm Nang', keys: '?', icon: 'cam-nang', tab: 'controls' },
];

export const PANEL_TITLES: Record<Panel, string> = {
  shop: 'Chiêu Mộ', craft: 'Ghép Tướng', roster: 'Đội Hình', bonds: 'Duyên Phận & Trận Pháp', guide: 'Cẩm Nang', admin: 'Admin',
};

export interface GuideRow { keys: string[]; text: string }
export interface GuideSection { title: string; rows: GuideRow[] }

/** Controls as implemented in battlefield.ts (camera, mouse) and main.ts (orders, groups, panels). */
export const GUIDE_SECTIONS: readonly GuideSection[] = [
  {
    title: 'Camera',
    rows: [
      { keys: ['W', 'A', 'S', 'D'], text: 'Di chuyển camera (hoặc phím mũi tên)' },
      { keys: ['Rê chuột ra mép'], text: 'Cuộn bản đồ theo hướng con trỏ' },
      { keys: ['Lăn chuột'], text: 'Phóng to / thu nhỏ' },
      { keys: ['Giữ chuột giữa'], text: 'Kéo bản đồ (hoặc Ctrl + kéo chuột trái)' },
      { keys: ['Alt + kéo'], text: 'Xoay góc camera' },
      { keys: ['Tab'], text: 'Đổi góc nhìn' },
      { keys: ['Space'], text: 'Đưa camera về tướng đang chọn' },
    ],
  },
  {
    title: 'Chọn và ra lệnh',
    rows: [
      { keys: ['Chuột trái'], text: 'Chọn tướng; kéo để quét chọn nhiều tướng' },
      { keys: ['Shift + chuột trái'], text: 'Thêm hoặc bớt tướng trong nhóm đang chọn' },
      { keys: ['Chuột phải'], text: 'Di chuyển, hoặc đánh mục tiêu dưới con trỏ' },
      { keys: ['Z', 'Shift + A'], text: 'Tấn công: nhấp quái, hoặc chuột phải xuống đất để vừa đi vừa đánh' },
      { keys: ['Q'], text: 'Dùng kỹ năng của tướng đang chọn' },
      { keys: ['X'], text: 'Dừng lệnh' },
      { keys: ['H'], text: 'Giữ vị trí và lưu điểm neo (nhấn lại để bỏ neo)' },
      { keys: ['Rê chuột'], text: 'Xem kỹ năng và trạng thái của tướng trên sân hoặc dưới dock' },
    ],
  },
  {
    title: 'Nhóm quân',
    rows: [
      { keys: ['1 – 5'], text: 'Chọn tướng ở Ô 1–5; nhấn lần nữa để đưa camera tới' },
      { keys: ['Ctrl + 1 – 9'], text: 'Lưu nhóm đang chọn' },
      { keys: ['6 – 9'], text: 'Gọi lại nhóm đã lưu' },
    ],
  },
  {
    title: 'Bảng',
    rows: [
      { keys: ['B'], text: 'Chiêu Mộ (các gói cũng có sẵn trên thanh phía trên dock)' },
      { keys: ['C'], text: 'Ghép Tướng' },
      { keys: ['P'], text: 'Đội Hình: xuất trận, trang bị, hợp nhất, bán' },
      { keys: ['T'], text: 'Duyên Phận' },
      { keys: ['F'], text: 'Trận Pháp' },
      { keys: ['?', 'F1'], text: 'Cẩm Nang' },
      { keys: ['Esc'], text: 'Đóng bảng hoặc menu đang mở, rồi bỏ chọn tướng' },
    ],
  },
];
