import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import type { CommandAck } from '../../../packages/contracts/src/types.js';
import { GameSession } from '../src/game-session.js';
import { startServer, type RunningServer } from '../../server/src/server.js';

let running: RunningServer;
const sessions: GameSession[] = [];
const storage = new Map<string, string>();
const nativeFetch = globalThis.fetch;
const makeSession = () => { const session = new GameSession(); sessions.push(session); return session; };
const roomOf = (session: GameSession) => (session as unknown as { room: Room }).room;
// Retain the actual SDK callback to exercise delivery already queued before removal.
const ackCallbackOf = (room: Room) => {
  const callbacks = (room as unknown as { onMessageHandlers: { events: { ack?: ((ack: CommandAck) => void)[] } } }).onMessageHandlers.events.ack;
  if (!callbacks?.[0]) throw new Error('Session acknowledgement handler is missing');
  return callbacks[0];
};
async function until(predicate: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!predicate()) {
    if (Date.now() > deadline) throw new Error('Real network session timed out');
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}
async function drop(session: GameSession): Promise<void> {
  expect(roomOf(session).reconnection.enabled).toBe(false);
  roomOf(session).connection.close();
  await until(() => session.view.status === 'disconnected');
}
beforeAll(async () => {
  // Browser storage/location adapter only. All rooms, sockets and gameplay are real.
  vi.stubGlobal('location', { protocol: 'http:', host: '127.0.0.1:2569', search: '' });
  vi.stubGlobal('fetch', (input: string | URL | Request, init?: RequestInit) =>
    nativeFetch(typeof input === 'string' && input.startsWith('/') ? `http://127.0.0.1:2569${input}` : input, init));
  vi.stubGlobal('sessionStorage', {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
  });
  running = await startServer(2569, '127.0.0.1');
});
beforeEach(() => storage.clear());
afterAll(async () => {
  for (const session of sessions) await session.leave();
  await running?.close(); vi.unstubAllGlobals();
});
describe('browser session adapter with real SDK connections', () => {
  it('returns sent command ids, publishes matching acknowledgements and requests the existing sync', async () => {
    const session = makeSession();
    expect(session.send({ type: 'summon' })).toBeNull();
    expect(session.requestSync()).toBe(false);
    await session.connectCreate('Command receipts', 'normal');
    await until(() => !!session.view.state);
    const generation = session.sessionGeneration;
    const acknowledgements: { ack: CommandAck; generation: number }[] = [];
    const unsubscribe = session.subscribeAck((ack, generation) => acknowledgements.push({ ack, generation }));
    const receipt = session.send({ type: 'summon' });
    expect(typeof receipt).toBe('number');
    await until(() => acknowledgements.some(entry => entry.ack.id === receipt));
    expect(acknowledgements.find(entry => entry.ack.id === receipt)).toMatchObject({ ack: { id: receipt, ok: true }, generation });
    const rejected = session.send({ type: 'unequip-item', itemId: 'missing-item' });
    await until(() => acknowledgements.some(entry => entry.ack.id === rejected));
    expect(acknowledgements.find(entry => entry.ack.id === rejected)?.ack.ok).toBe(false);
    expect(rejected).toBeGreaterThan(receipt!);

    let identities = 0;
    const removeIdentity = roomOf(session).onMessage('identity', () => identities++);
    expect(session.requestSync()).toBe(true);
    await until(() => identities > 0);
    removeIdentity();
    unsubscribe(); unsubscribe();
    const count = acknowledgements.length;
    let lastAck: CommandAck | undefined;
    const removeAck = roomOf(session).onMessage('ack', (ack: CommandAck) => { lastAck = ack; });
    const nextReceipt = session.send({ type: 'ready', ready: true });
    await until(() => lastAck?.id === nextReceipt);
    expect(acknowledgements).toHaveLength(count);
    removeAck();
    await session.leave();
  });

  it('isolates acknowledgements across SDK drop, restore, manual reconnect, leave and disposal', async () => {
    const session = makeSession();
    await session.connectCreate('Acknowledgement generations', 'normal');
    await until(() => !!session.view.state);
    const acknowledgements: { ack: CommandAck; generation: number }[] = [];
    session.subscribeAck((ack, generation) => acknowledgements.push({ ack, generation }));
    const firstReceipt = session.send({ type: 'summon' });
    await until(() => acknowledgements.some(entry => entry.ack.id === firstReceipt));
    const originalRoom = roomOf(session);
    const oldAck = ackCallbackOf(originalRoom);
    const firstAck = acknowledgements[0].ack;
    const generation = session.sessionGeneration;

    // Exercise SDK lifecycle signals on the live room without replacing its transport.
    originalRoom.onDrop.invoke(1006);
    expect(session.sessionGeneration).toBeGreaterThan(generation);
    expect(session.send({ type: 'summon' })).toBeNull();
    expect(session.requestSync()).toBe(false);
    oldAck(firstAck);
    originalRoom.onReconnect.invoke();
    expect(session.view.status).toBe('connected');
    oldAck(firstAck);
    ackCallbackOf(originalRoom)(firstAck);
    expect(acknowledgements).toHaveLength(1);
    const restoredReceipt = session.send({ type: 'summon' });
    await until(() => acknowledgements.some(entry => entry.ack.id === restoredReceipt));
    expect(acknowledgements.at(-1)?.generation).toBe(session.sessionGeneration);

    const restoredAck = ackCallbackOf(originalRoom);
    await drop(session);
    const droppedGeneration = session.sessionGeneration;
    const reconnecting = session.reconnect();
    expect(session.sessionGeneration).toBeGreaterThan(droppedGeneration);
    restoredAck(firstAck);
    await reconnecting;
    expect(roomOf(session)).not.toBe(originalRoom);
    originalRoom.onError.invoke(500, 'Stale room error');
    expect(session.view.message).not.toBe('Stale room error');
    ackCallbackOf(roomOf(session))(firstAck);
    const finalReceipt = session.send({ type: 'ready', ready: true });
    await until(() => acknowledgements.some(entry => entry.ack.id === finalReceipt));
    expect(acknowledgements).toHaveLength(3);
    const currentAck = ackCallbackOf(roomOf(session));
    const currentGeneration = session.sessionGeneration;
    await session.leave();
    expect(session.sessionGeneration).toBeGreaterThan(currentGeneration);
    oldAck(firstAck); restoredAck(firstAck); currentAck(firstAck);
    expect(acknowledgements).toHaveLength(3);
    expect(session.requestSync()).toBe(false);
    session.dispose();
    expect((session as unknown as { ackListeners: Set<unknown> }).ackListeners.size).toBe(0);
  });

  it('paces white salvage, deduplicates queued ids and preserves equipped gear', async () => {
    const session = makeSession();
    await session.connectCreate('Gear queue regression', 'normal');
    await until(() => !!session.view.state);
    const selfId = session.view.selfId;
    session.send({ type: 'admin-get-hero', heroId: 'h001' });
    for (let index = 0; index < 5; index++) session.send({ type: 'admin-item', slot: 'weapon', rarity: 'white' });
    await until(() => session.view.state!.players[selfId].gear.length === 5 && Object.keys(session.view.state!.units).length === 1);
    const ids = session.view.state!.players[selfId].gear.map(item => item.id);
    const unitId = Object.keys(session.view.state!.units)[0];
    session.send({ type: 'equip-item', itemId: ids[0], unitId });
    await until(() => session.view.state!.players[selfId].gear[0].unitId === unitId);
    const pending = new Set<string>();
    session.queueWhiteSalvage(ids, id => !pending.has(id)); session.queueWhiteSalvage(ids);
    // A transfer can begin after confirmation but before this paced command reaches the queue head.
    pending.add(ids[1]);
    await until(() => session.view.state!.players[selfId].gear.length === 2);
    expect(session.view.state!.players[selfId].gear.some(item => item.id === ids[1])).toBe(true);
    pending.clear(); session.queueWhiteSalvage([ids[1]], id => !pending.has(id));
    await until(() => session.view.state!.players[selfId].gear.length === 1);
    expect(session.view.state!.players[selfId].gear[0].id).toBe(ids[0]);
    expect(session.view.state!.players[selfId].gearDust).toBe(4);
    await session.leave();
  });

  it('returns to the lobby immediately after a closed transport', async () => {
    const session = makeSession();
    await session.connectCreate('Leave regression', 'normal');
    await until(() => !!session.view.state);
    await drop(session);
    const started = performance.now();
    await session.leave();
    expect(performance.now() - started).toBeLessThan(500);
    expect(session.view).toMatchObject({ status: 'idle', state: null, selfId: '' });
    expect(session.canReconnect).toBe(false);
  });
  it('can create another real room after abandoning a dropped connection', async () => {
    const session = makeSession();
    await session.connectCreate('Before drop', 'normal');
    await until(() => !!session.view.state);
    const firstCode = session.view.state!.roomCode;
    await drop(session);
    await session.connectCreate('After drop', 'nightmare');
    await until(() => !!session.view.state);
    expect(session.view.status).toBe('connected');
    expect(session.view.state!.roomCode).not.toBe(firstCode);
    expect(session.view.state!.difficulty).toBe('nightmare');
  });
  it('refresh reconnect preserves resources, identity and next purchase sequence', async () => {
    const original = makeSession();
    await original.connectCreate('Refresh regression', 'normal');
    await until(() => !!original.view.state);
    const selfId = original.view.selfId;
    original.send({ type: 'summon' });
    await until(() => original.view.state!.players[selfId].souls === 16);
    await drop(original);
    const refreshed = makeSession();
    await refreshed.reconnect();
    await until(() => !!refreshed.view.state);
    expect(refreshed.view.selfId).toBe(selfId);
    expect(refreshed.view.state!.players[selfId].souls).toBe(16);
    expect(Object.keys(refreshed.view.state!.units)).toHaveLength(1);
    refreshed.send({ type: 'summon' });
    await until(() => refreshed.view.state!.players[selfId].souls === 14);
    expect(Object.keys(refreshed.view.state!.units)).toHaveLength(2);
  });
});
