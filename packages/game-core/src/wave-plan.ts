import type { EnemyKitId, EnemyRank, EnemySkillState, EnemySkillTemplate } from '../../contracts/src/types.js';
import {
  bossAttack,
  bossHp,
  chieftainAttack,
  chieftainHp,
  eliteAttack,
  eliteHp,
  minionAttack,
  minionHp,
} from './balance-curve.js';
import { archetypeById, type EnemyArchetype } from './enemy-archetypes.js';

export interface WaveSpawnGroup {
  archetypeId: string;
  count: number;
  phase: 'opening' | 'chieftain' | 'surge';
}

export interface WavePlan {
  wave: number;
  act: 1 | 2 | 3 | 4;
  name: string;
  duration: number;
  rowSize: number;
  rowInterval: number;
  spawns: readonly WaveSpawnGroup[];
  /** Shared center-road boss archetype IDs (Waves 5, 10, 15, 20). */
  bosses?: readonly string[];
  /** Lane spawn index (~30% of lane budget) at which shared bosses enter the center road. */
  bossSpawnIndex?: number;
}

export interface ResolvedWaveSpawn {
  archetypeId: string;
  name: string;
  monsterId?: EnemyArchetype['monsterId'];
  skinHeroId?: string;
  rank: EnemyRank;
  kind: EnemyArchetype['kind'];
  hp: number;
  attack: number;
  armor: number;
  speed: number;
  interval: number;
  range: number;
  leak: number;
  lifestealOnHit?: number;
  kit?: EnemyKitId;
  skillTemplate?: EnemySkillTemplate;
  skills?: EnemySkillState[];
}

const TEMPLATE_COOLDOWNS: Record<EnemySkillTemplate, { initial: number; max: number }> = {
  A: { initial: 3.5, max: 8.0 },
  'A+': { initial: 3.5, max: 7.5 },
  B: { initial: 3.0, max: 7.0 },
  C: { initial: 3.5, max: 8.5 },
  'C+': { initial: 3.5, max: 8.0 },
  D: { initial: 4.0, max: 9.0 },
};

const BOSS_KIT_SKILLS: Record<EnemyKitId, readonly { id: string; initial: number; max: number }[]> = {
  'hac-phong': [
    { id: 'boss-stone-shield', initial: 6.0, max: 10.0 },
    { id: 'boss-earthquake', initial: 8.0, max: 12.0 },
  ],
  'nguu-ma': [
    { id: 'boss-bull-charge', initial: 5.0, max: 9.0 },
    { id: 'boss-earth-splitter', initial: 8.0, max: 11.0 },
  ],
  'thiet-phien': [
    { id: 'boss-fan-gale', initial: 5.5, max: 9.5 },
    { id: 'boss-fire-tempest', initial: 8.5, max: 12.0 },
  ],
  'hinh-thien': [
    { id: 'boss-axe-cleave', initial: 4.5, max: 8.0 },
    { id: 'boss-shield-bash', initial: 7.0, max: 10.0 },
    { id: 'boss-defiant-roar', initial: 9.5, max: 13.0 },
  ],
  'chuc-dung': [
    { id: 'boss-meteor-cataclysm', initial: 6.0, max: 10.5 },
    { id: 'boss-blazing-spear', initial: 4.5, max: 8.0 },
  ],
  'cong-cong': [
    { id: 'boss-abyssal-deluge', initial: 5.5, max: 9.5 },
    { id: 'boss-monolith-ram', initial: 8.0, max: 11.5 },
  ],
};

export function createInitialEnemySkills(archetype: EnemyArchetype): EnemySkillState[] | undefined {
  if (archetype.kit) {
    return BOSS_KIT_SKILLS[archetype.kit].map(entry => ({
      id: entry.id,
      cooldown: entry.initial,
      maxCooldown: entry.max,
    }));
  }
  if (archetype.skillTemplate) {
    const timing = TEMPLATE_COOLDOWNS[archetype.skillTemplate];
    return [
      {
        id: `template-${archetype.skillTemplate}`,
        cooldown: timing.initial,
        maxCooldown: timing.max,
      },
    ];
  }
  return undefined;
}

