import type { CommandAck, GameState, GearSlot } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';
import { gearDropPolicy, type GearDropTarget, type GearInteractionView, type GearMoveCommand } from './gear-drop-policy.js';
import { GearPendingStore, type GearPendingResolution } from './gear-pending-store.js';
import { GearDragPointer } from './gear-drag-pointer.js';
import { GearDragPresentation } from './gear-drag-presentation.js';
export { gearDropPolicy, gearDragThreshold } from './gear-drop-policy.js';
export { GearPendingStore } from './gear-pending-store.js';
export type { GearDropTarget, GearInteractionView, GearMoveCommand } from './gear-drop-policy.js';

export interface GearDragOptions {
  root: HTMLElement; overlayLayer: HTMLElement; canvas: HTMLCanvasElement;
  getView: () => GearInteractionView; send: (command: GearMoveCommand) => number | null;
  subscribeAck: (listener: (ack: CommandAck, generation: number) => void) => () => void;
  requestSync: () => unknown; pickGearTarget: (clientX: number, clientY: number) => string | null;
  setGearInteraction: (active: boolean, targetUnitId: string | null, valid: boolean) => void;
  releaseRenderGuard: () => void; hideHover: () => void; isBlocking: () => boolean;
  onChanged: () => void; onMessage: (message: string) => void;
  onSelectItem?: (itemId: string, openInventory: boolean) => void; onSelectTarget?: (unitId: string) => void;
}
interface Gesture { itemId: string; generation: number; sourceUnitId: string | null; sourceSize?: string; dragging: boolean; startedAt: number }

