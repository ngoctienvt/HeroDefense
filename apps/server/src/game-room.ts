import { Room, ServerError, type Client } from '@colyseus/core';
import { randomBytes } from 'node:crypto';
import { createGame, addPlayer, removePlayer, setPlayerConnected, handleCommand, stepGame } from '../../../packages/game-core/src/index.js';
import { CONTENT_VERSION, type GameState, type Difficulty, type CommandAck } from '../../../packages/contracts/src/types.js';
import { commandEnvelope, RateLimit } from './validation.js';
import { debugLog } from './debug-log.js';

export const admissionKey = randomBytes(32).toString('hex');
interface Ticket { roomId: string; name: string; expires: number }
export const tickets = new Map<string, Ticket>();
export const rooms = new Map<string, GameRoom>();
export function issueTicket(roomId: string, name: string): string {
  const token = randomBytes(24).toString('hex');
  tickets.set(token, { roomId, name, expires: Date.now() + 30_000 });
  return token;
}
interface Sequence { last: number; acks: Map<number, CommandAck>; limit: RateLimit }
export class GameRoom extends Room {
  game!: GameState;
  private sequences = new Map<string, Sequence>();
  private created = Date.now();
  private shuttingDown = false;
  onCreate(options: { code: string; difficulty: Difficulty; admission?: string }): void {
    if (options.admission !== admissionKey || !/^[A-Z]{6}$/.test(options.code) || rooms.size >= 32) throw new ServerError(403, 'Use invitation API');
    this.maxClients = 4;
    this.seatReservationTimeout = 30;
    this.maxMessagesPerSecond = 80;
    this.patchRate = null;
    this.game = createGame(options.code, randomBytes(4).readUInt32LE(), options.difficulty);
    rooms.set(options.code, this);
    void this.setPrivate(true);
    this.onMessage('command', (client, data) => this.receiveCommand(client, data));
    this.onMessage('sync', client => {
      if (this.sequences.get(client.sessionId)?.limit.take()) this.sendIdentity(client);
    });
    this.onMessage('*', (client) => client.send('ack', { id: 0, ok: false, message: 'Unknown message' }));
    let lastStep = performance.now(), accumulated = 0;
    this.setSimulationInterval(() => {
      const at = performance.now();
      accumulated = Math.min(0.25, accumulated + (at - lastStep) / 1000);
      lastStep = at;
      while (accumulated >= 0.05) { stepGame(this.game, 0.05); accumulated -= 0.05; }
      if (performance.now() - at > 40) debugLog('slow-tick', { room: this.game.roomCode, durationMs: Math.round(performance.now() - at) });
    }, 50);
    this.clock.setInterval(() => {
      this.broadcast('snapshot', this.game);
      if (this.game.phase === 'lobby' && Date.now() - this.created >= 600_000) void this.disconnect();
    }, 100);
    debugLog('room-created', { room: options.code });
  }
  onAuth(_client: Client, options: { ticket?: string }): { name: string } {
    const token = options?.ticket;
    const ticket = typeof token === 'string' ? tickets.get(token) : undefined;
    if (!ticket || ticket.roomId !== this.roomId || ticket.expires < Date.now() || this.game.phase !== 'lobby') throw new ServerError(403, 'Invitation expired or room already started');
    tickets.delete(token!);
    return { name: ticket.name };
  }
  onJoin(client: Client): void {
    if (this.game.phase !== 'lobby') throw new ServerError(403, 'Room already started');
    const result = addPlayer(this.game, client.sessionId, client.auth.name);
    if (!result.ok) throw new ServerError(403, result.message || 'Room unavailable');
    this.sequences.set(client.sessionId, { last: 0, acks: new Map(), limit: new RateLimit(30, 20) });
    this.sendIdentity(client);
    this.broadcast('snapshot', this.game);
    debugLog('player-joined', { room: this.game.roomCode, count: Object.keys(this.game.players).length });
  }
  onDrop(client: Client): void {
    setPlayerConnected(this.game, client.sessionId, false);
    if (!this.shuttingDown) this.allowReconnection(client, 60).catch(() => undefined);
    debugLog('player-disconnected', { room: this.game.roomCode });
  }
  onReconnect(client: Client): void {
    setPlayerConnected(this.game, client.sessionId, true);
    this.sendIdentity(client);
    debugLog('player-reconnected', { room: this.game.roomCode });
  }
  onLeave(client: Client): void {
    removePlayer(this.game, client.sessionId);
    this.sequences.delete(client.sessionId);
  }
  onBeforeShutdown(): void { this.shuttingDown = true; void this.disconnect(); }
  onDispose(): void {
    rooms.delete(this.game?.roomCode);
    for (const [token, ticket] of tickets) if (ticket.roomId === this.roomId) tickets.delete(token);
    debugLog('room-disposed', { room: this.game?.roomCode });
  }
  private sendIdentity(client: Client): void {
    client.send('identity', { selfId: client.sessionId, code: this.game.roomCode, release: CONTENT_VERSION, lastCommandId: this.sequences.get(client.sessionId)?.last ?? 0 });
    client.send('snapshot', this.game);
  }
  private receiveCommand(client: Client, value: unknown): void {
    const seq = this.sequences.get(client.sessionId);
    if (!seq) return;
    const id = typeof value === 'object' && value !== null && 'id' in value && Number.isSafeInteger(value.id) ? Number(value.id) : 0;
    if (!seq.limit.take()) {
      client.send('ack', { id, ok: false, message: 'Too many commands' }); return;
    }
    const envelope = commandEnvelope(value);
    if (!envelope) {
      client.send('ack', { id, ok: false, message: 'Invalid command' });
      debugLog('invalid-command', { room: this.game.roomCode }); return;
    }
    const previous = seq.acks.get(envelope.id);
    if (previous) { client.send('ack', previous); return; }
    if (envelope.id <= seq.last) {
      client.send('ack', { id, ok: false, message: 'Stale command sequence' }); return;
    }
    seq.last = envelope.id;
    const ack: CommandAck = { id: envelope.id, ...handleCommand(this.game, client.sessionId, envelope.command) };
    seq.acks.set(envelope.id, ack);
    if (seq.acks.size > 128) seq.acks.delete(seq.acks.keys().next().value!);
    client.send('ack', ack);
    if (ack.ok && envelope.command.type === 'cast') {
      const lastEvent = this.game.events.at(-1);
      if (lastEvent?.kind === 'ability' && lastEvent.source === envelope.command.unitId) {
        debugLog('ability-cast', { room: this.game.roomCode, heroId: this.game.units[envelope.command.unitId]?.heroId, skillId: lastEvent.skillId });
      }
    }
    if (!ack.ok) debugLog('command-rejected', { room: this.game.roomCode, reason: (ack.message || '').slice(0, 120) });
  }
}
