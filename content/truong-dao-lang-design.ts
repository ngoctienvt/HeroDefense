import type { HeroAbility } from '../packages/contracts/src/types.js';

/** Web adaptation; the Warcraft map does not prove this skill. */
export const TRUONG_DAO_LANG = {
  id: 'h040', hp: 8500, attack: 1220, armor: 29, range: 9, interval: .95, speed: 3.8,
  radius: 9, freezeSeconds: 2.5, damagePower: 6, bolts: 21,
  slow: .45, slowSeconds: 2.5, splashRadius: 2.5, chainTargets: 6,
  bonusPower: 1.5, sunder: .5, sunderSeconds: 3,
  buffSeconds: 5, haste: .4, lightningPower: .35,
  cooldown: 10, windup: .35,
} as const;

export const TRUONG_DAO_LANG_ABILITY: HeroAbility = {
  id: 'skill-h040', provenance: 'adapted',
  name: 'Cửu Thiên Ngũ Lôi Chính Pháp & Bắc Đẩu Trận',
  description: 'Hồi chiêu 10 giây: bảy cự kiếm Băng–Lôi đóng băng quái và Boss 2,5 giây trong bán kính 9; 21 tia lôi gây tổng 600% Công và phá 50% Giáp trong 3 giây. Toàn bộ đồng minh được +40% tốc đánh và đòn thường kèm sét trong 5 giây.',
  kind: 'nova', cooldown: TRUONG_DAO_LANG.cooldown, power: TRUONG_DAO_LANG.damagePower,
  effect: { target: 'enemy', shape: 'radius', radius: TRUONG_DAO_LANG.radius },
};
