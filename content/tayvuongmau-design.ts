import type { HeroAbility } from '../packages/contracts/src/types';

export const TAYVUONGMAU = {
  id: 'h01A', hp: 3800, attack: 730, armor: 18, range: 9,
  interval: .8, speed: 3.8, pins: 5, normalSunder: .2,
  normalSunderSeconds: 3, ragePerAttack: 16,
  rainPower: 4.1, rainRadius: 7, rainSunder: .5,
  rainSunderSeconds: 5, peachCount: 3, peachHealRatio: .3,
  peachAttackBonus: .35, peachHaste: .3, peachSeconds: 5,
} as const;

export const TAYVUONGMAU_ABILITY: HeroAbility = {
  id: 'skill-h01A', provenance: 'adapted',
  name: 'Côn Lôn Vạn Kim Vũ & Bàn Đào Yến',
  description: 'Đầy 100 Nộ: mưa trâm vàng gây 410% Công và phá 50% Giáp trong 5 giây, bán kính 7. Ba đồng minh có Công cao nhất trong vùng được hồi 30% Máu tối đa, tăng 35% Công và 30% tốc đánh trong 5 giây.',
  kind: 'nova', cooldown: 0, power: TAYVUONGMAU.rainPower,
  effect: { target: 'enemy', shape: 'radius', radius: TAYVUONGMAU.rainRadius },
};
