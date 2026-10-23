import type {
  AttackGeometryConfig,
  AttackGeometryType,
  OnHitTraitConfig,
  OnHitTraitType,
  Role,
} from './types.js';

export const ATTACK_GEOMETRY_NAMES: Record<AttackGeometryType, string> = {
  single: 'Đơn Mục Tiêu',
  frontal_cleave: 'Chém Quét Hình Quạt',
  linear_pierce: 'Đâm / Bắn Xuyên Thấu',
  multishot: 'Bắn Đa Tia Hình Nón',
  impact_splash: 'Nổ Chấn Động Quanh Mục Tiêu',
  bounce: 'Bắn Nảy Dây Chuyền',
  boomerang: 'Vũ Khí Bay Khứ Hồi',
};

export const ATTACK_GEOMETRY_DESCRIPTIONS: Record<AttackGeometryType, string> = {
  single: 'Tập trung 100% sát thương vào 1 mục tiêu duy nhất. Tốc đánh nhanh hoặc sát thương gốc cực cao (Chuyên săn Boss / Tướng bậc thấp).',
  frontal_cleave: 'Chỉ dành cho tướng cận chiến đánh tay: vung vũ khí quét hình quạt phía trước (bán kính 2.2 - 3.8). Mục tiêu chính nhận 100%, quái bên cạnh nhận 60% (bậc Linh/Huyền 50%).',
  linear_pierce: 'Mũi thương hoặc mũi tên bay thẳng một đường dài (6.0 - 12.0 đơn vị), xuyên qua tất cả quái xếp hàng dọc trên đường bay (Thương, Đại Cung).',
  multishot: 'Mỗi lần ra đòn bắn đồng thời 2 đến 7 tia đạn vào các mục tiêu khác nhau trong tầm bắn. Mỗi tia đều tính hiệu ứng đòn đánh riêng (Cung, Ám khí).',
  impact_splash: 'Nổ tròn quanh mục tiêu chính. Hiện không tướng nào dùng cho đòn đánh thường; nổ lan chỉ còn trong kỹ năng.',
  bounce: 'Đòn đánh thường sau khi trúng mục tiêu đầu tiên sẽ tự nảy sang 1 - 3 mục tiêu lân cận (sát thương giảm dần 20% mỗi lần nảy).',
  boomerang: 'Phóng pháp bảo bay xuyên qua bầy quái tới điểm đích rồi bay ngược về tay tướng, cắt sát thương 2 lần (lượt đi và lượt về).',
};

export const ON_HIT_TRAIT_NAMES: Record<OnHitTraitType, string> = {
  crit_pierce: 'Bạo Kích & Xuyên Giáp',
  nth_strike: 'Đòn Đánh Thứ N',
  double_strike: 'Liên Kích',
  stacking_mark: 'Cộng Dồn Ấn Ký',
  orbit_aura: 'Hào Quang Quanh Thân',
  follow_up: 'Hiệp Kích',
  berserk: 'Cuồng Chiến',
  pure_land: 'Tịnh Độ',
  moon_bounce: 'Nguyệt Luân Nảy',
  poison: 'Độc',
  soul_link: 'Nhân Quả Liên Kết',
};

export const ON_HIT_TRAIT_DESCRIPTIONS: Record<OnHitTraitType, string> = {
  crit_pierce: 'Có tỷ lệ nổ Chí Mạng (150% - 250% sát thương) hoặc bỏ qua một lượng Giáp cố định/ % Giáp của địch.',
  nth_strike: 'Cứ mỗi 3 hoặc 4 đòn đánh thường thì đòn tiếp theo được cường hóa mạnh (nổ sát thương chuẩn, làm choáng nhẹ, hoặc bắn chùm).',
  double_strike: 'Có 20% - 40% xác suất vung tay đánh bồi thêm 1-2 đòn ngay lập tức mà không tốn thời gian hồi đòn.',
  stacking_mark: 'Càng bắn vào cùng 1 mục tiêu (như Boss) càng tăng sát thương hoặc tích đủ 5 cộng dồn thì kích nổ gấp 4 lần sát thương đòn gốc.',
  orbit_aura: 'Có vòng lửa/kiếm khí/hàn băng xoay quanh người tướng liên tục, tự động gây sát thương hoặc làm chậm mọi quái áp sát mỗi 0.5s.',
  follow_up: 'Khi đồng minh đứng cạnh tung Kỹ năng hoặc nổ Chí Mạng, tướng này tự động bắn bồi thêm 1 đòn đánh thường miễn phí vào mục tiêu đó.',
  berserk: 'Sức mạnh và nhịp đánh tăng khi mất máu; kỹ năng kích hoạt trạng thái cuồng chiến.',
  pure_land: 'Mục tiêu chịu thêm sát thương khi đứng trong vùng Tịnh Độ.',
  moon_bounce: 'Đòn đánh nảy qua các mục tiêu và áp dụng hiệu ứng trăng.',
  poison: 'Đòn đánh đặt hiệu ứng độc theo thời gian.',
  soul_link: 'Đòn đánh nối nhiều mục tiêu để chia sẻ một phần sát thương.',
};

