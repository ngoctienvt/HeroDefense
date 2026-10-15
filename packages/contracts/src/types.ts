export const CONTENT_VERSION = 'thien-dao-web-3';
export type Difficulty = 'normal' | 'nightmare' | 'hell' | 'supreme';
export type Role = 'warrior' | 'ranger' | 'mage' | 'guardian' | 'support';
export type AbilityKind = 'cleave' | 'chain' | 'nova' | 'shield' | 'heal';
export type AttackGeometryType =
  | 'single'
  | 'frontal_cleave'
  | 'linear_pierce'
  | 'multishot'
  | 'impact_splash'
  | 'bounce'
  | 'boomerang';
export type OnHitTraitType =
  | 'crit_pierce'
  | 'nth_strike'
  | 'double_strike'
  | 'stacking_mark'
  | 'orbit_aura'
  | 'follow_up';

export type EnergyType = 'cooldown' | 'rage_on_attack' | 'rage_on_hit';

export interface AttackGeometryConfig {
  type: AttackGeometryType;
  radius?: number;
  length?: number;
  width?: number;
  shots?: number;
  angle?: number;
  splashDamageRatio?: number;
  cleaveSecondaryRatio?: number;
  bounces?: number;
  bounceDecay?: number;
  bounceRadius?: number;
  returnDamageRatio?: number;
  targetPriority?: 'lowest_hp' | 'highest_hp' | 'nearest' | 'boss';
  knockback?: number;
  maxTargets?: number;
}

export interface OnHitTraitConfig {
  type: OnHitTraitType;
  critChance?: number;
  critMultiplier?: number;
  flatArmorPierce?: number;
  percentArmorPierce?: number;
  nth?: number;
  nthEffect?: 'true_damage' | 'stun' | 'cluster' | 'sunder' | 'burst' | 'earthquake';
  nthBonusMultiplier?: number;
  nthStunDuration?: number;
  nthKnockback?: number;
  nthClusterTargets?: number;
  nthRadius?: number;
  nthSlow?: number;
  nthSlowDuration?: number;
  nthWardReduction?: number;
  nthWardDuration?: number;
  doubleChance?: number;
  extraStrikes?: number;
  bleedBonusDamage?: number;
  bleedDuration?: number;
  markDamagePerStack?: number;
  maxMarkStacks?: number;
  markDetonatePercentHp?: number;
  orbitRadius?: number;
  orbitInterval?: number;
  orbitDamage?: number;
  orbitElement?: 'fire' | 'sword' | 'ice';
  orbitSlow?: number;
  orbitSlowDuration?: number;
  orbitAttackSlow?: number;
  followUpRadius?: number;
  followUpCooldown?: number;
  followUpHeal?: number;
  poisonDps?: number;
  poisonDuration?: number;
  poisonSlow?: number;
  burnDpsRatio?: number;
  burnDuration?: number;
  burnExplosionDamage?: number;
  burnExplosionRadius?: number;
  healOnHit?: number;
  drainToGuardianRatio?: number;
  sunderOnCrit?: { amount: number; duration: number };
  sunderChance?: number;
  sunderAmount?: number;
  sunderDuration?: number;
  bonusDamageLowHpOrDebuff?: number;
  attackWeakPercent?: number;
  attackWeakDuration?: number;
}

