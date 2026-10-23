import type { HeroAbility } from '../packages/contracts/src/types';

export const FUXI = {
  id: 'h01D', hp: 9200, attack: 1060, armor: 31, range: 8.5,
  interval: .95, speed: 3.8, chainTargets: 6, bounceRadius: 4,
  normalLinkShare: .35, normalLinkSeconds: 4,
  cooldown: 10, radius: 9.5, duration: 6, power: 4.4,
  slowStrength: .6, sunderStrength: .45,
  skillLinkShare: .6, pullSpeed: 5,
} as const;

export const FUXI_ABILITY: HeroAbility = {
  id: 'skill-h01D', provenance: 'adapted', name: 'Tiên Thiên Bát Quái Càn Khôn Trận',
  description: 'Hồi chiêu 10 giây: dựng Bát Quái bán kính 9,5 trong 6 giây; gây 440% Công, gom quái vào tâm, chậm 60%, phá 45% Giáp và liên kết Nhân Quả chia sẻ 60% sát thương giữa mọi quái trong trận.',
  kind: 'nova', cooldown: FUXI.cooldown, power: FUXI.power,
  effect: { target: 'enemy', shape: 'radius', radius: FUXI.radius },
};
