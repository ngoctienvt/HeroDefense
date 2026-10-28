import type { HeroAbility } from '../packages/contracts/src/types.js';

/** Web adaptations from the supplied brief. IDs reuse retired catalog slots. */
export const NHIEN_DANG = { id: 'h03W', hp: 11800, attack: 490, armor: 36,
  range: 2.5, interval: 1.15, speed: 3.1, radius: 7,
  auraRadius: 4, auraDps: .9, weak: .3, shieldPower: 3.4, shieldHp: .24,
  duration: 5.5, slow: .55, reflect: .8, burnDps: 180,
  cooldown: 10, windup: .45 } as const;
export const BO_DE = { id: 'h03X', hp: 4000, attack: 600, armor: 20,
  range: 8, interval: 1, speed: 3.8, chain: 4, radius: 10,
  healRatio: .02, healPower: 2, buffSeconds: 5, attackBonus: .4,
  cooldown: 10, windup: .35 } as const;
export const DE_TUAN = { id: 'h01I', hp: 12800, attack: 1180, armor: 35,
  range: 3.5, interval: .8, speed: 4.5,
  /** Single-target duelist: one heavy strike per attack. */
  strikePower: 1.3, auraRadius: 4.5, auraDps: 1,
  auraSunder: .4, skillRadius: 8.5, skillPower: 5.2, skillSplashPower: 2, skillPierce: .6,
  berserkSeconds: 6.5, critMultiplier: 2.2, bossBonus: .25,
  cooldown: 10, windup: .5 } as const;
export const NHU_LAI = { id: 'h01J', hp: 19500, attack: 920, armor: 52,
  range: 3.5, interval: 1.1, speed: 3.2,
  splashRadius: 4, weak: .3, auraReduction: .2,
  skillRadius: 9.5, skillPower: 4.8, stunSeconds: 3,
  zoneSeconds: 5, zoneSlow: .7, zoneSunder: .4,
  shieldPower: 4, shieldHp: .3, shieldSeconds: 6,
  cooldown: 10, windup: .65 } as const;
export const NGUYEN_THUY = { id: 'h014', hp: 9400, attack: 1120, armor: 33,
  range: 9, interval: .95, speed: 3.8,
  lineLength: 10, normalSunder: .35, vulnerableTrue: .2,
  skillRadius: 11, skillPower: 5,
  invulnerableSeconds: 2, buffSeconds: 6, armorPierce: .4,
  cooldown: 10.5, windup: .5 } as const;

export const NHIEN_DANG_ABILITY: HeroAbility = { id: 'skill-h03W', provenance: 'adapted',
  name: 'Nhiên Đăng Vạn Cổ Tịch Diệt Trận', kind: 'shield', cooldown: NHIEN_DANG.cooldown, power: NHIEN_DANG.shieldPower,
  description: 'Khiên 340% Công + 24% Máu tối đa của người nhận trong bán kính 7. Trong 5,5 giây, 24 Định Hải Thần Châu tạo trận lửa trắng làm chậm 55%, đốt cháy và phản 80% sát thương đánh trúng khiên thành sát thương chuẩn.',
  effect: { target: 'allies', shape: 'radius', radius: NHIEN_DANG.radius } };
export const BO_DE_ABILITY: HeroAbility = { id: 'skill-h03X', provenance: 'adapted',
  name: 'Đại Phẩm Thiên Tiên Quyết', kind: 'heal', cooldown: BO_DE.cooldown, power: BO_DE.healPower,
  description: 'Hồi 200% Công cho đồng minh trong bán kính 10. Hai đồng minh Công cao nhất được nạp đầy Nộ hoặc xóa hồi chiêu, tăng 40% Công và đánh thường hai lần trong 5 giây.',
  effect: { target: 'allies', shape: 'radius', radius: BO_DE.radius } };
export const DE_TUAN_ABILITY: HeroAbility = { id: 'skill-h01I', provenance: 'adapted',
  name: 'Đế Tuấn Thập Nhật Đồng Thăng', kind: 'nova', cooldown: DE_TUAN.cooldown, power: DE_TUAN.skillPower,
  description: 'Mười Kim Ô hợp kiếm vào quái nhiều Máu nhất trong bán kính 8,5, gây 520% Công xuyên 60% Giáp; quái khác trong vùng chịu 200% Công. Bản thân hóa thần 6,5 giây: đánh nhanh gấp đôi, chắc chắn chí mạng ×2,2 và gây thêm 25% sát thương lên Boss.',
  effect: { target: 'enemy', shape: 'radius', radius: DE_TUAN.skillRadius } };
export const NHU_LAI_ABILITY: HeroAbility = { id: 'skill-h01J', provenance: 'adapted',
  name: 'Như Lai Thần Chưởng: Ngũ Chỉ Sơn Trấn Áp', kind: 'nova', cooldown: NHU_LAI.cooldown, power: NHU_LAI.skillPower,
  description: 'Bàn tay Phật gây 480% Công trong bán kính 9,5, có tỷ lệ choáng 3 giây (theo bậc); Ngũ Chỉ Sơn giữ 5 giây, làm chậm 70%, phá 40% Giáp. Cả đội nhận khiên 400% Công + 30% Máu tối đa trong 6 giây.',
  effect: { target: 'enemy', shape: 'radius', radius: NHU_LAI.skillRadius } };
export const NGUYEN_THUY_ABILITY: HeroAbility = { id: 'skill-h014', provenance: 'adapted',
  name: 'Bàn Cổ Phướng: Phá Toái Hư Không', kind: 'nova', cooldown: NGUYEN_THUY.cooldown, power: NGUYEN_THUY.skillPower,
  description: 'Ba luồng kiếm khí Hỗn Độn gây tổng 500% Công sát thương chuẩn toàn làn, xóa khiên và giáp cộng thêm của Boss. Đồng minh cùng chủ miễn sát thương 2 giây và xuyên 40% Giáp trong 6 giây.',
  effect: { target: 'enemy', shape: 'radius', radius: NGUYEN_THUY.skillRadius } };
