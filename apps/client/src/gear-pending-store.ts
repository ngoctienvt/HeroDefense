import type { CommandAck, GearItem, GearSlot } from '../../../packages/contracts/src/types.js';
import type { GearDropDecision, GearLocks } from './gear-drop-policy.js';

export interface GearPending {
  commandId: number; generation: number; itemId: string; slot: GearSlot; sourceUnitId: string | null;
  expectedUnitId: string | null; replacedItemId?: string; gearVersion: number; sentAt: number;
  acknowledged: boolean; timedOut: boolean; timeoutSnapshot: number;
}
type Move = Extract<GearDropDecision, { kind: 'equip' | 'unequip' }>;
export interface GearPendingResolution { entry: GearPending; outcome: 'confirmed' | 'synchronized' | 'rejected'; message?: string }

/** Locks source and destination, including the displaced item; snapshots alone confirm equipment. */
export class GearPendingStore implements GearLocks {
  private readonly entries = new Map<number, GearPending>();
  private snapshotSequence = 0;
  get size(): number { return this.entries.size; }
  values(): readonly GearPending[] { return [...this.entries.values()].map(entry => ({ ...entry })); }
  isItemPending(itemId: string): boolean { return [...this.entries.values()].some(entry => entry.itemId === itemId || entry.replacedItemId === itemId); }
  isSlotPending(unitId: string, slot: GearSlot): boolean {
    return [...this.entries.values()].some(entry => entry.slot === slot && (entry.sourceUnitId === unitId || entry.expectedUnitId === unitId));
  }
  add(commandId: number, generation: number, move: Move, gearVersion: number, now: number): void {
    this.entries.set(commandId, { commandId, generation, itemId: move.item.id, slot: move.item.slot,
      sourceUnitId: move.item.unitId, expectedUnitId: move.expectedUnitId, replacedItemId: move.replacedItem?.id,
      gearVersion, sentAt: now, acknowledged: false, timedOut: false, timeoutSnapshot: 0 });
  }
  ack(ack: CommandAck, generation: number): GearPendingResolution | null {
    const entry = this.entries.get(ack.id);
    if (!entry || entry.generation !== generation) return null;
    if (!ack.ok) { this.entries.delete(ack.id); return { entry, outcome: 'rejected', message: ack.message }; }
    entry.acknowledged = true;
    return null;
  }
  snapshot(gear: readonly GearItem[], gearVersion: number, generation: number): GearPendingResolution[] {
    this.snapshotSequence++;
    const resolved: GearPendingResolution[] = [];
    for (const entry of this.entries.values()) {
      if (entry.generation !== generation) { this.entries.delete(entry.commandId); continue; }
      const item = gear.find(item => item.id === entry.itemId);
      const confirmed = item?.unitId === entry.expectedUnitId;
      // A fresh authoritative snapshot after the one-shot sync resolves uncertainty without claiming success.
      if (confirmed || entry.timedOut && this.snapshotSequence > entry.timeoutSnapshot && gearVersion >= entry.gearVersion) {
        this.entries.delete(entry.commandId);
        resolved.push({ entry, outcome: confirmed ? 'confirmed' : 'synchronized' });
      }
    }
    return resolved;
  }
  expire(now: number): GearPending[] {
    const expired: GearPending[] = [];
    for (const entry of this.entries.values()) if (!entry.timedOut && now - entry.sentAt >= 5000) {
      entry.timedOut = true; entry.timeoutSnapshot = this.snapshotSequence; expired.push({ ...entry });
    }
    return expired;
  }
  clear(): void { this.entries.clear(); this.snapshotSequence = 0; }
}
