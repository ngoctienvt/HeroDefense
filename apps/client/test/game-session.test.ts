import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Room } from '@colyseus/sdk';
import { GameSession } from '../src/game-session.js';
import { startServer, type RunningServer } from '../../server/src/server.js';

let running: RunningServer;
const sessions: GameSession[] = [];
const storage = new Map<string, string>();
const nativeFetch = globalThis.fetch;
const makeSession = () => { const session = new GameSession(); sessions.push(session); return session; };
const roomOf = (session: GameSession) => (session as unknown as { room: Room }).room;
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
