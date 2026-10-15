import type { Enemy, Unit, Vec } from '../../contracts/src/types.js';

export function unitRadius(unit: Unit): number {
  return (unit.block && unit.block > 0) ? 0.9 : 0.7;
}

export function enemyRadius(enemy: Enemy): number {
  if (enemy.kind === 'boss' || enemy.monsterId === 'b001') return 1.6;
  if (enemy.monsterId === 'm003') return 1.0;
  return 0.75;
}

/**
 * Places attacking melee enemies in organized battle ranks in front of the defending hero
 * (Frontline at Z <= prey.z), preventing monsters from circling behind or clumping together.
 */
export function surroundSlotGoal(enemy: Enemy, prey: Unit, index: number, totalInRing: number, baseRange: number): Vec {
  const isRank2 = index >= 5;
  const isRank3 = index >= 11;
  const rank = isRank3 ? 3 : isRank2 ? 2 : 1;
  const rankIndex = isRank3 ? index - 11 : isRank2 ? index - 5 : index;
  const rankDistZ = rank === 1 ? Math.max(1.8, baseRange) : rank === 2 ? Math.max(3.2, baseRange * 1.7) : Math.max(4.6, baseRange * 2.4);

  // Spread along X across the frontline (symmetric from center: 0, +1, -1, +2, -2...)
  const spreadX = 1.35;
  const offset = rankIndex === 0 ? 0 : (rankIndex % 2 === 1 ? 1 : -1) * Math.ceil(rankIndex / 2);
  const targetX = prey.x + offset * spreadX;
  // Concave arc: outer flankers wrap forward slightly
  const arcCurve = Math.min(0.6, Math.abs(offset) * 0.15);
  const targetZ = prey.z - rankDistZ + arcCurve;

  return { x: targetX, z: targetZ };
}

/**
 * Warcraft 3 Body-blocking: Hero walks towards destination but CANNOT walk through enemies.
 * Stops at enemy collision boundary without pushing/snowplowing enemies.
 */
export function walkHeroWithCollision(heroUnit: Unit, destination: Vec, amount: number, enemies: Iterable<Enemy>): boolean {
  const dx = destination.x - heroUnit.x;
  const dz = destination.z - heroUnit.z;
  const d = Math.hypot(dx, dz);
  if (d <= amount || d < .001) {
    heroUnit.x = destination.x;
    heroUnit.z = destination.z;
    return true;
  }
  let stepX = (dx / d) * amount;
  let stepZ = (dz / d) * amount;

  const nextX = heroUnit.x + stepX;
  const nextZ = heroUnit.z + stepZ;
  const heroR = 0.8;

  for (const enemy of enemies) {
    if (enemy.zone !== heroUnit.zone || enemy.hp <= 0) continue;
    const er = enemyRadius(enemy);
    const minDist = heroR + er;
    const toEnemyX = enemy.x - nextX;
    const toEnemyZ = enemy.z - nextZ;
    const distSq = toEnemyX * toEnemyX + toEnemyZ * toEnemyZ;
    if (distSq < minDist * minDist) {
      const currentDist = Math.hypot(enemy.x - heroUnit.x, enemy.z - heroUnit.z);
      if (currentDist > minDist) {
        const allowed = Math.max(0, currentDist - minDist);
        stepX = (dx / d) * allowed;
        stepZ = (dz / d) * allowed;
      } else {
        stepX = 0;
        stepZ = 0;
      }
      break;
    }
  }

  heroUnit.x += stepX;
  heroUnit.z += stepZ;
  return stepX === 0 && stepZ === 0;
}

/**
 * Soft separation relaxation resolves unit-unit overlaps every tick among enemies.
 * Keeps clustered enemies spaced out without erratic physics or pushing heroes.
 */