export interface AbilityEffect {
  target: 'enemy' | 'allies' | 'self';
  shape: 'single' | 'chain' | 'radius';
  radius?: number;
  jumps?: number;
  status?: 'slow' | 'burn' | 'ward' | 'haste' | 'root' | 'stun' | 'sunder';
  statusSeconds?: number;
  statusStrength?: number;
  secondary?: { status: 'slow' | 'burn' | 'ward' | 'haste' | 'root' | 'stun' | 'sunder'; seconds: number; strength: number };
  maxTargets?: number;
  jumpRange?: number;
  knockback?: number;
  sunder?: number;
  bonusArmor?: number;
  reflect?: number;
  overhealShield?: boolean;
  pull?: number;
  groundBurnSeconds?: number;
}
export interface HeroAbility {
  name: string; description: string; kind: AbilityKind; cooldown: number; power: number;
  id?: string; provenance?: 'map' | 'original' | 'adapted'; effect?: AbilityEffect;
}
export interface HeroDef {
  id: string; index: number; name: string; faction: number; element: number; tier: number; role: Role;
  hp: number; attack: number; armor: number; range: number; interval: number; speed: number;
  ability: HeroAbility | null;
  trait?: { name: string; description: string };
  attackGeometry?: AttackGeometryConfig;
  onHitTrait?: OnHitTraitConfig;
  energyType?: EnergyType;
  maxEnergy?: number;
  block?: number;
  source: { scriptLine: number; rawcode: string; adapted: boolean };
}
export interface SynergyDef {
  id: number; name: string; description: string; members: string[]; thresholds: number[];
  bonus: 'attack' | 'health' | 'speed' | 'armor' | 'regen'; amount: number; sourceLine: number;
}
export interface CraftRecipe { heroId: string; ingredients: [string, string, string]; sourceIndex: number }
export interface FormationDef { id: number; name: string; description: string; bonus: 'attack' | 'health' | 'speed' | 'armor' | 'regen'; amount: number }
export interface DifficultyDef { id: Difficulty; name: string; waves: number; attack: number; health: number }
export interface DungeonDef { id: number; name: string; boss: string; wave: number; supremeOnly?: boolean }
export interface Vec { x: number; z: number }
export interface Unit extends Vec {
  id: string; heroId: string; owner: string; rank: number; slot: number; hp: number; maxHp: number;
  attack: number; armor: number; range: number; cooldown: number; abilityCooldown: number;
  energy?: number; maxEnergy?: number; energyType?: EnergyType; block?: number;
  target: string | null; destination: Vec | null; savedPosition: Vec | null; stopped: boolean;
  orderMode?: 'auto' | 'move' | 'attack' | 'attack-move' | 'hold'; engageAt?: Vec | null; guardPosition?: Vec | null;
  equipment: [number, number, number]; deaths: number; respawn: number; shield: number;
  stun?: number;
  ward?: { remaining: number; reduction: number };
  haste?: { remaining: number; amount: number; attackBonus?: number };
  empower?: { remaining: number; attackBonus: number; armorPierce: number };
  pendingAbility?: { remaining: number; targetId?: string; zone: number; point?: Vec; direction?: Vec };
  attackCount?: number; comboTarget?: string; comboCount?: number;
  attackType?: AttackGeometryType;
  onHitTrait?: OnHitTraitType;
  orbitTimer?: number;
  followUpCooldown?: number;
  bonusArmor?: { remaining: number; amount: number };
  reflect?: { amount: number };
  mistShield?: { remaining: number; amount: number };
  frostShield?: { remaining: number; amount: number; attackSlow: number };
  berserk?: { remaining: number; attackSpeed: number; lifesteal: number };
  heatStacks?: number;
  summonDuration?: number;
  zone: number; kills: number;
}
export interface Enemy extends Vec {
  id: string; owner: string; name: string; kind: 'melee' | 'ranged' | 'boss'; zone: number;
  monsterId?: 'm001' | 'm002' | 'm003' | 'm004' | 'b001';
  hp: number; maxHp: number; attack: number; armor: number; speed: number; cooldown: number;
  attackInterval?: number; attackRange?: number; lifestealOnHit?: number;
  shield?: number; armorBuff?: { remaining: number; amount: number };
  skillCooldown?: number; quakeCooldown?: number; shieldWarning?: boolean; quakeWarning?: boolean;
  target: string | null; leak: number; slow: number; slowStrength?: number;
  slows?: { remaining: number; strength: number }[]; pathIndex?: number;
  burn?: { remaining: number; damagePerSecond: number; casterId: string };
  poison?: { remaining: number; damagePerSecond: number; casterId: string };
  bleed?: { remaining: number; bonusDamage: number };
  soulLink?: { remaining: number; group: string[]; sharePercent: number };
  stun?: number; root?: number; sunder?: { remaining: number; amount: number; percent?: boolean };
  attackSlow?: { remaining: number; strength: number }; attackWeak?: { remaining: number; strength: number };
  markStacks?: Record<string, number>;
}
export interface Player {
  id: string; name: string; color: string; connected: boolean; ready: boolean;
  gold: number; souls: number; pellets: number; kills: number; damage: number;
  summonFailures: { tien: number; thien: number };
  pendingChoice: { source: 'tien' | 'thien' | 'chest-1' | 'chest-2'; heroIds: string[] } | null;
  embryos: { tier3: number; tier4: number; tier4Purchased: boolean };
  formation: number; formationLevels: number[]; formationPoints: number;
  activeSynergies: { id: number; count: number; level: number }[];
}
export interface Dungeon { id: number; unlocked: boolean; cleared: boolean; active: boolean; attempts: number; owner: string | null; remaining: number }
export interface BoomerangState {
  id: number;
  casterId: string;
  start: Vec;
  end: Vec;
  zone: number;
  remaining: number;
  totalDuration: number;
  damage: number;
  penetration: number;
  phase: 'outward' | 'return';
  hitIds: string[];
}
export interface GameEvent {
  id: number;
  kind: 'attack' | 'trait' | 'cast' | 'ability' | 'death' | 'reward' | 'wave' | 'info';
  source?: string;
  target?: string;
  targets?: string[];
  x?: number;
  z?: number;
  value?: number;
  text?: string;
  ability?: AbilityKind;
  skillId?: string;
  at?: number;
  geometry?: AttackGeometryType;
  traitType?: OnHitTraitType;
  isCrit?: boolean;
  markStacks?: number;
  direction?: Vec;
  zone?: number;
  windup?: number;
}
export interface GameState {
  version: string; roomCode: string; host: string; seed: number; tick: number; elapsed: number; serial: number;
  phase: 'lobby' | 'preparation' | 'combat' | 'won' | 'lost'; difficulty: Difficulty;
  wave: number; maxWaves: number; remaining: number; baseHp: number; maxBaseHp: number; speed: number;
  players: Record<string, Player>; units: Record<string, Unit>; enemies: Record<string, Enemy>;
  dungeons: Dungeon[]; events: GameEvent[]; notice: string; stars: number;
  spawned: number; spawnBudget: number; spawnTimer: number;
  groundEffects?: { x: number; z: number; zone: number; radius: number; remaining: number; damagePerSecond: number; casterId: string;
    kind?: 'pangu-rift'; id?: string; direction?: Vec; length?: number; width?: number; slowStrength?: number }[];
  boomerangs?: BoomerangState[];
}
export type Command =
  | { type: 'ready'; ready: boolean }
  | { type: 'start' }
  | { type: 'difficulty'; difficulty: Difficulty }
  | { type: 'summon'; pack?: 'phan' | 'tien' | 'thien' }
  | { type: 'choose-hero'; heroId: string }
  | { type: 'redeem'; item: 'chest-1' | 'chest-2' | 'embryo-3' | 'embryo-4' }
  | { type: 'deploy'; unitId: string; slot: number }
  | { type: 'bench'; unitId: string }
  | { type: 'merge'; unitId: string }
  | { type: 'craft'; heroId: string }
  | { type: 'sell'; unitId: string }
  | { type: 'equip'; unitId: string; category: number }
  | { type: 'cast'; unitId: string; target?: string }
  | { type: 'move'; unitId: string; x: number; z: number }
  | { type: 'attack'; unitId: string; target: string }
  | { type: 'stop'; unitId: string }
  | { type: 'order'; unitIds: string[]; order: 'move' | 'attack-move' | 'attack' | 'stop' | 'hold'; x?: number; z?: number; target?: string }
  | { type: 'save-position'; unitId: string; clear?: boolean }
  | { type: 'formation'; formation: number }
  | { type: 'upgrade-formation'; formation: number }
  | { type: 'dungeon'; dungeonId: number; unitIds: string[] }
  | { type: 'return'; unitId: string }
  | { type: 'next-wave' }
  | { type: 'speed'; speed: number }
  | { type: 'admin-get-hero'; heroId: string; rank?: number; deploy?: boolean }
  | { type: 'admin-resources'; gold?: number; souls?: number; pellets?: number; formationPoints?: number };
export interface CommandEnvelope { id: number; command: Command }
export interface CommandResult { ok: boolean; message?: string }
export interface CommandAck extends CommandResult { id: number }
export interface SessionInfo { roomId: string; sessionId: string; code: string; token: string; release: string }
