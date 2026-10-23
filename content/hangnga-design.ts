import type { HeroAbility } from '../packages/contracts/src/types';

export const HANGNGA = {
  id: 'h018', hp: 3600, attack: 580, armor: 18, range: 8,
  interval: 1, speed: 4, bounceTargets: 4, bounceRange: 5.5,
  slowStrength: .4, slowSeconds: 2,
  cooldown: 9.5, healPower: 3.4, shieldPower: 3.4,
  allyRadius: 9.5, freezeSeconds: 2,
} as const;

export const HANGNGA_ABILITY: HeroAbility = {
  name: 'Quảng Hàn Cung Nguyệt Hoa Vũ',
  description: 'Hồi 340% Công và tạo Khiên Ánh Trăng 340% Công cho đồng minh cùng chủ trong bán kính 9,5; quái đang bị chậm trong cùng khu vực có tỷ lệ bị đóng băng 2 giây (theo bậc).',
  kind: 'heal', cooldown: HANGNGA.cooldown, power: HANGNGA.healPower,
  id: 'skill-h018', provenance: 'adapted',
  effect: { target: 'allies', shape: 'radius', radius: HANGNGA.allyRadius },
};
