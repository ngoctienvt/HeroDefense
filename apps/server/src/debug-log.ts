export interface DebugEntry { time: string; event: string; room?: string; client?: string; reason?: string; count?: number; durationMs?: number; heroId?: string; skillId?: string }
const recent: DebugEntry[] = [];
const emitted = new Map<string, { at: number; count: number }>();
export function debugLog(event: string, details: Omit<DebugEntry, 'time' | 'event'> = {}): void {
  const now = Date.now();
  const bucket = emitted.get(event);
  if (bucket && now - bucket.at < 1000) {
    if (bucket.count >= 4) return;
    bucket.count++;
  } else emitted.set(event, { at: now, count: 1 });
  const entry = { time: new Date().toISOString(), event, ...details };
  recent.push(entry);
  if (recent.length > 200) recent.shift();
  if (process.env.NODE_ENV !== 'test') console.log(JSON.stringify(entry));
}
export function recentDebugLogs(): readonly DebugEntry[] { return recent; }
