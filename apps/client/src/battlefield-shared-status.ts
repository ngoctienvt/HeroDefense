import type { SharedMark } from './visual-shared-status.js';
import type { VisualActor } from './visual-actors.js';

/** Snapshot fields read from a Unit or an Enemy (structural, so tests need no full GameState). */
export type SharedStatusSnapshot = {
  monsterId?: string; heroId?: string; shield?: number; stun?: number; frozen?: number; sealed?: number; divineImmortal?: number;
  ward?: { remaining: number; reduction: number; kind?: string }; haste?: { remaining: number; amount: number };
  attackWeak?: { remaining: number }; pureLand?: { remaining: number }; soulLink?: { remaining: number };
  armorBuff?: { remaining: number }; berserk?: { remaining: number };
};
/** Hero-specific looks that already replace a game-wide one on the same actor (their own module draws them). */
export type SharedStatusActor = Partial<Pick<VisualActor, 'kimtraBell' | 'culinhBulwark' | 'nuwaShielded' | 'blackWaterShield'
  | 'nhiepShield' | 'mandonHaste' | 'moctraFrenzy' | 'manhbaBond'>>;

/** Heroes whose own berserk art replaces the game-wide mark (Hình Thiên's immortal flame, Kim Sí Điểu's golden feathers). */
const OWN_BERSERK_HEROES = ['h011', 'h016', 'h01I'];

/**
 * Game-wide statuses to draw on one actor this snapshot, each from its real server field (never inferred from a skill
 * or a position). One neutral design per effect, whatever the hero's element; several different effects stack as
 * small marks/sheets, the same effect from several sources is one entry. Freeze is added by the battlefield, which
 * knows which frozen enemies a hero module (Cộng Công's black ice, Trường Đạo Lăng) already draws.
 */
export function sharedStatuses(entity: SharedStatusSnapshot, hero: boolean, actor: SharedStatusActor): SharedMark[] {
  const marks: SharedMark[] = [];
  const frozen = (entity.frozen ?? 0) > 0;
  if ((entity.stun ?? 0) > 0 && !frozen) marks.push('stun');
  if ((entity.shield ?? 0) > 0 && entity.monsterId !== 'b001' && !actor.kimtraBell && !actor.culinhBulwark
    && !actor.nuwaShielded && !actor.blackWaterShield && !actor.nhiepShield) marks.push('shield');
  if (hero) {
    if ((entity.divineImmortal ?? 0) > 0) marks.push('invulnerable');
    const ward = entity.ward;
    if (ward && ward.remaining > 0 && ward.reduction > 0 && !ward.kind && !actor.culinhBulwark) marks.push('damage-reduction');
    if (entity.haste && entity.haste.remaining > 0 && entity.haste.amount > 0 && !actor.mandonHaste) marks.push('haste');
    if ((entity.berserk?.remaining ?? 0) > 0 && !OWN_BERSERK_HEROES.includes(entity.heroId ?? '') && !actor.moctraFrenzy) marks.push('berserk');
  } else {
    if ((entity.sealed ?? 0) > 0) marks.push('seal');
    if ((entity.attackWeak?.remaining ?? 0) > 0) marks.push('attack-down');
    if ((entity.pureLand?.remaining ?? 0) > 0) marks.push('vulnerable');
    // Slow, root, poison, burn and armour break are body tints (visual-status-tint.ts), not marks.
    if ((entity.soulLink?.remaining ?? 0) > 0 && !actor.manhbaBond) marks.push('soul-link');
    if ((entity.armorBuff?.remaining ?? 0) > 0) marks.push('armor-up');
  }
  return marks;
}