/** Melee carries keep their sweep; enemies beside the primary target take this share (T1–T2 heroes use 0.5). */
export const MELEE_CLEAVE_SECONDARY = 0.6;

export interface HeroCombatProfile {
  geometry: AttackGeometryConfig;
  trait: OnHitTraitConfig;
}

/** Authoritative Attack Geometry and On-Hit Trait configuration for all 70 heroes. */
export const HERO_COMBAT_PROFILES: Readonly<Record<string, HeroCombatProfile>> = {
  // --- BẬC 1: LINH ---
  h001: {
    geometry: { type: 'single', targetPriority: 'highest_hp' },
    trait: { type: 'crit_pierce', critChance: 0.25, critMultiplier: 1.75, flatArmorPierce: 3, sunderOnCrit: { amount: 3, duration: 3.5 } },
  },
  h002: {
    geometry: { type: 'bounce', bounces: 2, bounceRadius: 4.0, bounceDecay: 0.25 },
    trait: { type: 'stacking_mark', poisonDps: 15, poisonDuration: 2.5, poisonSlow: 0.10 },
  },
  h003: {
    geometry: { type: 'frontal_cleave', radius: 2.2, angle: (120 / 180) * Math.PI, cleaveSecondaryRatio: 0.5 },
    trait: { type: 'orbit_aura', burnDpsRatio: 0.15, burnDuration: 3.0, burnExplosionDamage: 35, burnExplosionRadius: 2.0 },
  },
  h004: {
    geometry: { type: 'linear_pierce', length: 3.5, width: 0.95 },
    trait: { type: 'double_strike', doubleChance: 0.30, extraStrikes: 1, bleedBonusDamage: 0.10, bleedDuration: 3.0 },
  },
  h005: {
    geometry: { type: 'single' },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'stun', nthBonusMultiplier: 1.6, nthKnockback: 0.6, nthStunDuration: 0.6 },
  },
  h006: {
    geometry: { type: 'single' },
    trait: { type: 'follow_up', followUpRadius: 6.0, followUpCooldown: 1.5, followUpHeal: 20 },
  },
  h007: {
    geometry: { type: 'single' },
    trait: { type: 'orbit_aura', orbitRadius: 2.8, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.30, orbitSlowDuration: 2.0, orbitAttackSlow: 0.20 },
  },
  h008: {
    geometry: { type: 'single' },
    trait: { type: 'nth_strike', nth: 4, nthEffect: 'earthquake', nthBonusMultiplier: 1.4, nthRadius: 2.5, nthSlow: 0.35, nthSlowDuration: 2.5, nthWardReduction: 0.25, nthWardDuration: 2.5 },
  },

  // --- BẬC 2: HUYỀN ---
  h009: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', sunderChance: 0.25, sunderAmount: 3, sunderDuration: 3.5 },
  },
  h00A: {
    geometry: { type: 'frontal_cleave', radius: 2.2, angle: (150 / 180) * Math.PI, cleaveSecondaryRatio: 0.5 },
    trait: { type: 'double_strike', doubleChance: 0.25, extraStrikes: 1 },
  },
  h00B: {
    geometry: { type: 'multishot', shots: 2, knockback: 0.25 },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'knockback', nthKnockback: 0.6 },
  },
  h00C: {
    geometry: { type: 'linear_pierce', length: 4.0, width: 0.95 },
    trait: { type: 'stacking_mark' },
  },
  h00D: {
    geometry: { type: 'linear_pierce', length: 8.0, width: 0.9, maxTargets: 3 },
    trait: { type: 'double_strike', doubleChance: 0.25, extraStrikes: 1 },
  },
  h00E: {
    geometry: { type: 'single' },
    trait: { type: 'nth_strike', nth: 4, nthEffect: 'burst', nthBonusMultiplier: 1.4 },
  },
  h00F: {
    geometry: { type: 'single' },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.15, orbitSlowDuration: 1.5 },
  },
  h00G: {
    geometry: { type: 'single' },
    trait: { type: 'orbit_aura', orbitRadius: 2.5, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.25, orbitSlowDuration: 2.0 },
  },
  h00H: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0.25, critMultiplier: 1.75, bonusDamageLowHpOrDebuff: 0.30 },
  },
  h00I: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 4.5, bounceDecay: 0.2 },
    trait: { type: 'stacking_mark', attackWeakPercent: 0.15, attackWeakDuration: 2.0 },
  },
  h03O: {
    geometry: { type: 'single' },
    trait: { type: 'follow_up', drainToGuardianRatio: 0.35 },
  },
  h03P: {
    geometry: { type: 'single' },
    trait: { type: 'stacking_mark', poisonDps: 25, poisonDuration: 3.0 },
  },

  // --- BẬC 3 ---
  h00J: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h00K: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0, sunderChance: 1, sunderAmount: 3, sunderDuration: 3 },
  },
  h00L: {
    geometry: { type: 'multishot', shots: 3 },
    trait: { type: 'crit_pierce', critChance: 0, poisonDps: 35, poisonDuration: 3 },
  },
  h00M: {
    geometry: { type: 'single' },
    trait: { type: 'nth_strike', nth: 4, nthEffect: 'sunder', nthBonusMultiplier: 1 },
  },
  h00N: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0, burnDpsRatio: 60 / 215, burnDuration: 3 },
  },
  h00O: {
    geometry: { type: 'frontal_cleave', radius: 2.5, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'crit_pierce', critChance: 0, critMultiplier: 2 },
  },
  h00P: {
    geometry: { type: 'frontal_cleave', radius: 3.2, angle: Math.PI, knockback: .25, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'crit_pierce', critChance: 0, sunderChance: 1, sunderAmount: .15, sunderDuration: 3 },
  },
  h00Q: {
    geometry: { type: 'linear_pierce', length: 6, width: 1.2 },
    trait: { type: 'crit_pierce', critChance: 0, poisonSlow: .3 },
  },
  h03Q: {
    geometry: { type: 'frontal_cleave', radius: 3, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'follow_up', followUpRadius: 5.5, followUpCooldown: 1 },
  },
  h03R: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h03S: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0, burnDpsRatio: .25, burnDuration: 2 },
  },

  // --- BẬC 4 ---
  h00R: {
    geometry: { type: 'frontal_cleave', radius: 3.2, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'crit_pierce', critChance: .25, critMultiplier: 2 },
  },
  h00S: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h00T: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.2, bounceDecay: .2 },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h00U: {
    geometry: { type: 'linear_pierce', length: 5.5, width: 1.1 },
    trait: { type: 'double_strike', doubleChance: .35, extraStrikes: 1 },
  },
  h00V: {
    geometry: { type: 'frontal_cleave', radius: 3.2, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: .5, orbitElement: 'fire', orbitDamageRatio: .3 },
  },
  h00W: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h00X: {
    geometry: { type: 'bounce', bounces: 2, bounceRadius: 5, bounceDecay: .2 },
    trait: { type: 'stacking_mark', maxMarkStacks: 4, markDamagePerStack: 0, markDetonatePower: 3 },
  },
  h00Y: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h00Z: {
    geometry: { type: 'multishot', shots: 3 },
    trait: { type: 'crit_pierce', critChance: 0, poisonSlow: .35 },
  },
  h010: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0, burnDpsRatio: .2, burnDuration: 2 },
  },
  h03T: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0 },
  },
  h03U: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0, sunderChance: 1, sunderAmount: .25, sunderDuration: 3 },
  },
  h03V: {
    geometry: { type: 'multishot', shots: 3, maxTargets: 4 },
    trait: { type: 'crit_pierce', critChance: 0, poisonDps: 80, poisonDuration: 3, poisonSlow: .25 },
  },

  // --- BẬC 5 ---
  h011: {
    geometry: { type: 'frontal_cleave', radius: 3.5, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'berserk' },
  },
  h012: {
    geometry: { type: 'frontal_cleave', radius: 3.8, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'crit_pierce', critChance: .35, critMultiplier: 2.2, percentArmorPierce: .3 },
  },
  h013: {
    geometry: { type: 'single' },
    trait: { type: 'pure_land' },
  },
  h014: {
    geometry: { type: 'single' },
    trait: { type: 'pure_land' },
  },
  h015: {
    // Tinh Quang Tiễn: one star bolt; the heal is resolved in thaibach-combat.ts.
    geometry: { type: 'single' },
    trait: { type: 'follow_up', followUpRadius: 6.5, followUpCooldown: 0.5 },
  },
  h016: {
    geometry: { type: 'frontal_cleave', radius: 3.5, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'double_strike', doubleChance: .35, extraStrikes: 1 },
  },
  h017: {
    geometry: { type: 'linear_pierce', length: 12, width: 1.1 },
    trait: { type: 'crit_pierce', critChance: .4, critMultiplier: 2, percentArmorPierce: .35 },
  },
  h018: {
    geometry: { type: 'single' },
    trait: { type: 'moon_bounce' },
  },
  h019: {
    geometry: { type: 'bounce', bounces: 4, bounceRadius: 6, bounceDecay: 0 },
    trait: { type: 'follow_up' },
  },
  h01A: {
    geometry: { type: 'multishot', shots: 5 },
    trait: { type: 'crit_pierce', percentArmorPierce: 0.2 },
  },
  h03W: {
    geometry: { type: 'single' },
    trait: { type: 'pure_land' },
  },
  h03X: {
    geometry: { type: 'single' },
    trait: { type: 'follow_up' },
  },
  h03Y: {
    geometry: { type: 'linear_pierce', length: 6, width: 1.15 },
    trait: { type: 'crit_pierce', critChance: .4, critMultiplier: 2 },
  },

  // --- BẬC 6: TỐI THƯỢNG ---
  h01B: {
    geometry: { type: 'frontal_cleave', radius: 3.8, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'crit_pierce', critChance: .3, critMultiplier: 2.2, percentArmorPierce: .35,
      nth: 3, nthBonusMultiplier: 1.8, nthKnockback: .6, bleedBonusDamage: .1, bleedDuration: 3 },
  },
  h01C: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce' },
  },
  h01D: {
    geometry: { type: 'single' },
    trait: { type: 'soul_link' },
  },
  h01E: {
    geometry: { type: 'single' },
    trait: { type: 'poison', poisonDuration: 3 },
  },
  h01F: {
    geometry: { type: 'linear_pierce', length: 10, width: 1.3 },
    trait: { type: 'crit_pierce', percentArmorPierce: .35 },
  },
  h01G: {
    geometry: { type: 'single' },
    trait: { type: 'orbit_aura', orbitRadius: 3.8, orbitInterval: .2,
      orbitElement: 'water', orbitSlow: .45, orbitSlowDuration: .2 },
  },
  h01H: {
    geometry: { type: 'single' },
    trait: { type: 'orbit_aura', burnDpsRatio: 0, burnDuration: 3 },
  },
  h01I: {
    geometry: { type: 'single', targetPriority: 'highest_hp' },
    trait: { type: 'pure_land' },
  },
  h01J: {
    geometry: { type: 'single' },
    trait: { type: 'pure_land' },
  },
  h01K: {
    geometry: { type: 'linear_pierce', length: 10, width: 1.4 },
    trait: { type: 'poison', burnDuration: 3 },
  },
  h03Z: {
    geometry: { type: 'frontal_cleave', radius: 3.6, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
    trait: { type: 'poison', burnDuration: 3 },
  },
  h040: {
    geometry: { type: 'bounce', bounces: 5, bounceRadius: 5, bounceDecay: 0 },
    trait: { type: 'poison', poisonSlow: .45, poisonDuration: 2.5 },
  },
  h041: {
    geometry: { type: 'multishot', shots: 4 },
    trait: { type: 'poison', burnDuration: 3 },
  },
};

