import type { HeroAbility } from '../packages/contracts/src/types';

export const CHUCDUNG = {
  id: 'h01H', hp: 8200, attack: 1150, armor: 27, range: 7.5,
  interval: 1.1, speed: 3.6, splashRadius: 3.5,
  /** Burn per second as a fraction of attack. */
  burnPower: .3, burnSeconds: 3, emberSeconds: 5,
  deathExplosionPower: 1.5, deathExplosionRadius: 3.5,
  cooldown: 10, eruptionPower: 3.6, lavaDpsPower: 1.2,
  lavaSeconds: 5, lavaRadius: 7.5, lavaSlow: .45,
} as const;

export const CHUCDUNG_ABILITY: HeroAbility = {
  id: 'skill-h01H', provenance: 'adapted',
  name: 'Chúc Dung Phần Thiên Hỏa Hải',
  description: 'Hồi chiêu 10 giây: núi lửa nổ 360% Công bán kính 7,5, để lại biển dung nham 5 giây gây 120% Công sát thương chuẩn mỗi giây, làm chậm 45% và tăng gấp đôi sát thương bỏng.',
  kind: 'nova', cooldown: CHUCDUNG.cooldown, power: CHUCDUNG.eruptionPower,
  effect: { target: 'enemy', shape: 'radius', radius: CHUCDUNG.lavaRadius },
};
