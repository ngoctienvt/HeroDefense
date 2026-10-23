/**
 * Which enemies died this very tick. The server emits the victim's `death` event before the `ability skill-h00H`
 * event of the same tick, and the ability event itself carries no kill flag, so battlefield.ts notes deaths here and
 * the module asks `consume` when the ability arrives. Presentation only (it only chooses the soul-return beat).
 */
export class VothuongKills {
  private deaths = new Map<string, number>();

  constructor(private now: () => number = () => performance.now() / 1000, private ttl = 1) {}

  note(id: string | undefined): void {
    if (!id) return;
    const now = this.now();
    for (const [key, at] of this.deaths) if (now - at > this.ttl) this.deaths.delete(key);
    this.deaths.set(id, now);
  }

  /** True once per recorded death; a stale record (older than ttl) does not count. */
  consume(id: string | undefined): boolean {
    if (!id) return false;
    const at = this.deaths.get(id);
    this.deaths.delete(id);
    return at !== undefined && this.now() - at <= this.ttl;
  }

  clear(): void { this.deaths.clear(); }
}

/** Shared by battlefield.ts (writes) and VisualVothuong (reads); cleared with the module on zone change. */
export const vothuongKills = new VothuongKills();
