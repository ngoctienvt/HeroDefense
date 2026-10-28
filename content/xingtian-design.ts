import type { HeroAbility } from '../packages/contracts/src/types.js';

/** Web combat design supplied for Hình Thiên; names/ID follow the current catalog. */
export const XINGTIAN = {
  id: 'h011', hp: 9800, attack: 720, armor: 28, range: 2.8, interval: .85,
  speed: 4.5, cleaveRadius: 3.5, burnDps: 150, burnSeconds: 3,
  rageOnAttack: 14, rageOnHit: 6, blastRadius: 6, blastPower: 4.2,
  berserkSeconds: 5, berserkAttackSpeed: .8, minimumBerserkHp: 1,
  attackSpeedPerLostTenth: .12, lifestealPerLostTenth: .08, pullDistance: .5,
  conditionalCritMultiplier: 2, fireWavePower: .5, fireWaveLength: 6, fireWaveHalfWidth: 1,
} as const;

export const XINGTIAN_ABILITY: HeroAbility = {
  id: 'skill-h011', name: 'Hình Thiên Vũ Can Thích', kind: 'cleave', cooldown: 0,
  power: XINGTIAN.blastPower, provenance: 'original',
  description: 'Đầy 100 Nộ: xoay rìu và khiên tạo lốc lửa bán kính 6, gây 420% Công, kéo quái; mục tiêu Choáng/Phá Giáp chịu chí mạng. Sau đó bất tử ở tối thiểu 1 HP, +80% tốc đánh trong 5 giây và phát sóng lửa theo đòn đánh.',
  effect: { target: 'enemy', shape: 'radius', radius: XINGTIAN.blastRadius, pull: XINGTIAN.pullDistance },
};
