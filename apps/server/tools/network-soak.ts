import { Client, type Room } from '@colyseus/sdk';
import { monitorEventLoopDelay } from 'node:perf_hooks';
import { startServer } from '../src/server.js';
import type { CommandAck, GameState } from '../../../packages/contracts/src/types.js';

const seconds = Number(process.argv[2] || 15);
if (!Number.isFinite(seconds) || seconds < 5 || seconds > 300) throw new Error('Duration must be 5–300 seconds');
const running = await startServer(2568, '127.0.0.1');
const base = 'http://127.0.0.1:2568';
const connected: Room[] = [];
const delay = monitorEventLoopDelay({ resolution: 10 });
let snapshots = 0, bytes = 0, acks = 0, rejects = 0, latest: GameState | undefined;
const sequences: number[] = [];
async function join(path: string, name: string): Promise<Room> {
  const response = await fetch(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name, ...(path === '/api/rooms' ? { difficulty: 'normal' } : {}) }) });
  const body = await response.json();
  if (!response.ok) throw new Error(`Admission failed: ${response.status}`);
  const room = await new Client(base + '/game').consumeSeatReservation(body.reservation);
  room.onMessage('identity', () => {});
  room.onMessage<GameState>('snapshot', state => { snapshots++; bytes += Buffer.byteLength(JSON.stringify(state)); latest = state; });
  room.onMessage<CommandAck>('ack', ack => { acks++; if (!ack.ok) rejects++; });
  connected.push(room); sequences.push(0); room.send('sync');
  return room;
}
let commands: ReturnType<typeof setInterval> | undefined;
try {
  await join('/api/rooms', 'Soak host');
  while (!latest) await new Promise(resolve => setTimeout(resolve, 10));
  for (let i = 1; i < 4; i++) await join(`/api/rooms/${latest.roomCode}/join`, `Soak peer ${i}`);
  connected.forEach((room, i) => {
    room.send('command', { id: ++sequences[i], command: { type: 'ready', ready: true } });
    room.send('command', { id: ++sequences[i], command: { type: 'summon' } });
  });
  await new Promise(resolve => setTimeout(resolve, 100));
  connected[0].send('command', { id: ++sequences[0], command: { type: 'start' } });
  await new Promise(resolve => setTimeout(resolve, 100));
  connected.forEach((room, i) => {
    const unit = Object.values(latest!.units).find(unit => unit.owner === room.sessionId);
    if (!unit) throw new Error('Summon did not create owned unit');
    room.send('command', { id: ++sequences[i], command: { type: 'deploy', unitId: unit.id, slot: 0 } });
  });
  connected[0].send('command', { id: ++sequences[0], command: { type: 'next-wave' } });
  const start = performance.now(), memoryStart = process.memoryUsage().rss, cpu = process.cpuUsage();
  snapshots = 0; bytes = 0; delay.enable();
  commands = setInterval(() => connected.forEach((room, i) => room.send('command', { id: ++sequences[i], command: { type: 'ready', ready: true } })), 100);
  await new Promise(resolve => setTimeout(resolve, seconds * 1000));
  clearInterval(commands); commands = undefined; delay.disable();
  const elapsed = (performance.now() - start) / 1000, used = process.cpuUsage(cpu);
  const report = { clients: connected.length, seconds: Number(elapsed.toFixed(2)), snapshots, snapshotsPerClientSecond: Number((snapshots / 4 / elapsed).toFixed(2)), snapshotBytes: bytes, ackCount: acks, rejectedCommands: rejects, rssStartMiB: Number((memoryStart / 1048576).toFixed(1)), rssEndMiB: Number((process.memoryUsage().rss / 1048576).toFixed(1)), cpuMs: Math.round((used.user + used.system) / 1000), eventLoopP99Ms: Number((delay.percentile(99) / 1e6).toFixed(2)), tick: latest!.tick, phase: latest!.phase, wave: latest!.wave };
  console.log(JSON.stringify(report));
  if (report.snapshotsPerClientSecond < 8 || rejects !== 0 || latest!.tick < seconds * 15) throw new Error('Soak acceptance failed');
} finally {
  if (commands) clearInterval(commands);
  delay.disable();
  await Promise.all(connected.filter(room => room.connection.isOpen).map(room => room.leave()));
  await running.close();
}
