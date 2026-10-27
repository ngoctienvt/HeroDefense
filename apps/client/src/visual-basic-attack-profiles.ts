import { HERO_BY_ID } from '../../../content/catalog.js';
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import type { TierMotif } from './visual-tier-motif-textures.js';

/**
 * Basic-attack looks, one entry per hero. A profile only names the form and matter; reach, angle and shot count are
 * read from the hero's combat profile at paint time so the picture always matches what the server resolved.
 *
 * Forms: `arc` sweeps a blade across the cleave fan, `thrust` draws a lance along the pierce line, `bolt` flies one
 * projectile (a multishot event arrives once per shot), `chain` arcs from the attacker to the next monster, `smash`
 * slams the target from above. Matter picks the impact: water splash, fire flare, ink smoke, steel sparks, spirit
 * flame, leaf burst, earth dust, lightning flash. An optional authored motif lands on top of the impact.
 */
export type BasicAttackForm = 'arc' | 'thrust' | 'bolt' | 'chain' | 'smash';
export type BasicAttackMatter = 'water' | 'fire' | 'ink' | 'steel' | 'spirit' | 'wood' | 'earth' | 'lightning';
export type BasicAttackTexture = 'slash_01' | 'trace_01' | 'spark_01' | 'twirl_01' | 'magic_01' | 'circle_03';

export interface BasicAttackMotif { readonly kind: TierMotif; readonly size: number }

export interface BasicAttackProfile {
  readonly form: BasicAttackForm;
  readonly matter: BasicAttackMatter;
  /** Main body colour and a brighter edge/core colour. */
  readonly color: string;
  readonly accent: string;
  /** Glyph size of the main shape in world units; skills stay several times larger. */
  readonly size: number;
  readonly texture: BasicAttackTexture;
  /** Projectile flight seconds per world unit (bolt / chain). */
  readonly pace?: number;
  /** Peak height of the projectile arc. */
  readonly arc?: number;
  /** Authored flipbook that lands on the hit point (skipped under reduced motion). */
  readonly motif?: BasicAttackMotif;
}

