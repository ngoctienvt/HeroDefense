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
  frontal_cleave: 'Đòn cận chiến vung vũ khí quét góc 180 độ phía trước mặt (Bán kính 2.0 - 4.0), gây sát thương cho toàn bộ quái đứng trước mặt (Dao, Rìu, Gậy).',
  linear_pierce: 'Mũi thương hoặc mũi tên bay thẳng một đường dài (6.0 - 12.0 đơn vị), xuyên qua tất cả quái xếp hàng dọc trên đường bay (Thương, Đại Cung).',
  multishot: 'Mỗi lần ra đòn bắn đồng thời 2 đến 7 tia đạn vào các mục tiêu khác nhau trong tầm bắn. Mỗi tia đều tính hiệu ứng đòn đánh riêng (Cung, Ám khí).',
  impact_splash: 'Đánh trúng mục tiêu chính sẽ tạo vụ nổ tròn xung quanh nó (Bán kính 2.5 - 4.0), gây 40% - 80% sát thương lan cho quái đi sát bên (Chùy, Pháp cầu).',
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
};

export const ON_HIT_TRAIT_DESCRIPTIONS: Record<OnHitTraitType, string> = {
  crit_pierce: 'Có tỷ lệ nổ Chí Mạng (150% - 250% sát thương) hoặc bỏ qua một lượng Giáp cố định/ % Giáp của địch.',
  nth_strike: 'Cứ mỗi 3 hoặc 4 đòn đánh thường thì đòn tiếp theo được cường hóa mạnh (nổ sát thương chuẩn, làm choáng nhẹ, hoặc bắn chùm).',
  double_strike: 'Có 20% - 40% xác suất vung tay đánh bồi thêm 1-2 đòn ngay lập tức mà không tốn thời gian hồi đòn.',
  stacking_mark: 'Càng bắn vào cùng 1 mục tiêu (như Boss) càng tăng sát thương hoặc tích đủ 5 cộng dồn thì kích nổ theo % Máu tối đa của mục tiêu.',
  orbit_aura: 'Có vòng lửa/kiếm khí/hàn băng xoay quanh người tướng liên tục, tự động gây sát thương hoặc làm chậm mọi quái áp sát mỗi 0.5s.',
  follow_up: 'Khi đồng minh đứng cạnh tung Kỹ năng hoặc nổ Chí Mạng, tướng này tự động bắn bồi thêm 1 đòn đánh thường miễn phí vào mục tiêu đó.',
};

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
    geometry: { type: 'impact_splash', radius: 2.0, splashDamageRatio: 0.40 },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'stun', nthBonusMultiplier: 1.6, nthKnockback: 0.6, nthStunDuration: 0.6 },
  },
  h006: {
    geometry: { type: 'impact_splash', radius: 2.5, splashDamageRatio: 0.50, percentArmorPierce: 0.30 },
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
    geometry: { type: 'frontal_cleave', radius: 2.2, angle: (120 / 180) * Math.PI },
    trait: { type: 'crit_pierce', sunderChance: 0.25, sunderAmount: 3, sunderDuration: 3.5 },
  },
  h00A: {
    geometry: { type: 'frontal_cleave', radius: 2.2, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.25, extraStrikes: 1, healOnHit: 12 },
  },
  h00B: {
    geometry: { type: 'multishot', shots: 2, knockback: 0.25 },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'stun', nthStunDuration: 0.3, nthKnockback: 0.3 },
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
    geometry: { type: 'impact_splash', radius: 2.2, splashDamageRatio: 0.5 },
    trait: { type: 'nth_strike', nth: 4, nthEffect: 'burst', nthBonusMultiplier: 1.4 },
  },
  h00F: {
    geometry: { type: 'bounce', bounces: 2, bounceRadius: 5.0, bounceDecay: 0.2 },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.15, orbitSlowDuration: 1.5 },
  },
  h00G: {
    geometry: { type: 'impact_splash', radius: 2.5, splashDamageRatio: 0.55 },
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
    geometry: { type: 'impact_splash', radius: 2.2, splashDamageRatio: 0.5 },
    trait: { type: 'stacking_mark', poisonDps: 25, poisonDuration: 3.0 },
  },

  // --- BẬC 3 ---
  h00J: {
    geometry: { type: 'frontal_cleave', radius: 2.6, angle: Math.PI },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'stun', nthStunDuration: 0.4, nthKnockback: 0.4 },
  },
  h00K: {
    geometry: { type: 'linear_pierce', length: 7.5, width: 1.0 },
    trait: { type: 'orbit_aura', orbitRadius: 3.0, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.2, orbitSlowDuration: 1.5 },
  },
  h00L: {
    geometry: { type: 'linear_pierce', length: 8.5, width: 0.9 },
    trait: { type: 'crit_pierce', critChance: 0.28, critMultiplier: 1.8, percentArmorPierce: 0.25 },
  },
  h00M: {
    geometry: { type: 'multishot', shots: 3 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.08, markDetonatePercentHp: 0.08 },
  },
  h00N: {
    geometry: { type: 'impact_splash', radius: 2.8, splashDamageRatio: 0.55 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.08, markDetonatePercentHp: 0.1 },
  },
  h00O: {
    geometry: { type: 'single' },
    trait: { type: 'crit_pierce', critChance: 0.35, critMultiplier: 2.0, flatArmorPierce: 6 },
  },
  h00P: {
    geometry: { type: 'frontal_cleave', radius: 2.8, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.3, extraStrikes: 1 },
  },
  h00Q: {
    geometry: { type: 'impact_splash', radius: 3.2, splashDamageRatio: 0.6 },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.25, orbitSlowDuration: 1.5 },
  },
  h03Q: {
    geometry: { type: 'impact_splash', radius: 3.0, splashDamageRatio: 0.55 },
    trait: { type: 'follow_up', followUpRadius: 5.5, followUpCooldown: 0.7 },
  },
  h03R: {
    geometry: { type: 'multishot', shots: 3 },
    trait: { type: 'orbit_aura', orbitRadius: 3.0, orbitInterval: 0.5, orbitElement: 'sword', orbitDamage: 28 },
  },
  h03S: {
    geometry: { type: 'frontal_cleave', radius: 2.4, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.28, extraStrikes: 1 },
  },

  // --- BẬC 4 ---
  h00R: {
    geometry: { type: 'frontal_cleave', radius: 3.0, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.35, extraStrikes: 1 },
  },
  h00S: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.0, bounceDecay: 0.2 },
    trait: { type: 'follow_up', followUpRadius: 6.0, followUpCooldown: 0.6 },
  },
  h00T: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.2, bounceDecay: 0.18 },
    trait: { type: 'crit_pierce', critChance: 0.3, critMultiplier: 1.9, percentArmorPierce: 0.3 },
  },
  h00U: {
    geometry: { type: 'linear_pierce', length: 7.5, width: 1.1 },
    trait: { type: 'crit_pierce', critChance: 0.32, critMultiplier: 2.0, flatArmorPierce: 8 },
  },
  h00V: {
    geometry: { type: 'boomerang', length: 7.5, width: 1.1, returnDamageRatio: 1.0 },
    trait: { type: 'orbit_aura', orbitRadius: 3.0, orbitInterval: 0.5, orbitElement: 'fire', orbitDamage: 38 },
  },
  h00W: {
    geometry: { type: 'impact_splash', radius: 3.2, splashDamageRatio: 0.65 },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: 0.5, orbitElement: 'sword', orbitDamage: 35 },
  },
  h00X: {
    geometry: { type: 'multishot', shots: 4 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.09, markDetonatePercentHp: 0.1 },
  },
  h00Y: {
    geometry: { type: 'single' },
    trait: { type: 'follow_up', followUpRadius: 6.0, followUpCooldown: 0.6 },
  },
  h00Z: {
    geometry: { type: 'linear_pierce', length: 9.0, width: 1.0 },
    trait: { type: 'nth_strike', nth: 4, nthEffect: 'burst', nthBonusMultiplier: 1.6 },
  },
  h010: {
    geometry: { type: 'impact_splash', radius: 3.0, splashDamageRatio: 0.55 },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.22, orbitSlowDuration: 1.5 },
  },
  h03T: {
    geometry: { type: 'frontal_cleave', radius: 2.8, angle: Math.PI },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.08, markDetonatePercentHp: 0.09 },
  },
  h03U: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.0, bounceDecay: 0.2 },
    trait: { type: 'orbit_aura', orbitRadius: 3.0, orbitInterval: 0.5, orbitElement: 'sword', orbitDamage: 32 },
  },
  h03V: {
    geometry: { type: 'linear_pierce', length: 9.0, width: 1.0 },
    trait: { type: 'double_strike', doubleChance: 0.3, extraStrikes: 1 },
  },

  // --- BẬC 5 ---
  h011: {
    geometry: { type: 'frontal_cleave', radius: 3.4, angle: Math.PI },
    trait: { type: 'crit_pierce', critChance: 0.35, critMultiplier: 2.2, percentArmorPierce: 0.4 },
  },
  h012: {
    geometry: { type: 'frontal_cleave', radius: 3.2, angle: Math.PI },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'true_damage', nthBonusMultiplier: 1.7 },
  },
  h013: {
    geometry: { type: 'impact_splash', radius: 3.5, splashDamageRatio: 0.7 },
    trait: { type: 'follow_up', followUpRadius: 6.5, followUpCooldown: 0.5 },
  },
  h014: {
    geometry: { type: 'impact_splash', radius: 3.6, splashDamageRatio: 0.7 },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.3, orbitSlowDuration: 1.8 },
  },
  h015: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.5, bounceDecay: 0.18 },
    trait: { type: 'follow_up', followUpRadius: 6.5, followUpCooldown: 0.5 },
  },
  h016: {
    geometry: { type: 'linear_pierce', length: 8.5, width: 1.2 },
    trait: { type: 'double_strike', doubleChance: 0.38, extraStrikes: 1 },
  },
  h017: {
    geometry: { type: 'linear_pierce', length: 11.0, width: 1.0 },
    trait: { type: 'crit_pierce', critChance: 0.4, critMultiplier: 2.3, percentArmorPierce: 0.35 },
  },
  h018: {
    geometry: { type: 'multishot', shots: 5 },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.25, orbitSlowDuration: 1.5 },
  },
  h019: {
    geometry: { type: 'impact_splash', radius: 3.5, splashDamageRatio: 0.65 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.1, markDetonatePercentHp: 0.11 },
  },
  h01A: {
    geometry: { type: 'boomerang', length: 9.0, width: 1.1, returnDamageRatio: 1.0 },
    trait: { type: 'crit_pierce', critChance: 0.32, critMultiplier: 2.0, percentArmorPierce: 0.3 },
  },
  h03W: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.5, bounceDecay: 0.15 },
    trait: { type: 'crit_pierce', critChance: 0.35, critMultiplier: 2.1, percentArmorPierce: 0.3 },
  },
  h03X: {
    geometry: { type: 'linear_pierce', length: 9.5, width: 1.2 },
    trait: { type: 'orbit_aura', orbitRadius: 3.2, orbitInterval: 0.5, orbitElement: 'sword', orbitDamage: 40 },
  },
  h03Y: {
    geometry: { type: 'frontal_cleave', radius: 3.0, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.35, extraStrikes: 1 },
  },

  // --- BẬC 6: TỐI THƯỢNG ---
  h01B: {
    geometry: { type: 'frontal_cleave', radius: 3.8, angle: Math.PI },
    trait: { type: 'crit_pierce', critChance: .3, critMultiplier: 2.2, percentArmorPierce: .35,
      nth: 3, nthBonusMultiplier: 1.8, nthKnockback: .6, bleedBonusDamage: .1, bleedDuration: 3 },
  },
  h01C: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 6.0, bounceDecay: 0.15 },
    trait: { type: 'follow_up', followUpRadius: 7.0, followUpCooldown: 0.4 },
  },
  h01D: {
    geometry: { type: 'linear_pierce', length: 11.5, width: 1.2 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.1, markDetonatePercentHp: 0.12 },
  },
  h01E: {
    geometry: { type: 'multishot', shots: 5 },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'fire', orbitDamage: 50 },
  },
  h01F: {
    geometry: { type: 'frontal_cleave', radius: 3.6, angle: Math.PI },
    trait: { type: 'double_strike', doubleChance: 0.4, extraStrikes: 2 },
  },
  h01G: {
    geometry: { type: 'impact_splash', radius: 3.8, splashDamageRatio: 0.75 },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.35, orbitSlowDuration: 2.0 },
  },
  h01H: {
    geometry: { type: 'frontal_cleave', radius: 3.5, angle: Math.PI },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'fire', orbitDamage: 55 },
  },
  h01I: {
    geometry: { type: 'impact_splash', radius: 3.8, splashDamageRatio: 0.7 },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'stun', nthStunDuration: 0.6, nthKnockback: 0.6 },
  },
  h01J: {
    geometry: { type: 'boomerang', length: 10.0, width: 1.2, returnDamageRatio: 1.0 },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.1, markDetonatePercentHp: 0.12 },
  },
  h01K: {
    geometry: { type: 'linear_pierce', length: 11.0, width: 1.3 },
    trait: { type: 'orbit_aura', orbitRadius: 3.5, orbitInterval: 0.5, orbitElement: 'fire', orbitDamage: 55 },
  },
  h03Z: {
    geometry: { type: 'frontal_cleave', radius: 3.4, angle: Math.PI },
    trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.1, markDetonatePercentHp: 0.12 },
  },
  h040: {
    geometry: { type: 'bounce', bounces: 3, bounceRadius: 5.8, bounceDecay: 0.15 },
    trait: { type: 'nth_strike', nth: 3, nthEffect: 'true_damage', nthBonusMultiplier: 1.8 },
  },
  h041: {
    geometry: { type: 'boomerang', length: 10.5, width: 1.2, returnDamageRatio: 1.0 },
    trait: { type: 'orbit_aura', orbitRadius: 3.6, orbitInterval: 0.5, orbitElement: 'fire', orbitDamage: 52 },
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
        geometry: { type: 'frontal_cleave', radius: 2.8, angle: Math.PI },
        trait: { type: 'double_strike', doubleChance: 0.25, extraStrikes: 1 },
      };
    case 'ranger':
      return {
        geometry: { type: 'linear_pierce', length: 8.0, width: 0.9 },
        trait: { type: 'crit_pierce', critChance: 0.25, critMultiplier: 1.8 },
      };
    case 'mage':
      return {
        geometry: { type: 'impact_splash', radius: 2.8, splashDamageRatio: 0.55 },
        trait: { type: 'stacking_mark', maxMarkStacks: 5, markDamagePerStack: 0.08, markDetonatePercentHp: 0.08 },
      };
    case 'guardian':
      return {
        geometry: { type: 'frontal_cleave', radius: 2.5, angle: Math.PI },
        trait: { type: 'orbit_aura', orbitRadius: 2.8, orbitInterval: 0.5, orbitElement: 'ice', orbitSlow: 0.2 },
      };
    case 'support':
      return {
        geometry: { type: 'bounce', bounces: 2, bounceRadius: 5.0, bounceDecay: 0.2 },
        trait: { type: 'follow_up', followUpRadius: 6.0, followUpCooldown: 0.7 },
      };
    default:
      return {
        geometry: { type: 'single' },
        trait: { type: 'crit_pierce', critChance: 0.2, critMultiplier: 1.5 },
      };
  }
}
