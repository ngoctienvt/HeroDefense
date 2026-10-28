import { Client, type Room } from '@colyseus/sdk';
import { CONTENT_VERSION } from '../../../packages/contracts/src/types.js';
import type { Command, CommandAck, Difficulty, GameState } from '../../../packages/contracts/src/types.js';
import { debug } from './debug.js';

export interface SessionView { status: 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error'; state: GameState | null; selfId: string; message: string }
const TOKEN_KEY = 'thien-dao-reconnect';
export class GameSession {
  view: SessionView = { status: 'idle', state: null, selfId: '', message: '' };
  private client = new Client(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/game`);
  private room: Room | null = null;
  private listeners = new Set<(view: SessionView) => void>();
  private ackListeners = new Set<(ack: CommandAck, generation: number) => void>();
  private commandId = 0;
  private removers: (() => void)[] = [];
  private generation = 0;
  private salvageQueue = new Set<string>();
  private salvageTimer: ReturnType<typeof setTimeout> | null = null;
  private cancelSalvage(): void {
    if (this.salvageTimer !== null) clearTimeout(this.salvageTimer);
    this.salvageTimer = null; this.salvageQueue.clear();
  }
  /** Pace an unbounded inventory below the server command limit; revalidate each live item. */
  queueWhiteSalvage(itemIds: readonly string[], canSalvage: (itemId: string) => boolean = () => true): void {
    if (!this.room || this.view.status !== 'connected') return;
    debug('client.gear-salvage-batch', { count: itemIds.length });
    for (const id of itemIds) this.salvageQueue.add(id);
    if (this.salvageTimer !== null) return;
    const next = () => {
      this.salvageTimer = null;
      if (!this.room || this.view.status !== 'connected') { this.cancelSalvage(); return; }
      const itemId = this.salvageQueue.values().next().value;
      if (itemId === undefined) return;
      this.salvageQueue.delete(itemId);
      const item = this.view.state?.players[this.view.selfId]?.gear.find(item => item.id === itemId);
      if (item?.rarity === 'white' && item.unitId === null && canSalvage(itemId)) {
        debug('client.gear-salvage', { itemId, slot: item.slot, rarity: item.rarity });
        this.send({ type: 'salvage-item', itemId });
      }
      if (this.salvageQueue.size) this.salvageTimer = setTimeout(next, 150);
    };
    this.salvageTimer = setTimeout(next, 150);
  }
  private update(patch: Partial<SessionView>): void { this.view = { ...this.view, ...patch }; this.listeners.forEach(listener => listener(this.view)); }
  subscribe(listener: (view: SessionView) => void): () => void { this.listeners.add(listener); listener(this.view); return () => this.listeners.delete(listener); }
  subscribeAck(listener: (ack: CommandAck, generation: number) => void): () => void { this.ackListeners.add(listener); return () => this.ackListeners.delete(listener); }
  get sessionGeneration(): number { return this.generation; }
  get canReconnect(): boolean { return !!sessionStorage.getItem(TOKEN_KEY); }
  async connectCreate(name: string, difficulty: Difficulty): Promise<void> { await this.connect('/api/rooms', { name, difficulty }); }
  async connectJoin(name: string, code: string): Promise<void> { await this.connect(`/api/rooms/${encodeURIComponent(code.trim().toUpperCase())}/join`, { name }); }
  private async connect(path: string, body: Record<string, string>): Promise<void> {
    if (this.view.status === 'connecting') return;
    await this.leave(); const generation = ++this.generation; this.update({ status: 'connecting', message: 'Đang kết nối phòng…' });
    try {
      const response = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(12000) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || data.message || 'Không thể mở phòng.');
      if (data.release !== CONTENT_VERSION) throw new Error('Phiên bản game đã đổi. Hãy tải lại trang trước khi vào phòng.');
      const room = await this.client.consumeSeatReservation(data.reservation);
      if (generation !== this.generation) { await room.leave(); return; } this.attach(room);
    } catch (error) { if (generation === this.generation) this.failed(error); }
  }
  async reconnect(): Promise<void> {
    const token = sessionStorage.getItem(TOKEN_KEY); if (!token || this.view.status === 'connecting') return;
    this.cancelSalvage();
    const previous = this.room; this.room = null; this.removers.splice(0).forEach(remove => remove());
    if (previous) { previous.reconnection.enabled = false; if (previous.connection.isOpen) previous.connection.close(); }
    const generation = ++this.generation; this.update({ status: 'connecting', message: 'Đang kết nối lại…' });
    try { const room = await this.client.reconnect(token); if (generation !== this.generation) { await room.leave(); return; } this.attach(room); }
    catch (error) { if (generation === this.generation) { sessionStorage.removeItem(TOKEN_KEY); this.failed(error); } }
  }
  private attach(room: Room): void {
    // One manual reconnect path prevents an abandoned SDK retry reclaiming the seat.
    room.reconnection.enabled = false;
    this.removers.splice(0).forEach(remove => remove()); this.room = room; sessionStorage.setItem(TOKEN_KEY, room.reconnectionToken);
    const generation = this.generation;
    const current = () => this.room === room && this.generation === generation;
    this.commandId = Number(sessionStorage.getItem(`thien-dao-sequence:${room.roomId}`)) || 0;
    const previousCommandId = this.commandId;
    this.update({ status: 'connected', selfId: room.sessionId, message: '' }); debug('session.connected');
    this.removers.push(room.onMessage('snapshot', (state: GameState) => {
      if (!current()) return;
      if (state.version !== CONTENT_VERSION) { this.update({ status: 'error', message: 'Phiên bản không tương thích. Hãy tải lại trang.' }); return; }
      this.update({ state });
    }));
    this.removers.push(room.onMessage('identity', (identity: { selfId: string; lastCommandId?: number }) => { if (!current()) return; this.commandId = Math.max(this.commandId, identity.lastCommandId ?? 0); this.update({ selfId: identity.selfId }); }));
    this.removers.push(room.onMessage('ack', (ack: CommandAck) => {
      if (!current() || this.view.status !== 'connected' || ack.id <= previousCommandId) return;
      if (!ack.ok || ack.message) this.update({ message: ack.message || 'Máy chủ từ chối thao tác.' });
      for (const listener of this.ackListeners) { if (!current()) break; listener(ack, generation); }
    }));
    const dropped = () => {
      if (!current()) return;
      this.generation++; this.cancelSalvage();
      this.update({ status: 'disconnected', message: 'Mất kết nối. Bấm Kết nối lại để khôi phục phiên.' }); debug('session.dropped');
    };
    const restored = () => {
      if (this.room !== room || this.generation !== generation + 1 || this.view.status !== 'disconnected') return;
      // Rebind callbacks so pre-drop acknowledgements retain their old generation.
      this.attach(room); this.update({ message: 'Đã kết nối lại.' }); debug('session.restored');
    };
    const left = () => {
      if (!current()) return;
      this.generation++; this.cancelSalvage(); this.update({ status: 'disconnected', message: 'Kết nối đã đóng. Bạn có thể thử kết nối lại.' });
    };
    const failure = (_code: number, message?: string) => { if (current()) this.update({ message: message || 'Lỗi kết nối máy chủ.' }); };
    room.onDrop(dropped); room.onReconnect(restored); room.onLeave(left); room.onError(failure);
    this.removers.push(() => { room.onDrop.remove(dropped); room.onReconnect.remove(restored); room.onLeave.remove(left); room.onError.remove(failure); });
    this.requestSync();
  }
  requestSync(): boolean {
    if (!this.room || !this.room.connection.isOpen || this.view.status !== 'connected') return false;
    try { this.room.send('sync'); debug('session.sync-requested', { generation: this.generation }); return true; }
    catch { debug('session.sync-failed', { generation: this.generation }); return false; }
  }
  send(command: Command): number | null {
    if (!this.room || !this.room.connection.isOpen || this.view.status !== 'connected') { this.update({ message: 'Hãy kết nối lại trước khi điều khiển.' }); return null; }
    sessionStorage.setItem(`thien-dao-sequence:${this.room.roomId}`, String(++this.commandId));
    try { this.room.send('command', { id: this.commandId, command }); debug('command.sent', { type: command.type }); return this.commandId; }
    catch { this.update({ message: 'Không thể gửi thao tác. Hãy kết nối lại.' }); debug('command.send-failed', { type: command.type }); return null; }
  }
  private failed(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';
    this.update({ status: 'error', message }); debug('session.error', { message });
  }
  async leave(): Promise<void> {
    this.cancelSalvage();
    this.generation++; const room = this.room; this.room = null; this.removers.splice(0).forEach(remove => remove());
    sessionStorage.removeItem(TOKEN_KEY);
    this.update({ status: 'idle', state: null, selfId: '', message: '' });
    if (room) {
      room.reconnection.enabled = false;
      sessionStorage.removeItem(`thien-dao-sequence:${room.roomId}`);
      if (room.connection.isOpen) await room.leave().catch(() => debug('session.leave-closed'));
    }
  }
  clearMessage(): void { this.update({ message: '' }); }
  dispose(): void {
    this.generation++; this.cancelSalvage(); const room = this.room; this.room = null;
    this.removers.splice(0).forEach(remove => remove()); this.listeners.clear(); this.ackListeners.clear();
    if (room) { room.reconnection.enabled = false; if (room.connection.isOpen) room.leave().catch(() => debug('session.leave-closed')); }
  }
}