/** Get the configured combat profile for a hero, falling back gracefully by role if unmapped. */
export function getHeroCombatProfile(heroId: string, role?: Role): HeroCombatProfile {
  const profile = HERO_COMBAT_PROFILES[heroId];
  if (profile) return profile;

  // Fallback defaults if an uncatalogued hero appears
  switch (role) {
    case 'warrior':
      return {
        geometry: { type: 'frontal_cleave', radius: 2.8, angle: Math.PI, cleaveSecondaryRatio: MELEE_CLEAVE_SECONDARY },
        trait: { type: 'double_strike', doubleChance: 0.25, extraStrikes: 1 },
      };
    case 'ranger':
      return {
        geometry: { type: 'linear_pierce', length: 8.0, width: 0.9 },
        trait: { type: 'crit_pierce', critChance: 0.25, critMultiplier: 1.8 },
      };
    case 'mage':
      return {
        geometry: { type: 'single' },
        trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.08, markDetonatePower: 4 },
      };
    case 'guardian':
      return {
        geometry: { type: 'single' },
        trait: { type: 'orbit_aura', orbitRadius: 2.8, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.2 },
      };
    case 'support':
      return {
        geometry: { type: 'single' },
        trait: { type: 'follow_up', followUpRadius: 6.0, followUpCooldown: 0.7 },
      };
    default:
      return {
        geometry: { type: 'single' },
        trait: { type: 'crit_pierce', critChance: 0.2, critMultiplier: 1.5 },
      };
  }
}
