import type { HeroAbility } from '../packages/contracts/src/types';

export const KIMTHIEN = {
  id: 'h013', hp: 3400, attack: 740, armor: 16, range: 8,
  interval: 1.1, speed: 3.6, splashRadius: 3.2,
  pureLandBonus: .15, pureLandSeconds: 3,
  rageGift: 5, rageGiftRadius: 5,
  cooldown: 9.5, zoneRadius: 7, zoneSeconds: 5,
  attackPowerPerSecond: 1, pullSpeed: 5,
} as const;

export const KIMTHIEN_ABILITY: HeroAbility = {
  name: 'Tử Kim Bát Vu Thu Yêu Trận',
  description: 'Bình Bát Vàng phủ vùng bán kính 7 trong 5 giây, liên tục hút quái vào tâm; mỗi giây gây 100% Công (tổng 500% Công).',
  kind: 'nova', cooldown: KIMTHIEN.cooldown, power: KIMTHIEN.attackPowerPerSecond * KIMTHIEN.zoneSeconds,
  id: 'skill-h013', provenance: 'adapted',
  effect: { target: 'enemy', shape: 'radius', radius: KIMTHIEN.zoneRadius },
};