export function resolveEnemySpawn(
  wave: number,
  archetypeId: string,
  playerCount = 1,
  isTwinBoss = false,
): ResolvedWaveSpawn {
  const arch = archetypeById(archetypeId);
  const hpMult = arch.hpMultiplier ?? 1;
  const atkMult = arch.attackMultiplier ?? 1;
  let hp: number;
  let attack: number;
  if (arch.rank === 'boss') {
    hp = Math.round(bossHp(wave, arch.armor, playerCount, isTwinBoss) * hpMult);
    attack = Math.round(bossAttack(wave, arch.interval) * atkMult);
  } else if (arch.rank === 'chieftain') {
    hp = Math.round(chieftainHp(wave, arch.armor) * hpMult);
    attack = Math.round(chieftainAttack(wave, arch.interval) * atkMult);
  } else if (arch.rank === 'elite') {
    hp = eliteHp(wave, arch.armor, arch.hpMultiplier ?? 1.85);
    attack = eliteAttack(wave, arch.interval, arch.attackMultiplier ?? 1.25);
  } else {
    hp = Math.round(minionHp(wave, arch.armor) * hpMult);
    attack = Math.round(minionAttack(wave, arch.interval) * atkMult);
  }
  return {
    archetypeId: arch.id,
    name: arch.name,
    monsterId: arch.monsterId,
    skinHeroId: arch.skinHeroId,
    rank: arch.rank,
    kind: arch.kind,
    hp: Math.max(1, hp),
    attack: Math.max(1, attack),
    armor: arch.armor,
    speed: arch.speed,
    interval: arch.interval,
    range: arch.range,
    leak: arch.leak,
    lifestealOnHit: arch.lifestealOnHit,
    kit: arch.kit,
    skillTemplate: arch.skillTemplate,
    skills: createInitialEnemySkills(arch),
  };
}

