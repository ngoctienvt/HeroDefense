import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Client, type Room } from '@colyseus/sdk';
import { matchMaker } from '@colyseus/core';
import { startServer, type RunningServer } from '../src/server.js';
import { admissionKey, issueTicket, rooms, tickets } from '../src/game-room.js';
import type { CommandAck, GameState } from '../../../packages/contracts/src/types.js';

let base: string;
let running: RunningServer;
const connected: Room[] = [];
async function post(path: string, body: unknown): Promise<Response> {
  return fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
}
async function join(path: string, name: string): Promise<Room> {
  const response = await post(path, { name, ...(path === '/api/rooms' ? { difficulty: 'normal' } : {}) });
  const data = await response.json();
  expect(response.ok, JSON.stringify(data)).toBe(true);
  const room = await new Client(base + '/game').consumeSeatReservation(data.reservation);
  room.onMessage('identity', () => {}); room.onMessage('snapshot', () => {});
  connected.push(room); return room;
}
function ack(room: Room, id: number, command: unknown): Promise<CommandAck> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { off(); reject(new Error('Command ack timeout')); }, 2000);
    const off = room.onMessage<CommandAck>('ack', value => { if (value.id === id) { clearTimeout(timeout); off(); resolve(value); } });
    room.send('command', { id, command });
  });
}
function snapshot(room: Room, predicate: (state: GameState) => boolean): Promise<GameState> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { off(); reject(new Error('Snapshot timeout')); }, 3000);
    const off = room.onMessage<GameState>('snapshot', value => { if (predicate(value)) { clearTimeout(timeout); off(); resolve(value); } });
  });
}
beforeAll(async () => { running = await startServer(0, '127.0.0.1'); base = `http://127.0.0.1:${running.port}`; });
afterAll(async () => {
  await Promise.all(connected.filter(room => room.connection.isOpen).map(room => room.leave()));
  await running?.close();
});
describe('real authoritative online rooms', () => {
  it('runs two SDK clients, idempotent purchases, ownership, refresh reconnect and no late join', async () => {
    const host = await join('/api/rooms', 'Chủ phòng');
    const room = [...rooms.values()].find(r => r.roomId === host.roomId)!;
    const peer = await join(`/api/rooms/${room.game.roomCode}/join`, 'Đồng đội');
    expect(await snapshot(peer, s => Object.keys(s.players).length === 2)).toMatchObject({ roomCode: room.game.roomCode });
    expect((await ack(host, 1, { type: 'summon' })).ok).toBe(true);
    const souls = room.game.players[host.sessionId].souls;
    const units = Object.keys(room.game.units).length;
    expect((await ack(host, 1, { type: 'summon' })).ok).toBe(true);
    expect(room.game.players[host.sessionId].souls).toBe(souls);
    expect(Object.keys(room.game.units)).toHaveLength(units);
    const unitId = Object.keys(room.game.units)[0];
    expect((await ack(peer, 1, { type: 'sell', unitId })).ok).toBe(false);
    expect((await ack(host, 2, { type: 'move', unitId, x: 1e30, z: 0 })).message).toBe('Invalid command');
    expect((await ack(host, 3, { type: 'ready', ready: true })).ok).toBe(true);
    expect((await ack(peer, 2, { type: 'ready', ready: true })).ok).toBe(true);
    expect((await ack(host, 4, { type: 'start' })).ok).toBe(true);
    expect((await post(`/api/rooms/${room.game.roomCode}/join`, { name: 'Late' })).status).toBe(409);
    const token = peer.reconnectionToken;
    peer.reconnection.enabled = false;
    const disconnected = snapshot(host, s => s.players[peer.sessionId]?.connected === false);
    peer.connection.close();
    await disconnected;
    const refreshed = await new Client(base + '/game').reconnect(token);
    refreshed.onMessage('identity', () => {}); refreshed.onMessage('snapshot', () => {}); connected.push(refreshed);
    expect(refreshed.sessionId).toBe(peer.sessionId);
    await snapshot(host, s => s.players[peer.sessionId]?.connected === true);
    expect((await ack(refreshed, 3, { type: 'summon' })).ok).toBe(true);
  });
  it('rejects default matchmaking, malformed bodies and oversized payloads', async () => {
    const count = rooms.size;
    for (const method of ['create', 'joinOrCreate', 'joinById']) {
      expect((await post(`/matchmake/${method}/coop`, {})).status).toBe(403);
      expect((await post(`/game/matchmake/${method}/coop`, {})).status).toBe(403);
    }
    expect(rooms.size).toBe(count);
    expect((await post('/api/rooms', { name: 'x'.repeat(25), difficulty: 'normal' })).status).toBe(400);
    expect((await post('/api/rooms', { name: 'x'.repeat(5000), difficulty: 'normal' })).status).toBe(413);
    const malformed = await fetch(base + '/api/rooms', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' });
    expect(malformed.status).toBe(400);
  });
  it('rate limits real SDK command floods', async () => {
    const host = await join('/api/rooms', 'Rate test');
    const responses: CommandAck[] = [];
    const enough = new Promise<void>(resolve => {
      const off = host.onMessage<CommandAck>('ack', value => { responses.push(value); if (responses.length === 50) { off(); resolve(); } });
    });
    for (let id = 1; id <= 50; id++) host.send('command', { id, command: { type: 'ready', ready: true } });
    await enough;
    expect(responses.some(value => value.message === 'Too many commands')).toBe(true);
  });
  it('reserves at most four seats and rejects a fifth participant', async () => {
    const host = await join('/api/rooms', 'Capacity host');
    const room = [...rooms.values()].find(r => r.roomId === host.roomId)!;
    for (let i = 0; i < 3; i++) await join(`/api/rooms/${room.game.roomCode}/join`, `Peer ${i}`);
    const response = await post(`/api/rooms/${room.game.roomCode}/join`, { name: 'Fifth' });
    expect(response.status).toBe(409);
    expect(Object.keys(room.game.players)).toHaveLength(4);
  });
  it('enforces allocation quota and expires genuine unused seats after thirty seconds', async () => {
    let expiredReservation: Awaited<ReturnType<typeof matchMaker.reserveSeatFor>> | undefined;
    while (rooms.size < 32) {
      const code = 'ZZZZ' + String.fromCharCode(65 + Math.floor(rooms.size / 26), 65 + rooms.size % 26);
      const listing = await matchMaker.createRoom('coop', { code, difficulty: 'normal', admission: admissionKey });
      expiredReservation = await matchMaker.reserveSeatFor(listing, { ticket: issueTicket(listing.roomId, 'Unused seat') });
    }
    expect((await post('/api/rooms', { name: 'Overflow', difficulty: 'normal' })).status).toBe(503);
    expect(rooms.size).toBe(32);
    // Real wall-clock expiry: no fake timers or stubbed network/room state.
    await new Promise(resolve => setTimeout(resolve, 30_300));
    expect(rooms.size).toBeLessThan(32);
    await expect(new Client(base + '/game').consumeSeatReservation(expiredReservation!)).rejects.toThrow();
    expect([...tickets.values()].some(ticket => ticket.expires < Date.now())).toBe(false);
  }, 35_000);
  it('drains new allocations while existing rooms still sync, join and accept commands', async () => {
    const existing = connected.find(client => {
      const room = [...rooms.values()].find(room => room.roomId === client.roomId);
      return room?.game.phase === 'lobby' && Object.keys(room.game.players).length < 4;
    })!;
    const room = [...rooms.values()].find(room => room.roomId === existing.roomId)!;
    running.drain();
    expect((await fetch(base + '/health')).ok).toBe(true);
    expect(await (await fetch(base + '/health')).json()).toMatchObject({ draining: true });
    expect((await post('/api/rooms', { name: 'New room', difficulty: 'normal' })).status).toBe(503);
    const pending = snapshot(existing, s => s.roomCode === room.game.roomCode);
    existing.send('sync'); await pending;
    expect((await ack(existing, 100, { type: 'ready', ready: true })).ok).toBe(true);
    const peer = await join(`/api/rooms/${room.game.roomCode}/join`, 'Drain peer');
    expect(peer.roomId).toBe(existing.roomId);
  });
});
