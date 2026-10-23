import type { HeroAbility } from '../packages/contracts/src/types';

export const CHUCLONG = {
  id: 'h01K', hp: 8600, attack: 1280, armor: 27, range: 8.5,
  interval: 1.05, speed: 4, breathLength: 10, breathWidth: 1.4,
  breathBurnDps: 350, breathBurnSeconds: 3, breathSunder: .3,
  breathSunderSeconds: 3, cooldown: 11, winterPower: 2.3,
  winterFreezeSeconds: 2.5, summerPower: 3.5, phaseDelay: 1.5,
  zoneRadius: 12, summerBurnPower: 1.6, summerBurnSeconds: 4,
  cooldownGift: 3,
} as const;

export const CHUCLONG_ABILITY: HeroAbility = {
  id: 'skill-h01K', provenance: 'adapted', name: 'Chúc Long Khai Mục: Nhật Nguyệt Đảo Nghịch',
  description: 'Hồi chiêu 11 giây: Vĩnh Dạ gây 230% Công và đóng băng/choáng toàn làn 2,5 giây (tỷ lệ khống chế theo bậc). Sau 1,5 giây, Liệt Nhật gây thêm 350% Công sát thương chuẩn và đốt thêm 160% Công sát thương chuẩn trong 4 giây. Đồng minh cùng làn được giảm ngay 3 giây hồi chiêu.',
  kind: 'nova', cooldown: CHUCLONG.cooldown, power: CHUCLONG.winterPower,
  effect: { target: 'enemy', shape: 'radius', radius: CHUCLONG.zoneRadius,
    status: 'stun', statusSeconds: CHUCLONG.winterFreezeSeconds, statusStrength: 1 },
};
