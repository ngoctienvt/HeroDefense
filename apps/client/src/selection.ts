import type { GameState } from '../../../packages/contracts/src/types.js';

export class Selection {
  ids: string[] = [];
  private groups = new Map<number, string[]>();

  private eligible(state: GameState, owner: string, zone: number, id: string): boolean {
    const unit = state.units[id];
    return !!unit && unit.owner === owner && unit.slot >= 0 && unit.hp > 0 && unit.zone === zone;
  }

  set(ids: string[], state: GameState, owner: string, zone: number, append = false): void {
    const next = append ? [...this.ids, ...ids] : ids;
    this.ids = [...new Set(next)].filter(id => this.eligible(state, owner, zone, id)).slice(0, 5);
  }

  focus(id: string, state: GameState, owner: string, zone: number): void {
    if (!this.eligible(state, owner, zone, id)) return;
    if (!this.ids.includes(id)) this.set([id], state, owner, zone);
  }

  assign(group: number): void { if (group >= 1 && group <= 9) this.groups.set(group, [...this.ids]); }

  toggle(id: string, state: GameState, owner: string, zone: number): void {
    if (this.ids.includes(id)) this.ids = this.ids.filter(item => item !== id);
    else this.set([id], state, owner, zone, true);
  }

  recall(group: number, state: GameState, owner: string, zone: number): void {
    this.set(this.groups.get(group) ?? [], state, owner, zone);
  }

  prune(state: GameState, owner: string, zone: number): void {
    this.ids = this.ids.filter(id => this.eligible(state, owner, zone, id));
    for (const [group, ids] of this.groups) this.groups.set(group, ids.filter(id => state.units[id]?.owner === owner));
  }

  clear(): void { this.ids = []; this.groups.clear(); }
}
