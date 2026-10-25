import type { HeroAbility } from '../packages/contracts/src/types';

export const NUWA = {
  id: 'h01C', hp: 9500, attack: 950, armor: 32, range: 9,
  interval: .95, speed: 4, stones: 3, extraBounces: 1, bounceRadius: 4,
  bounceDamageRatio: 1, slowStrength: .45, slowSeconds: 3,
  supportRadius: 9, attackHeal: 150, attackShield: 300,
  attackShieldSeconds: 3, cooldown: 14, stoneRainPower: 3.8,
  rainSlow: .5, rainSlowSeconds: 3, abilityHealPower: 4, abilityShieldSeconds: 6,
  blessingSeconds: 6, ward: .35, reviveHpRatio: .4,
} as const;

export const NUWA_ABILITY: HeroAbility = {
  id: 'skill-h01C', provenance: 'adapted', name: 'Nữ Oa Bổ Thiên',
  description: 'Hồi chiêu 14 giây: mưa đá Ngũ Sắc gây 380% Công và làm chậm 50% toàn quái trên làn 3 giây. Hồi sinh mọi đồng minh đang chờ hồi sinh tại chỗ Nữ Oa với 40% Máu tối đa; hồi 400% Công cho toàn đội trên sân, máu dư thành khiên 6 giây; toàn đội giảm 35% sát thương gánh chịu trong 6 giây.',
  kind: 'nova', cooldown: NUWA.cooldown, power: NUWA.stoneRainPower,
  effect: { target: 'enemy', shape: 'radius', radius: 99 },
};