export const WAVE_PLANS: readonly WavePlan[] = [
  // ================= ACT I: YÊU KHÍ KHỞI ĐẦU (Waves 1–5) =================
  {
    wave: 1,
    act: 1,
    name: 'Hồi I · Thanh Lang Xuất Động',
    duration: 55,
    rowSize: 5,
    rowInterval: 0.95,
    spawns: [
      { archetypeId: 'm001', count: 10, phase: 'opening' },
      { archetypeId: 'm001', count: 10, phase: 'surge' },
    ],
  },
  {
    wave: 2,
    act: 1,
    name: 'Hồi I · Huyết Xà Tẩm Độc',
    duration: 55,
    rowSize: 5,
    rowInterval: 0.9,
    spawns: [
      { archetypeId: 'm001', count: 6, phase: 'opening' },
      { archetypeId: 'm002', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w2-h001', count: 1, phase: 'chieftain' },
      { archetypeId: 'm001', count: 8, phase: 'surge' },
      { archetypeId: 'm002', count: 4, phase: 'surge' },
    ],
  },
  {
    wave: 3,
    act: 1,
    name: 'Hồi I · Thạch Giáp Phá Trận',
    duration: 58,
    rowSize: 5,
    rowInterval: 0.9,
    spawns: [
      { archetypeId: 'm001', count: 6, phase: 'opening' },
      { archetypeId: 'm003', count: 2, phase: 'opening' },
      { archetypeId: 'chief-w3-h007', count: 1, phase: 'chieftain' },
      { archetypeId: 'm001', count: 8, phase: 'surge' },
      { archetypeId: 'm003', count: 3, phase: 'surge' },
      { archetypeId: 'm002', count: 4, phase: 'surge' },
    ],
  },
  {
    wave: 4,
    act: 1,
    name: 'Hồi I · Cốt Ma Dạ Tập',
    duration: 60,
    rowSize: 5,
    rowInterval: 0.9,
    spawns: [
      { archetypeId: 'm001', count: 6, phase: 'opening' },
      { archetypeId: 'm004', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w4-h008', count: 1, phase: 'chieftain' },
      { archetypeId: 'm004', count: 4, phase: 'surge' },
      { archetypeId: 'm003', count: 2, phase: 'surge' },
      { archetypeId: 'm002', count: 6, phase: 'surge' },
    ],
  },
  {
    wave: 5,
    act: 1,
    name: 'Đại Yêu Đợt 5 · Hắc Phong Hùng Vương',
    duration: 80,
    rowSize: 5,
    rowInterval: 0.9,
    bosses: ['b001'],
    bossSpawnIndex: 6,
    spawns: [
      { archetypeId: 'm001', count: 6, phase: 'opening' },
      { archetypeId: 'm003', count: 2, phase: 'opening' },
      { archetypeId: 'm004', count: 4, phase: 'surge' },
      { archetypeId: 'm002', count: 4, phase: 'surge' },
      { archetypeId: 'm001', count: 4, phase: 'surge' },
    ],
  },

  // ================= ACT II: HUYỀN TIÊN TÀ HÓA (Waves 6–10) =================
  {
    wave: 6,
    act: 2,
    name: 'Hồi II · Ma Liên Xung Trận',
    duration: 60,
    rowSize: 5,
    rowInterval: 0.9,
    spawns: [
      { archetypeId: 'minion-h006', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h002', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w6-h00C', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00A', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h006', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h003', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 7,
    act: 2,
    name: 'Hồi II · Cuồng Chùy Chấn Địa',
    duration: 60,
    rowSize: 5,
    rowInterval: 0.9,
    spawns: [
      { archetypeId: 'minion-h006', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h004', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w7-h00E', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00D', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h006', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h005', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 8,
    act: 2,
    name: 'Hồi II · Kim Chung Ma Hóa',
    duration: 62,
    rowSize: 5,
    rowInterval: 0.88,
    spawns: [
      { archetypeId: 'minion-h006', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00F', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w8-h009', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00A', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h002', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h005', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 9,
    act: 2,
    name: 'Hồi II · Huyết Vũ Đoạt Mệnh',
    duration: 62,
    rowSize: 5,
    rowInterval: 0.88,
    spawns: [
      { archetypeId: 'minion-h006', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00G', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w9-h00H', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00G', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h003', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h004', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 10,
    act: 2,
    name: 'Song Yêu Đợt 10 · Ngưu Ma Vương & Thiết Phiến Công Chúa',
    duration: 85,
    rowSize: 5,
    rowInterval: 0.9,
    bosses: ['boss-nguu-ma', 'boss-thiet-phien'],
    bossSpawnIndex: 6,
    spawns: [
      { archetypeId: 'minion-h006', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00A', count: 2, phase: 'opening' },
      { archetypeId: 'elite-h00D', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h003', count: 5, phase: 'surge' },
      { archetypeId: 'minion-h006', count: 4, phase: 'surge' },
    ],
  },

  // ================= ACT III: CHÂN TIÊN NHẬP MA (Waves 11–15) =================
  {
    wave: 11,
    act: 3,
    name: 'Hồi III · Liệt Hỏa Phần Thiên',
    duration: 62,
    rowSize: 5,
    rowInterval: 0.88,
    spawns: [
      { archetypeId: 'minion-h00L', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h00I', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w11-h00N', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h03R', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00M', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h03O', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 12,
    act: 3,
    name: 'Hồi III · Hắc Lôi Giáng Thế',
    duration: 62,
    rowSize: 5,
    rowInterval: 0.88,
    spawns: [
      { archetypeId: 'minion-h03P', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h03O', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w12-h00O', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h03Q', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00L', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00I', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 13,
    act: 3,
    name: 'Hồi III · Thiết Giáp Huyết Chiến',
    duration: 64,
    rowSize: 5,
    rowInterval: 0.86,
    spawns: [
      { archetypeId: 'minion-h00M', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h03Q', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w13-h03S', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h03R', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h03P', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h03O', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 14,
    act: 3,
    name: 'Hồi III · Hàng Ma Chử Luyện Ngục',
    duration: 64,
    rowSize: 5,
    rowInterval: 0.86,
    spawns: [
      { archetypeId: 'minion-h00L', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h03R', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w14-h00Q', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h03Q', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00M', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00I', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 15,
    act: 3,
    name: 'Chiến Thần Đợt 15 · Hình Thiên Bất Khuất',
    duration: 90,
    rowSize: 5,
    rowInterval: 0.88,
    bosses: ['boss-hinh-thien'],
    bossSpawnIndex: 6,
    spawns: [
      { archetypeId: 'minion-h00L', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h03Q', count: 2, phase: 'opening' },
      { archetypeId: 'elite-h03R', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00M', count: 5, phase: 'surge' },
      { archetypeId: 'minion-h03O', count: 4, phase: 'surge' },
    ],
  },

  // ================= ACT IV: THƯỢNG CỔ MA THẦN (Waves 16–20) =================
  {
    wave: 16,
    act: 4,
    name: 'Hồi IV · Ma Nhãn Tam Tiêm Đao',
    duration: 65,
    rowSize: 5,
    rowInterval: 0.85,
    spawns: [
      { archetypeId: 'minion-h03T', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h00S', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w16-h00T', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00W', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00R', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00V', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 17,
    act: 4,
    name: 'Hồi IV · Bạch Viên Phệ Thiên',
    duration: 65,
    rowSize: 5,
    rowInterval: 0.85,
    spawns: [
      { archetypeId: 'minion-h00R', count: 6, phase: 'opening' },
      { archetypeId: 'minion-h00V', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w17-h00U', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00X', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h03T', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00S', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 18,
    act: 4,
    name: 'Hồi IV · Hắc Liên Ngũ Sắc Quang',
    duration: 65,
    rowSize: 5,
    rowInterval: 0.85,
    spawns: [
      { archetypeId: 'minion-h03T', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00W', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w18-h00Z', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00X', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00R', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00S', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 19,
    act: 4,
    name: 'Hồi IV · Lục Hồn Kiếm Trận',
    duration: 65,
    rowSize: 5,
    rowInterval: 0.85,
    spawns: [
      { archetypeId: 'minion-h00R', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00X', count: 3, phase: 'opening' },
      { archetypeId: 'chief-w19-h03V', count: 1, phase: 'chieftain' },
      { archetypeId: 'elite-h00W', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h03T', count: 6, phase: 'surge' },
      { archetypeId: 'minion-h00V', count: 5, phase: 'surge' },
    ],
  },
  {
    wave: 20,
    act: 4,
    name: 'Thượng Cổ Kiếp Đợt 20 · Chúc Dung & Cộng Công',
    duration: 95,
    rowSize: 5,
    rowInterval: 0.88,
    bosses: ['boss-chuc-dung', 'boss-cong-cong'],
    bossSpawnIndex: 6,
    spawns: [
      { archetypeId: 'minion-h03T', count: 6, phase: 'opening' },
      { archetypeId: 'elite-h00W', count: 2, phase: 'opening' },
      { archetypeId: 'elite-h00X', count: 3, phase: 'surge' },
      { archetypeId: 'minion-h00R', count: 5, phase: 'surge' },
      { archetypeId: 'minion-h00V', count: 4, phase: 'surge' },
    ],
  },
];

export function wavePlanFor(wave: number): WavePlan {
  const index = Math.max(0, Math.min(WAVE_PLANS.length - 1, Math.floor((wave || 1) - 1)));
  return WAVE_PLANS[index];
}

export function waveLaneBudget(plan: WavePlan): number {
  return plan.spawns.reduce((sum, group) => sum + group.count, 0);
}

export function waveSpawnAt(plan: WavePlan, index: number, playerCount = 1): ResolvedWaveSpawn | undefined {
  let cursor = index;
  for (const group of plan.spawns) {
    if (cursor < group.count) {
      return resolveEnemySpawn(plan.wave, group.archetypeId, playerCount, false);
    }
    cursor -= group.count;
  }
  return undefined;
}
