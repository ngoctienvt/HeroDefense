import { Quaternion, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { AbstractMesh } from '@babylonjs/core/Meshes/abstractMesh.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import '@babylonjs/core/Meshes/instancedMesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { debug } from './debug.js';
import { VisualMaterials } from './visual-materials.js';
import { isFireSkill, VisualFire } from './visual-fire.js';
import { TIER_VISUALS } from './visual-tier-profiles.js';
import { extractHeroIdFromSkill, isTierSkill, paintTierAbility, paintTierAttack, paintTierCast,
  type TierSkillPainter } from './visual-tier-skills.js';
import { VisualTierParticles } from './visual-tier-particles.js';
import { VisualWater } from './visual-water.js';
import { VisualTierMotifs } from './visual-tier-motifs.js';
import type { TierMotif } from './visual-tier-motif-textures.js';
import { VisualMonsterProjectiles } from './visual-monster-projectiles.js';
import { VisualBossEarth } from './visual-boss-earth.js';
import { VisualPangu } from './visual-pangu.js';
import type { GameState } from '../../../packages/contracts/src/types.js';

type EffectKind = 'ring' | 'orb' | 'beam' | 'halo' | 'spark' | 'flare' | 'glyph' | 'decal';
type ActiveEffect = { mesh: AbstractMesh; age: number; duration: number; size: number; kind: EffectKind;
  baseColor: Color3; velocity?: Vector3; from?: Vector3; to?: Vector3; arrive?: () => void; spin?: number;
  arcHeight?: number; orient?: boolean };
type StatusKind = 'stun' | 'root' | 'sunder' | 'slow' | 'poison' | 'charged' | 'shield' | 'ward' | 'haste'
  | 'berserk' | 'soulLink' | 'frost' | 'stoneShield';
const MAX_EFFECTS = 64;
const STATUS_COLORS: Record<StatusKind, string> = {
  stun: '#ffdc78', root: '#7eda9b', sunder: '#d48b8b', slow: '#83dbf8', poison: '#92d77c', charged: '#b99cf1',
  shield: '#f6df8f', ward: '#b4eddf', haste: '#eac2fc',
  berserk: '#3ac587', soulLink: '#38bdf8', frost: '#a9e8ff', stoneShield: '#aa9273',
};
const STATUS_MOTIFS: Partial<Record<StatusKind, TierMotif>> = {
  shield: 'bell', ward: 'shield', berserk: 'vines', haste: 'flower', frost: 'ice',
};
const ELEMENT_COLORS = ['#f59e0b', '#10b981', '#0284c7', '#ea580c', '#d97706'];

/** Short, pooled feedback tied only to authoritative combat events. */
export class VisualEffects {
  private pangu: VisualPangu;
  private active: ActiveEffect[] = [];
  private pools: Record<EffectKind, AbstractMesh[]> = { ring: [], orb: [], beam: [], halo: [], spark: [], flare: [], glyph: [], decal: [] };
  private scheduled: { delay: number; run: () => void }[] = [];
  private flareMaterials = new Map<string, StandardMaterial>();
  private glyphMaterials = new Map<string, StandardMaterial>();
  private glyphTextures = new Map<string, Texture>();
  private statusMarkers = new Map<string, { mesh: Mesh; accent?: Mesh; kind: StatusKind; touched: boolean }>();
  private statusPool: Mesh[] = [];
  private statusAccentPool: Mesh[] = [];
  private groundMarkers = new Map<string, { mesh: Mesh; touched: boolean }>();
  private groundPool: Mesh[] = [];
  private plants = new Map<string, { root: TransformNode; touched: boolean }>();
  private plantPool: TransformNode[] = [];
  private soulLinkMarkers = new Map<string, { mesh: Mesh; touched: boolean }>();
  private soulLinkPool: Mesh[] = [];
  private flareTexture: DynamicTexture;
  private reduced = matchMedia('(prefers-reduced-motion: reduce)');
  private fire: VisualFire;
  private tierParticles: VisualTierParticles;
  private water: VisualWater;
  private tierMotifs: VisualTierMotifs;
  private monsterProjectiles: VisualMonsterProjectiles;
  private bossEarth: VisualBossEarth;
  private readonly roots: Partial<Record<EffectKind, Mesh>> = {};
  private readonly tempColor = new Color3();
  private readonly arrivals: (() => void)[] = [];
  constructor(private scene: Scene, private palette: VisualMaterials) {
    this.pangu = new VisualPangu(scene);
    this.fire = new VisualFire(scene);
    this.tierParticles = new VisualTierParticles(scene);
    this.water = new VisualWater(scene);
    this.tierMotifs = new VisualTierMotifs(scene);
    this.monsterProjectiles = new VisualMonsterProjectiles(scene, palette);
    this.bossEarth = new VisualBossEarth(scene);
    this.initInstancedRoots();
    for (const name of ['magic_01', 'magic_03', 'slash_01', 'twirl_01', 'spark_01', 'trace_01', 'circle_03']) {
      const texture = new Texture(`/assets/vfx-${name}.webp`, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
        () => debug('visual.tier.texture.ready', { name }),
        (_message, error) => debug('visual.tier.texture.error', { name, message: String(error ?? 'load failed') }));
      texture.hasAlpha = true;
      this.glyphTextures.set(name, texture);
    }
    this.flareTexture = new DynamicTexture('skill-flare-gradient', { width: 64, height: 64 }, scene, false);
    const context = this.flareTexture.getContext();
    const gradient = context.createRadialGradient(32, 32, 2, 32, 32, 31);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(.22, 'rgba(255,255,255,.72)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    context.fillStyle = gradient; context.fillRect(0, 0, 64, 64);
    this.flareTexture.hasAlpha = true; this.flareTexture.update();
  }

  showCast(event: GameEvent, position: Vector3): void {
    if (event.skillId === 'skill-h01B') { this.pangu.cast(event, position.clone(), this.reduced.matches); return; }
    if (isTierSkill(event.skillId)) {
      paintTierCast(this.tierPainter(), event, position.clone());
      debug('visual.tier.cast', { eventId: event.id, skillId: event.skillId });
      return;
    }
    const color = this.color(event);
    this.spawn('ring', position, color, 1.5, .25);
    const profile = this.profile(event);
    if (profile && !this.reduced.matches) this.spawn('glyph', position.add(new Vector3(0, .1, 0)), profile.color, 1.5, .25, undefined, profile.texture);
    if (isFireSkill(event.skillId)) {
      this.fire.cast(position);
      debug('visual.cast', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (!this.reduced.matches) this.spawn('flare', position, color, 1.3, .25);
    if (!this.reduced.matches) this.spawn('orb', position.add(new Vector3(0, .35, 0)), '#ffffff', .42, .2);
    debug('visual.cast', { eventId: event.id, skillId: event.skillId });
  }

  show(event: GameEvent, position: Vector3, origin?: Vector3, targets: readonly Vector3[] = []): void {
    if (event.skillId?.endsWith('-h01B')) {
      this.pangu.show(event, position.clone(), origin?.clone() ?? position.clone(), this.reduced.matches); return;
    }
    if (event.skillId?.startsWith('monster-') || event.skillId?.startsWith('boss-')) {
      this.showMonster(event, position, origin);
      return;
    }
    if (event.kind === 'ability' && isTierSkill(event.skillId)) {
      paintTierAbility(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone(), targets.map(at => at.clone()));
      const heroId = extractHeroIdFromSkill(event.skillId);
      debug('visual.tier.ability', { eventId: event.id, skillId: event.skillId, targets: targets.length,
        element: HERO_BY_ID[heroId]?.element, radius: HERO_BY_ID[heroId]?.ability?.effect?.radius ?? 0 });
      return;
    }
    if ((event.kind === 'attack' || event.kind === 'trait') && isTierSkill(event.skillId)) {
      paintTierAttack(this.tierPainter(), event, origin?.clone() ?? position.clone(), position.clone());
      debug('visual.tier.attack', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (event.skillId === 'burst-h003') {
      this.fire.impact(position, true, 2);
      debug('visual.trait.burst', { eventId: event.id, skillId: event.skillId });
      return;
    }
    if (event.skillId === 'burst-h005' || event.skillId === 'burst-h008') {
      const earth = event.skillId === 'burst-h008';
      this.spawn('ring', position, earth ? '#d6b47e' : '#f0d28a', earth ? 5 : 2.2, .38);
      if (!this.reduced.matches) {
        this.spawn('glyph', position, earth ? '#e2c994' : '#fff1b6', earth ? 2.8 : 1.4, .38,
          undefined, earth ? 'twirl_01' : 'spark_01');
        this.burst(position, earth ? '#d6b47e' : '#f0d28a', earth ? 7 : 4, earth ? 2.1 : 1.1);
      }
      debug('visual.trait.burst', { eventId: event.id, skillId: event.skillId });
      return;
    }
    const ability = event.kind === 'ability';
    const heroId = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4) : undefined;
    const hero = heroId ? HERO_BY_ID[heroId] : undefined;
    const effect = hero?.ability?.effect;
    const defensive = event.ability === 'shield' || event.ability === 'heal' || effect?.target === 'allies';
    const color = this.color(event);
    const profile = this.profile(event);
    if (isFireSkill(event.skillId) && !defensive) {
      const fireRadius = ability && effect?.shape === 'radius' ? effect.radius ?? 0 : 0;
      if (this.reduced.matches && fireRadius > 0) {
        this.spawn('ring', position, color, fireRadius * 2, .18);
      }
      if (origin) this.fire.launch(origin, position, ability, fireRadius);
      else this.fire.impact(position, ability, fireRadius);
      if (profile && !this.reduced.matches) this.spawn('glyph', position, profile.color, profile.size, .38, undefined, profile.texture);
      if (event.skillId === 'web-h00C' && !this.reduced.matches) {
        this.spawn('ring', position, '#ffd68a', 3.2, .32);
        this.burst(position, '#ffbd73', 5, 2.1);
      }
      debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId,
        shape: effect?.shape, status: effect?.status, projectile: Boolean(origin) });
      return;
    }
    const radius = effect?.radius ?? (event.ability === 'nova' ? 5.5 : 0);
    const groundRing = ability && (effect?.shape === 'radius' || event.ability === 'nova');
    if (groundRing && !defensive) this.spawn('ring', position, color, radius > 0 ? radius * 2 : 3.2, .55);
    this.spawn('orb', position, color, ability ? 1.7 : .85, ability ? .38 : .22);
    if (ability && !this.reduced.matches) this.spawn('flare', position, color, defensive ? 2.1 : 3.1, .3);
    if (profile && !this.reduced.matches) {
      this.spawn('glyph', position, profile.color, profile.size, ability ? .52 : .24, undefined, profile.texture);
      if (ability) this.burst(position, profile.color, profile.sparks, Math.min(3.2, profile.size * .65));
      if (event.skillId === 'web-h009' || event.skillId === 'web-h00E') {
        this.spawn('halo', position, '#fff3c7', 3.1, .62);
        this.spawn('ring', position, profile.color, profile.size * 1.5, .55);
      } else if (event.skillId === 'web-h00A') {
        this.spawn('glyph', position.add(new Vector3(.5, 0, .2)), '#b9ffe0', profile.size * .75, .35, undefined, 'slash_01');
      } else if (event.skillId === 'web-h00D') {
        this.beam(position.add(new Vector3(0, 5, 0)), position, '#ffd789');
        this.spawn('ring', position, '#ff9c65', profile.size * 1.8, .55);
      } else if (event.skillId?.includes('h00G')) {
        this.spawn('ring', position, '#0284c7', profile.size * 1.7, .55);
        this.spawn('glyph', position.add(new Vector3(0, .2, 0)), '#0ea5e9', profile.size * .72, .65, undefined, 'twirl_01');
      } else if (event.skillId === 'web-h03P') {
        this.spawn('ring', position, '#d8f4a3', profile.size * 1.7, .55);
      }
    }
    if (ability && defensive) this.spawn('halo', position, color, event.ability === 'shield' ? 2.6 : 2.1, .7);
    if ((ability || event.ability === 'chain') && !defensive && origin && Vector3.DistanceSquared(origin, position) > 1.5) this.beam(origin, position, color);
    if (ability && !profile && !this.reduced.matches) this.burst(position, color, 4, 1.5);

    // Geometries & Traits visual feedback
    if (event.isCrit && !this.reduced.matches) {
      this.spawn('flare', position, '#ffea78', 2.0, .25);
      this.burst(position, '#ffea78', 5, 1.4);
    }
    if (event.geometry === 'linear_pierce' && origin && Vector3.DistanceSquared(origin, position) > 1.2) {
      this.beam(origin, position, color);
    }
    if (event.geometry === 'impact_splash' && !defensive) {
      this.spawn('ring', position, color, 3.0, .3);
      if (!this.reduced.matches) this.burst(position, color, 4, 1.2);
    }
    if (event.geometry === 'bounce' && origin && Vector3.DistanceSquared(origin, position) > 1.0) {
      this.beam(origin, position, color);
    }
    if (event.geometry === 'boomerang' && origin && Vector3.DistanceSquared(origin, position) > 1.2) {
      this.beam(origin, position, color);
      if (!this.reduced.matches) this.spawn('glyph', position, color, 1.3, .3, undefined, 'twirl_01');
    }
    if (event.geometry === 'frontal_cleave' && !this.reduced.matches) {
      this.spawn('glyph', position, color, 1.4, .25, undefined, 'slash_01');
    }
    if (event.skillId?.startsWith('mark-detonate')) {
      this.spawn('ring', position, '#ff4444', 3.5, .4);
      if (!this.reduced.matches) this.burst(position, '#ff8844', 8, 2.0);
    }
    if (event.skillId?.startsWith('aura-')) {
      this.spawn('halo', position, color, 2.5, .35);
    }

    debug('visual.effect', { eventId: event.id, kind: event.kind, skillId: event.skillId,
      shape: effect?.shape, status: effect?.status, active: this.active.length });
  }

  private showMonster(event: GameEvent, position: Vector3, origin?: Vector3): void {
    const id = event.skillId;
    if (id === 'boss-stone-shield-windup') {
      this.spawn('ring', position, '#e2d2a6', 5, .8);
      this.bossEarth.show(position, 'shield-warning', this.reduced.matches);
    } else if (id === 'boss-earthquake-windup') {
      this.spawn('ring', position, '#f3b579', 8, 1);
      this.bossEarth.show(position, 'quake-warning', this.reduced.matches);
    } else if (id === 'boss-stone-shield') {
      this.bossEarth.show(position, 'shield', this.reduced.matches);
      if (!this.reduced.matches) this.tierParticles.smoke(position, '#8b7862', 2.2, .6);
    } else if (id === 'boss-earthquake') {
      this.bossEarth.show(position, 'quake', this.reduced.matches);
      if (!this.reduced.matches) {
        this.tierParticles.burst(position, '#9e8166', 9, 3.4);
        this.tierParticles.smoke(position, '#8f7968', 3.5, .7);
      }
    } else if (id === 'monster-attack-m002') {
      const impact = position.clone();
      const arrive = () => {
        this.spawn('orb', impact, '#e97434', .35, .18);
        if (!this.reduced.matches) this.spawn('glyph', impact, '#ffbd78', .6, .18, undefined, 'trace_01');
      };
      if (origin && !this.reduced.matches) this.monsterProjectiles.launch(origin.clone(), impact, arrive);
      else arrive();
    } else if (id === 'monster-attack-m003' || id === 'monster-attack-b001') {
      this.spawn('ring', position, '#9c816c', id.endsWith('b001') ? 2.1 : 1.1, .2);
      if (!this.reduced.matches) this.tierParticles.burst(position, '#a69079', 3, .7);
    } else if (id === 'monster-attack-m004') {
      this.spawn('orb', position, '#bb4763', .38, .17);
      if (!this.reduced.matches) this.spawn('glyph', position, '#c65a70', .65, .2, undefined, 'slash_01');
      if (origin) this.spawn('halo', origin, '#c75670', .9, .25);
    } else {
      this.spawn('orb', position, '#91b9a9', .32, .16);
      if (!this.reduced.matches) this.spawn('glyph', position, '#9cbea9', .7, .2, undefined, 'slash_01');
    }
    if (id?.startsWith('boss-') || event.id % 16 === 0)
      debug('visual.monster', { eventId: event.id, skillId: id });
  }

  private tierPainter(): TierSkillPainter {
    return {
      reduced: this.reduced.matches,
      ring: (at, color, diameter, duration) => this.spawn('ring', at, color, diameter, duration),
      image: (at, color, size, duration, texture, ground = false, spin = 0) => {
        if (this.reduced.matches) return;
        this.spawn(ground ? 'decal' : 'glyph', at, color, size, duration, undefined, texture);
        this.active[this.active.length - 1].spin = spin;
      },
      burst: (at, color, count, spread) => {
        if (!this.reduced.matches) this.tierParticles.burst(at, color, count, spread);
      },
      beam: (from, to, color, width = 0.22, duration = 0.32) => {
        if (!this.reduced.matches) this.beam(from, to, color, width, duration);
      },
      flash: (at, color, size, duration) => {
        if (this.reduced.matches) return;
        this.spawn('flare', at, color, size ?? 2.8, duration ?? 0.14);
      },
      shockwave: (at, color, radius, duration) => {
        this.spawn('ring', at, color, radius * 2, duration ?? 0.38);
      },
      smoke: (at, color, size, duration) => {
        if (this.reduced.matches) return;
        this.tierParticles.smoke(at, color, size, duration);
      },
      pillar: (at, color, width = 3.2, height = 7, duration = 0.45) => {
        if (this.reduced.matches) return;
        this.beam(at.subtract(new Vector3(0, 1.5, 0)), at.add(new Vector3(0, height - 1.2, 0)), color, width, duration);
      },
      travel: (from, to, color, size, texture, duration, arrive, options) => {
        if (this.reduced.matches) { this.scheduled.push({ delay: .06, run: arrive }); return; }
        this.spawn('glyph', from, color, size, duration, undefined, texture);
        const fx = this.active[this.active.length - 1];
        fx.from = fx.mesh.position.clone();
        fx.to = to.add(new Vector3(0, to.y > 1.5 ? 0 : 1.35, 0));
        fx.arrive = arrive;
        if (options?.arcHeight) fx.arcHeight = options.arcHeight;
        if (options?.spin) fx.spin = options.spin;
        if (options?.orient) fx.orient = options.orient;
      },
      later: (delay, run) => {
        if (this.scheduled.length >= 96) this.scheduled.shift();
        this.scheduled.push({ delay: this.reduced.matches ? 0 : delay, run });
      },
      fire: (at, radius) => this.fire.impact(at, radius > 0, radius),
      water: (at, radius, duration) => this.water.impact(at, radius, duration, this.reduced.matches),
      motif: (at, kind, size, duration, ground, spin) => this.tierMotifs.show(at, kind, size, duration,
        ground, spin, this.reduced.matches),
      motifTravel: (from, to, kind, size, duration, arrive, arcHeight) => this.tierMotifs.travel(
        from, to, kind, size, duration, arrive, arcHeight, this.reduced.matches),
    };
  }

  private color(event: GameEvent): string {
    const profile = this.profile(event);
    if (profile) return profile.color;
    const heroId = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4) : undefined;
    const hero = heroId ? HERO_BY_ID[heroId] : undefined;
    const effect = hero?.ability?.effect;
    return effect?.status === 'slow' ? '#7cdffa' : effect?.status === 'burn' ? '#ff825b'
      : event.ability === 'shield' || event.ability === 'heal' || effect?.target === 'allies' ? '#94f6c5'
        : hero ? ELEMENT_COLORS[Math.max(0, Math.min(4, hero.element - 1))]
          : event.ability === 'chain' ? '#f5d177' : '#f4ae82';
  }

  private profile(event: GameEvent) {
    const id = event.skillId?.startsWith('skill-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('web-') ? event.skillId.slice(4)
      : event.skillId?.startsWith('trait-') ? event.skillId.slice(6)
      : event.skillId?.startsWith('splash-') ? event.skillId.slice(7)
      : event.skillId?.startsWith('bounce-') ? event.skillId.slice(7)
      : event.skillId?.startsWith('nth-') ? event.skillId.slice(4)
      : '';
    return TIER_VISUALS[id];
  }

  private burst(position: Vector3, color: string, count: number, spread: number): void {
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count;
      const velocity = new Vector3(Math.cos(angle) * spread, .7 + i % 3 * .38, Math.sin(angle) * spread);
      this.spawn(i % 3 === 0 ? 'orb' : 'spark', position, color,
        .16 + i % 3 * .045, .35 + i % 3 * .07, velocity);
    }
  }

  private initInstancedRoots(): void {
    const geoKinds: EffectKind[] = ['ring', 'orb', 'beam', 'halo', 'spark'];
    const masterMat = new StandardMaterial('vfx-instanced-master', this.scene);
    masterMat.diffuseColor = Color3.White();
    masterMat.emissiveColor = Color3.Black();
    masterMat.disableLighting = true;
    masterMat.backFaceCulling = false;
    masterMat.disableDepthWrite = true;
    masterMat.alpha = 0.9999;
    masterMat.alphaMode = Engine.ALPHA_ADD;

    for (const kind of geoKinds) {
      const root = this.makeGeometryMesh(kind);
      root.material = masterMat;
      root.registerInstancedBuffer('color', 4);
      root.instancedBuffers.color = new Color4(1, 1, 1, 1);
      root.setEnabled(false);
      root.isPickable = false;
      this.roots[kind] = root;
    }
  }

  private makeGeometryMesh(kind: EffectKind): Mesh {
    if (kind === 'orb') return MeshBuilder.CreateSphere('root-orb', { diameter: 1, segments: 8 }, this.scene);
    if (kind === 'spark') return MeshBuilder.CreateBox('root-spark', { size: 1 }, this.scene);
    if (kind === 'beam') return MeshBuilder.CreateCylinder('root-beam', { height: 1, diameter: 1, tessellation: 7 }, this.scene);
    return MeshBuilder.CreateTorus(kind === 'halo' ? 'root-halo' : 'root-ring',
      { diameter: 1, thickness: kind === 'halo' ? .075 : .09, tessellation: 24 }, this.scene);
  }

  private acquireNode(kind: EffectKind): AbstractMesh {
    const pooled = this.pools[kind].pop();
    if (pooled) return pooled;

    const root = this.roots[kind];
    if (root) {
      const instance = root.createInstance(`${kind}-inst`);
      instance.instancedBuffers.color = new Color4(1, 1, 1, 1);
      instance.isPickable = false;
      return instance;
    }

    const plane = MeshBuilder.CreatePlane(`skill-${kind}`, { size: 1 }, this.scene);
    plane.billboardMode = kind === 'decal' ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL;
    plane.isPickable = false;
    return plane;
  }

  private spawn(kind: EffectKind, position: Vector3, color: string, size: number, duration: number, velocity?: Vector3, texture?: string): void {
    if (this.active.length >= MAX_EFFECTS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      oldest.arrive?.();
    }
    const mesh = this.acquireNode(kind);
    const baseColor = Color3.FromHexString(color);
    if (this.roots[kind]) {
      const buf = mesh.instancedBuffers.color as Color4;
      buf.r = baseColor.r;
      buf.g = baseColor.g;
      buf.b = baseColor.b;
      buf.a = 1.0;
    } else {
      mesh.material = kind === 'flare' ? this.flareMaterial(color) : this.glyphMaterial(color, texture!);
      mesh.visibility = 1;
    }
    mesh.position.copyFrom(position);
    mesh.position.y = kind === 'ring' ? 0.025 : kind === 'decal' ? 0.03 : position.y + (kind === 'halo' ? 1.55 : (position.y > 1.5 ? 0 : 1.35));
    mesh.rotationQuaternion = null;
    mesh.rotation.set(
      kind === 'halo' || kind === 'decal' ? Math.PI / 2 : 0,
      0,
      kind === 'spark' && velocity ? Math.atan2(velocity.x, velocity.y) : 0,
    );
    if (kind === 'beam') {
      mesh.scaling.set(size, 1, size);
    } else if (kind === 'spark') {
      mesh.scaling.set(size * 0.28, size * 1.7, size * 0.28);
    } else {
      mesh.scaling.setAll(size * (kind === 'ring' ? 0.2 : 0.65));
    }
    mesh.isPickable = false;
    mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, duration: this.reduced.matches ? 0.16 : duration, size, kind, baseColor, velocity });

    if (kind === 'orb' && !velocity && size >= 0.4 && !this.reduced.matches) {
      this.spawnGroundBounceLight(position, color, size * 2.2, duration * 0.85);
    }
  }

  private spawnGroundBounceLight(position: Vector3, color: string, size: number, duration: number): void {
    if (this.glyphTextures.has('circle_03')) {
      this.spawn('decal', position, color, size, duration, undefined, 'circle_03');
    }
  }

  private beam(from: Vector3, to: Vector3, color: string, width = 0.22, duration = 0.32): void {
    if (this.active.length >= MAX_EFFECTS) {
      const oldest = this.active.shift()!;
      this.release(oldest);
      oldest.arrive?.();
    }
    const mesh = this.acquireNode('beam');
    const baseColor = Color3.FromHexString(color);
    if (mesh.instancedBuffers?.color) {
      const buf = mesh.instancedBuffers.color as Color4;
      buf.r = baseColor.r;
      buf.g = baseColor.g;
      buf.b = baseColor.b;
      buf.a = 1.0;
    } else {
      mesh.material = this.palette.get(`effect-${color}`, color, 1);
      mesh.visibility = 1;
    }
    const start = from.add(new Vector3(0, 1.5, 0));
    const end = to.add(new Vector3(0, 1.2, 0));
    const direction = end.subtract(start);
    const length = direction.length();
    mesh.position.copyFrom(start.add(end).scale(.5));
    mesh.rotationQuaternion ??= new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.normalize(), mesh.rotationQuaternion);
    mesh.scaling.set(width, length, width);
    mesh.isPickable = false;
    mesh.setEnabled(true);
    this.active.push({ mesh, age: 0, duration: this.reduced.matches ? .12 : duration, size: width, kind: 'beam', baseColor });
  }

  private flareMaterial(color: string): StandardMaterial {
    let material = this.flareMaterials.get(color);
    if (material) return material;
    material = new StandardMaterial(`skill-flare-${color}`, this.scene);
    material.diffuseTexture = this.flareTexture;
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alphaMode = Engine.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.zOffset = -2;
    this.flareMaterials.set(color, material);
    return material;
  }

  private glyphMaterial(color: string, name: string): StandardMaterial {
    const key = `${name}:${color}`;
    let material = this.glyphMaterials.get(key);
    if (material) return material;
    const texture = this.glyphTextures.get(name);
    if (!texture) throw new Error(`Missing VFX texture: ${name}`);
    material = new StandardMaterial(`skill-${key}`, this.scene);
    material.diffuseTexture = texture;
    material.emissiveTexture = texture;
    material.diffuseColor = Color3.FromHexString(color);
    material.emissiveColor = material.diffuseColor;
    material.useAlphaFromDiffuseTexture = true;
    material.disableLighting = true;
    material.backFaceCulling = false;
    material.alphaMode = Engine.ALPHA_ADD;
    material.disableDepthWrite = true;
    material.zOffset = -2;
    this.glyphMaterials.set(key, material);
    return material;
  }

  tick(dt: number): void {
    this.monsterProjectiles.tick(dt);
    this.bossEarth.tick(dt);
    this.pangu.tick(dt);
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      const task = this.scheduled[i]; task.delay -= dt;
      if (task.delay <= 0) {
        this.scheduled[i] = this.scheduled[this.scheduled.length - 1];
        this.scheduled.pop();
        task.run();
      }
    }
    this.arrivals.length = 0;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const fx = this.active[i]; fx.age += dt;
      if (fx.age >= fx.duration) {
        this.release(fx); this.active.splice(i, 1);
        if (fx.arrive) this.arrivals.push(fx.arrive);
        continue;
      }
      const progress = fx.age / fx.duration;
      if (fx.from && fx.to) {
        Vector3.LerpToRef(fx.from, fx.to, progress, fx.mesh.position);
        if (fx.arcHeight) {
          fx.mesh.position.y += Math.sin(progress * Math.PI) * fx.arcHeight;
        }
        if (fx.orient) {
          const dx = fx.to.x - fx.from.x;
          const dy = (fx.to.y - fx.from.y) + (fx.arcHeight ? Math.cos(progress * Math.PI) * fx.arcHeight * Math.PI : 0);
          if (Math.abs(dx) > 0.001 || Math.abs(dy) > 0.001) {
            fx.mesh.rotation.z = Math.atan2(dx, dy);
          }
        }
      }
      if (fx.velocity) {
        const drag = (1 - progress) * (1 - progress);
        fx.velocity.scaleAndAddToRef(dt * drag, fx.mesh.position);
        if (fx.kind === 'spark') {
          fx.velocity.y -= 9.8 * dt;
          if (fx.mesh.position.y < 0.03) {
            fx.mesh.position.y = 0.03;
            fx.velocity.y = 0;
          }
          fx.mesh.rotation.z = Math.atan2(fx.velocity.x, fx.velocity.y);
        }
      }
      if (fx.spin) fx.mesh.rotation.y += fx.spin * dt;

      if (fx.kind === 'beam') {
        const pulse = 1 + 0.18 * Math.sin(fx.age * 65);
        const width = fx.size * (1 - progress * 0.75) * pulse;
        fx.mesh.scaling.x = fx.mesh.scaling.z = width;
      } else if (fx.kind === 'spark') {
        const speed = fx.velocity ? fx.velocity.length() : 1;
        const stretch = Math.max(0.4, Math.min(2.5, speed * 0.28));
        fx.mesh.scaling.set(fx.size * 0.28, fx.size * stretch * (1 - progress * 0.5), fx.size * 0.28);
      } else if (fx.kind === 'ring') {
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        fx.mesh.scaling.setAll(fx.size * (0.2 + 0.8 * easeOutCubic));
      } else if (fx.kind === 'orb') {
        const orbPulse = (1 + 0.25 * Math.sin(Math.min(1, progress * 3) * Math.PI)) * (1 - progress * 0.65);
        fx.mesh.scaling.setAll(fx.size * Math.max(0.1, orbPulse));
      } else if (fx.kind === 'halo') {
        const easeOutCubic = 1 - Math.pow(1 - progress, 3);
        fx.mesh.scaling.setAll(fx.size * (0.8 + 0.2 * easeOutCubic));
      } else {
        fx.mesh.scaling.setAll(fx.size * (0.65 + 0.35 * Math.sin(progress * Math.PI)));
      }

      const alpha = Math.max(0, 1 - progress * progress);
      if (fx.mesh.instancedBuffers?.color) {
        const buf = fx.mesh.instancedBuffers.color as Color4;
        buf.r = fx.baseColor.r;
        buf.g = fx.baseColor.g;
        buf.b = fx.baseColor.b;
        buf.a = alpha;
      } else {
        fx.mesh.visibility = alpha;
      }
    }
    for (let i = 0; i < this.arrivals.length; i++) this.arrivals[i]();
    this.fire.tick(dt);
    this.water.tick(dt);
    this.tierMotifs.tick(dt);
    for (const [id, marker] of this.statusMarkers) {
      if (!marker.touched) {
        marker.mesh.setEnabled(false); this.statusPool.push(marker.mesh);
        if (marker.accent) { marker.accent.setEnabled(false); this.statusAccentPool.push(marker.accent); }
        this.statusMarkers.delete(id);
      }
      else marker.touched = false;
    }
    for (const [id, marker] of this.groundMarkers) {
      if (!marker.touched) { marker.mesh.setEnabled(false); this.groundPool.push(marker.mesh); this.groundMarkers.delete(id); }
      else marker.touched = false;
    }
    for (const [id, plant] of this.plants) {
      if (!plant.touched) {
        plant.root.setEnabled(false); this.plantPool.push(plant.root); this.plants.delete(id);
        debug('visual.tier.plant.end');
      } else {
        if (!this.reduced.matches) plant.root.rotation.y += dt * .55;
        plant.touched = false;
      }
    }
    for (const [id, link] of this.soulLinkMarkers) {
      if (!link.touched) {
        link.mesh.setEnabled(false); this.soulLinkPool.push(link.mesh); this.soulLinkMarkers.delete(id);
      } else link.touched = false;
    }
  }

  markBurning(id: string, position: Vector3, phase: number): void { this.fire.markBurning(id, position, phase); }
  markStatus(id: string, position: Vector3, kind: StatusKind): void {
    if (kind === 'stoneShield') { this.bossEarth.markShield(id, position); return; }
    let marker = this.statusMarkers.get(id);
    if (!marker) {
      if (this.statusMarkers.size >= 256) return;
      const mesh = this.statusPool.pop() ?? MeshBuilder.CreateTorus('combat-status', { diameter: 1, thickness: .08, tessellation: 28 }, this.scene);
      mesh.isPickable = false; mesh.setEnabled(true);
      marker = { mesh, kind, touched: false }; this.statusMarkers.set(id, marker);
    }
    marker.kind = kind; marker.touched = true;
    marker.mesh.material = this.palette.get(`status-${kind}`, STATUS_COLORS[kind], .8);
    marker.mesh.position.set(position.x, kind === 'stun' ? 3.4 : .05, position.z);
    marker.mesh.scaling.setAll(kind === 'stoneShield' ? 4.4 : kind === 'shield' || kind === 'ward' || kind === 'frost' ? 2.8 : 1.9);
    const motif = STATUS_MOTIFS[kind];
    if (motif) {
      const accent = marker.accent ?? this.statusAccentPool.pop()
        ?? MeshBuilder.CreatePlane('combat-status-motif', { size: 1 }, this.scene);
      accent.material = this.tierMotifs.materialFor(motif);
      accent.billboardMode = Mesh.BILLBOARDMODE_ALL;
      accent.position.set(position.x + (kind === 'stoneShield' ? 1.7 : 1.1), kind === 'stoneShield' ? 2.8 : 1.65, position.z);
      accent.scaling.setAll(kind === 'stoneShield' ? 2.1 : kind === 'frost' ? 1.45 : 1.15);
      accent.visibility = .78;
      accent.isPickable = false;
      accent.setEnabled(true);
      marker.accent = accent;
    } else if (marker.accent) {
      marker.accent.setEnabled(false);
      this.statusAccentPool.push(marker.accent);
      marker.accent = undefined;
    }
  }
  markGround(id: string, position: Vector3, radius: number): void {
    let marker = this.groundMarkers.get(id);
    if (!marker) {
      if (this.groundMarkers.size >= 16) return;
      const mesh = this.groundPool.pop() ?? MeshBuilder.CreateTorus('burning-ground', { diameter: 1, thickness: .1, tessellation: 36 }, this.scene);
      mesh.isPickable = false; mesh.material = this.palette.get('burning-ground', '#ff8d58', .5);
      mesh.setEnabled(true); marker = { mesh, touched: false }; this.groundMarkers.set(id, marker);
    }
    marker.touched = true; marker.mesh.position.set(position.x, .04, position.z);
    marker.mesh.scaling.setAll(radius * 2);
    this.fire.markGroundBurning(id, position);
  }
  markPlant(id: string, position: Vector3): void {
    let plant = this.plants.get(id);
    if (!plant) {
      if (this.plants.size >= 24) return;
      const root = this.plantPool.pop() ?? this.createPlant();
      root.setEnabled(true);
      root.rotation.y = 0;
      plant = { root, touched: false };
      this.plants.set(id, plant);
      debug('visual.tier.plant.start');
    }
    plant.touched = true;
    plant.root.position.set(position.x, .04, position.z);
  }

  markSoulLink(key: string, from: Vector3, to: Vector3): void {
    const start = from.add(new Vector3(0, 1.35, 0));
    const end = to.add(new Vector3(0, 1.35, 0));
    const direction = end.subtract(start);
    const length = direction.length();
    if (length < .1) return;
    let link = this.soulLinkMarkers.get(key);
    if (!link) {
      if (this.soulLinkMarkers.size >= 64) return;
      const mesh = this.soulLinkPool.pop() ?? MeshBuilder.CreateCylinder('soul-link',
        { height: 1, diameter: .07, tessellation: 6 }, this.scene);
      mesh.material = this.palette.get('soul-link-water', '#7dd3fc', .65);
      mesh.isPickable = false; mesh.setEnabled(true);
      link = { mesh, touched: false }; this.soulLinkMarkers.set(key, link);
    }
    link.touched = true;
    link.mesh.position.copyFrom(start.add(end).scale(.5));
    link.mesh.rotationQuaternion ??= new Quaternion();
    Quaternion.FromUnitVectorsToRef(Vector3.Up(), direction.scale(1 / length), link.mesh.rotationQuaternion);
    link.mesh.scaling.set(1, length, 1);
  }

  private createPlant(): TransformNode {
    const root = new TransformNode('summoned-carnivorous-flower', this.scene);
    const stem = MeshBuilder.CreateCylinder('plant-stem', { height: 1.7, diameterTop: .22, diameterBottom: .36 }, this.scene);
    stem.parent = root; stem.position.y = .85;
    stem.material = this.palette.get('plant-stem', '#3b9850', .12);
    const bloom = MeshBuilder.CreateSphere('plant-bloom', { diameter: 1.2, segments: 10 }, this.scene);
    bloom.parent = root; bloom.position.y = 1.9; bloom.scaling.set(1, .65, 1);
    bloom.material = this.palette.get('plant-bloom', '#9bd74e', .15);
    const mouth = MeshBuilder.CreateSphere('plant-mouth', { diameter: .8, segments: 8 }, this.scene);
    mouth.parent = root; mouth.position.set(0, 1.91, -.49); mouth.scaling.set(1, .34, .3);
    mouth.material = this.palette.get('plant-mouth', '#59233f', .08);
    for (let i = 0; i < 4; i++) {
      const angle = i * Math.PI / 2;
      const petal = MeshBuilder.CreateSphere('plant-jaw-petal', { diameter: .9, segments: 8 }, this.scene);
      petal.parent = root;
      petal.position.set(Math.cos(angle) * .62, 2.06, Math.sin(angle) * .62);
      petal.scaling.set(.5, .28, .9);
      petal.rotation.y = -angle;
      petal.material = this.palette.get(i % 2 ? 'plant-petal-dark' : 'plant-petal-light',
        i % 2 ? '#4cae59' : '#9de76a', .16);
      petal.isPickable = false;
    }
    for (const side of [-1, 1]) {
      const fang = MeshBuilder.CreateCylinder('plant-fang',
        { height: .28, diameterTop: 0, diameterBottom: .12, tessellation: 5 }, this.scene);
      fang.parent = root;
      fang.position.set(side * .2, 1.94, -.76);
      fang.material = this.palette.get('plant-fang', '#f7efc7', .14);
      fang.isPickable = false;
    }
    const aura = MeshBuilder.CreateTorus('plant-armor-break-radius', { diameter: 6, thickness: .045, tessellation: 32 }, this.scene);
    aura.parent = root; aura.position.y = .06;
    aura.material = this.palette.get('plant-aura', '#84cc73', .45);
    aura.isPickable = false;
    for (const side of [-1, 1]) {
      const leaf = MeshBuilder.CreateSphere('plant-leaf', { diameter: 1, segments: 8 }, this.scene);
      leaf.parent = root; leaf.position.set(side * .55, .75, 0); leaf.scaling.set(.85, .2, .45);
      leaf.rotation.z = side * .35; leaf.material = this.palette.get('plant-leaf', '#4db96b', .1);
      leaf.isPickable = false;
    }
    stem.isPickable = bloom.isPickable = mouth.isPickable = false;
    return root;
  }
  clear(): void {
    this.monsterProjectiles.clear();
    this.bossEarth.clear();
    this.pangu.clear();
    this.scheduled.length = 0;
    for (const fx of this.active) this.release(fx);
    this.active.length = 0;
    for (const marker of this.statusMarkers.values()) {
      marker.mesh.setEnabled(false); this.statusPool.push(marker.mesh);
      if (marker.accent) { marker.accent.setEnabled(false); this.statusAccentPool.push(marker.accent); }
    }
    this.statusMarkers.clear();
    for (const marker of this.groundMarkers.values()) { marker.mesh.setEnabled(false); this.groundPool.push(marker.mesh); }
    this.groundMarkers.clear();
    for (const plant of this.plants.values()) { plant.root.setEnabled(false); this.plantPool.push(plant.root); }
    this.plants.clear();
    for (const link of this.soulLinkMarkers.values()) { link.mesh.setEnabled(false); this.soulLinkPool.push(link.mesh); }
    this.soulLinkMarkers.clear(); this.tierParticles.clear(); this.fire.clear(); this.water.clear(); this.tierMotifs.clear();
  }
  private release(fx: ActiveEffect): void {
    fx.mesh.setEnabled(false); fx.mesh.visibility = 1; this.pools[fx.kind].push(fx.mesh);
  }
  markPanguRift(ground: NonNullable<GameState['groundEffects']>[number]): void { this.pangu.markRift(ground, this.reduced.matches); }
  markPanguStatus(id: string, at: Vector3, kind: 'stun' | 'sunder' | 'empower'): void { this.pangu.markStatus(id, at, kind, this.reduced.matches); }
  cameraShake(): { x: number; y: number } { return this.reduced.matches ? { x: 0, y: 0 } : this.pangu.shake(); }
}
