import type { HeroAbility } from '../packages/contracts/src/types.js';

/**
 * Thái Bạch Kim Tinh (h015): web-original rescuer. Saves one ally from death and
 * brings back the strongest fallen ally; Nữ Oa is the mass reviver.
 */
export const THAIBACH = {
  id: 'h015', hp: 3700, attack: 620, armor: 18, range: 8.5, interval: 1, speed: 3.9,
  /** Tinh Quang Tiễn: single-target bolt; heals the lowest ally by % of their own Máu. */
  boltPower: 1, healRatio: .015, healRadius: 9,
  /** Trường Canh Hộ Mệnh: passive cheat-death for one owned ally. */
  guardRadius: 10, guardCooldown: 45, guardHealRatio: .25, guardInvulnerable: 1.5,
  /** Tinh Quân Hồi Mệnh. */
  cooldown: 16, windup: .5, reviveHpRatio: .6, reviveInvulnerable: 1.5,
  healPower: 4, haste: .25, hasteSeconds: 5,
} as const;

export const THAIBACH_ABILITY: HeroAbility = {
  id: 'skill-h015', provenance: 'original', name: 'Tinh Quân Hồi Mệnh',
  description: 'Hồi chiêu 16 giây: nếu có đồng minh cùng chủ đang chờ hồi sinh, hồi sinh người có Công cao nhất cạnh Thái Bạch với 60% Máu và miễn sát thương 1,5 giây. Nếu không, hồi 400% Công cho đồng minh thấp Máu nhất, xóa choáng và tăng 25% tốc đánh trong 5 giây.',
  kind: 'heal', cooldown: THAIBACH.cooldown, power: THAIBACH.healPower,
  effect: { target: 'allies', shape: 'single', radius: 12 },
};