export const BASIC_ATTACK_PROFILES: Readonly<Record<string, BasicAttackProfile>> = {
  // Trư Bát Giới: the nine-tooth rake comes down on the target and splashes muddy water.
  h00J: { form: 'smash', matter: 'water', color: '#6fb7a8', accent: '#d7f5e8', size: 1.5, texture: 'circle_03' },
  // Ứng Long: thin water darts, one per shot of the fan.
  h00Z: { form: 'bolt', matter: 'water', color: '#5cc7ea', accent: '#e4fbff', size: .8, texture: 'trace_01', pace: .028, arc: .15 },
  // Long Vương: a long water lance along the pierce line.
  h00Q: { form: 'thrust', matter: 'water', color: '#2f9fd6', accent: '#bfeaff', size: 1.1, texture: 'trace_01' },
  // Na Tra: a fire-tipped sweep of the spear across the fan.
  h00V: { form: 'arc', matter: 'fire', color: '#ff6a2a', accent: '#ffd08a', size: 1.7, texture: 'slash_01' },
  // Đát Kỷ: fox-fire arcs towards the monsters.
  h00X: { form: 'chain', matter: 'fire', color: '#e86bd0', accent: '#ffd6f5', size: 1, texture: 'twirl_01', pace: .03, arc: .6 },
  // Chung Quỳ: a ghost-flame bolt.
  h00N: { form: 'bolt', matter: 'spirit', color: '#7be08f', accent: '#e3ffe8', size: 1.1, texture: 'magic_01', pace: .032, arc: .25 },
  // Phán Quan: the judgement brush sweeps an ink arc.
  h00O: { form: 'arc', matter: 'ink', color: '#e0d19a', accent: '#2b2a35', size: 1.8, texture: 'slash_01' },
  // Dương Tiễn: the three-pointed blade stabs along the pierce line.
  h00U: { form: 'thrust', matter: 'steel', color: '#bfe6ff', accent: '#ffffff', size: 1.1, texture: 'trace_01' },

  // Sa Ngộ Tịnh: a golden bell ring rolls out of the staff.
  h00K: { form: 'bolt', matter: 'steel', color: '#e5c36a', accent: '#fff1bd', size: 1, texture: 'circle_03', pace: .03, arc: .2, motif: { kind: 'bell', size: 1.7 } },
  // Tiểu Bạch Long: jade dragon darts, one per shot.
  h00L: { form: 'bolt', matter: 'wood', color: '#9be8bf', accent: '#f0fff6', size: .8, texture: 'trace_01', pace: .026, arc: .2, motif: { kind: 'vines', size: 1.5 } },
  // Tinh Vệ: a pebble lobbed from the sea bird.
  h00M: { form: 'bolt', matter: 'earth', color: '#b99a6a', accent: '#f2e0b8', size: .8, texture: 'spark_01', pace: .034, arc: .55, motif: { kind: 'rock', size: 1.7 } },
  // Ngưu Ma Vương: a heavy hammer sweep.
  h00P: { form: 'arc', matter: 'steel', color: '#cfd6e0', accent: '#fff4c9', size: 2, texture: 'slash_01', motif: { kind: 'hammer', size: 2.1 } },
  // Tôn Ngộ Không: the golden cudgel sweeps wide.
  h00R: { form: 'arc', matter: 'steel', color: '#e0a935', accent: '#fff0b0', size: 1.8, texture: 'slash_01' },
  // Đường Tăng: a lotus of sutra light.
  h00S: { form: 'bolt', matter: 'wood', color: '#9fe38a', accent: '#f5ffd9', size: 1, texture: 'twirl_01', pace: .032, arc: .25, motif: { kind: 'bloom', size: 1.6 } },
  // Lôi Chấn Tử: lightning forks towards the monsters.
  h00T: { form: 'chain', matter: 'lightning', color: '#a8c8ff', accent: '#ffffff', size: .9, texture: 'spark_01', pace: .02, arc: .3, motif: { kind: 'lightning', size: 2.2 } },
  // Lý Tịnh: the pagoda comes down on the target.
  h00W: { form: 'smash', matter: 'steel', color: '#d9c27a', accent: '#fff6cf', size: 1.5, texture: 'circle_03', motif: { kind: 'tower', size: 1.9 } },
  // Ngũ Đạo Tướng Quân: a ribbon of river water.
  h00Y: { form: 'bolt', matter: 'water', color: '#4fb6c9', accent: '#e1fbff', size: 1, texture: 'twirl_01', pace: .03, arc: .3 },
  // Xích Tùng Tử: a pine ember.
  h010: { form: 'bolt', matter: 'fire', color: '#ff8a3d', accent: '#ffe2a8', size: .95, texture: 'spark_01', pace: .03, arc: .3 },
  // Trầm Hương: a crescent of axe light (his combat profile carries a cleave fan, so every hit gets its own crescent).
  h03Q: { form: 'bolt', matter: 'steel', color: '#9fd6ff', accent: '#ffffff', size: 1.3, texture: 'slash_01', pace: .028, arc: .1 },
  // Khổng Tước: a peacock feather glides out.
  h03R: { form: 'bolt', matter: 'wood', color: '#4cc9a0', accent: '#ffe27a', size: 1, texture: 'twirl_01', pace: .032, arc: .35, motif: { kind: 'peacock', size: 1.6 } },
  // Triệu Công Minh: the whip cracks and coins scatter.
  h03S: { form: 'smash', matter: 'fire', color: '#f2b134', accent: '#fff1b8', size: 1.4, texture: 'slash_01', motif: { kind: 'coin', size: 1.7 } },
  // Tịnh Đàn Sứ Giả: purifying water falls on the target.
  h03T: { form: 'smash', matter: 'water', color: '#7fd8e6', accent: '#ffffff', size: 1.4, texture: 'circle_03' },
  // Kim Thân La Hán: a golden palm and dharma wheel.
  h03U: { form: 'bolt', matter: 'steel', color: '#f0c850', accent: '#fff6cf', size: 1.1, texture: 'circle_03', pace: .03, arc: .2, motif: { kind: 'wheel', size: 1.7 } },
  // Bát Bộ Thiên Long: deep emerald dragon darts.
  h03V: { form: 'bolt', matter: 'wood', color: '#2fbf75', accent: '#d9ffe8', size: .85, texture: 'trace_01', pace: .026, arc: .2, motif: { kind: 'dragon', size: 1.8 } },
};

const ELEMENT_LOOK = [
  { matter: 'steel', color: '#f5c85b', accent: '#fff4c9' },
  { matter: 'wood', color: '#3ac587', accent: '#e6ffe9' },
  { matter: 'water', color: '#38bdf8', accent: '#e4fbff' },
  { matter: 'fire', color: '#fb7135', accent: '#ffe2a8' },
  { matter: 'earth', color: '#bd9255', accent: '#f2e0b8' },
] as const;

/**
 * Look of a hero-skinned enemy's hit when its skin hero has no profile of its own: element picks colour and matter,
 * reach and combat geometry pick the form (cleave = arc, pierce = thrust, bounce = chain, else bolt at range or smash).
 */
export function skinnedEnemyProfile(skinHeroId: string): BasicAttackProfile | undefined {
  const profile = BASIC_ATTACK_PROFILES[skinHeroId];
  if (profile) return profile;
  const hero = HERO_BY_ID[skinHeroId];
  if (!hero) return undefined;
  const look = ELEMENT_LOOK[Math.min(4, Math.max(0, hero.element - 1))];
  const geometry = HERO_COMBAT_PROFILES[skinHeroId]?.geometry.type;
  const ranged = hero.range > 3;
  const form: BasicAttackForm = geometry === 'frontal_cleave' ? (ranged ? 'bolt' : 'arc')
    : geometry === 'linear_pierce' ? 'thrust' : geometry === 'bounce' ? 'chain' : ranged ? 'bolt' : 'smash';
  const texture: BasicAttackTexture = form === 'arc' ? 'slash_01' : form === 'smash' ? 'circle_03' : 'spark_01';
  return { form, ...look, size: 1.2, texture, pace: .03, arc: .25 };
}
