import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { Scene } from '@babylonjs/core/scene.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import type { Enemy, Unit } from '../../../packages/contracts/src/types.js';
import { VisualMaterials } from './visual-materials.js';
import { createHeroSprite, createMonsterSprite } from './visual-sprites.js';
import { heroDirection, type HeroPose } from './hero-motion.js';
import { animateMonster } from './visual-monster-motion.js';

export type VisualActor = {
  root: TransformNode; barRoot: TransformNode; body: Mesh; head: Mesh; weapon: Mesh;
  shadow: Mesh;
  bar: Mesh; barBack: Mesh; shieldBar?: Mesh; manaBar?: Mesh; manaBack?: Mesh;
  barWidth: number;
  target: Vector3; hp: number; zone: number; size: number; phase: number; fireBurning: boolean;
  status?: 'stun' | 'root' | 'sunder' | 'slow' | 'poison' | 'charged' | 'shield' | 'ward' | 'haste'
    | 'berserk' | 'soulLink' | 'frost' | 'stoneShield';
  action: 'idle' | 'attack' | 'cast' | 'hit' | 'death'; actionTime: number; dying: boolean;
  hitStop: number;
  hitFlashTime: number;
  facingX: number; facingZ: number;
  monsterId?: Enemy['monsterId'];
  stoneShield?: boolean;
  heroId?: string;
  sprite?: ReturnType<typeof createHeroSprite> | ReturnType<typeof createMonsterSprite>; spriteShown: boolean; fallbackParts: Mesh[];
};

