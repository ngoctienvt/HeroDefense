import type { Enemy, GameState, Unit } from '../../contracts/src/types.js';
import { executeAttackGeometry, type Hurt } from './attack-geometry.js';
import { applyEnemyStatus, knockEnemyBack } from './combat-status.js';
import { distance, event, isDeployed } from './rules.js';

export function basicAttack(state: GameState, unit: Unit, target: Enemy, hurt: Hurt): void {
  // Execute authoritative Attack Geometry & On-Hit Trait system
  executeAttackGeometry(state, unit, target, hurt);
}

export function passiveTraits(state: GameState, dt: number): void {
  for (const unit of Object.values(state.units)) {
    if (unit.followUpCooldown && unit.followUpCooldown > 0) {
      unit.followUpCooldown = Math.max(0, unit.followUpCooldown - dt);
    }
    if (!isDeployed(unit) || unit.heroId !== 'h00F') continue;
    // Hào quang nội tại: Tăng vĩnh viễn +12% Tốc độ đánh cho 2 tướng đồng minh đứng gần Mẫu Đơn Tiên Tử nhất
    const nearestAllies = Object.values(state.units)
      .filter(u => u.id !== unit.id && isDeployed(u) && u.zone === unit.zone && distance(u, unit) <= 7.5)
      .sort((a, b) => distance(a, unit) - distance(b, unit))
      .slice(0, 2);
    for (const ally of nearestAllies) {
      if (!ally.haste || ally.haste.amount < 0.12) {
        ally.haste = { remaining: Math.max(dt * 2, 0.2), amount: 0.12 };
      }
    }
  }
}
