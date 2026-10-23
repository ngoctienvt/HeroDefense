/**
 * 20-wave reference balance curves and stat formulas.
 *
 * Audited against `content/catalog.ts` and `content/tier3-tier4-brief.json`:
 * - Act I   (Waves 1–5):   Tier 1 Linh (DPS Atk 46–60, HP 200–780) -> Tier 2 Huyền 1★ (DPS Atk 92–115)
 * - Act II  (Waves 6–10):  Tier 2 Huyền 2★ + early Tier 3 Chân Tiên 1★ (DPS Atk 178–215, HP 880–3400)
 * - Act III (Waves 11–15): Tier 3 2★ + Tier 4 Kim Tiên 1★ (DPS Atk 360–415, HP 1650–5200)
 * - Act IV  (Waves 16–20): Tier 4 2★ + Tier 5–6 Thánh/Thần (DPS Atk 600–1280) + gear/formations
 */

export const BALANCE_SCALE = {
  hp: 1.0,
  attack: 1.0,
  bossHp: 1.0,
  skillPower: 1.0,
};

/** 1-indexed reference single-target hero attack per wave (Waves 1..20). */
export const A_REF: readonly number[] = [
  0,
  // Act I: Waves 1–5
  42, 48, 56, 65, 76,
  // Act II: Waves 6–10
  95, 112, 130, 150, 172,
  // Act III: Waves 11–15
  205, 238, 275, 315, 360,
  // Act IV: Waves 16–20
  420, 490, 570, 660, 760,
];

/** 1-indexed reference frontline/midline hero HP per wave (Waves 1..20). */
export const H_REF: readonly number[] = [
  0,
  // Act I: Waves 1–5
  220, 260, 310, 370, 440,
  // Act II: Waves 6–10
  540, 650, 780, 930, 1100,
  // Act III: Waves 11–15
  1350, 1620, 1940, 2320, 2760,
  // Act IV: Waves 16–20
  3300, 3950, 4700, 5600, 6650,
];

/** 1-indexed pressure multiplier, strictly increasing from 0.80 (Wave 1) to 1.40 (Wave 20). */
export const PRESSURE: readonly number[] = [
  0,
  0.80, 0.83, 0.86, 0.89, 0.92,
  0.95, 0.98, 1.01, 1.04, 1.07,
  1.10, 1.13, 1.16, 1.19, 1.22,
  1.25, 1.28, 1.32, 1.36, 1.40,
];

function clampWave(wave: number): number {
  if (!Number.isFinite(wave)) return 1;
  return Math.max(1, Math.min(20, Math.floor(wave)));
}

export function aRef(wave: number): number {
  return A_REF[clampWave(wave)];
}

export function hRef(wave: number): number {
  return H_REF[clampWave(wave)];
}

export function pressure(wave: number): number {
  return PRESSURE[clampWave(wave)];
}

/**
 * Minion HP so a reference hero at wave `w` takes `hitsToKill` (default 12, window 10–15)
 * basic attacks to kill a minion after armor reduction `100 / (100 + armor * 5)`.
 */
export function minionHp(wave: number, armor: number, hitsToKill = 12): number {
  const safeArmor = Math.max(0, armor);
  return Math.max(1, Math.round(hitsToKill * aRef(wave) * (1 + (safeArmor * 5) / 100) * BALANCE_SCALE.hp));
}

/**
 * Minion attack so a single minion threatens `H_REF[w]` over ~14s scaled by wave pressure
 * (a 4-minion pack threatens a reference frontline in ~3.5s).
 */
export function minionAttack(wave: number, interval = 1.35): number {
  return Math.max(1, Math.round((hRef(wave) / 14) * interval * pressure(wave) * BALANCE_SCALE.attack));
}

export function eliteHp(wave: number, armor: number, multiplier = 1.85): number {
  return Math.max(1, Math.round(multiplier * minionHp(wave, armor)));
}

export function eliteAttack(wave: number, interval = 1.35, multiplier = 1.25): number {
  return Math.max(1, Math.round(multiplier * minionAttack(wave, interval)));
}

export function chieftainHp(wave: number, armor: number): number {
  return Math.max(1, Math.round(4 * minionHp(wave, armor)));
}

export function chieftainAttack(wave: number, interval = 1.35): number {
  return Math.max(1, Math.round(1.65 * minionAttack(wave, interval)));
}

export function partyBossFactor(playerCount: number): number {
  const clamped = Math.max(1, Math.min(4, Math.floor(playerCount || 1)));
  return 1 + 0.75 * (clamped - 1);
}

/**
 * Shared boss HP:
 * - Solo boss (Waves 5, 15): 28× minionHp * partyBossFactor
 * - Twin boss (Waves 10, 20): 18× minionHp each (36× total pair) * partyBossFactor
 */
export function bossHp(wave: number, armor: number, playerCount: number, isTwin = false): number {
  const baseMultiple = isTwin ? 18 : 28;
  return Math.max(
    1,
    Math.round(baseMultiple * minionHp(wave, armor) * partyBossFactor(playerCount) * BALANCE_SCALE.bossHp),
  );
}

export function bossAttack(wave: number, interval = 1.4): number {
  return Math.max(1, Math.round(2.4 * minionAttack(wave, interval)));
}
