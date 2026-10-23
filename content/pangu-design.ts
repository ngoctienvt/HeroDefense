import type { HeroAbility } from '../packages/contracts/src/types.js';

/** User-authored web adaptation, separate from generated map evidence. */
export const PANGU = {
  id: 'h01B', title: 'Khai Thiên Tổ Thần', windup: .35,
  cleaveRadius: 3.8, critChance: .3, critMultiplier: 2.2, armorPierce: .35,
  strikeLength: 9, strikeWidth: 1.2, strikePower: 1.8,
  blastRadius: 8.5, blastPower: 4.8, sunder: .5, sunderSeconds: 6,
  riftLength: 14, riftWidth: 4.5, riftSeconds: 5, riftDps: .9, riftSlow: .6,
  cataclysmPower: 1.5, empowerSeconds: 5, empowerAttack: .25, empowerPierce: .2,
} as const;

export const PANGU_ABILITY: HeroAbility = {
  id: 'skill-h01B', name: 'Khai Thiên Nhất Phủ', kind: 'cleave', cooldown: 0, power: 4.8, provenance: 'original',
  description: 'Đầy 100 Nộ: lấy đà 0,35s và miễn sát thương. Bổ 480% Công vật lý trong bán kính 8,5; chắc chắn chí mạng ×2,2 nếu mục tiêu đang bị phá giáp hoặc dưới 50% HP. Phá 50% Giáp 6s. Để lại khe nứt 14×4,5 trong 5s: chậm 60%, 90% Công chuẩn/giây. Dư chấn gây 150% Công chuẩn lên mọi quái ở làn chính co-op; toàn quân đã triển khai của chủ sở hữu nhận +25% Công và +20% xuyên giáp trong 5s.',
  effect: { target: 'enemy', shape: 'radius', radius: 8.5, status: 'sunder', statusSeconds: 6, statusStrength: .5 },
};
