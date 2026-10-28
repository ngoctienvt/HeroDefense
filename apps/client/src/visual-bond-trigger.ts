import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Material } from '@babylonjs/core/Materials/material.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** What a bond trigger looks like: a ground ring whose colour tells the material (fire, water, shield...). */
export type BondTriggerKind = 'fire' | 'water' | 'shield' | 'heal' | 'thunder' | 'summon' | 'revive' | 'curse' | 'gold';
export const BOND_TRIGGER_COLORS: Readonly<Record<BondTriggerKind, string>> = {
  fire: '#ff7a3d', water: '#56cce3', shield: '#8fb8ff', heal: '#7de2a0', thunder: '#f5e663',
  summon: '#b58cff', revive: '#fff0b0', curse: '#9a5bd6', gold: '#e6c97b',
};

/** One entry for every synergy id; presentation only, taken from the bond's main material. */
export const BOND_TRIGGER_KIND: Readonly<Record<number, BondTriggerKind>> = {
  1: 'fire', 2: 'shield', 3: 'curse', 4: 'gold', 5: 'gold', 6: 'heal', 7: 'gold', 8: 'gold', 9: 'heal',
  10: 'gold', 11: 'summon', 12: 'heal', 13: 'water', 14: 'fire', 15: 'water', 16: 'fire', 17: 'heal',
  18: 'thunder', 19: 'fire', 20: 'gold', 21: 'gold', 22: 'summon', 23: 'thunder', 24: 'thunder', 25: 'curse',
  26: 'revive', 27: 'fire',
};

const MAX_RINGS = 24, LIFETIME = .8, START_SCALE = 1.2, END_SCALE = 5;
type Ring = { mesh: Mesh; age: number; lifetime: number; start: number; end: number };
interface MaterialSource { get(key: string, color: string, glow?: number): Material }

/** Pooled expanding rings for `bond-trigger` events and for the impact of every bond strike. */
export class BondTriggerRings {
  private readonly active: Ring[] = [];
  private readonly pool: Mesh[] = [];

  constructor(private readonly scene: Scene, private readonly palette: MaterialSource) {}

  /** Reduced motion skips the trigger ring; the toast still reports it. */
  spawn(x: number, z: number, bondId: number, reducedMotion: boolean): boolean {
    if (reducedMotion) return false;
    return this.ring(x, z, bondId, START_SCALE, END_SCALE, LIFETIME);
  }

  /** A short hit flash; kept even with reduced motion so the target stays identifiable (no travel, no growth). */
  impact(x: number, z: number, bondId: number, reducedMotion: boolean, size = 2.2): boolean {
    return reducedMotion ? this.ring(x, z, bondId, size, size, .3) : this.ring(x, z, bondId, size * .4, size, .35);
  }

  private ring(x: number, z: number, bondId: number, start: number, end: number, lifetime: number): boolean {
    if (this.active.length >= MAX_RINGS) return false;
    const kind = BOND_TRIGGER_KIND[bondId] ?? 'gold';
    const mesh = this.pool.pop() ?? MeshBuilder.CreateTorus('bond-trigger-ring', { diameter: 1, thickness: .07, tessellation: 32 }, this.scene);
    mesh.isPickable = false; mesh.setEnabled(true);
    mesh.material = this.palette.get(`bond-${kind}`, BOND_TRIGGER_COLORS[kind], .6);
    mesh.position.set(x, .06, z);
    mesh.scaling.setAll(start);
    mesh.visibility = 1;
    this.active.push({ mesh, age: 0, lifetime, start, end });
    return true;
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const ring = this.active[i];
      ring.age += dt;
      const t = ring.age / ring.lifetime;
      if (t >= 1) { this.release(i); continue; }
      ring.mesh.scaling.setAll(ring.start + (ring.end - ring.start) * t);
      ring.mesh.visibility = 1 - t;
    }
  }

  clear(): void { for (let i = this.active.length - 1; i >= 0; i--) this.release(i); }

  private release(index: number): void {
    const [ring] = this.active.splice(index, 1);
    ring.mesh.setEnabled(false);
    this.pool.push(ring.mesh);
  }
}

export type BondStrikeStyle = 'arrow' | 'bolt' | 'slash' | 'blast';
/** Style carried by the server event's skillId (`bond-strike-<style>`). */
export function bondStrikeStyle(skillId: string | undefined): BondStrikeStyle | undefined {
  const style = skillId?.startsWith('bond-strike-') ? skillId.slice('bond-strike-'.length) : undefined;
  return style === 'arrow' || style === 'bolt' || style === 'slash' || style === 'blast' ? style : undefined;
}

