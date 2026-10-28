import type { HeroAbility } from '../packages/contracts/src/types';

export const KIMSI = {
  id: 'h016', hp: 8400, attack: 790, armor: 24, range: 3,
  interval: .65, speed: 5.2,
  cleaveRadius: 3.5, doubleChance: .35,
  armorCutPerStrike: 4, armorCutLimit: 28,
  bleedDps: 150, bleedSeconds: 3, ragePerStrike: 12,
  stormPower: 4, stormRadius: 6.5, berserkSeconds: 5.5,
  berserkAttackSpeed: 1, berserkCritChance: .35, critMultiplier: 2,
} as const;

export const KIMSI_ABILITY: HeroAbility = {
  id: 'skill-h016', provenance: 'adapted',
  name: 'Đại Bằng Kim Dực Trảm Thiên',
  description: 'Đầy 100 Nộ: bão lông vũ vàng gây 400% Công xuyên giáp và chảy máu trong bán kính 6,5. Sau khi đáp xuống, tăng 100% tốc đánh và 35% chí mạng trong 5,5 giây.',
  kind: 'nova', cooldown: 0, power: KIMSI.stormPower,
  effect: { target: 'enemy', shape: 'radius', radius: KIMSI.stormRadius },
};
