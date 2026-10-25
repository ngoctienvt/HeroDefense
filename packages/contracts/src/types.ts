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
  | 'follow_up'
  | 'berserk'
  | 'pure_land'
  | 'moon_bounce'
  | 'poison'
  | 'soul_link';

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

/**
 * Web-original hand-attack passive for melee and ranged carries. Bonuses apply to the
 * basic attack's primary target only, so cleave/multishot hits never multiply them.
 */
export interface CarryPassiveConfig {
  name: string;
  /** Heals this share of the HP damage the basic attack deals to its primary target. */
  lifesteal?: number;
  /** Each basic attack adds one attack-speed stack; all stacks drop after CARRY_STACK_SECONDS idle. */
  fervor?: { perStack: number; maxStacks: number };
  /** Consecutive basic attacks on the same primary target add damage; switching target resets. */
  focus?: { perStack: number; maxStacks: number };
  /** Extra damage when the primary target is at least minDistance away. */
  longShot?: { bonus: number; minDistance: number };
  /** Extra damage against a primary target below CARRY_EXECUTE_THRESHOLD HP. */
  execute?: number;
  /** Extra damage against bosses. */
  bossBonus?: number;
  /** Damage-taken reduction while CARRY_CROWD_COUNT enemies are within CARRY_CROWD_RADIUS. */
  crowdGuard?: number;
  /** Attack-speed bonus for CARRY_STACK_SECONDS after a basic attack kills its primary target. */
  momentum?: number;
}

export interface OnHitTraitConfig {
  type: OnHitTraitType;
  critChance?: number;
  critMultiplier?: number;
  flatArmorPierce?: number;
  percentArmorPierce?: number;
  nth?: number;
  nthEffect?: 'true_damage' | 'stun' | 'knockback' | 'cluster' | 'sunder' | 'burst' | 'earthquake';
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
  /** Detonation damage as a multiple of the triggering hit's base damage. */
  markDetonatePower?: number;
  orbitRadius?: number;
  orbitInterval?: number;
  orbitDamage?: number;
  orbitDamageRatio?: number;
  orbitElement?: 'fire' | 'sword' | 'ice' | 'water';
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
  shape: 'single' | 'chain' | 'radius' | 'line';
  radius?: number;
  length?: number;
  width?: number;
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
  /** Extra heal/shield equal to this share of each recipient's max HP, so support stays relevant late. */
  recipientMaxHpRatio?: number;
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
  carryPassive?: CarryPassiveConfig;
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
  /** Deaths in the current wave; deaths remains the whole-match statistic. */
  waveDeaths?: number;
  stun?: number;
  ward?: { remaining: number; reduction: number; kind?: 'black-water' | 'five-color'; sourceSkillId?: string };
  haste?: { remaining: number; amount: number; attackBonus?: number; cooldownReduction?: number; sourceSkillId?: string };
  critBlessing?: { remaining: number; chance: number };
  fuxiBlessing?: { remaining: number; attackBonus: number; skillBonus: number };
  thunderBlessing?: { remaining: number; power: number };
  bodhiBlessing?: { remaining: number };
  primordialBlessing?: { remaining: number };
  lanternShield?: { remaining: number; amount: number; casterId: string };
  divineShield?: { remaining: number; amount: number };
  divineImmortal?: number;
  empower?: { remaining: number; attackBonus: number; armorPierce: number; kind?: 'peach' };
  pendingAbility?: { remaining: number; targetId?: string; zone: number; point?: Vec; direction?: Vec };
  shadowAssault?: { remaining: number; pulseTime: number; pulses: number; point: Vec; zone: number; targets: string[] };
  attackCount?: number; comboTarget?: string; comboCount?: number;
  attackType?: AttackGeometryType;
  onHitTrait?: OnHitTraitType;
  orbitTimer?: number;
  followUpCooldown?: number;
  bonusArmor?: { remaining: number; amount: number };
  /** Temporary extra block cap: draws more enemies onto a guardian without a rolled taunt. */
  blockBonus?: { remaining: number; amount: number };
  reflect?: { amount: number };
  mistShield?: { remaining: number; amount: number };
  frostShield?: { remaining: number; amount: number; attackSlow: number };
  berserk?: { remaining: number; attackSpeed: number; lifesteal: number; immortal?: boolean; critChance?: number;
    /** Optional server provenance for a skill-specific presentation; never used to calculate combat. */
    sourceSkillId?: string };
  heatStacks?: number;
  /** Carry passive runtime state (server-authoritative, mirrored in snapshots). */
  carryFervor?: { stacks: number; remaining: number };
  carryFocus?: { target: string; stacks: number };
  carryMomentum?: { remaining: number; amount: number };
  summonDuration?: number;
  summonKind?: 'buddha-clone' | 'monkey-clone' | 'ancient-tree' | 'blood-warrior' | 'blood-general';
  summonerId?: string;
  bloodDeathCount?: number;
  phoenixCycle?: number;
  phoenixEgg?: { remaining: number };
  /** Thái Bạch's Trường Canh Hộ Mệnh cooldown (on the Thái Bạch unit). */
  starGuardCooldown?: number;
  tierShield?: { remaining: number; amount: number; kind: 'water' | 'gold' };
  tierGoldShields?: { remaining: number; amount: number }[];
  nuwaShields?: { remaining: number; amount: number }[];
  tierBuff?: { remaining: number; kind: 'poison' | 'fire' | 'nezha' };
  tierImmortal?: { remaining: number; activeRemaining: number };
  tierSoulCount?: number;
  tierPetTimer?: number;
  zone: number; kills: number;
}