export function resolveSoftCollisions(enemies: Iterable<Enemy>): void {
  const activeEnemies: Enemy[] = [];
  for (const e of enemies) {
    if (e.zone === 0 && e.hp > 0) activeEnemies.push(e);
  }

  // Gentle enemy vs enemy soft separation
  for (let i = 0; i < activeEnemies.length; i++) {
    const e1 = activeEnemies[i];
    const r1 = enemyRadius(e1);
    for (let j = i + 1; j < activeEnemies.length; j++) {
      const e2 = activeEnemies[j];
      const r2 = enemyRadius(e2);
      const minDist = r1 + r2;
      const dx = e2.x - e1.x;
      const dz = e2.z - e1.z;
      const distSq = dx * dx + dz * dz;
      if (distSq < minDist * minDist) {
        const dist = Math.sqrt(distSq);
        const overlap = minDist - (dist || 0.0001);
        const push = Math.min(0.08, overlap * 0.25);
        const nx = dist > 0.0001 ? dx / dist : (e1.id < e2.id ? -1 : 1);
        const nz = dist > 0.0001 ? dz / dist : 0;
        e1.x -= nx * push * 0.5;
        e1.z -= nz * push * 0.5;
        e2.x += nx * push * 0.5;
        e2.z += nz * push * 0.5;
      }
    }
  }
}

// Nearby monsters contribute a lateral nudge, but never stop forward travel.
export function crowdMovement(enemies: Iterable<Enemy>) {
  const cells = new Map<string, Enemy[]>();
  const key = (owner: string, x: number, z: number) => `${owner}:${Math.floor(x / 2)}:${Math.floor(z / 2)}`;
  for (const enemy of enemies) {
    if (enemy.zone !== 0) continue;
    const cell = key(enemy.owner, enemy.x, enemy.z);
    const group = cells.get(cell) ?? [];
    group.push(enemy);
    cells.set(cell, group);
  }
  return (enemy: Enemy, toward: Vec): Vec => {
    const dx = toward.x - enemy.x, dz = toward.z - enemy.z;
    const length = Math.hypot(dx, dz);
    if (length < .001) return { x: 0, z: 0 };
    const forwardX = dx / length, forwardZ = dz / length;
    const cx = Math.floor(enemy.x / 2), cz = Math.floor(enemy.z / 2);
    let pushX = 0, pushZ = 0;
    for (let x = cx - 1; x <= cx + 1; x++) for (let z = cz - 1; z <= cz + 1; z++) {
      for (const other of cells.get(`${enemy.owner}:${x}:${z}`) ?? []) {
        if (other.id === enemy.id) continue;
        const awayX = enemy.x - other.x, awayZ = enemy.z - other.z;
        const gap = Math.hypot(awayX, awayZ);
        if (gap >= 1.5) continue;
        if (gap < .001) {
          // Stable ID ordering breaks exact overlaps without frame-to-frame flips.
          const side = enemy.id < other.id ? -1 : 1;
          pushX += -forwardZ * side * .5;
          pushZ += forwardX * side * .5;
          continue;
        }
        const strength = (1.5 - gap) / 1.5;
        pushX += awayX / gap * strength;
        pushZ += awayZ / gap * strength;
        const ahead = (other.x - enemy.x) * forwardX + (other.z - enemy.z) * forwardZ;
        const lateral = awayX * -forwardZ + awayZ * forwardX;
        if (ahead > 0 && Math.abs(lateral) < .25) {
          const side = enemy.id < other.id ? -1 : 1;
          pushX += -forwardZ * side * strength;
          pushZ += forwardX * side * strength;
        }
      }
    }
    let x = forwardX + pushX * .65, z = forwardZ + pushZ * .65;
    // Dense ranks still move toward their objective.
    const along = x * forwardX + z * forwardZ;
    if (along < .35) { x += forwardX * (.35 - along); z += forwardZ * (.35 - along); }
    const magnitude = Math.hypot(x, z);
    return magnitude > .001 ? { x: x / magnitude, z: z / magnitude } : { x: forwardX, z: forwardZ };
  };
}
