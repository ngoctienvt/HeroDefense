import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { XINGTIAN as X } from '../../../content/xingtian-design.js';
import { debug } from './debug.js';
import { cameraLook } from './visual-de-tuan-strip.js';
import { screenUp } from './visual-kit-billboard.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitPainted } from './visual-kit-painted.js';
import { unitDirection } from './visual-kit-timeline.js';
import { XingtianImpacts } from './visual-xingtian-impacts.js';
import { XingtianReplay } from './visual-xingtian-replay.js';
import { XingtianShell } from './visual-xingtian-shell.js';
import { DEFAULT_WINDUP, VORTEX_SIZE } from './visual-xingtian-timeline.js';
import { XingtianVortex } from './visual-xingtian-vortex.js';
import { XingtianWaves } from './visual-xingtian-waves.js';

/** Painted planes alive at once: 3 casts × 2, 6 shells, 6 waves, 24 wave impacts. */
const PAINTED_CAPACITY = 48;

/**
 * Hình Thiên Vũ Can Thích (h011) on the kit, Codex art from tier56-codex-art (palette/spray `warfire`).
 * Windup (`cast skill-h011`): the R6 Ma Hỏa rim lights around the caster, embers are pulled in, two arcs open around the body.
 * Resolve (`ability skill-h011`): the hollow vortex column swirls up around him, shock ring on the R6 edge, ash and a small
 * burst on each listed monster; no burn mark (the blast applies none). Berserk (`berserk.remaining`, ≤ 5 s): the armour/flame
 * shell via `markShell` every frame, breaking apart as it ends. `fire-wave-h011`: one 6 x 2 wave per event, along its
 * direction, flaring on the monsters it lists. The basic attack (`trait-h011`) is not handled here (common path).
 * Presentation only; the server decides every hit.
 */
export class VisualXingtian implements HeroVfx {
  readonly heroId = X.id;
  private art: KitPainted;
  private bank: KitFxBank;
  private vortex: XingtianVortex;
  private shell: XingtianShell;
  private impacts: XingtianImpacts;
  private waves: XingtianWaves;
  private preview = new XingtianReplay(this);

  constructor(private scene: Scene) {
    this.art = new KitPainted(scene, PAINTED_CAPACITY, 'xingtian');
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.vortex = new XingtianVortex(this.art, this.bank);
    this.shell = new XingtianShell(this.art, this.bank);
    this.impacts = new XingtianImpacts(this.art, this.bank);
    this.waves = new XingtianWaves(this.art, this.bank, this.impacts);
    debug('visual.xingtian.layout', { radius: X.blastRadius, vortex: VORTEX_SIZE, wave: [X.fireWaveLength, X.fireWaveHalfWidth * 2] });
  }

  /** Idempotent; art still loading keeps the ring and the next use retries. */
  prepare(): void {
    this.art.prepare('vortex', '/assets/vfx-xingtian-vortex.webp', { foreground: true });
    this.art.prepare('ground', '/assets/vfx-xingtian-ground.webp');
    this.art.prepare('wave', '/assets/vfx-xingtian-wave.webp', { foreground: true });
    this.art.prepare('impact', '/assets/vfx-xingtian-wave-impact.webp', { foreground: true });
    this.art.prepare('shell', '/assets/vfx-xingtian-shell.webp', { foreground: true });
  }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${X.id}`) return false;
    this.prepare();
    this.vortex.begin(origin ?? at, event.windup ?? DEFAULT_WINDUP, reduced, event.source);
    debug('visual.xingtian.cast', { eventId: event.id, windup: event.windup ?? DEFAULT_WINDUP, reduced });
    return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${X.id}`: {
        if (event.kind !== 'ability') return false;
        this.prepare();
        const hadCast = this.vortex.burst(event.source, at, extra?.targets ?? [], reduced);
        debug('visual.xingtian.burst', { eventId: event.id, hadCast, targets: event.targets?.length ?? 0, reduced });
        return true;
      }
      case `fire-wave-${X.id}`: {
        this.prepare();
        const dir = unitDirection(event, origin);
        if (!dir) { debug('visual.xingtian.wave.skip', { eventId: event.id, reason: 'no-direction' }); return true; }
        this.waves.launch(origin, dir, extra?.targets ?? [], reduced);
        return true;
      }
      default: return false;
    }
  }

  /** Snapshot `berserk.remaining` (every frame while the hero is berserk): the shell holds for that long. */
  markShell(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    this.prepare();
    this.shell.mark(id, at, remaining, reduced);
  }

  tick(dt: number, time: number): void {
    this.preview.tick(dt);
    const up = screenUp(this.scene);
    this.vortex.tick(dt, up);
    this.shell.tick(dt, up);
    this.waves.tick(dt, cameraLook(this.scene));
    this.impacts.tick(dt, up);
    this.bank.tick(dt, time);
  }

  clear(): void {
    this.preview.clear(); this.vortex.clear(); this.shell.clear(); this.waves.clear(); this.impacts.clear();
    this.bank.clear(); this.art.clear();
  }

  replay(kind: string, at: Vector3, reduced: boolean): boolean {
    this.prepare();
    return this.preview.start(kind, at, reduced);
  }
}
