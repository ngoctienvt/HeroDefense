import type { HeroAbility } from '../packages/contracts/src/types';

export const CONGCONG = {
  id: 'h01G', hp: 14200, attack: 460, armor: 42,
  range: 2.5, interval: 1.2, speed: 3.2, block: 25,
  cleaveRadius: 3.8, auraRadius: 3.8, auraSlow: .45, auraAttackSlow: .25,
  rageOnAttack: 10, rageOnHit: 7,
  wavePower: 3.2, waveRadius: 7.5, knockback: 3,
  /** Presentation only: how long the black-ice floor lingers after the wave (no gameplay freeze). */
  iceVisualSeconds: 2.2,
  shieldAttackPower: 3.5, shieldHpRatio: .25, shieldRadius: 8,
  wardReduction: .4, shieldSeconds: 5,
  /** Tụ lực 0,8 giây do người dùng chốt để chiêu có pha báo trước. */
  windup: .8,
} as const;

export const CONGCONG_ABILITY: HeroAbility = {
  id: 'skill-h01G', provenance: 'adapted',
  name: 'Cộng Công Nộ Xúc Bất Chu Sơn',
  description: 'Đầy 100 Nộ: sóng thần gây 320% Công bán kính 7,5, đẩy lùi 3 đơn vị. Bản thân và đồng minh trong bán kính 8 nhận khiên bằng 350% Công cộng 25% Máu tối đa của từng người, giảm 40% sát thương trong 5 giây.',
  kind: 'shield', cooldown: 0, power: CONGCONG.shieldAttackPower,
  effect: { target: 'allies', shape: 'radius', radius: CONGCONG.shieldRadius,
    status: 'ward', statusSeconds: CONGCONG.shieldSeconds, statusStrength: CONGCONG.wardReduction },
};
