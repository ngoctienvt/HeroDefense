import type { HeroAbility } from '../packages/contracts/src/types';

export const SHENNONG = {
  id: 'h01E', hp: 8800, attack: 1080, armor: 30, range: 8,
  interval: 1, speed: 3.6, splashRadius: 3.5,
  normalPoisonPower: .35, normalPoisonSeconds: 3,
  normalHeal: 180, normalHealRadius: 3.5,
  cooldown: 10.5, eruptionPower: 4.2, eruptionTruePower: 1.5,
  zoneRadius: 8.5, zoneSeconds: 5.5,
  zoneDpsPower: .6, weakness: .5, trees: 3,
  treeHp: 6000, treeBlock: 8, healPowerPerSecond: 1.5,
} as const;

export const SHENNONG_ABILITY: HeroAbility = {
  id: 'skill-h01E', provenance: 'adapted', name: 'Thần Nông Bách Thảo Luyện Thiên Đỉnh',
  description: 'Hồi chiêu 10,5 giây: Dược Đỉnh nổ bán kính 8,5 gây 420% Công cộng 150% Công sát thương chuẩn. Sương độc tồn tại 5,5 giây, gây 60% Công sát thương chuẩn mỗi giây và giảm 50% Công/tốc đánh. Ba Cổ Thụ 6.000 HP chặn 8 quái mỗi cây; cả đội cùng khu vực hồi 150% Công mỗi giây.',
  kind: 'nova', cooldown: SHENNONG.cooldown, power: SHENNONG.eruptionPower,
  effect: { target: 'enemy', shape: 'radius', radius: SHENNONG.zoneRadius },
};