/** One gesture, independent pending receipts. Never mutates snapshot gear or RTS selection. */
export class GearDragController {
  private readonly pending = new GearPendingStore();
  private readonly presentation: GearDragPresentation;
  private readonly pointer: GearDragPointer;
  private gesture: Gesture | null = null;
  private point = { x: 0, y: 0 };
  private lastSnapshot: GameState | null = null;
  private generation: number;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private unsubscribeAck: (() => void) | null = null;
  private disposed = false;
  private readonly pagehide = (): void => this.dispose();
  constructor(private readonly options: GearDragOptions) {
    this.generation = options.getView().generation;
    this.presentation = new GearDragPresentation(options.root, options.overlayLayer, options.canvas);
    this.pointer = new GearDragPointer(options.root, {
      active: () => this.active, press: event => this.press(event), begin: event => this.begin(event),
      move: event => { this.point = { x: event.clientX, y: event.clientY }; this.paint(); },
      drop: event => { this.point = { x: event.clientX, y: event.clientY }; const itemId = this.gesture?.itemId; if (itemId) this.commit(itemId, this.targetAt()); },
      click: event => this.click(event), key: event => this.key(event), cancel: reason => this.cancel(reason),
    });
    window.addEventListener('pagehide', this.pagehide); this.update();
  }
  get active(): boolean { return this.gesture !== null; }
  isItemPending(itemId: string): boolean { return this.pending.isItemPending(itemId); }
  isSlotPending(unitId: string, slot: GearSlot): boolean { return this.pending.isSlotPending(unitId, slot); }
  /** Call for every session update and after HUD rebuilds; only real state changes emit onChanged. */
  update(): void {
    if (this.disposed) return;
    const view = this.options.getView(), usable = this.usable(view);
    if (view.generation !== this.generation || !usable) {
      const changed = this.pending.size > 0;
      this.generation = view.generation; this.pending.clear(); this.clearTimer(); this.cancel('session');
      this.unsubscribeAck?.(); this.unsubscribeAck = null; this.lastSnapshot = null;
      if (changed) this.options.onChanged();
      if (!usable) return;
    }
    this.unsubscribeAck ??= this.options.subscribeAck((ack, generation) => {
      const resolution = this.pending.ack(ack, generation);
      if (resolution) { this.resolved(resolution); this.schedule(); this.options.onChanged(); }
    });
    if (view.state && view.state !== this.lastSnapshot) {
      this.lastSnapshot = view.state;
      const player = view.state.players[view.selfId];
      const resolved = this.pending.snapshot(player.gear, player.gearVersion, view.generation);
      resolved.forEach(result => this.resolved(result));
      if (resolved.length) { this.schedule(); this.options.onChanged(); }
    }
    if (this.gesture && !this.sourceValid(view)) { this.cancel('source-changed'); return; }
    if (this.gesture && this.options.isBlocking()) { this.cancel('blocking-overlay'); return; }
    this.paint();
  }
  private usable(view: GearInteractionView): boolean {
    return view.status === 'connected' && !!view.state?.players[view.selfId]?.connected && view.state.phase !== 'won' && view.state.phase !== 'lost';
  }
  private sourceValid(view: GearInteractionView): boolean {
    const gesture = this.gesture;
    if (!gesture) return false;
    const item = view.state?.players[view.selfId]?.gear.find(item => item.id === gesture.itemId);
    return this.usable(view) && gesture.generation === view.generation && !!item && item.unitId === gesture.sourceUnitId
      && (!item.unitId || view.state?.units[item.unitId]?.owner === view.selfId) && !this.pending.isItemPending(item.id);
  }
  private arm(itemId: string, event: Event): boolean {
    const view = this.options.getView(), item = view.state?.players[view.selfId]?.gear.find(item => item.id === itemId);
    const reason = this.disposed ? 'disposed' : !this.usable(view) ? 'session' : this.options.isBlocking() ? 'blocking-overlay' : !item ? 'missing-item' : this.pending.isItemPending(itemId) ? 'pending' : '';
    if (reason || !item) { debug('client.gear-drag.arm-rejected', { itemId, reason }); return false; }
    this.gesture = { itemId, generation: view.generation, sourceUnitId: item.unitId, sourceSize: this.presentation.sourceSizeFrom(event), dragging: false, startedAt: Date.now() };
    this.options.hideHover(); this.paint(); debug('client.gear-drag.armed', { itemId, generation: view.generation }); return true;
  }
  private press(event: PointerEvent): boolean {
    const itemId = this.presentation.sourceFrom(event);
    if (!itemId) return false;
    this.point = { x: event.clientX, y: event.clientY };
    // An armed item's next click on an equipped slot is a destination, including occupied slots.
    if (this.gesture && itemId !== this.gesture.itemId && this.presentation.targetFrom(event).kind === 'unit') return false;
    return this.arm(itemId, event);
  }
  private begin(event: PointerEvent): void {
    if (!this.gesture || !this.sourceValid(this.options.getView()) || this.options.isBlocking()) { this.cancel('source-changed'); return; }
    this.gesture.dragging = true; this.options.releaseRenderGuard();
    this.presentation.begin(this.gesture.itemId, this.options.getView(), this.gesture.sourceSize);
    debug('client.gear-drag.begin', { itemId: this.gesture.itemId, generation: this.gesture.generation });
    this.point = { x: event.clientX, y: event.clientY }; this.paint();
  }
  private targetAt(): GearDropTarget {
    const target = this.presentation.targetAt(this.point.x, this.point.y);
    if (target !== 'world') return target;
    const unitId = this.options.pickGearTarget(this.point.x, this.point.y);
    return unitId ? { kind: 'unit', unitId } : { kind: 'invalid', reason: 'Thả lên thân tướng đang hiển thị của bạn.' };
  }
  private paint(): void {
    const view = this.options.getView(), target = this.active ? this.targetAt() : { kind: 'invalid' } as const;
    const decision = this.gesture ? gearDropPolicy(view, this.gesture.itemId, target, this.pending) : null;
    const valid = !!decision && decision.kind !== 'invalid';
    this.presentation.paint(this.gesture?.itemId ?? null, target, decision, view, this.point.x, this.point.y);
    this.options.setGearInteraction(this.active, target.kind === 'unit' ? target.unitId : null, valid);
  }
  /** Detail buttons, pointer drops and keyboard fallback all enter this live validation pipeline. */
  commit(itemId: string, target: GearDropTarget): boolean {
    const view = this.options.getView();
    if (this.disposed || this.options.isBlocking() || this.gesture && (this.gesture.itemId !== itemId || !this.sourceValid(view))) { this.cancel('source-changed'); return false; }
    const decision = gearDropPolicy(view, itemId, target, this.pending);
    if (decision.kind === 'invalid' || decision.kind === 'noop') {
      if (decision.kind === 'invalid') { this.options.onMessage(decision.reason); debug('client.gear-drag.rejected', { itemId, reason: decision.reason }); }
      this.cancel(decision.kind); return false;
    }
    const commandId = this.options.send(decision.command);
    if (commandId === null) { this.cancel('send-failed'); return false; }
    this.pending.add(commandId, view.generation, decision, view.state!.players[view.selfId].gearVersion, Date.now());
    debug('client.gear-drag.drop', { itemId, unitId: decision.expectedUnitId, slot: decision.item.slot, commandId, duration: this.gesture ? Date.now() - this.gesture.startedAt : 0 });
    if (decision.unit) this.options.onSelectTarget?.(decision.unit.id);
    this.finish(); this.schedule(); this.options.onChanged(); return true;
  }
  private click(event: MouseEvent): void {
    if (this.disposed) return;
    this.point = { x: event.clientX, y: event.clientY };
    const itemId = this.presentation.sourceFrom(event), target = event.detail === 0 ? this.presentation.targetFrom(event) : this.targetAt();
    if (this.gesture && !itemId && target.kind === 'invalid' && this.otherControl(event)) { this.cancel('other-control'); return; }
    if (this.gesture && target.kind !== 'invalid' && itemId !== this.gesture.itemId) {
      this.consume(event); this.commit(this.gesture.itemId, target); return;
    }
    if (itemId) {
      this.consume(event); this.options.releaseRenderGuard();
      const openInventory = !this.presentation.sourceIsTray(event);
      if (this.arm(itemId, event)) { this.options.onSelectItem?.(itemId, openInventory); this.options.onChanged(); }
    }
  }
  private key(event: KeyboardEvent): void {
    if (event.key === 'Escape' && this.active) { this.consume(event); this.cancel('escape'); return; }
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const itemId = this.presentation.sourceFrom(event), target = this.presentation.targetFrom(event);
    if (this.gesture && !itemId && target.kind === 'invalid' && this.otherControl(event)) { this.cancel('other-control'); return; }
    if (this.gesture && target.kind !== 'invalid' && itemId !== this.gesture.itemId) { this.consume(event); this.commit(this.gesture.itemId, target); }
    else if (itemId) { this.consume(event); const openInventory = !this.presentation.sourceIsTray(event); if (this.arm(itemId, event)) { this.options.onSelectItem?.(itemId, openInventory); this.options.onChanged(); } }
  }
  private otherControl(event: Event): boolean { return event.target instanceof Element && !!event.target.closest('button,input,select,textarea,a[href]'); }
  private consume(event: Event): void { event.preventDefault(); event.stopImmediatePropagation(); }
  cancel(reason = 'cancel'): void {
    if (this.gesture) debug('client.gear-drag.cancel', { itemId: this.gesture.itemId, reason, duration: Date.now() - this.gesture.startedAt });
    this.finish();
  }
  private finish(): void {
    this.gesture = null; this.pointer.release(); this.options.releaseRenderGuard(); this.presentation.clear();
    this.options.setGearInteraction(false, null, false);
  }
  private resolved(result: GearPendingResolution): void {
    const { entry, outcome } = result;
    debug(`client.gear-drag.${outcome}`, { itemId: entry.itemId, commandId: entry.commandId, generation: entry.generation });
    if (outcome === 'rejected') this.options.onMessage(result.message ?? 'Máy chủ từ chối chuyển đồ.');
    if (outcome === 'synchronized') this.options.onMessage('Đã đồng bộ kho. Thao tác chưa được xác nhận; bạn có thể thử lại.');
  }
  private clearTimer(): void { if (this.timer !== null) clearTimeout(this.timer); this.timer = null; }
  private schedule(): void {
    this.clearTimer(); const entries = this.pending.values().filter(entry => !entry.timedOut);
    if (!entries.length) return;
    this.timer = setTimeout(() => {
      this.timer = null; const expired = this.pending.expire(Date.now());
      if (expired.length) {
        expired.forEach(entry => debug('client.gear-drag.timeout', { itemId: entry.itemId, commandId: entry.commandId }));
        this.options.onMessage('Đang đồng bộ trang bị với máy chủ…'); this.options.requestSync(); this.options.onChanged();
      }
      this.schedule();
    }, Math.max(0, Math.min(...entries.map(entry => entry.sentAt + 5000)) - Date.now()));
  }
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true; this.cancel('dispose'); this.pointer.dispose(); this.clearTimer(); this.pending.clear();
    this.unsubscribeAck?.(); this.unsubscribeAck = null; window.removeEventListener('pagehide', this.pagehide);
  }
}
