import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { PHUONG_HOANG as P } from '../../../content/phuong-hoang-design.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { PhoenixArt, PHOENIX_PLANES } from './visual-phuong-hoang-art.js';
import { PhoenixFlight } from './visual-phuong-hoang-flight.js';
import { PhoenixGround } from './visual-phuong-hoang-ground.js';
import { PhoenixUltimate } from './visual-phuong-hoang-ultimate.js';
import { PhoenixReplay } from './visual-phuong-hoang-replay.js';

type Marker = { root: TransformNode; touched: boolean };
type Pulse = { root: TransformNode; age: number; life: number };

/** h041 on the kit. Ultimate is event-led; rain/carpet are driven only by snapshot lifetimes. */
export class VisualPhuongHoang implements HeroVfx {
  readonly heroId = P.id;
  private readonly eggs = new Map<string, Marker>();
  private readonly eggPool: TransformNode[] = [];
  private readonly pulses: Pulse[] = [];
  private readonly red: StandardMaterial;
  private readonly gold: StandardMaterial;
  private readonly jade: StandardMaterial;
  private readonly bank: KitFxBank;
  private readonly art: PhoenixArt;
  private readonly flight: PhoenixFlight;
  private readonly ultimate: PhoenixUltimate;
  private readonly ground: PhoenixGround;
  private readonly preview = new PhoenixReplay(this);
  private time = 0;

  constructor(private readonly scene: Scene) {
    this.red = this.material('phoenix-ember', '#a82b19', .16, .62);
    this.gold = this.material('phoenix-flame', '#ffbd45', .3, .72);
    this.jade = this.material('phoenix-life', '#38b989', .18, .55);
    this.bank = new KitFxBank(scene, new KitFlipbooks(scene));
    this.art = new PhoenixArt(scene);
    this.flight = new PhoenixFlight(scene, this.art, this.bank, this.bank.spray('phoenix'));
    this.ultimate = new PhoenixUltimate(scene, this.art, this.flight, this.bank);
    this.ground = new PhoenixGround(scene, this.art, this.bank);
    debug('visual.phoenix.layout', { groundCap: 4, chargeCap: 8, flightCap: 3, hitCap: 32,
      planes: PHOENIX_PLANES, palette: 'phoenix', snapshot: ['radius', 'remaining', 'rainRemaining'] });
  }

  prepare(): void { this.art.prepare(); }

  cast(event: GameEvent, at: Vector3, reduced: boolean, origin?: Vector3): boolean {
    if (event.skillId !== `skill-${P.id}` || event.kind !== 'cast') return false;
    this.prepare(); this.ultimate.cast(event, at, reduced, origin); return true;
  }

  ability(event: GameEvent, origin: Vector3, at: Vector3, reduced: boolean, extra?: AbilityExtra): boolean {
    switch (event.skillId) {
      case `skill-${P.id}`:
        if (event.kind !== 'ability') return false;
        this.prepare(); this.ultimate.impact(event, origin, at, extra?.targets ?? [], reduced); return true;
      case `trait-${P.id}`: this.attack(event, at, reduced); return true;
      case `phoenix-rebirth-${P.id}`: this.rebirth(event, at, reduced); return true;
      case `phoenix-egg-${P.id}`: return true;
      default: return false;
    }
  }

  markCarpet(id: string, at: Vector3, radius: number, remaining: number, rain: number, reduced: boolean): void {
    this.prepare(); this.ground.mark(id, at, radius, remaining, rain, reduced);
  }

  replay(kind: string, caster: Vector3, at: Vector3, reduced: boolean, actorId?: string): boolean {
    this.prepare(); return this.preview.start(kind, caster, at, reduced, actorId);
  }

  replayEgg(id: string, at: Vector3): boolean { return this.preview.egg(id, at); }

  // Existing egg, normal attack and rebirth presentation are kept outside the ultimate modules.
  markEgg(id: string, at: Vector3): void {
    let entry = this.eggs.get(id);
    if (!entry) {
      if (this.eggs.size >= 8) return;
      entry = { root: this.eggPool.pop() ?? this.makeEgg(), touched: true };
      entry.root.setEnabled(true); this.eggs.set(id, entry);
    }
    entry.root.position.copyFrom(at); entry.touched = true;
  }

  attack(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced ? 1 : P.splashRadius, reduced ? .15 : .3, this.gold);
    debug('visual.phoenix.feather', { eventId: event.id });
  }

  rebirth(event: GameEvent, at: Vector3, reduced: boolean): void {
    this.pulse(at, P.eggRadius, reduced ? .2 : .55, this.jade);
    debug('visual.phoenix.rebirth', { eventId: event.id });
  }

  private material(name: string, color: string, glow: number, alpha: number): StandardMaterial {
    const material = new StandardMaterial(name, this.scene);
    material.diffuseColor = Color3.FromHexString(color); material.emissiveColor = material.diffuseColor.scale(glow);
    material.alpha = alpha; material.backFaceCulling = false; material.disableDepthWrite = true;
    return material;
  }

  private makeEgg(): TransformNode {
    const root = new TransformNode('phoenix-rebirth-egg', this.scene);
    const shell = MeshBuilder.CreateSphere('phoenix-gold-egg-shell', { diameter: 1.8, segments: 12 }, this.scene);
    shell.parent = root; shell.position.y = 1.1; shell.scaling.set(.85, 1.35, .85);
    shell.material = this.gold; shell.isPickable = false;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const flame = MeshBuilder.CreateCylinder('egg-red-flame', { height: 1.6, diameterBottom: .45, diameterTop: .03, tessellation: 5 }, this.scene);
      flame.parent = root; flame.position.set(Math.cos(a) * 1.15, .55, Math.sin(a) * 1.15);
      flame.material = this.red; flame.isPickable = false;
    }
    return root;
  }

  private pulse(at: Vector3, radius: number, life: number, material: StandardMaterial): void {
    if (this.pulses.length >= 16) return;
    const root = new TransformNode('phoenix-ring-pulse', this.scene); root.position.copyFrom(at);
    const ring = MeshBuilder.CreateTorus('phoenix-flame-wave', { diameter: radius * 2, thickness: .3, tessellation: 40 }, this.scene);
    ring.parent = root; ring.position.y = .12; ring.material = material; ring.isPickable = false;
    ring.alphaIndex = GROUND_ALPHA_INDEX + 8;
    this.pulses.push({ root, age: 0, life });
  }

  tick(dt: number, time = this.time + dt): void {
    this.time = time; this.preview.tick(dt);
    this.ultimate.tick(dt, time); this.flight.tick(dt); this.ground.tick(dt); this.art.tick(dt);
    this.bank.tick(dt, time);
    for (const [id, entry] of this.eggs) {
      if (entry.touched) entry.touched = false;
      else { entry.root.setEnabled(false); this.eggPool.push(entry.root); this.eggs.delete(id); }
    }
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const pulse = this.pulses[i]; pulse.age += dt;
      if (pulse.age >= pulse.life) { pulse.root.dispose(false, false); this.pulses.splice(i, 1); }
    }
  }

  clear(): void {
    this.preview.clear(); this.ultimate.clear(); this.flight.clear(); this.ground.clear(); this.art.clear(); this.bank.clear();
    for (const entry of this.eggs.values()) { entry.root.setEnabled(false); this.eggPool.push(entry.root); }
    this.eggs.clear();
    for (const pulse of this.pulses) pulse.root.dispose(false, false);
    this.pulses.length = 0;
  }
}
