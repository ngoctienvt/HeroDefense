import type { HeroAbility } from '../packages/contracts/src/types';

export const HAUNGHE = {
  id: 'h017', hp: 3100, attack: 840, armor: 15, range: 11,
  interval: .9, speed: 3.8, arrowLength: 12, arrowHalfWidth: .55,
  critChance: .4, critMultiplier: 2, armorPierce: .35,
  normalBurnDps: 180, normalBurnSeconds: 3,
  rageOnAttack: 18, mainPower: 5.5, explosionPower: 2.5,
  blastRadius: 6.5, sunCount: 9, sunderPercent: .5, sunderSeconds: 4,
  burnPowerPerSecond: .6, burnSeconds: 4,
} as const;

export const HAUNGHE_ABILITY: HeroAbility = {
  name: 'Cửu Nhật Liên Châu Trảm',
  description: 'Đầy 100 Nộ: chín mặt trời đánh mục tiêu nhiều máu nhất và vùng bán kính 6,5; mũi tên chính 550% Công chắc chắn chí mạng, nổ 250% Công và đốt 60% Công sát thương chuẩn mỗi giây trong 4 giây.',
  kind: 'nova', cooldown: 0, power: HAUNGHE.mainPower,
  id: 'skill-h017', provenance: 'adapted',
  effect: { target: 'enemy', shape: 'radius', radius: HAUNGHE.blastRadius },
};
