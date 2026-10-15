import { startServer } from './server.js';
import { debugLog } from './debug-log.js';

const port = Number(process.env.PORT || 2567);
if (!Number.isSafeInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535');
const running = await startServer(port);
let closing = false;
async function shutdown(): Promise<void> {
  if (closing) return;
  closing = true;
  debugLog('server-stopping');
  await running.close();
}
process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
process.on('SIGUSR2', () => running.drain());
