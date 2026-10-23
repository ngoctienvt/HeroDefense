import type { Vec } from '../../contracts/src/types.js';

type Placed = Vec & { zone: number };

/**
 * Uniform bucket grid rebuilt once per tick so crowd queries (pathing blockers,
 * soft collisions, ring slots) only scan nearby bodies instead of every entity.
 */
export class SpatialGrid<T extends Placed> {
  private readonly cells = new Map<string, T[]>();

  constructor(items: Iterable<T>, private readonly cellSize = 4) {
    for (const item of items) this.insert(item);
  }

  private key(zone: number, cx: number, cz: number): string {
    return `${zone}:${cx}:${cz}`;
  }

  insert(item: T): void {
    const key = this.key(item.zone, Math.floor(item.x / this.cellSize), Math.floor(item.z / this.cellSize));
    const bucket = this.cells.get(key);
    if (bucket) bucket.push(item);
    else this.cells.set(key, [item]);
  }

  /** Items in the same zone whose cells overlap the query circle (callers still check exact distance). */
  near(point: Vec, zone: number, radius: number): T[] {
    const result: T[] = [];
    const minX = Math.floor((point.x - radius) / this.cellSize), maxX = Math.floor((point.x + radius) / this.cellSize);
    const minZ = Math.floor((point.z - radius) / this.cellSize), maxZ = Math.floor((point.z + radius) / this.cellSize);
    for (let cx = minX; cx <= maxX; cx++) for (let cz = minZ; cz <= maxZ; cz++) {
      const bucket = this.cells.get(this.key(zone, cx, cz));
      if (bucket) for (const item of bucket) result.push(item);
    }
    return result;
  }
}
