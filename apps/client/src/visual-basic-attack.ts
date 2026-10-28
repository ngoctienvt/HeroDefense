import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { HERO_COMBAT_PROFILES } from '../../../packages/contracts/src/combat-profiles.js';
import type { AttackGeometryConfig, GameEvent } from '../../../packages/contracts/src/types.js';
import { BASIC_ATTACK_PROFILES, PREEMPTING_BASIC_ATTACKS, skinnedEnemyProfile, type BasicAttackProfile } from './visual-basic-attack-profiles.js';
import type { TierSkillPainter } from './visual-tier-skills.js';

const BODY_HEIGHT = 1.2;
const CRIT_SCALE = 1.35;
const ENEMY_SCALE = .85;
const FLAT = new Vector3(1, 0, 0);

/** Hero id of a basic-attack event (`trait-`, `bounce-`, `splash-`, `nth-` ids), or '' when it has no profile. */
export function basicAttackHeroId(skillId?: string): string {
  const match = /^(?:trait|bounce|splash|nth|boomerang-return)-(h[0-9A-Z]{3})$/.exec(skillId ?? '');
  return match && BASIC_ATTACK_PROFILES[match[1]] ? match[1] : '';
}

/** True when the profile must be painted before the hero's own module sees the event. */
export function basicAttackPreempts(skillId?: string): boolean {
  return PREEMPTING_BASIC_ATTACKS.has(basicAttackHeroId(skillId));
}

/** Sweep and lance are one motion per swing: the first event of a server tick (per attacker) draws it, the rest only impact. */
const swungAt = new Map<string, number>();

function isRepeatSwing(event: GameEvent): boolean {
  if (event.source === undefined || event.at === undefined) return false;
  const repeat = swungAt.get(event.source) === event.at;
  if (!repeat) {
    if (swungAt.size >= 64) swungAt.clear();
    swungAt.set(event.source, event.at);
  }
  return repeat;
}

const lift = (at: Vector3, height = BODY_HEIGHT): Vector3 => at.add(new Vector3(0, height, 0));

/** Unit vector on the ground plane from `from` to `to`; +X when the two coincide. */
function aim(from: Vector3, to: Vector3): Vector3 {
  const flat = new Vector3(to.x - from.x, 0, to.z - from.z);
  return flat.lengthSquared() < 1e-4 ? FLAT.clone() : flat.normalize();
}

function rotate(direction: Vector3, angle: number): Vector3 {
  const cos = Math.cos(angle), sin = Math.sin(angle);
  return new Vector3(direction.x * cos - direction.z * sin, 0, direction.x * sin + direction.z * cos);
}

/** The impact of one hit: what the matter looks like when it lands. Always at least one ring, so reduced motion keeps the spot. */
function impact(fx: TierSkillPainter, profile: BasicAttackProfile, at: Vector3, scale: number): void {
  const size = profile.size * scale;
  fx.shockwave(at, profile.color, .55 * scale + size * .25, .22);
  switch (profile.matter) {
    case 'water': fx.water(at, .8 * scale, .3); break;
    case 'fire': fx.fire(at, .7 * scale); break;
    case 'ink': fx.smoke(at, profile.accent, .7 * scale, .3); break;
    case 'steel': fx.image(lift(at), profile.accent, size * .9, .16, 'spark_01'); break;
    case 'spirit': fx.image(lift(at), profile.color, size * 1.2, .24, 'magic_01'); break;
    case 'wood': fx.image(lift(at), profile.accent, size * 1.1, .2, 'spark_01'); break;
    case 'earth': fx.smoke(at, profile.color, .8 * scale, .32); break;
    case 'lightning': fx.flash(lift(at), profile.accent, 1.4 * scale, .1); break;
  }
  if (profile.motif && !fx.reduced) fx.motif(at, profile.motif.kind, profile.motif.size * scale, .28);
  fx.burst(lift(at, .6), profile.color, scale > 1 ? 6 : 3, .5 * scale);
}

/** Blade sweep across the cleave fan: three glyphs staggered along the arc so the swing reads as motion. */
function paintArc(fx: TierSkillPainter, profile: BasicAttackProfile, from: Vector3, to: Vector3, reach: number,
  fan: number, scale: number): void {
  const direction = aim(from, to);
  const radius = Math.min(Math.max(reach * .7, 1.4), 3);
  const half = Math.min(fan, Math.PI) / 2;
  [-half * .8, 0, half * .8].forEach((angle, index) => {
    const at = lift(from.add(rotate(direction, angle).scale(radius)));
    const stage = () => {
      fx.image(at, index === 1 ? profile.accent : profile.color, profile.size * scale, .2, profile.texture);
      if (index === 1) fx.beam(lift(from), at, profile.color, .16 * scale, .14);
    };
    if (index === 0) stage(); else fx.later(index * .045, stage);
  });
}

