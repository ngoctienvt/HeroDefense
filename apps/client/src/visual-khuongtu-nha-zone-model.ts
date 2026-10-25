import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { debug } from './debug.js';
import { BOLT_PULSE_SECONDS, CAST_GRACE, CLOSE_SECONDS, MARK_LOSS, MARK_WAIT, OPEN_SECONDS, ZONE_CAP } from './visual-khuongtu-nha-timeline.js';

/** One scroll + seal. Plain numbers only (no Babylon), so the lifecycle is testable. */
export interface ZoneItem {
  /** Ground-effect id once the snapshot shows the zone (the event carries none). */
  id?: string;
  /** Caster, to pair a resolve with its own cast. */
  source?: string;
  x: number; z: number;
  age: number; windup: number;
  /** The server resolved (`ability`): the zone is real. Before that it is only the windup preview. */
  confirmed: boolean;
  confirmAge: number;
  touched: boolean; missing: number;
  closeAge?: number;
  reduced: boolean;
  pulse: number;
}

const MAX_ZONES = 8;
/** A resolve claims the unconfirmed cast within this distance of its point. */
const PAIR_DISTANCE = 2.5;
/** The snapshot's zone claims the confirmed, unbound zone within this distance of its point. */
const BIND_DISTANCE = 2.5;

const near = (z: ZoneItem, x: number, y: number, limit: number): boolean => Math.hypot(z.x - x, z.z - y) <= limit;

/**
 * Scroll/seal lifecycle driven by the real events: `cast` opens it at the locked point (T0), `ability` confirms it,
 * the `phong-than` ground effect (snapshot `remaining`) keeps it for the server's 5 s and ends it, and a cast
 * that never resolves closes after its windup + grace. The seal never draws an area the server has not locked.
 */
export class ZoneModel {
  readonly items: ZoneItem[] = [];

  /** Windup: a preview zone at the locked point. Returns undefined at the cap. */
  cast(source: string | undefined, x: number, z: number, windup: number, reduced: boolean): ZoneItem | undefined {
    for (const item of this.items) if (!item.confirmed && item.closeAge === undefined && item.source === source) this.close(item);
    return this.add({ source, x, z, windup: Math.max(.05, windup), reduced });
  }

  /** Resolve: confirms the pairing cast (re-anchoring on the server's point), else opens a fresh zone (practice lobby, reconnect). */
  confirm(source: string | undefined, x: number, z: number, reduced: boolean): { item?: ZoneItem; hadCast: boolean } {
    const pending = this.items.filter(i => !i.confirmed && i.closeAge === undefined && (i.source === source || !i.source || !source))
      .sort((a, b) => Math.hypot(a.x - x, a.z - z) - Math.hypot(b.x - x, b.z - z))[0];
    const hadCast = Boolean(pending && near(pending, x, z, PAIR_DISTANCE));
    const item = hadCast ? pending : this.add({ source, x, z, windup: 0, reduced });
    if (!item) return { hadCast: false };
    item.x = x; item.z = z; item.confirmed = true; item.confirmAge = 0; item.reduced = reduced;
    return { item, hadCast };
  }

  /** Snapshot `phong-than` ground effect, every frame: binds to its zone, keeps it alive, ends it at `remaining`. */
  mark(id: string, x: number, z: number, remaining: number | undefined, reduced: boolean): ZoneItem | undefined {
    let item: ZoneItem | undefined = this.items.find(i => i.id === id)
      ?? this.items.filter(i => i.confirmed && !i.id && i.closeAge === undefined && near(i, x, z, BIND_DISTANCE))[0];
    if (!item) {
      // Joined mid-zone (reconnect, another zone view): already fully open, no opening replay.
      item = this.add({ x, z, windup: 0, reduced }, OPEN_SECONDS + 1);
      if (!item) return undefined;
      item.confirmed = true;
      debug('visual.khuongtu.zone.join', { id, remaining });
    }
    item.id = id; item.x = x; item.z = z; item.touched = true; item.missing = 0;
    if (remaining !== undefined && remaining <= CLOSE_SECONDS && item.closeAge === undefined) this.close(item);
    return item;
  }

  /** A bolt landed near this point: the zone's scroll pulses. */
  pulse(x: number, z: number): void {
    const item = this.items.filter(i => i.confirmed && i.closeAge === undefined && near(i, x, z, K.zoneRadius + 2))[0];
    if (item) item.pulse = BOLT_PULSE_SECONDS;
  }

  /** Advances every zone; returns the ones that finished their closing this step. */
  step(dt: number): ZoneItem[] {
    const done: ZoneItem[] = [];
    for (const item of [...this.items]) {
      item.age += dt; item.pulse = Math.max(0, item.pulse - dt);
      if (item.closeAge !== undefined) {
        item.closeAge += dt;
        if (item.closeAge >= CLOSE_SECONDS) { this.items.splice(this.items.indexOf(item), 1); done.push(item); }
        continue;
      }
      if (!item.confirmed) {
        if (item.age >= item.windup + CAST_GRACE) { debug('visual.khuongtu.cast.timeout', { windup: +item.windup.toFixed(2) }); this.close(item); }
      } else if (item.id) {
        item.missing = item.touched ? 0 : item.missing + dt;
        item.touched = false;
        if (item.missing >= MARK_LOSS) this.close(item);
      } else {
        item.confirmAge += dt;
        if (item.confirmAge >= MARK_WAIT) this.close(item);
      }
      if (item.closeAge === undefined && item.age >= ZONE_CAP + item.windup) this.close(item);
    }
    return done;
  }

  clear(): ZoneItem[] { return this.items.splice(0); }

  private close(item: ZoneItem): void { if (item.closeAge === undefined) item.closeAge = 0; }

  private add(init: Pick<ZoneItem, 'x' | 'z' | 'windup' | 'reduced'> & { source?: string }, age = 0): ZoneItem | undefined {
    if (this.items.length >= MAX_ZONES) { debug('visual.khuongtu.cap', { layer: 'zones' }); return undefined; }
    const item: ZoneItem = { confirmed: false, confirmAge: 0, touched: false, missing: 0, pulse: 0, age, ...init };
    this.items.push(item);
    return item;
  }
}
