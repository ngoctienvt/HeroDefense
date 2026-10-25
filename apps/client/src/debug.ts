type Entry = { time: string; event: string; detail?: unknown };
const entries: Entry[] = [];
/** Opt in with ?debug=1. Connection tokens and player names never enter this log. */
export function debug(event: string, detail?: unknown): void {
  entries.push({ time: new Date().toISOString(), event, detail });
  if (entries.length > 100) entries.shift();
  if (typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug'))
    console.debug('[thien-dao]', event, detail === undefined ? '' : JSON.stringify(detail));
}
export function debugLog(): readonly Entry[] { return entries.map(entry => ({ ...entry })); }
if (typeof window !== 'undefined') Object.defineProperty(window, '__thienDaoDebug', { value: debugLog, writable: false });
