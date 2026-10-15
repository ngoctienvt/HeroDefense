import type { HeroAbility, HeroDef, Role, SynergyDef } from '../../packages/contracts/src/types';

export const ROLE_BY_LABEL: Record<string, Role> = {
  '[Xạ Thủ]': 'ranger', '[Chiến Binh]': 'warrior', '[Pháp Sư]': 'mage',
  '[Hộ Thuẫn]': 'guardian', '[Thuật Sĩ]': 'support',
};

const ROLE_PROFILE: Record<Role, { hp: number; attack: number; armor: number; range: number; interval: number; ability: HeroAbility }> = {
  warrior: { hp: 1.1, attack: 1.12, armor: 5, range: 1.8, interval: 1.05,
    ability: { name: 'Hoành Tảo', description: 'Quét các kẻ địch gần mục tiêu, gây sát thương theo công kích.', kind: 'cleave', cooldown: 8, power: 2.2 } },
  ranger: { hp: 0.85, attack: 1.18, armor: 2, range: 8, interval: 0.9,
    ability: { name: 'Liên Xạ', description: 'Đòn đánh nối tiếp nhiều kẻ địch trong tầm.', kind: 'chain', cooldown: 9, power: 1.8 } },
  mage: { hp: 0.8, attack: 1.3, armor: 1, range: 7, interval: 1.35,
    ability: { name: 'Linh Lực Bạo Phát', description: 'Bùng nổ linh lực, gây sát thương diện rộng quanh mục tiêu.', kind: 'nova', cooldown: 11, power: 3 } },
  guardian: { hp: 1.55, attack: 0.75, armor: 11, range: 1.8, interval: 1.2,
    ability: { name: 'Kim Chung Tráo', description: 'Tạo hộ thuẫn hấp thụ sát thương cho bản thân và đồng đội gần bên.', kind: 'shield', cooldown: 12, power: 3.5 } },
  support: { hp: 1, attack: 0.9, armor: 3, range: 6.5, interval: 1.2,
    ability: { name: 'Hồi Xuân', description: 'Hồi sinh lực cho đồng đội bị thương trong phạm vi.', kind: 'heal', cooldown: 10, power: 3 } },
};

export function adaptedStats(role: Role, tier: number, sourceHp: number, sourceSpeed: number, sourceRange: number): Pick<HeroDef, 'hp' | 'attack' | 'armor' | 'range' | 'interval' | 'speed' | 'ability'> {
  const profile = ROLE_PROFILE[role];
  return {
    hp: Math.round(sourceHp / 10 * profile.hp), attack: Math.round((28 + tier * 15) * profile.attack),
    armor: profile.armor + tier, range: Math.max(profile.range, sourceRange / 100),
    interval: profile.interval, speed: sourceSpeed / 100, ability: { ...profile.ability },
  };
}

/** Source-specific procs are exposed separately; these are the web combat equivalents. */
export const SYNERGY_BONUSES: SynergyDef['bonus'][] = [
  'attack', 'health', 'speed', 'attack', 'attack', 'regen', 'attack', 'attack', 'regen',
  'armor', 'armor', 'health', 'attack', 'attack', 'armor', 'regen', 'speed', 'attack',
  'attack', 'attack', 'armor', 'health', 'attack', 'attack', 'health', 'speed', 'attack',
];
