import type { Enemy, GameState, Player, Unit } from '../../../contracts/src/types.js';
import { baoLienDang } from './bao-lien-dang.js';
import { chienPhuHongHoang } from './chien-phu-hong-hoang.js';
import { hoaDiemSon } from './hoa-diem-son.js';
import { luongTinh } from './luong-tinh-tuong-duyet.js';
import { thuyThan } from './thuy-than.js';
import { tienTu } from './tien-tu.js';
import { tranDuongQuan } from './tran-duong-quan.js';
import { trucNhat } from './truc-nhat.js';
import { uMinh } from './u-minh.js';
import { yeuLinh } from './yeu-linh.js';
import { chanHoa } from './chan-hoa.js';
import { hauTayDuKy } from './hau-tay-du-ky.js';
import { phatQuang } from './phat-quang-pho-chieu.js';
import { phongThan } from './phong-than-dien-nghia.js';
import { thinhKinh } from './thinh-kinh.js';
import { viemDe } from './viem-de-huyet-mach.js';
import { amKhiTrungThien } from './am-khi-trung-thien.js';
import { daoVoNhai } from './dao-vo-nhai.js';
import { hoangThienUngLong } from './hoang-thien-ung-long.js';
import { longToc } from './long-toc-huyet-mach.js';
import { nuThan } from './nu-than.js';
import { phongVuLoiDien } from './phong-vu-loi-dien.js';
import { tamDaiThanDieu } from './tam-dai-than-dieu.js';
import { thanHoa } from './than-hoa.js';
import { thienDiaNhanDao } from './thien-dia-nhan-dao.js';
import { thienDinh } from './thien-dinh.js';
import { tuHauHonThe } from './tu-hau-hon-the.js';

/** What a handler learns about the owner's bond when an event fires. */
export interface BondContext {
  state: GameState; owner: string; player: Player; bondId: number;
  /** Distinct deployed members. */
  count: number;
  /** Number of thresholds reached (1-based tier index). */
  level: number;
}

/**
 * One small handler per bond, keyed by synergy id. Handlers react to events and call existing helpers
 * (status, forceCast, summon, heal, shield); they never run on copies or summoned units.
 */
export interface BondHandler {
  onCast?(ctx: BondContext, caster: Unit, targetId: string | undefined): void;
  onKill?(ctx: BondContext, killer: Unit, enemy: Enemy): void;
  onHeroDeath?(ctx: BondContext, unit: Unit): void;
  onHeal?(ctx: BondContext, source: Unit, target: Unit, amount: number, overheal: number): void;
  onShield?(ctx: BondContext, source: Unit, target: Unit, amount: number): void;
  /** Damage multiplier on a hit by `attacker` (any hero of the owner), multiplied across bonds. */
  damageMultiplier?(ctx: BondContext, attacker: Unit, enemy: Enemy): number;
  /** True kills the enemy outright on this hit. Never asked for bosses. */
  executes?(ctx: BondContext, attacker: Unit, enemy: Enemy): boolean;
  /** After damage landed on a still-living enemy. */
  onHit?(ctx: BondContext, attacker: Unit, enemy: Enemy): void;
  /** Healing amount multiplier for `source` healing `target`. */
  healMultiplier?(ctx: BondContext, source: Unit, target: Unit): number;
  /** Shield amount multiplier for `source` shielding `target`. */
  shieldMultiplier?(ctx: BondContext, source: Unit, target: Unit): number;
  /** A deployed member's hero was hurt by an enemy. */
  onHeroHit?(ctx: BondContext, unit: Unit, attacker: Enemy | undefined): void;
  /** Fatal damage: return true after restoring hp > 0 to save the unit. */
  rescue?(ctx: BondContext, unit: Unit): boolean;
  /** Once per combat step with the step length in seconds (timers, threshold watchers). */
  onTick?(ctx: BondContext, dt: number): void;
  /** After a basic attack landed on `hitIds`; `hurt` deals plain damage as the attacker. */
  onAttack?(ctx: BondContext, attacker: Unit, target: Enemy, hitIds: readonly string[], damage: number,
    hurt: (enemy: Enemy, damage: number) => void): void;
  /** After a hero's basic attack on a living target. */
  onBasicAttack?(ctx: BondContext, unit: Unit, target: Enemy): void;
  /** Moves part of `damage` (returned) to another hero before `unit` takes the rest. */
  redirect?(ctx: BondContext, unit: Unit, damage: number, attacker: Enemy | undefined): number;
  /** Extra summoned bodies for a skill that creates a fixed number. */
  extraClones?(ctx: BondContext, caster: Unit): number;
  /** A hero landed a critical hit. */
  onCrit?(ctx: BondContext, unit: Unit, enemy: Enemy): void;
  /** Multiplier on the reach of an area skill. */
  areaScale?(ctx: BondContext, caster: Unit): number;
  /** Multiplier on the stats of summons created by `caster`. */
  summonScale?(ctx: BondContext, caster: Unit): number;
  /** A timed summon ran out. */
  onSummonEnd?(ctx: BondContext, summon: Unit): void;
  onWaveStart?(ctx: BondContext): void;
  onWaveClear?(ctx: BondContext): void;
}

/** Filled in bond by bond; a bond without a handler only uses its data-driven stat effects. */
export const BOND_HANDLERS: Readonly<Record<number, BondHandler>> = {
  1: hoaDiemSon, 2: tranDuongQuan, 3: uMinh, 6: tienTu, 7: luongTinh, 9: yeuLinh,
  15: thuyThan, 19: trucNhat, 20: chienPhuHongHoang, 21: baoLienDang,
  11: thienDinh, 12: nuThan, 13: longToc, 16: daoVoNhai, 18: hoangThienUngLong, 22: tuHauHonThe,
  4: thinhKinh, 5: hauTayDuKy, 8: phongThan, 10: phatQuang, 14: chanHoa, 17: viemDe,
  23: phongVuLoiDien, 24: thienDiaNhanDao, 25: amKhiTrungThien, 26: tamDaiThanDieu, 27: thanHoa,
};
