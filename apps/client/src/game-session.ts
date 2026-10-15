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
  private commandId = 0;
  private removers: (() => void)[] = [];
  private generation = 0;
  private update(patch: Partial<SessionView>): void { this.view = { ...this.view, ...patch }; this.listeners.forEach(listener => listener(this.view)); }
  subscribe(listener: (view: SessionView) => void): () => void { this.listeners.add(listener); listener(this.view); return () => this.listeners.delete(listener); }
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
    const generation = ++this.generation; this.update({ status: 'connecting', message: 'Đang kết nối lại…' });
    try { const room = await this.client.reconnect(token); if (generation !== this.generation) { await room.leave(); return; } this.attach(room); }
    catch (error) { if (generation === this.generation) { sessionStorage.removeItem(TOKEN_KEY); this.failed(error); } }
  }
  private attach(room: Room): void {
    // One manual reconnect path prevents an abandoned SDK retry reclaiming the seat.
    room.reconnection.enabled = false;
    this.removers.splice(0).forEach(remove => remove()); this.room = room; sessionStorage.setItem(TOKEN_KEY, room.reconnectionToken);
    this.commandId = Number(sessionStorage.getItem(`thien-dao-sequence:${room.roomId}`)) || 0;
    this.update({ status: 'connected', selfId: room.sessionId, message: '' }); debug('session.connected');
    this.removers.push(room.onMessage('snapshot', (state: GameState) => {
      if (state.version !== CONTENT_VERSION) { this.update({ status: 'error', message: 'Phiên bản không tương thích. Hãy tải lại trang.' }); return; }
      this.update({ state });
    }));
    this.removers.push(room.onMessage('identity', (identity: { selfId: string; lastCommandId?: number }) => { this.commandId = Math.max(this.commandId, identity.lastCommandId ?? 0); this.update({ selfId: identity.selfId }); }));
    this.removers.push(room.onMessage('ack', (ack: CommandAck) => { if (!ack.ok || ack.message) this.update({ message: ack.message || 'Máy chủ từ chối thao tác.' }); }));
    const dropped = () => { this.update({ status: 'disconnected', message: 'Mất kết nối. Bấm Kết nối lại để khôi phục phiên.' }); debug('session.dropped'); };
    const restored = () => { sessionStorage.setItem(TOKEN_KEY, room.reconnectionToken); this.update({ status: 'connected', message: 'Đã kết nối lại.' }); debug('session.restored'); };
    const left = () => { if (this.room === room) this.update({ status: 'disconnected', message: 'Kết nối đã đóng. Bạn có thể thử kết nối lại.' }); };
    const failure = (_code: number, message?: string) => this.update({ message: message || 'Lỗi kết nối máy chủ.' });
    room.onDrop(dropped); room.onReconnect(restored); room.onLeave(left); room.onError(failure);
    this.removers.push(() => { room.onDrop.remove(dropped); room.onReconnect.remove(restored); room.onLeave.remove(left); room.onError.remove(failure); });
    room.send('sync');
  }
  send(command: Command): void {
    if (!this.room || this.view.status !== 'connected') { this.update({ message: 'Hãy kết nối lại trước khi điều khiển.' }); return; }
    sessionStorage.setItem(`thien-dao-sequence:${this.room.roomId}`, String(++this.commandId));
    this.room.send('command', { id: this.commandId, command }); debug('command.sent', { type: command.type });
  }
  private failed(error: unknown): void {
    const message = error instanceof Error ? error.message : 'Không thể kết nối máy chủ.';
    this.update({ status: 'error', message }); debug('session.error', { message });
  }
  async leave(): Promise<void> {
    this.generation++; const room = this.room; this.room = null; this.removers.splice(0).forEach(remove => remove());
    sessionStorage.removeItem(TOKEN_KEY);
    if (room) {
      room.reconnection.enabled = false;
      sessionStorage.removeItem(`thien-dao-sequence:${room.roomId}`);
      if (room.connection.isOpen) await room.leave().catch(() => debug('session.leave-closed'));
    }
    this.update({ status: 'idle', state: null, selfId: '', message: '' });
  }
  clearMessage(): void { this.update({ message: '' }); }
  dispose(): void { this.removers.splice(0).forEach(remove => remove()); this.listeners.clear(); this.room?.leave().catch(() => {}); }
}
