import type { HeroAbility } from '../packages/contracts/src/types';

export const KHUONGTU = {
  id: 'h019', hp: 3500, attack: 750, armor: 16, range: 8.5,
  interval: 1.1, speed: 3.5, chainTargets: 5, chainReach: 6,
  alliedSkillBonus: .15, cooldown: 10, powerPerBolt: 3.8,
  boltCount: 8, zoneRadius: 7, zoneSeconds: 5, stunSeconds: 1.8,
  slowStrength: .6, sunderPercent: .4,
} as const;

export const KHUONGTU_ABILITY: HeroAbility = {
  id: 'skill-h019', provenance: 'adapted',
  name: 'Đả Thần Tiên & Phong Thần Pháp Trận',
  description: 'Hồi chiêu 10 giây: Phong Thần Bảng tồn tại 5 giây trong bán kính 7; tám đạo thần lôi, mỗi tia gây 380% Công và có tỷ lệ choáng 1,8 giây. Quái trong vùng bị giảm 60% tốc chạy, 40% Giáp; Boss có tỷ lệ bị phong ấn kỹ năng (tỷ lệ khống chế theo bậc).',
  kind: 'nova', cooldown: KHUONGTU.cooldown, power: KHUONGTU.powerPerBolt,
  effect: { target: 'enemy', shape: 'radius', radius: KHUONGTU.zoneRadius },
};
