import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { KHUONGTU as K } from '../../../content/khuongtu-nha-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { KhuongtuBolts } from './visual-khuongtu-nha-bolts.js';
import { KhuongtuChain } from './visual-khuongtu-nha-chain.js';
import { KhuongtuReplay } from './visual-khuongtu-nha-replay.js';
import { ARRAY_SIZE, BOLT_SIZE, DEFAULT_WINDUP, SCROLL_SIZE } from './visual-khuongtu-nha-timeline.js';
import { KhuongtuZones } from './visual-khuongtu-nha-zones.js';

/** Painted planes alive at once: 8 zones × (scroll + seal), 12 bolt strikes, 24 chain links. */
const PAINTED_CAPACITY = 56;

/**
 * Khương Tử Nha Phong Thần Pháp Trận (h019) on the kit, Codex art from tier56-codex-art (palette jade + gold).
 * Windup (`cast`, T0): the investiture scroll unfurls at the locked point in 0.2 s while the seal's lines gather in.
 * Resolve (`ability skill-h019`, R7): the zone is confirmed and a shock ring marks the exact edge; the 5 s that follow
 * come from the `phong-than` ground effect (snapshot `remaining`), which also ends it: the scroll rolls into its axle and
 * the seal retracts to the centre in 0.35 s. Each `bolt-h019` (eight, 0.625 s apart, one target each) is one thunder
 * strike on that single point, never a zone blast. Basic `trait-h019`: the thunder chain along the server's targets.
 * Seals on bosses come from the shared status marks. Presentation only; the server decides every hit.
 */
export class VisualKhuongTuNha implements HeroVfx {
  readonly heroId = K.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private zones: KhuongtuZones;
  private bolts: KhuongtuBolts;
  private chain: KhuongtuChain;
  private preview = new KhuongtuReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'khuongtu');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.zones = new KhuongtuZones(this.art, this.bank);
    this.bolts = new KhuongtuBolts(this.art, this.bank);
    this.chain = new KhuongtuChain(scene, this.art, this.bank);
    debug('visual.khuongtu.layout', { radius: K.zoneRadius, array: +ARRAY_SIZE.toFixed(2), scroll: SCROLL_SIZE, bolt: BOLT_SIZE });
  }

  /** Idempotent; art still loading keeps the shader rings, and the next use retries. */
  prepare(): void {
    this.art.prepare('scroll', '/assets/vfx-khuongtu-nha-scroll.webp', { foreground: true });
    this.art.prepare('boltHit', '/assets/vfx-khuongtu-nha-bolt-hit.webp', { foreground: true });
    this.art.prepare('bolt', '/assets/vfx-khuongtu-nha-bolt.webp', { foreground: true });
    this.art.prepare('array', '/assets/vfx-khuongtu-nha-array.webp');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean): boolean {
    if (event.skillId !== `skill-${K.id}`) return false;
    this.prepare();
    this.zones.cast(event.source, at, event.windup ?? DEFAULT_WINDUP, reduced);
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    switch (event.skillId) {
      case `skill-${K.id}`: {
        if (event.kind !== 'ability') return false;
        const hadCast = this.zones.confirm(event.source, at, reduced);
        debug('visual.khuongtu.impact', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `bolt-${K.id}`: {
        const accepted = this.bolts.strike(at, reduced);
        this.zones.pulse(at);
        debug('visual.khuongtu.bolt', { eventId: event.id, accepted, reduced });
        return true;
      }
      case `trait-${K.id}`: {
        const links = this.chain.launch(origin, extra?.targets?.length ? extra.targets : [at], reduced);
        debug('visual.khuongtu.chain', { eventId: event.id, links, targets: extra?.targets.length ?? 1, reduced });
        return true;
      }
      default: return false;
    }
  }

  /** Kit snapshot marker `zone` (no `remaining`: the zone ends when the marker stops); the field uses `markZone`. */
  mark(kind: string, id: string, at: Vector3, reduced: boolean): void {
    if (kind === 'zone') this.zones.mark(id, at, undefined, reduced);
  }

  /** `phong-than` ground effect, every frame while it exists: `remaining` ≤ 0.35 s starts the closing. */
  markZone(id: string, at: Vector3, remaining: number | undefined, reduced: boolean): void {
    this.prepare();
    this.zones.mark(id, at, remaining, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.zones.tick(dt, time, up);
    this.bolts.tick(dt, up);
    this.chain.tick(dt);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.zones.clear(); this.bolts.clear(); this.chain.clear(); this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }
}
