import type { HeroAbility } from '../packages/contracts/src/types';

export const DOUZHAN = {
  id: 'h012', hp: 9200, attack: 760, armor: 26, range: 3.2,
  interval: .75, speed: 4.8,
  cleaveRadius: 3.8, critChance: .35, critMultiplier: 2.2,
  armorPierce: .30, critFollowUpPower: .8,
  rageOnAttack: 16, rageOnCrit: 28,
  staffLength: 14, staffWidth: 4.5, staffPower: 4.6,
  sunderPercent: .4, sunderSeconds: 3,
  cloneCount: 3, cloneSeconds: 7, cloneAttackRatio: .5,
} as const;

export const DOUZHAN_ABILITY: HeroAbility = {
  name: 'Pháp Thiên Tượng Địa & Vạn Phật Triều Tông',
  description: 'Đầy 100 Nộ: Thiết Bổng đập làn dài 14, rộng 4,5 gây 460% Công và phá 40% Giáp trong 3 giây; triệu hồi ba Kim Thân Hầu Vương trong 7 giây.',
  kind: 'cleave', cooldown: 0, power: DOUZHAN.staffPower,
  id: 'skill-h012', provenance: 'adapted',
  effect: { target: 'enemy', shape: 'line', length: DOUZHAN.staffLength, width: DOUZHAN.staffWidth },
};
