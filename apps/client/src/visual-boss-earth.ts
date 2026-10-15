import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Scene } from '@babylonjs/core/scene.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import { debug } from './debug.js';

type Kind = 'shield' | 'quake';
type Phase = 'warning' | 'impact';
type EarthEffect = { sprite: Sprite; kind: Kind; phase: Phase; age: number; duration: number; reduced: boolean };
const MAX_BOSS_EFFECTS = 24;

/** Blender-rendered stone, fissures and dust, timed by server boss events. */
export class VisualBossEarth {
  private active: EarthEffect[] = [];
  private pools: Record<Kind, Sprite[]> = { shield: [], quake: [] };
  private managers: Record<Kind, SpriteManager>;
  private shields = new Map<string, { sprite: Sprite; touched: boolean }>();

  constructor(scene: Scene) {
    const manager = (kind: Kind) => {
      const value = new SpriteManager(`boss-earth-${kind}`, `/assets/vfx-boss-${kind}.webp`,
        MAX_BOSS_EFFECTS, { width: 256, height: 256 }, scene);
      value.isPickable = false;
      value.texture.hasAlpha = true;
      value.texture.onLoadObservable.addOnce(() => debug('visual.boss.texture.ready', { kind }));
      return value;
    };
    this.managers = { shield: manager('shield'), quake: manager('quake') };
  }

  show(at: Vector3, event: 'shield-warning' | 'shield' | 'quake-warning' | 'quake', reduced: boolean): void {
    const kind: Kind = event.startsWith('shield') ? 'shield' : 'quake';
    const phase: Phase = event.endsWith('warning') ? 'warning' : 'impact';
    const manager = this.managers[kind];
    if (!manager.texture.isReady()) {
      debug('visual.boss.texture.missing', { kind, phase });
      return;
    }
    if (this.active.length >= MAX_BOSS_EFFECTS - 4) this.recycle(this.active.shift()!);
    const sprite = this.pools[kind].pop() ?? new Sprite(`boss-${kind}`, manager);
    sprite.isPickable = false;
    sprite.isVisible = true;
    sprite.position.set(at.x, kind === 'shield' ? 1.65 : 1.25, at.z);
    sprite.width = kind === 'shield' ? 6.8 : 9.6;
    sprite.height = kind === 'shield' ? 5.4 : 6.7;
    sprite.cellIndex = phase === 'warning' ? 0 : 6;
    sprite.color = new Color4(1, 1, 1, reduced ? .82 : .92);
    this.active.push({ sprite, kind, phase, age: 0,
      duration: reduced ? .22 : phase === 'warning' ? kind === 'shield' ? .8 : 1 : .75, reduced });
    debug('visual.boss.earth', { kind, phase, reduced });
  }

  tick(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const effect = this.active[i];
      effect.age += dt;
      const progress = Math.min(1, effect.age / effect.duration);
      effect.sprite.cellIndex = effect.reduced ? 8 : effect.phase === 'warning'
        ? Math.min(5, Math.floor(progress * 6)) : Math.min(15, 6 + Math.floor(progress * 10));
      effect.sprite.color.a = (effect.reduced ? .82 : .92) * (progress > .82 ? (1 - progress) / .18 : 1);
      if (progress >= 1) { this.active.splice(i, 1); this.recycle(effect); }
    }
    for (const [id, mark] of this.shields) {
      if (!mark.touched) {
        mark.sprite.isVisible = false;
        this.pools.shield.push(mark.sprite);
        this.shields.delete(id);
      } else mark.touched = false;
    }
  }

  markShield(id: string, at: Vector3): void {
    if (!this.managers.shield.texture.isReady()) return;
    let mark = this.shields.get(id);
    if (!mark) {
      if (this.shields.size >= 4) return;
      const sprite = this.pools.shield.pop() ?? new Sprite('boss-shield-status', this.managers.shield);
      sprite.isPickable = false;
      sprite.cellIndex = 11;
      sprite.width = 6.8;
      sprite.height = 5.4;
      sprite.color = new Color4(1, 1, 1, .58);
      sprite.isVisible = true;
      mark = { sprite, touched: false };
      this.shields.set(id, mark);
    }
    mark.sprite.position.set(at.x, 1.65, at.z);
    mark.touched = true;
  }

  clear(): void {
    for (const effect of this.active) this.recycle(effect);
    this.active.length = 0;
    for (const mark of this.shields.values()) {
      mark.sprite.isVisible = false;
      this.pools.shield.push(mark.sprite);
    }
    this.shields.clear();
  }

  private recycle(effect: EarthEffect): void {
    effect.sprite.isVisible = false;
    this.pools[effect.kind].push(effect.sprite);
  }
}