export function createActor(scene: Scene, palette: VisualMaterials, entity: Unit | Enemy, ownerColor = '#9de8c2', seat = 0): VisualActor {
  const hero = 'heroId' in entity ? HERO_BY_ID[entity.heroId] : undefined;
  const role = hero?.role ?? ('kind' in entity ? entity.kind : 'warrior');
  const enemy = !hero;
  const authoredMonster = enemy && 'monsterId' in entity && Boolean(entity.monsterId);
  const boss = role === 'boss';
  const size = boss ? 2.3 : role === 'guardian' ? 1.4 : 1.25;
  const colors: Record<string, string> = {
    warrior: '#c78c6d', ranger: '#75af92', mage: '#819fd0', guardian: '#bdab89', support: '#b8a3d9',
    melee: '#a87677', ranged: '#9d9a77', boss: '#6e9a78',
  };
  const root = new TransformNode(entity.id, scene);
  const material = palette.get(`actor-${role}`, colors[role] ?? '#af9fbb');
  const elementColors = ['#e8d3a0', '#82d1ad', '#8ad7e7', '#e9a47c', '#d9c28d'];
  const accent = hero ? palette.get(`hero-accent-${hero.element}`, elementColors[(hero.element - 1 + 5) % 5], .3) : material;
  const skin = palette.get(boss ? 'bone' : enemy ? 'enemy-skin' : 'skin', boss ? '#ded7b2' : enemy ? '#bca5a8' : '#f2d7bd');
  const metal = palette.get('weapon', '#ddd0b3', .05);
  const eye = palette.get(boss ? 'boss-eye' : 'face', boss ? '#b679ee' : '#332c45', boss ? .9 : .05);
  const parts: Mesh[] = [];
  const piece = (name: string, shape: 'sphere' | 'box' | 'cylinder', at: [number, number, number], scale: [number, number, number], mat = material): Mesh => {
    const mesh = shape === 'sphere' ? MeshBuilder.CreateSphere(name, { diameter: 1, segments: 8 }, scene)
      : shape === 'cylinder' ? MeshBuilder.CreateCylinder(name, { height: 1, diameterTop: .8, diameterBottom: 1.1, tessellation: 8 }, scene)
      : MeshBuilder.CreateBox(name, { size: 1 }, scene);
    mesh.parent = root; mesh.position.set(at[0] * size, at[1] * size, at[2] * size);
    mesh.scaling.set(scale[0] * size, scale[1] * size, scale[2] * size);
    mesh.material = mat; mesh.metadata = { actorId: entity.id };
    parts.push(mesh);
    return mesh;
  };
  const body = piece('tunic', 'cylinder', [0, .88, 0], [1, 1.15, 1]);
  const head = piece('chibi-head', 'sphere', [0, 1.83, 0], [1.05, 1.05, .94], skin);
  for (const side of authoredMonster ? [] : [-1, 1]) {
    piece('eye', 'sphere', [side * .23, 1.91, -.42], [.12, .13, .08], eye);
    piece('arm', 'sphere', [side * .6, 1.05, 0], [.44, .73, .46], boss ? skin : material);
    piece('foot', 'sphere', [side * .29, .24, -.12], [.4, .34, .55], material);
  }
  if (boss && !authoredMonster) {
    // Bone fists and crown give bosses a recognizable silhouette at wide camera zoom.
    for (const side of [-1, 1]) {
      piece('bone-fist', 'sphere', [side * .94, .66, -.12], [.55, .52, .55], skin);
      piece('horn', 'cylinder', [side * .48, 2.36, 0], [.35, .7, .35], skin).rotation.z = side * .45;
    }
    piece('rib-plate', 'box', [0, 1.08, -.46], [.88, .35, .1], skin);
  } else if (authoredMonster) {
    // The authored billboard supplies the silhouette; keep only a cheap load fallback.
  } else if (role === 'ranger') {
    piece('hood', 'sphere', [0, 2.04, .2], [1.1, .75, .9], material);
  } else if (role === 'mage' || role === 'support') {
    piece('halo', 'cylinder', [0, 2.5, 0], [.77, .17, .77], palette.get(`accent-${role}`, role === 'mage' ? '#9fe7ee' : '#ebc7fa', .5));
  } else if (role === 'guardian') {
    piece('shield', 'box', [-.77, 1.12, -.34], [.2, .85, .74], metal);
  } else {
    piece('crest', 'cylinder', [0, 2.35, 0], [.62, .37, .62], material);
  }
  if (hero) {
    // Deterministic color and headgear variants identify a hero without imported art.
    piece('element-brooch', 'sphere', [0, 1.36, -.49], [.23, .23, .12], accent);
    const variant = hero.index % 4;
    if (variant === 0) piece('plume', 'sphere', [0, 2.52, 0], [.3, .48, .28], accent);
    if (variant === 1) for (const side of [-1, 1]) piece('ear-crest', 'sphere', [side * .61, 2.2, 0], [.26, .39, .25], accent);
    if (variant === 2) piece('forehead-gem', 'sphere', [0, 2.25, -.48], [.2, .2, .12], accent);
    if (variant === 3) piece('back-cape', 'box', [0, .89, .45], [.84, 1.24, .12], accent);
  }
  const weapon = piece('weapon', role === 'ranger' ? 'cylinder' : 'box', [.8, 1.15, -.1], role === 'ranger' ? [.1, 1.5, .1] : [.12, 1.52, .18], metal);
  weapon.rotation.z = -.3;
  const fallbackParts = parts.slice();
  const sprite = hero ? createHeroSprite(scene, palette, hero.id, root)
    : 'monsterId' in entity && entity.monsterId ? createMonsterSprite(scene, palette, entity.monsterId, root) : undefined;

  const isHero = Boolean(hero);
  const isBoss = boss || ('monsterId' in entity && entity.monsterId === 'b001');
  const shadowRadius = isBoss ? 1.5 : isHero ? 0.75 : 0.5;
  const shadow = MeshBuilder.CreateDisc(`shadow-${entity.id}`, { radius: shadowRadius, tessellation: 20 }, scene);
  shadow.parent = root;
  shadow.rotation.x = Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  shadow.material = palette.dropShadow();
  shadow.isPickable = false;

  const barRoot = new TransformNode(`bar-root-${entity.id}`, scene);
  barRoot.parent = root;
  barRoot.billboardMode = Mesh.BILLBOARDMODE_Y;
  const initialHpY = boss ? 3.7 : 2.75;
  barRoot.position.set(0, initialHpY, 0);

  const barWidth = isBoss ? 2.6 : isHero ? 1.8 : 0.95;
  const hpHeight = isBoss ? 0.2 : isHero ? 0.15 : 0.08;
  const borderPad = 0.035 * size;
  const barBorderMat = palette.get('wc3-bar-border', '#090b10');

  const hpY = hero ? 0.06 * size : 0;
  const barBack = MeshBuilder.CreateBox('hp-back', { width: barWidth + borderPad * 2, height: hpHeight + borderPad * 2, depth: 0.08 }, scene);
  barBack.parent = barRoot;
  barBack.position.set(0, hpY, 0);
  barBack.material = barBorderMat;
  barBack.isPickable = false;

  const bar = MeshBuilder.CreateBox('hp-fill', { width: barWidth, height: hpHeight, depth: 0.1 }, scene);
  bar.parent = barRoot;
  bar.position.set(0, hpY, -0.015);
  bar.material = palette.get('wc3-hp-high', '#22c55e', 0.45);
  bar.isPickable = false;

  let shieldBar: Mesh | undefined;
  if (hero || boss && 'monsterId' in entity && entity.monsterId === 'b001') {
    shieldBar = MeshBuilder.CreateBox('shield-fill', { width: barWidth, height: hpHeight * .4, depth: .11 }, scene);
    shieldBar.parent = barRoot;
    shieldBar.position.set(0, hpY + hpHeight * .75, -.025);
    shieldBar.material = palette.get('wc3-shield-gold', '#fff1b2', .65);
    shieldBar.isPickable = false; shieldBar.setEnabled(false);
  }

  let manaBack: Mesh | undefined;
  let manaBar: Mesh | undefined;
  if (hero?.ability) {
    const manaHeight = 0.08 * size;
    const manaY = -0.07 * size;
    manaBack = MeshBuilder.CreateBox('mana-back', { width: barWidth + borderPad * 2, height: manaHeight + borderPad * 2, depth: 0.08 }, scene);
    manaBack.parent = barRoot;
    manaBack.position.set(0, manaY, 0);
    manaBack.material = barBorderMat;
    manaBack.isPickable = false;

    manaBar = MeshBuilder.CreateBox('mana-fill', { width: barWidth, height: manaHeight, depth: 0.1 }, scene);
    manaBar.parent = barRoot;
    manaBar.position.set(0, manaY, -0.015);
    manaBar.material = palette.get('wc3-mana-blue', '#2563eb', 0.45);
    manaBar.isPickable = false;
  }

  root.position.set(entity.x, 0, entity.z);
  return { root, barRoot, body, head, weapon, shadow, bar, barBack, shieldBar, manaBar, manaBack, barWidth,
    target: new Vector3(entity.x, 0, entity.z), hp: entity.hp, zone: entity.zone, size,
    phase: entity.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) * .31, fireBurning: false,
    action: 'idle', actionTime: 0, hitStop: 0, hitFlashTime: 0, dying: false,
    facingX: 0, facingZ: 1, heroId: 'heroId' in entity ? entity.heroId : undefined,
    monsterId: 'monsterId' in entity ? entity.monsterId : undefined,
    sprite, spriteShown: false, fallbackParts };
}

