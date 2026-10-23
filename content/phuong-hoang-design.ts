import type { HeroAbility } from '../packages/contracts/src/types';

export const PHUONG_HOANG = {
  id: 'h041', hp: 8000, attack: 1260, armor: 26, range: 11.5,
  interval: .8, speed: 4.8, shots: 4, splashRadius: 2.8,
  rageOnAttack: 15, poisonDps: 220, burnDps: 220,
  normalStatusSeconds: 3, rebirthCooldown: 45, eggSeconds: 2,
  eggPower: 4, eggRadius: 5,
  skillPower: 4.2, rainPower: 3, radius: 9,
  rainSeconds: 4, carpetSeconds: 6,
  sunder: .5, carpetBurnPower: .5, healRatioPerSecond: 1,
} as const;

export const PHUONG_HOANG_ABILITY: HeroAbility = {
  id: 'skill-h041', provenance: 'adapted', name: 'Niết Bàn Phần Thiên Vũ',
  description: '100 Nộ: Phượng Hoàng quét toàn làn gây 420% Công; mưa lông vũ 4 giây gây thêm 300% Công trong vùng bán kính 9 và phá 50% Giáp. Thảm lửa tồn tại 6 giây, đốt 50% Công sát thương chuẩn mỗi giây và hồi mỗi giây 100% Công cho đồng minh trong vùng. Nội tại Niết Bàn: khi nhận đòn chí tử hóa trứng bất tử 2 giây rồi tái sinh đầy Máu (hồi 45 giây).',
  kind: 'nova', cooldown: 0, power: PHUONG_HOANG.skillPower,
  effect: { target: 'enemy', shape: 'radius', radius: PHUONG_HOANG.radius },
};
