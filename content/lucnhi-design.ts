import type { HeroAbility } from '../packages/contracts/src/types';

export const LUCNHI = {
  id: 'h03Y', hp: 7800, attack: 820, armor: 22, range: 3.5,
  interval: .7, speed: 5, waveLength: 6, waveWidth: 1.15,
  critChance: .4, critMultiplier: 2, sunderBonus: .35,
  ragePerAttack: 16, strikes: 6, strikePower: .9,
  strikeRadius: 6.5, strikeDuration: 1.5,
  sunder: .5, weakness: .3, weaknessSeconds: 5,
} as const;

export const LUCNHI_ABILITY: HeroAbility = {
  id: 'skill-h03Y', provenance: 'adapted',
  name: 'Lục Nhĩ Thính Thiên & Hỗn Thế Ma Côn',
  description: 'Đầy 100 Nộ: biến mất 1,5 giây; sáu nhát lên mỗi quái trong bán kính 6,5, mỗi nhát gây 90% Công xuyên giáp (tổng 540%). Quái trúng bị phá 50% Giáp và nhận thêm 30% sát thương chí mạng trong 5 giây.',
  kind: 'nova', cooldown: 0, power: LUCNHI.strikes * LUCNHI.strikePower,
  effect: { target: 'enemy', shape: 'radius', radius: LUCNHI.strikeRadius },
};
