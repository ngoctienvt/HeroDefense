import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { NHIEN_DANG as N } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { NhienDangCage } from './visual-nhien-dang-cage.js';
import { NhienDangGifts } from './visual-nhien-dang-gifts.js';
import { NhienDangReflect } from './visual-nhien-dang-reflect.js';
import { NhienDangReplay } from './visual-nhien-dang-replay.js';
import { CAGE_RADIUS, DEFAULT_WINDUP, PEARL_COUNT, REFLECT_RADIUS } from './visual-nhien-dang-timeline.js';

/** Painted planes alive at once: two cages (24 pearls + 24 flames + decal), shield gifts, reflect bursts and ribbons, basic puffs. */
const PAINTED_CAPACITY = 160;

/**
 * Nhiên Đăng Vạn Cổ Tịch Diệt Trận (h03W) on the kit, Codex art from tier56-codex-art (palette/spray `lantern`).
 * Windup (`cast`, R7 at the caster): 24 pearl lamps light one after another round two rings. Resolve (`ability skill-h03W`):
 * the pearls lift into a cage over the 24-slot array decal; each `shield-h03W` sends one pearl to that recipient. The cage is
 * held by the server's `lantern-cage` ground snapshot (`markCage`, every frame) and folds in 0.35 s when it ends.
 * `reflect-h03W`: one burst at the attacker (R2.5). `trait-h03W`: a lamp flame on the struck monster. Shield bubbles, slow and
 * burn marks on monsters come from the shared layers (snapshot fields). Presentation only; the server decides every effect.
 */
export class VisualNhienDang implements HeroVfx {
  readonly heroId = N.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private cage: NhienDangCage;
  private gifts: NhienDangGifts;
  private hits: NhienDangReflect;
  private preview = new NhienDangReplay(this);
  /** The defensive branch calls `ability` once per ally for the one `skill-h03W` event: only the first resolves. */
  private lastResolveId?: number;

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'nhiendang');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.cage = new NhienDangCage(this.art, this.bank);
    this.gifts = new NhienDangGifts(this.art, this.bank);
    this.hits = new NhienDangReflect(scene, this.art, this.bank);
    debug('visual.nhiendang.layout', { pearls: PEARL_COUNT, radius: CAGE_RADIUS, reflectRadius: REFLECT_RADIUS });
  }

  /** Idempotent; art still loading keeps the ring and the next use retries. */
  prepare(): void {
    this.art.prepare('pearl', '/assets/vfx-nhien-dang-pearl.webp', { foreground: true });
    this.art.prepare('flame', '/assets/vfx-nhien-dang-flame.webp', { foreground: true });
    this.art.prepare('reflect', '/assets/vfx-nhien-dang-reflect.webp', { foreground: true });
    this.art.prepare('ribbon', '/assets/vfx-nhien-dang-reflection.webp', { foreground: true });
    this.art.prepare('array', '/assets/vfx-nhien-dang-array.webp');
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${N.id}`) return false;
    this.prepare();
    this.cage.begin(event.source ?? 'caster', origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced);
    debug('visual.nhiendang.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    this.prepare();
    const source = event.source ?? 'caster';
    switch (event.skillId) {
      case `skill-${N.id}`:
        if (event.kind !== 'ability') return false;
        if (event.id === this.lastResolveId) return true;
        this.lastResolveId = event.id;
        this.resolve(event, source, event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : origin, reduced, extra);
        return true;
      case `shield-${N.id}`:
        this.gifts.send(this.cage.pearlNear(source, at), origin, at, screenUp(this.scene), reduced);
        debug('visual.nhiendang.shield', { eventId: event.id, reduced });
        return true;
      case `reflect-${N.id}`:
        this.hits.reflect(at, this.cage.pearlNear(source, at), reduced);
        debug('visual.nhiendang.reflect', { eventId: event.id, reduced });
        return true;
      case `trait-${N.id}`:
        this.hits.basic(at);
        return true;
      default: return false;
    }
  }

  /** Marker `caster` (every frame the hero is on the field): the lit array follows him while the windup runs. */
  mark(kind: string, id: string, at: Vector3): void {
    if (kind === 'caster') this.cage.follow(id, at);
  }

  /** Server `lantern-cage` ground effect (every frame): holds the cage for `remaining` seconds. */
  markCage(casterId: string, at: Vector3, radius: number, remaining: number, reduced: boolean): void {
    this.cage.mark(casterId, at, remaining, radius, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.cage.tick(dt, time, up);
    this.gifts.tick(dt, up);
    this.hits.tick(dt, up);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.cage.clear(); this.gifts.clear(); this.hits.clear(); this.bank.clear(); this.art.clear();
    this.lastResolveId = undefined;
  }

  replay(kind: string, at: Vector3, reduced: boolean, origin = at): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced, origin);
  }

  /** One resolve: the pearls lift into the cage; ground ring on the real R7 edge and motes rising from the lamps. */
  private resolve(event: GameEvent, source: string, center: Vector3, reduced: boolean, extra?: AbilityExtra): void {
    const hadCast = this.cage.resolve(source, center, reduced);
    this.bank.ring(center, CAGE_RADIUS, 'lantern', { life: .55, fill: .04, rim: 1, alpha: .95, reduced, order: 6 });
    if (!reduced) this.bank.spray('lantern').ring(center, CAGE_RADIUS * .6, 44, .3, 1.5, 3.2);
    debug('visual.nhiendang.impact', { eventId: event.id, hadCast, hasOrigin: extra?.hasOrigin ?? false,
      allies: event.targets?.length ?? 0, reduced });
  }
}
