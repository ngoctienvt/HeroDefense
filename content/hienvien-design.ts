import type { HeroAbility } from '../packages/contracts/src/types';

export const HIENVIEN = {
  id: 'h01F', hp: 8200, attack: 1150, armor: 28, range: 9.5,
  interval: .75, speed: 4.2, swords: 5, swordLength: 10,
  swordWidth: .65, swordFanRadians: .09, armorPierce: .35,
  ragePerAttack: 16,
  giantPower: 5, giantCritMultiplier: 2, giantRadius: 8.5,
  rainSwords: 15, rainPower: .3,
  rainSeconds: 5, rainSunder: .5, blessingSeconds: 6,
  blessingCrit: .3, blessingHaste: .3,
} as const;

export const HIENVIEN_ABILITY: HeroAbility = {
  id: 'skill-h01F', provenance: 'adapted', name: 'Hiên Viên Vạn Kiếm Trấn Cửu Châu',
  description: 'Đầy 100 Nộ: cự kiếm gây 500% Công chắc chắn chí mạng ×2 trong bán kính 8,5. Cửu Đỉnh tồn tại 5 giây, bắn 15 thanh kiếm mỗi thanh 30% Công và phá 50% Giáp. Các tướng cùng chủ trên sân nhận +30% chí mạng và +30% tốc đánh trong 6 giây.',
  kind: 'nova', cooldown: 0, power: HIENVIEN.giantPower,
  effect: { target: 'enemy', shape: 'radius', radius: HIENVIEN.giantRadius },
};