export type EnemyRank = 'minion' | 'elite' | 'chieftain' | 'boss';
export type EnemyKitId = 'hac-phong' | 'nguu-ma' | 'thiet-phien' | 'hinh-thien' | 'chuc-dung' | 'cong-cong';
export type EnemySkillTemplate = 'A' | 'B' | 'C' | 'D' | 'A+' | 'C+';
export type EnemyTelegraphShape = 'circle' | 'line' | 'cone' | 'marks' | 'none';

export interface EnemySkillState {
  id: string;
  cooldown: number;
  maxCooldown: number;
  windup?: {
    remaining: number;
    point?: Vec;
    direction?: Vec;
    targets?: string[];
  };
}

export interface Enemy extends Vec {
  id: string; owner: string; name: string; kind: 'melee' | 'ranged' | 'boss'; zone: number;
  monsterId?: 'm001' | 'm002' | 'm003' | 'm004' | 'b001';
  skinHeroId?: string;
  rank?: EnemyRank;
  kit?: EnemyKitId;
  skills?: EnemySkillState[];
  linkId?: string;
  enraged?: boolean;
  hp: number; maxHp: number; attack: number; armor: number; speed: number; cooldown: number;
  attackInterval?: number; attackRange?: number; lifestealOnHit?: number;
  shield?: number; armorBuff?: { remaining: number; amount: number };
  target: string | null; leak: number; slow: number; slowStrength?: number;
  slows?: { remaining: number; strength: number }[]; pathIndex?: number;
  burn?: { remaining: number; damagePerSecond: number; casterId: string; trueDamage?: boolean };
  poison?: { remaining: number; damagePerSecond: number; casterId: string };
  bleed?: { remaining: number; bonusDamage: number; damagePerSecond?: number; casterId?: string };
  armorCuts?: { remaining: number; amount: number };
  pureLand?: { remaining: number; bonusDamage: number };
  soulLink?: { remaining: number; group: string[]; sharePercent: number; casterId?: string };
  critVulnerability?: { remaining: number; amount: number };
  stun?: number; frozen?: number; root?: number; sealed?: number; sunder?: { remaining: number; amount: number; percent?: boolean };
  silence?: number;
  fireMark?: number;
  primordialMark?: { remaining: number; owner: string; casterId: string; bonus: number };
  attackSlow?: { remaining: number; strength: number }; attackWeak?: { remaining: number; strength: number };
  markStacks?: Record<string, number>;
  /** Melee ring slot: the hero this enemy surrounds and its angle (radians) around that hero. */
  engage?: { target: string; angle: number };
  /** Attack in progress: damage lands on `target` when `remaining` reaches 0 (stun/freeze cancels it). */
  windup?: { remaining: number; target: string };
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
  /** Optional presentation recipients; never damage targets or client selection input. */
  supportTargets?: string[];
  /** Server-selected resource recipient, separate from healing or damage recipients. */
  resourceTarget?: string;
  /** Original/end positions of a server-confirmed displacement; presentation only. */
  displacements?: { id: string; from: Vec; to: Vec }[];
  /** Locked area center when x/z describes a random pulse focus instead. */
  areaCenter?: Vec;
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
  strikeIndex?: number;
  direction?: Vec;
  zone?: number;
  windup?: number;
  radius?: number;
  length?: number;
  width?: number;
  angle?: number;
  telegraph?: EnemyTelegraphShape;
}
export interface GameState {
  version: string; roomCode: string; host: string; seed: number; tick: number; elapsed: number; serial: number;
  phase: 'lobby' | 'preparation' | 'combat' | 'won' | 'lost'; difficulty: Difficulty;
  wave: number; maxWaves: number; remaining: number; baseHp: number; maxBaseHp: number; speed: number;
  players: Record<string, Player>; units: Record<string, Unit>; enemies: Record<string, Enemy>;
  events: GameEvent[]; notice: string; stars: number;
  spawned: number; spawnBudget: number; spawnTimer: number;
  /** Events through this id belong to combat cleared on wave completion. */
  combatResetEventId?: number;
  groundEffects?: { x: number; z: number; zone: number; radius: number; remaining: number; damagePerSecond: number; casterId: string;
    kind?: 'pangu-rift' | 'golden-bowl' | 'phong-than' | 'beidou' | 'lantern-cage' | 'five-finger' | 'chucdung-ember' | 'chucdung-lava' | 'xuanyuan-sword' | 'shennong-grove' | 'fuxi-bagua' | 'blood-sea' | 'phoenix-carpet' | 'tier-fire' | 'tier-water' | 'tier-gold'; id?: string; direction?: Vec; length?: number; width?: number; slowStrength?: number;
    healPerSecond?: number; pullSpeed?: number; controlRolls?: Record<string, boolean>; boltsRemaining?: number; boltClock?: number; boltDamage?: number; burnDps?: number; rainRemaining?: number }[];
  boomerangs?: BoomerangState[];
  tierPulses?: { casterId: string; heroId: string; zone: number; x: number; z: number; radius: number;
    remaining: number; interval: number; timer: number; power: number; hitCount: Record<string, number> }[];
  solarPhases?: { casterId: string; zone: number; x: number; z: number; remaining: number; attack: number }[];
  /** Separate RNG stream for hard-control rolls (see game-core crowd-control). */
  controlSeed?: number;
  /** Test/debug only: forces every hard-control roll to this chance. The server never sets it. */
  controlChanceOverride?: number;
  /** Hard-control rolls and successes per hero id, for debugging balance. */
  controlStats?: Record<string, { rolls: number; hits: number }>;
  /** Per-wave carry passive totals by hero id (attacks, extra damage, healing, guarded hits); server logs then resets. */
  carryStats?: Record<string, { attacks: number; bonus: number; healed: number; guarded: number }>;
  /** Per-wave melee surround / enemy swing counters for server logs (reset after each log). */
  engagementStats?: { swings: number; cancelled: number; switched: number; overflow: number };
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
  | { type: 'next-wave' }
  | { type: 'speed'; speed: number }
  | { type: 'admin-get-hero'; heroId: string; rank?: number; deploy?: boolean }
  | { type: 'admin-resources'; gold?: number; souls?: number; pellets?: number; formationPoints?: number };
export interface CommandEnvelope { id: number; command: Command }
export interface CommandResult { ok: boolean; message?: string }
export interface CommandAck extends CommandResult { id: number }
export interface SessionInfo { roomId: string; sessionId: string; code: string; token: string; release: string }