const MAX_STRIKES = 40;
const FLIGHT: Readonly<Record<'arrow' | 'bolt', number>> = { arrow: .16, bolt: .28 };
const SLASH_LIFE = .22, ORIGIN_HEIGHT = 1.1, TARGET_HEIGHT = .8;
type Strike = {
  mesh: Mesh; style: 'arrow' | 'bolt' | 'slash'; from: Vector3; to: Vector3; age: number; bondId: number;
  impacted: boolean; reduced: boolean;
};

/**
 * Draws the extra hits a bond dealt: an arrow or bolt that flies from the shooter to every victim, a slash line,
 * or a blast ring at a point. Presentation only; the damage was already decided by the server.
 */
export class BondStrikeFx {
  private readonly active: Strike[] = [];
  private readonly pool: Record<'arrow' | 'bolt' | 'slash', Mesh[]> = { arrow: [], bolt: [], slash: [] };

  constructor(private readonly scene: Scene, private readonly palette: MaterialSource, private readonly rings: BondTriggerRings) {}

  spawn(style: BondStrikeStyle, bondId: number, origin: { x: number; z: number }, target: { x: number; z: number }, reduced: boolean): boolean {
    if (style === 'blast') return this.rings.impact(target.x, target.z, bondId, reduced, 4.5);
    if (reduced || this.active.length >= MAX_STRIKES) return this.rings.impact(target.x, target.z, bondId, true);
    const kind = BOND_TRIGGER_KIND[bondId] ?? 'gold';
    const mesh = this.pool[style].pop() ?? this.build(style);
    mesh.setEnabled(true); mesh.isPickable = false;
    mesh.material = this.palette.get(`bond-${kind}`, BOND_TRIGGER_COLORS[kind], .8);
    mesh.visibility = 1;
    const from = new Vector3(origin.x, ORIGIN_HEIGHT, origin.z), to = new Vector3(target.x, TARGET_HEIGHT, target.z);
    const length = Math.max(.01, Vector3.Distance(from, to));
    mesh.position.copyFrom(from);
    if (style === 'slash') {
      mesh.position.copyFrom(Vector3.Center(from, to));
      mesh.scaling.set(1, 1, length);
      mesh.lookAt(to);
    } else if (style === 'arrow') {
      mesh.scaling.set(1, 1, 1);
      mesh.lookAt(to);
    } else mesh.scaling.setAll(1);
    this.active.push({ mesh, style, from, to, age: 0, bondId, impacted: false, reduced });
    return true;
  }

  update(dt: number): void {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const strike = this.active[i];
      strike.age += dt;
      if (strike.style === 'slash') {
        const t = strike.age / SLASH_LIFE;
        if (!strike.impacted) { strike.impacted = true; this.rings.impact(strike.to.x, strike.to.z, strike.bondId, strike.reduced, 1.8); }
        if (t >= 1) { this.release(i); continue; }
        strike.mesh.visibility = 1 - t;
        continue;
      }
      const flight = FLIGHT[strike.style], t = Math.min(1, strike.age / flight);
      Vector3.LerpToRef(strike.from, strike.to, t, strike.mesh.position);
      if (t >= 1) {
        this.rings.impact(strike.to.x, strike.to.z, strike.bondId, strike.reduced, 2);
        this.release(i);
      }
    }
  }

  clear(): void { for (let i = this.active.length - 1; i >= 0; i--) this.release(i); }

  private release(index: number): void {
    const [strike] = this.active.splice(index, 1);
    strike.mesh.setEnabled(false);
    this.pool[strike.style].push(strike.mesh);
  }

  private build(style: 'arrow' | 'bolt' | 'slash'): Mesh {
    if (style === 'bolt') return MeshBuilder.CreateSphere('bond-strike-bolt', { diameter: .4, segments: 8 }, this.scene);
    // The long axis is Z so lookAt() points the shaft at the target; a slash is stretched to the span at spawn.
    return MeshBuilder.CreateBox(`bond-strike-${style}`, style === 'arrow' ? { width: .07, height: .07, depth: 1.3 } : { width: .1, height: .1, depth: 1 }, this.scene);
  }
}
