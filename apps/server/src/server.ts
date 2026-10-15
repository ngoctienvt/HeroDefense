import express, { type Request, type Response, type NextFunction } from 'express';
import { Server, matchMaker } from '@colyseus/core';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { CONTENT_VERSION, type Difficulty } from '../../../packages/contracts/src/types.js';
import { GameRoom, admissionKey, issueTicket, rooms, tickets } from './game-room.js';
import { difficulties, playerName, RateLimit } from './validation.js';
import { debugLog } from './debug-log.js';

export interface RunningServer { server: Server; port: number; drain(): void; close(): Promise<void> }
export async function startServer(port = 2567, host = '0.0.0.0'): Promise<RunningServer> {
  const rateByIp = new Map<string, { limiter: RateLimit; seen: number }>();
  const globalLimit = new RateLimit(60, 10);
  let creating = 0;
  let draining = false;
  const transport = new WebSocketTransport({
    maxPayload: 4096,
    beforeUpgrade: (request) => /^\/game\/[\w-]+\/[\w-]+$/.test(new URL(request.url).pathname) ? undefined : new Response('Invalid websocket path', { status: 404 }),
  });
  const app = transport.getExpressApp();
  app.disable('x-powered-by');
  if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    next();
  });
  app.use(express.json({ limit: '4kb', strict: true }));
  app.get('/health', (_req, res) => res.json({ ok: true, release: CONTENT_VERSION, rooms: rooms.size, draining }));
  const apiLimit = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [ip, entry] of rateByIp) if (now - entry.seen > 600_000) rateByIp.delete(ip);
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    let entry = rateByIp.get(ip);
    if (!entry) {
      if (rateByIp.size >= 2048) return res.status(429).json({ error: 'Server busy' });
      entry = { limiter: new RateLimit(12, 0.5), seen: now }; rateByIp.set(ip, entry);
    }
    entry.seen = now;
    if (!globalLimit.take() || !entry.limiter.take()) return res.status(429).json({ error: 'Too many room requests' });
    for (const [token, ticket] of tickets) if (ticket.expires < now) tickets.delete(token);
    next();
  };
  app.post('/api/rooms', apiLimit, async (req, res) => {
    if (draining) return res.status(503).json({ error: 'Server is draining; use the new game host' });
    const name = playerName(req.body?.name);
    const difficulty = req.body?.difficulty as Difficulty;
    if (!name || !difficulties.includes(difficulty) || Object.keys(req.body).some(k => !['name', 'difficulty'].includes(k))) return res.status(400).json({ error: 'Invalid name or difficulty' });
    if (rooms.size + creating >= 32) return res.status(503).json({ error: 'Room limit reached' });
    creating++;
    let code = '';
    do { code = Array.from({ length: 6 }, () => String.fromCharCode(65 + randomInt(26))).join(''); } while (rooms.has(code));
    try {
      const listing = await matchMaker.createRoom('coop', { code, difficulty, admission: admissionKey });
      const ticket = issueTicket(listing.roomId, name);
      const reservation = await matchMaker.reserveSeatFor(listing, { ticket });
      res.status(201).json({ reservation, code, release: CONTENT_VERSION });
    } catch {
      debugLog('reservation-failed', { room: code });
      res.status(503).json({ error: 'Room unavailable' });
    } finally { creating--; }
  });
  app.post('/api/rooms/:code/join', apiLimit, async (req, res) => {
    const name = playerName(req.body?.name);
    const code = String(req.params.code);
    if (!name || !/^[A-Z]{6}$/.test(code) || Object.keys(req.body).some(k => k !== 'name')) return res.status(400).json({ error: 'Invalid name or invitation code' });
    const room = rooms.get(code);
    if (!room) return res.status(404).json({ error: 'Room not found' });
    if (room.game.phase !== 'lobby') return res.status(409).json({ error: 'Room already started' });
    if (Object.keys(room.game.players).length >= 4) return res.status(409).json({ error: 'Room full' });
    const ticket = issueTicket(room.roomId, name);
    try {
      const listing = await matchMaker.getRoomById(room.roomId);
      const reservation = await matchMaker.reserveSeatFor(listing, { ticket });
      res.json({ reservation, code, release: CONTENT_VERSION });
    } catch {
      tickets.delete(ticket);
      res.status(409).json({ error: 'Room full or unavailable' });
    }
  });
  app.post('/game/matchmake/reconnect/:roomId', apiLimit, async (req, res) => {
    const roomId = String(req.params.roomId);
    if (typeof req.body?.reconnectionToken !== 'string' || req.body.reconnectionToken.length > 128 || !/^[\w-]{1,64}$/.test(roomId)) return res.status(400).json({ error: 'Invalid reconnect request' });
    try { res.json(await matchMaker.reconnect(roomId, { reconnectionToken: req.body.reconnectionToken })); }
    catch { res.status(403).json({ error: 'Reconnect expired' }); }
  });
  app.use(['/matchmake', '/game/matchmake'], (_req, res) => res.status(403).json({ error: 'Use invitation API' }));
  const clientDist = resolve(process.cwd(), 'dist/client');
  app.use(express.static(clientDist, {
    index: false,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');
      }
    },
  }));
  app.get('/{*path}', (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/game/')) return res.status(404).json({ error: 'Not found' });
    const index = resolve(clientDist, 'index.html');
    if (existsSync(index)) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(index);
    } else res.status(404).send('Build the client with npm run build.');
  });
  app.use((error: { type?: string }, _req: Request, res: Response, _next: NextFunction) => {
    res.status(error.type === 'entity.too.large' ? 413 : 400).json({ error: 'Invalid request body' });
  });
  const server = new Server({ transport, greet: false, gracefullyShutdown: false });
  server.define('coop', GameRoom);
  const http = await server.serverless();
  // Expose only our invitation/reconnect API. The framework's default router
  // permits room allocation and its serverless body prereader is unbounded.
  http.removeAllListeners('request');
  http.on('request', app);
  await new Promise<void>((accept, reject) => {
    http.once('error', reject);
    http.listen(port, host, () => { http.off('error', reject); accept(); });
  });
  const address = http.address();
  const boundPort = typeof address === 'object' && address ? address.port : port;
  debugLog('server-listening', { count: boundPort });
  return { server, port: boundPort, drain: () => {
    draining = true;
    debugLog('server-draining', { count: rooms.size });
  }, close: async () => {
    await server.gracefullyShutdown(false);
    http.closeAllConnections();
    if (http.listening) await new Promise<void>(accept => http.close(() => accept()));
    rateByIp.clear(); tickets.clear();
  } };
}