export function faceActorTowards(actor: VisualActor, x: number, z: number): void {
  const dx = x - actor.root.position.x, dz = z - actor.root.position.z;
  if (dx * dx + dz * dz > .0001) { actor.facingX = dx; actor.facingZ = dz; }
}

export function animateActor(actor: VisualActor, dt: number, time: number, reduced: boolean,
  cameraX = 0, cameraZ = 1, cameraAlpha = Math.PI / 2, cameraBeta = 0.66): void {
  const frozen = actor.hitStop > 0;
  actor.hitStop = Math.max(0, actor.hitStop - dt);
  const distance = actor.target.subtract(actor.root.position);
  const moving = distance.lengthSquared() > .012;
  if (!frozen) actor.root.position.addInPlace(distance.scale(Math.min(1, dt * 11)));
  if (moving && actor.actionTime <= 0) {
    actor.facingX = distance.x; actor.facingZ = distance.z;
    if (!actor.spriteShown) actor.root.rotation.y = Math.atan2(distance.x, distance.z);
  }
  if (!frozen) actor.actionTime = Math.max(0, actor.actionTime - dt);
  if (!actor.actionTime && actor.action !== 'death') actor.action = 'idle';
  const pulse = reduced ? 0 : Math.sin(time * (moving ? 13 : 2.3) + actor.phase);

  // Hit flash (White Flash) using Babylon's native renderOverlay
  if (actor.hitFlashTime > 0) {
    actor.hitFlashTime = Math.max(0, actor.hitFlashTime - dt);
    if (actor.sprite?.mesh && !reduced) {
      actor.sprite.mesh.renderOverlay = true;
      actor.sprite.mesh.overlayColor = Color3.White();
      actor.sprite.mesh.overlayAlpha = Math.min(0.85, (actor.hitFlashTime / 0.08) * 0.85);
    }
  } else if (actor.sprite?.mesh?.renderOverlay) {
    actor.sprite.mesh.renderOverlay = false;
  }

  // Attack Lunge (Lao người ra đòn)
  const len = Math.hypot(actor.facingX, actor.facingZ) || 1;
  const dirX = actor.facingX / len;
  const dirZ = actor.facingZ / len;
  let lungeX = 0, lungeZ = 0;
  if (actor.action === 'attack' && !reduced) {
    const duration = .38;
    const progress = Math.max(0, Math.min(1, 1 - actor.actionTime / duration));
    const strike = Math.sin(progress * Math.PI);
    const lungeDist = 0.38 * strike;
    lungeX = dirX * lungeDist;
    lungeZ = dirZ * lungeDist;
  }

  if (!actor.spriteShown) {
    actor.body.position.y = (.88 + (moving ? .035 : .018) * pulse) * actor.size;
    actor.head.position.y = (1.83 + (moving ? .045 : .025) * pulse) * actor.size;
    actor.weapon.rotation.z = actor.action === 'attack' ? -.3 - Math.sin((.4 - actor.actionTime) * 13) * .8
      : actor.action === 'cast' ? -.95 : -.3 + (reduced ? 0 : pulse * .035);
    actor.body.scaling.y = actor.action === 'hit' && !reduced ? actor.size * .88 : actor.size * 1.15;
  }
  if (actor.sprite) {
    const ready = actor.spriteShown || actor.sprite.ready();
    if (ready !== actor.spriteShown) {
      actor.sprite.mesh.setEnabled(ready);
      for (const part of actor.fallbackParts) part.dispose();
      actor.fallbackParts.length = 0;
      if (actor.sprite.healthBarY !== undefined) {
        // Move the bar with the anchored billboard after its texture is ready.
        actor.barRoot.parent = actor.sprite.mesh;
        actor.barRoot.billboardMode = Mesh.BILLBOARDMODE_NONE;
        actor.barRoot.position.set(0, actor.sprite.healthBarY, 0);
      } else actor.barRoot.position.y = actor.sprite.restY * 2 + .45;
      actor.spriteShown = ready;
    }
    if (ready) {
      // Maintain depth sorting index
      actor.sprite.mesh.alphaIndex = Math.round(actor.root.position.z * 100);

      // Position sprite with lunge offset
      actor.sprite.mesh.position.x = lungeX;
      actor.sprite.mesh.position.z = lungeZ;

      if (actor.sprite.animated) {
        const pose: HeroPose = actor.action !== 'idle' ? actor.action
          : moving ? reduced || Math.floor(time * 8 + actor.phase) % 2 === 0 ? 'walk-a' : 'walk-b' : 'idle';
        const duration = actor.action === 'cast' ? actor.heroId === 'h01B' ? .35 : .3 : .38;
        const progress = Math.max(0, Math.min(1, 1 - actor.actionTime / duration));
        actor.sprite.setFrame(heroDirection(actor.facingX, actor.facingZ, cameraX, cameraZ), pose,
          frozen ? 0 : dt, actor.heroId === 'h01B' && actor.action === 'cast' ? .35 : progress, reduced);
        actor.sprite.mesh.position.y = actor.sprite.restY + (actor.heroId === 'h01B' && actor.action === 'cast' && !reduced ? Math.sin(progress * Math.PI) * .65 : 0);
      } else if (actor.monsterId) {
        animateMonster(actor.sprite.mesh, actor.monsterId, actor.action, actor.actionTime,
          actor.sprite.restY, actor.phase, time, moving, reduced);
      } else {
        const duration = actor.action === 'cast' ? .3 : .38;
        const progress = Math.max(0, Math.min(1, 1 - actor.actionTime / duration));
        const strike = Math.sin(progress * Math.PI);

        // Walk hop: bounces up on each step
        const hop = reduced || !moving ? 0 : Math.abs(Math.sin(time * 11 + actor.phase)) * 0.16;
        // Walk sway: tilts left/right rhythmically
        const sway = reduced || !moving ? 0 : Math.sin(time * 5.5 + actor.phase) * 0.07;
        // Idle breathing: subtle height oscillation
        const breathe = reduced || moving ? 0 : Math.sin(time * 3 + actor.phase) * 0.025;

        actor.sprite.mesh.position.y = actor.sprite.restY + hop
          + (reduced ? 0 : actor.action === 'cast' ? .24 * strike : actor.action === 'attack' ? -.08 * strike : 0);
        actor.sprite.mesh.rotation.z = sway + (reduced ? 0 : actor.action === 'hit' ? .09 * strike
          : actor.action === 'cast' ? -.14 * strike : actor.action === 'attack' ? .14 * Math.sin(progress * Math.PI * 1.5) : 0);
        actor.sprite.mesh.scaling.y = (1 + breathe) * (reduced ? 1 : actor.action === 'hit' ? 1 - .12 * strike
          : actor.action === 'cast' ? 1 + .1 * strike : actor.action === 'attack' ? 1 - .05 * strike : 1);

        // Flip static sprite horizontally based on facing direction
        const signX = dirX < -0.15 ? -1 : 1;
        actor.sprite.mesh.scaling.x = signX * (reduced ? 1 : actor.action === 'attack' ? 1 + .08 * strike : 1);
      }
    }
  }

  // Update drop shadow scale & grounding
  actor.shadow.setEnabled(!actor.dying && actor.hp > 0);
  if (!reduced && actor.sprite?.mesh) {
    const jumpHeight = Math.max(0, actor.sprite.mesh.position.y - actor.sprite.restY);
    const shadowScale = Math.max(0.65, 1 - jumpHeight * 0.25);
    actor.shadow.scaling.set(shadowScale, shadowScale, shadowScale);
  }

  if (actor.dying && (!actor.sprite?.animated || actor.actionTime < .25)) actor.root.scaling.scaleInPlace(Math.max(.01, 1 - dt * 3));
}
