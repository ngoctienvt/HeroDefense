export const GEAR_SLOTS = ['weapon', 'armor', 'talisman'] as const;
export const GEAR_RARITIES = ['white', 'blue', 'purple', 'gold'] as const;
export type GearSlot = typeof GEAR_SLOTS[number];
export type GearRarity = typeof GEAR_RARITIES[number];
export type GearStatId =
  | 'attack-percent' | 'crit-chance' | 'crit-damage' | 'armor-pierce' | 'boss-damage'
  | 'execute-damage' | 'lifesteal' | 'pierce-length' | 'cleave-radius'
  | 'health-percent' | 'armor-flat' | 'damage-reduction' | 'health-regen'
  | 'respawn-reduction' | 'wave-shield' | 'melee-reflect'
  | 'attack-speed' | 'skill-damage' | 'cooldown-reduction' | 'rage-gain'
  | 'status-duration' | 'dot-damage' | 'summon-duration';
export const GEAR_UNIQUE_IDS = [
  'heaven-earth-reversal', 'sea-anchor', 'time-reversal', 'eight-trigram-mirror', 'inheritance-seal',
  'fate-defiance', 'star-absorption', 'blood-pact', 'demon-heart', 'seven-kills', 'lightning-talisman',
  'seated-oblivion', 'yin-yang', 'heaven-devouring-gourd', 'treasure-basin', 'celestial-net', 'wind-fire-wheels',
] as const;
export type GearUniqueId = typeof GEAR_UNIQUE_IDS[number];
/** Percent values use percentage points: 12 means +12%, not 0.12. */
export interface GearLine { stat: GearStatId; value: number }
export interface GearItem {
  id: string; slot: GearSlot; rarity: GearRarity; level: number; enhance: number; rerolls: number;
  lines: GearLine[]; unique?: GearUniqueId; unitId: string | null;
  stacks?: number; absorbedAttack?: number; absorbedHp?: number;
}
export type GearSource = 'kill' | 'boss' | 'drought' | 'dungeon' | 'admin';
export interface GearStats {
  drops: Partial<Record<GearRarity, number>>;
  sources: Partial<Record<GearSource, number>>;
  uniques: Partial<Record<GearUniqueId, number>>;
  commands: Partial<Record<string, number>>;
}
export type GearCommand =
  | { type: 'equip-item'; itemId: string; unitId: string }
  | { type: 'unequip-item' | 'enhance-item' | 'reroll-item' | 'salvage-item'; itemId: string }
  | { type: 'admin-item'; slot?: GearSlot; rarity?: GearRarity; unique?: GearUniqueId };
