import type {
  CraftRecipe,
  DifficultyDef,
  DungeonDef,
  EnergyType,
  FormationDef,
  HeroAbility,
  HeroDef,
  Role,
  SynergyDef,
} from '../packages/contracts/src/types';
import { getHeroCombatProfile } from '../packages/contracts/src/combat-profiles.js';
import catalog from './data/catalog.json';
import { PANGU_ABILITY } from './pangu-design.js';

interface HeroStatsOverride {
  hp?: number;
  attack?: number;
  armor?: number;
  range?: number;
  interval?: number;
  speed?: number;
  role?: Role;
  element?: number;
  block?: number;
  energyType?: EnergyType;
  maxEnergy?: number;
  ability?: HeroAbility | null;
  trait?: { name: string; description: string };
}

/** Authoritative web combat overrides; generated source identities remain intact. */
const HERO_STATS_OVERRIDES: Readonly<Record<string, HeroStatsOverride>> = {
  h01B: {
    hp: 14500, attack: 1150, armor: 36, range: 2.8, interval: .9, speed: 4.4,
    role: 'warrior', element: 1, block: 10, energyType: 'rage_on_attack', maxEnergy: 100,
    ability: PANGU_ABILITY,
    trait: { name: 'Khai Thiên Tổ Thần — Cự Phủ Phá Không', description: 'Hệ Kim; Chiến Binh Hạng Nặng, hệ số Thần 20×. Chém 180° bán kính 3,8 gây 100% Công; xuyên 35% Giáp, 30% chí mạng ×2,2. Mỗi đòn thứ 3 thay bằng Hỗn Độn Chấn xuyên hàng dài 9, gây 180% Công, Chảy Máu +10% sát thương vật lý trong 3s và đẩy lùi 0,6. Đánh thường +14 Nộ, chí mạng tổng +24; bị đánh trúng +5. Tối đa 100 Nộ.' },
  },
  // === TIER 1: LINH (8 TƯỚNG KHỞI ĐẦU) ===
  h001: {
    hp: 220, attack: 56, armor: 3, range: 8.5, interval: 0.80, speed: 3.6, role: 'ranger', element: 1,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Thiên Nhãn Thấu Thị', description: 'Đòn bắn có sẵn 25% Chí Mạng (175% ST), bỏ qua 3 Giáp. Nổ chí mạng gây Phá Giáp (-3 Giáp trong 3.5s).' },
  },
  h002: {
    hp: 220, attack: 46, armor: 3, range: 8.0, interval: 0.90, speed: 3.6, role: 'ranger', element: 2,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Phong Âm Cảm Thính', description: 'Mũi tên sóng âm nảy sang 2 quái (-25% ST/lần nảy), tiêm độc 15 DPS trong 2.5s và giảm 10% tốc chạy.' },
  },
  h003: {
    hp: 660, attack: 50, armor: 6, range: 2.0, interval: 1.00, speed: 4.2, role: 'warrior', element: 4,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Quỷ Liêm Âm Hỏa', description: 'Lưỡi hái quét góc 120 độ (100% mục tiêu chính, 50% quái cạnh). Gây Thiêu Đốt 45% ATK chuẩn trong 3s; quái chết bùng nổ 35 ST.' },
  },
  h004: {
    hp: 700, attack: 48, armor: 7, range: 2.4, interval: 1.00, speed: 4.0, role: 'warrior', element: 1,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Thiên Quân Thương Pháp', description: 'Trường thương đâm xuyên 3.5 đơn vị. 30% Liên Kích; kẻ địch trúng bị Chảy Máu (+10% ST vật lý từ cả đội trong 3s).' },
  },
  h005: {
    hp: 250, attack: 60, armor: 4, range: 7.5, interval: 1.10, speed: 3.5, role: 'ranger', element: 5,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Trọng Tiễn Chấn Địa', description: 'Tên đá nổ lan bán kính 2.0 (40% ST lan). Mỗi 3 phát bắn gây 160% ST, đẩy lùi 0.6 và Choáng 0.6s.' },
  },
  h006: {
    hp: 200, attack: 52, armor: 2, range: 7.0, interval: 1.15, speed: 3.4, role: 'support', element: 2,
    block: 0, energyType: 'cooldown', ability: null,
    trait: { name: 'Linh Hoa Hiệp Kích', description: 'Cầu hoa phát nổ bán kính 2.5 (bỏ qua 30% Giáp). Khi đồng minh tung chiêu hoặc nổ chí mạng, bắn bồi và hồi 20 HP cho đồng minh.' },
  },
  h007: {
    hp: 1500, attack: 34, armor: 13, range: 1.8, interval: 1.20, speed: 3.0, role: 'guardian', element: 3,
    block: 5, energyType: 'cooldown', ability: null,
    trait: { name: 'Huyền Quy Hàn Khí', description: 'Chặn tối đa 5 quái. Vòng hàn khí 2.8 làm chậm 30% tốc chạy và 20% tốc đánh (quái đánh Quy Thừa Tướng cũng bị chậm).' },
  },
  h008: {
    hp: 780, attack: 48, armor: 9, range: 1.8, interval: 0.95, speed: 4.5, role: 'warrior', element: 5,
    block: 3, energyType: 'cooldown', ability: null,
    trait: { name: 'Địa Linh Hộ Thân', description: 'Chặn tối đa 3 quái, độn thổ lướt tới mục tiêu >3.0. Mỗi 4 đòn gây 140% ST bán kính 2.5, làm chậm 35%, tự bọc Thiết Giáp (-25% ST gánh chịu trong 2.5s).' },
  },

  // === TIER 2: HUYỀN (12 TƯỚNG TRUNG CẤP) ===
  h009: {
    hp: 2550, attack: 68, armor: 17, range: 1.8, interval: 1.10, speed: 3.0, role: 'guardian', element: 1,
    block: 6, energyType: 'rage_on_hit', maxEnergy: 100,
    trait: { name: 'Kim Chung Phản Thương', description: 'Chặn 6 quái, chém quét trước mặt, 25% gây phá giáp (-3 Giáp). Bị đánh tích Nộ (+10 khi tự đánh, +7 khi bị quái đánh).' },
    ability: {
      name: 'Kim Chung Phản Kích Trận',
      description: 'Đầy 100 Nộ: Triệu hồi chuông vàng bọc bản thân và 1 đồng minh cận chiến gần nhất trong 5s (Khiên = 220% ATK + 12% Max HP). Phản 50% ST thành ST vật lý diện rộng và gây Chảy Máu.',
      kind: 'shield',
      cooldown: 0,
      power: 2.2,
      id: 'skill-h009',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 4.5, maxTargets: 2, reflect: 0.5, statusSeconds: 5 },
    },
  },
  h00A: {
    hp: 1300, attack: 95, armor: 10, range: 2.2, interval: 0.85, speed: 4.3, role: 'warrior', element: 2,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Ngô Câu Mộc Khí', description: 'Chém quét bán kính 2.2, mỗi đòn hồi 12 HP, 25% chém đúp. Đánh tay +14 Nộ.' },
    ability: {
      name: 'Ngô Câu Mộc Ảnh Vũ',
      description: 'Đầy 100 Nộ: Vào trạng thái Cuồng Vũ trong 5s: +75% Tốc đánh, +20% Hút máu, mỗi đòn đánh phóng 2 kiếm khí dây leo dài 4.5 trói chân 1.5s và gây độc.',
      kind: 'cleave',
      cooldown: 0,
      power: 2.3,
      id: 'skill-h00A',
      provenance: 'adapted',
    },
  },
  h00B: {
    hp: 440, attack: 96, armor: 5, range: 8.5, interval: 0.90, speed: 3.8, role: 'ranger', element: 5,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Ba Tiêu Liệt Phong', description: 'Mỗi lần vung quạt bắn 2 luồng gió vào 2 mục tiêu, đẩy lùi nhẹ 0.25 đơn vị.' },
    ability: {
      name: 'Ba Tiêu Cuồng Phong Toàn',
      description: 'Hồi chiêu 9.5s: Quạt bão cát gây 230% ATK, thổi quái lùi 2.2 đơn vị. Kích nổ quái đang cháy gây thêm 150% ATK lan và lan lửa.',
      kind: 'cleave',
      cooldown: 9.5,
      power: 2.3,
      id: 'skill-h00B',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.5, knockback: 2.2 },
    },
  },
  h00C: {
    hp: 1220, attack: 102, armor: 9, range: 2.6, interval: 0.95, speed: 4.3, role: 'warrior', element: 4,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Hỏa Tiêm Liệt Diễm', description: 'Đâm xuyên 4.0 đơn vị. Đánh quái đang cháy cộng dồn +10% Tốc đánh (tối đa +50%). Đánh tay +15 Nộ.' },
    ability: {
      name: 'Tam Muội Chân Hỏa Liên Kích',
      description: 'Đầy 100 Nộ: Xoay thương quét lửa 360 độ bán kính 4.2 gây 260% ATK. Thiêu Đốt rút 150% ATK chuẩn trong 4s và tan chảy 4 Giáp.',
      kind: 'cleave',
      cooldown: 0,
      power: 2.6,
      id: 'skill-h00C',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.2, status: 'burn', statusSeconds: 4, sunder: 4 },
    },
  },
  h00D: {
    hp: 380, attack: 115, armor: 4, range: 8.0, interval: 1.10, speed: 3.5, role: 'mage', element: 4,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Thuần Dương Phi Kiếm', description: 'Phi kiếm xuyên tối đa 3 quái. Đòn đánh trúng >=2 quái giảm 0.5s hồi chiêu.' },
    ability: {
      name: 'Thuần Dương Thiên Kiếm Trận',
      description: 'Hồi chiêu 9.0s: Cự kiếm rơi xuống cụm quái gây 240% ATK bán kính 4.2. Kiếm trận tồn tại 3s gây 80% ATK/s thiêu đốt.',
      kind: 'nova',
      cooldown: 9.0,
      power: 2.4,
      id: 'skill-h00D',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.2, groundBurnSeconds: 3 },
    },
  },
  h00E: {
    hp: 2700, attack: 72, armor: 18, range: 2.0, interval: 1.20, speed: 3.0, role: 'guardian', element: 1,
    block: 7, energyType: 'rage_on_hit', maxEnergy: 100,
    trait: { name: 'Tuyên Hoa Chấn Địa', description: 'Chặn 7 quái, nện búa nổ lan 2.2 quanh mục tiêu. Tự đánh +12 Nộ, bị đánh +6 Nộ.' },
    ability: {
      name: 'Tuyên Hoa Thiết Bích Trấn',
      description: 'Đầy 100 Nộ: Choáng quái cận chiến 1.2s. Khiên Thiết Bích 200% ATK + 15% Max HP và +8 Giáp cho đồng minh tuyến đầu trong 4.5s.',
      kind: 'shield',
      cooldown: 0,
      power: 2.0,
      id: 'skill-h00E',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 4.5, bonusArmor: 8, status: 'ward', statusSeconds: 4.5, statusStrength: 0.25 },
    },
  },
  h00F: {
    hp: 650, attack: 78, armor: 6, range: 7.5, interval: 1.10, speed: 3.8, role: 'support', element: 2,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Bách Hoa Quang Hoàn', description: 'Đạn hoa nảy 2 quái. Tăng vĩnh viễn +12% Tốc đánh cho 2 đồng minh gần nhất.' },
    ability: {
      name: 'Bách Hoa Hồi Xuân Khúc',
      description: 'Hồi chiêu 10.0s: Hồi 220% ATK cho tối đa 4 đồng minh trong bán kính 8.0, xóa 1 debuff, buff +35% Tốc đánh và +15% Công kích trong 4.5s.',
      kind: 'heal',
      cooldown: 10.0,
      power: 2.2,
      id: 'skill-h00F',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 8.0, maxTargets: 4, status: 'haste', statusSeconds: 4.5, statusStrength: 0.35 },
    },
  },
  h00G: {
    hp: 400, attack: 108, armor: 4, range: 7.5, interval: 1.20, speed: 3.4, role: 'mage', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Thủy Ba Chấn Kích', description: 'Thủy cầu nổ lan 2.5, làm chậm 25% trong 2s.' },
    ability: {
      name: 'Hoàng Hà Thủy Lao',
      description: 'Hồi chiêu 9.5s: Xoáy nước 3.5s bán kính 4.8 hút quái vào tâm, gây 225% ATK và làm chậm sâu 60%.',
      kind: 'nova',
      cooldown: 9.5,
      power: 2.25,
      id: 'skill-h00G',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.8, pull: 3.5, status: 'slow', statusSeconds: 3.5, statusStrength: 0.6 },
    },
  },
  h00H: {
    hp: 430, attack: 106, armor: 5, range: 8.0, interval: 0.85, speed: 3.7, role: 'ranger', element: 5,
    block: 0, energyType: 'rage_on_attack', maxEnergy: 100,
    trait: { name: 'Hắc Bạch Sát Ý', description: '25% Chí Mạng, +30% ST lên quái <50% máu hoặc bị Choáng/Phá Giáp. Đánh thường +15 Nộ, Chí mạng +30 Nộ.' },
    ability: {
      name: 'Hắc Bạch Đoạt Mệnh Xích',
      description: 'Đầy 100 Nộ: Bắn tỉa quái thấp máu gây 380% ATK (100% Chí Mạng nếu bị Phá Giáp hoặc <35% máu). Kết liễu hồi lại 70 Nộ.',
      kind: 'chain',
      cooldown: 0,
      power: 3.8,
      id: 'skill-h00H',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'single' },
    },
  },
  h00I: {
    hp: 420, attack: 92, armor: 5, range: 8.0, interval: 0.95, speed: 3.6, role: 'ranger', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Vong Xuyên Mê Hồn', description: 'Đạn nước nảy 3 quái, giảm 15% Công kích của quái.' },
    ability: {
      name: 'Vong Xuyên Hồn Liên',
      description: 'Hồi chiêu 10.5s: Nối dây 4 quái, gây 190% ATK, chậm 50%. Trong 4s chịu Đồng Mệnh: 30% ST truyền sang 3 con còn lại.',
      kind: 'chain',
      cooldown: 10.5,
      power: 1.9,
      id: 'skill-h00I',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'chain', jumps: 4, jumpRange: 6, status: 'slow', statusSeconds: 4, statusStrength: 0.5 },
    },
  },
  h03O: {
    hp: 630, attack: 82, armor: 6, range: 7.0, interval: 1.10, speed: 3.9, role: 'support', element: 3,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Lan Nhược U Hồn', description: 'Tiếng đàn rút máu, chuyển 35% ST thành máu bơm trực tiếp cho tướng Hộ Vệ tiền tuyến.' },
    ability: {
      name: 'Lan Nhược U Hồn Khúc',
      description: 'Hồi chiêu 9.0s: Hồi 215% ATK cho 3 đồng minh thấp máu nhất trong 7.5. Hồi vượt máu tạo Khiên Băng Giá 5s (kẻ địch đánh vào bị giảm 40% tốc đánh).',
      kind: 'heal',
      cooldown: 9.0,
      power: 2.15,
      id: 'skill-h03O',
      provenance: 'adapted',
      effect: { target: 'allies', shape: 'radius', radius: 7.5, maxTargets: 3, overhealShield: true },
    },
  },
  h03P: {
    hp: 400, attack: 104, armor: 4, range: 7.5, interval: 1.20, speed: 3.4, role: 'mage', element: 2,
    block: 0, energyType: 'cooldown',
    trait: { name: 'Linh Quả Độc Vụ', description: 'Ném quả nổ bán kính 2.2, dính bào tử độc mất 25 DPS trong 3s.' },
    ability: {
      name: 'Thần Mộc Bá Vương Hoa',
      description: 'Hồi chiêu 10.5s: Hạt giống nổ 210% ATK bán kính 4.0, triệu hồi Hoa Ăn Thịt (150% HP) chặn 3 quái và phun sương trừ 4 Giáp mỗi giây.',
      kind: 'nova',
      cooldown: 10.5,
      power: 2.1,
      id: 'skill-h03P',
      provenance: 'adapted',
      effect: { target: 'enemy', shape: 'radius', radius: 4.0 },
    },
  },
};