/** Lance along the pierce line: a tapered beam from the weapon to the end of the line, bright core on the first hit. */
function paintThrust(fx: TierSkillPainter, profile: BasicAttackProfile, from: Vector3, to: Vector3, length: number,
  scale: number): void {
  const direction = aim(from, to);
  const end = from.add(direction.scale(Math.max(length, Vector3.Distance(from, to))));
  fx.beam(lift(from), lift(end), profile.color, .3 * scale, .22);
  // A bright head runs down the line so the thrust is seen travelling to the monster instead of appearing all at once.
  fx.travel(lift(from), lift(end), profile.accent, profile.size * scale, profile.texture,
    Math.max(.1, Math.min(.24, Vector3.Distance(from, end) * .02)), () => undefined, { orient: true });
  fx.beam(lift(from), lift(to), profile.accent, .12 * scale, .18);
  fx.image(lift(to), profile.accent, profile.size * scale, .18, profile.texture);
}

function paintFlight(fx: TierSkillPainter, profile: BasicAttackProfile, from: Vector3, to: Vector3, scale: number,
  arrive: () => void): void {
  const distance = Vector3.Distance(from, to);
  const duration = Math.max(.1, Math.min(.36, distance * (profile.pace ?? .03)));
  fx.flash(lift(from), profile.accent, .7 * scale, .1);
  fx.travel(lift(from), to, profile.color, profile.size * scale, profile.texture, duration, arrive,
    { arcHeight: profile.arc ?? 0, spin: profile.form === 'chain' ? 10 : 0, orient: profile.form === 'bolt' });
}

function paintProfile(fx: TierSkillPainter, profile: BasicAttackProfile, geometry: AttackGeometryConfig | undefined,
  event: GameEvent, from: Vector3, to: Vector3, baseScale: number): void {
  const scale = baseScale * (event.isCrit ? CRIT_SCALE : 1);
  if (fx.reduced) { impact(fx, profile, to, scale); return; }
  switch (profile.form) {
    case 'arc':
      if (!isRepeatSwing(event)) paintArc(fx, profile, from, to, geometry?.radius ?? 2.2, geometry?.angle ?? Math.PI * 2 / 3, scale);
      impact(fx, profile, to, scale);
      break;
    case 'thrust':
      if (!isRepeatSwing(event)) paintThrust(fx, profile, from, to, geometry?.length ?? 5, scale);
      impact(fx, profile, to, scale);
      break;
    case 'smash':
      fx.image(lift(to, 2.2), profile.accent, profile.size * scale, .14, 'slash_01');
      fx.later(.07, () => impact(fx, profile, to, scale * 1.2));
      break;
    case 'bolt':
    case 'chain':
      paintFlight(fx, profile, from, to, scale, () => impact(fx, profile, to, scale));
      break;
  }
  if (event.isCrit) {
    fx.flash(lift(to), '#ffea78', 1.8, .16);
    fx.burst(lift(to), '#ffea78', 5, 1.1);
  }
}

/**
 * Paints one basic attack for a profiled hero. Returns false when the hero has no profile so the caller can keep the
 * older painters; geometry numbers come from the combat profile, never from the event alone.
 */
export function paintBasicAttack(fx: TierSkillPainter, event: GameEvent, from: Vector3, to: Vector3): boolean {
  const heroId = basicAttackHeroId(event.skillId);
  if (!heroId) return false;
  paintProfile(fx, BASIC_ATTACK_PROFILES[heroId], HERO_COMBAT_PROFILES[heroId]?.geometry, event, from, to, 1);
  return true;
}

/** Enemy shown with a hero's skin: the skin hero's look, a little smaller than the hero's own so allies read first. */
export function paintEnemyBasicAttack(fx: TierSkillPainter, event: GameEvent, from: Vector3, to: Vector3,
  skinHeroId: string): boolean {
  const profile = skinnedEnemyProfile(skinHeroId);
  if (!profile) return false;
  // A lance never runs past the hero it hits, so the pierce length is dropped for enemies.
  const geometry = HERO_COMBAT_PROFILES[skinHeroId]?.geometry;
  paintProfile(fx, profile, geometry && { ...geometry, length: 0 }, { ...event, isCrit: false }, from, to, ENEMY_SCALE);
  return true;
}
