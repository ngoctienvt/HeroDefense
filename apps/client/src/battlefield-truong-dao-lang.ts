import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { TRUONG_DAO_LANG as B } from '../../../content/truong-dao-lang-design.js';

/** Tracks provenance only; snapshot status still decides whether a recipient gets a marker. */
export class TruongStatusTracker {
  private frozen = new Map<string, { until: number; seen: boolean }>();
  private sunder = new Map<string, { until: number; seen: boolean }>();
  constructor(private now: () => number = () => performance.now()/1000) {}

  record(event: GameEvent): void {
    if (event.skillId !== 'skill-h040' && event.skillId !== 'bolt-h040') return;
    for (const records of [this.frozen,this.sunder])
      for (const [id,record] of records) if (record.until <= this.now()) records.delete(id);
    if (event.kind === 'ability' && event.skillId === 'skill-h040')
      for (const id of event.targets ?? []) this.frozen.set(id,{ until:this.now()+B.freezeSeconds,seen:false });
    if (event.kind === 'trait' && event.skillId === 'bolt-h040' && event.target)
      this.sunder.set(event.target,{ until:this.now()+B.sunderSeconds,seen:false });
  }

  active(kind: 'frozen' | 'sunder', id: string, snapshotRemaining: number): boolean {
    const records = kind === 'frozen' ? this.frozen : this.sunder;
    const record = records.get(id);
    if (!record) return false;
    if (record.until <= this.now() || (record.seen && snapshotRemaining <= 0)) { records.delete(id); return false; }
    if (snapshotRemaining <= 0) return false; // Wait for the first snapshot after the event.
    record.seen = true; record.until = this.now()+snapshotRemaining+1;
    return true;
  }

  clear(): void { this.frozen.clear(); this.sunder.clear(); }
}