/** Source identities and relationships; combat numbers are documented web adaptations. */
export const HEROES: HeroDef[] = (catalog.heroes as HeroDef[]).map((hero) => {
  const profile = getHeroCombatProfile(hero.id, hero.role);
  const override = HERO_STATS_OVERRIDES[hero.id];

  const mergedRole = override?.role ?? hero.role;
  const mergedElement = override?.element ?? hero.element;
  const mergedHp = override?.hp ?? hero.hp;
  const mergedAttack = override?.attack ?? hero.attack;
  const mergedArmor = override?.armor ?? hero.armor;
  const mergedRange = override?.range ?? hero.range;
  const mergedInterval = override?.interval ?? hero.interval;
  const mergedSpeed = override?.speed ?? hero.speed;
  const mergedAbility = override !== undefined && 'ability' in override ? override.ability : hero.ability;
  const mergedTrait = override?.trait ?? hero.trait;
  const mergedBlock = override?.block ?? hero.block;
  const mergedEnergyType = override?.energyType ?? hero.energyType ?? (hero.role === 'guardian' ? 'rage_on_hit' : (hero.role === 'warrior' || hero.role === 'ranger') ? 'rage_on_attack' : 'cooldown');
  const mergedMaxEnergy = override?.maxEnergy ?? hero.maxEnergy ?? 100;

  return {
    ...hero,
    role: mergedRole,
    element: mergedElement,
    hp: mergedHp,
    attack: mergedAttack,
    armor: mergedArmor,
    range: mergedRange,
    interval: mergedInterval,
    speed: mergedSpeed,
    ability: mergedAbility,
    trait: mergedTrait,
    block: mergedBlock,
    energyType: mergedEnergyType,
    maxEnergy: mergedMaxEnergy,
    attackGeometry: profile.geometry,
    onHitTrait: profile.trait,
  };
});
export const CRAFT_RECIPES: CraftRecipe[] = catalog.craftRecipes as CraftRecipe[];
export const SYNERGIES: SynergyDef[] = catalog.synergies as SynergyDef[];
export const FORMATIONS: FormationDef[] = catalog.formations as FormationDef[];
export const DIFFICULTIES: DifficultyDef[] = catalog.difficulties as DifficultyDef[];
export const DUNGEONS: DungeonDef[] = catalog.dungeons as DungeonDef[];
export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((hero) => [hero.id, hero]));
export const CONTENT_PROVENANCE = catalog.provenance;
export function cleanText(value: string): string {
  return value.replace(/\|c[\da-f]{8}/gi, '').replace(/\|r/g, '').replace(/\|n/g, '\n').trim();
}
