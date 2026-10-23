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
import { createMedicinalTree } from './visual-shennong-tree.js';
import { heroDirection, type HeroPose } from './hero-motion.js';
import type { SharedMark } from './visual-shared-status.js';
import { assignActorDrawGroups, configureCombatDrawOrder } from './visual-kit-draw-order.js';
import { createMotionTrack, sampleMotionTrack, updateMovingState, type MotionTrack } from './actor-interpolation.js';
import { enemyRankScale } from './visual-enemy-skill-routing.js';
import { PALETTE } from './ui-palette.js';

export type VisualActor = {
  root: TransformNode; barRoot: TransformNode; body: Mesh; head: Mesh; weapon: Mesh;
  shadow: Mesh;
  bar: Mesh; barBack: Mesh; shieldBar?: Mesh; manaBar?: Mesh; manaBack?: Mesh;
  /** Small gold tab at the left of the bar on the local player's own heroes (shape cue beside colour). */
  ownMark?: Mesh;
  barWidth: number;
  target: Vector3; hp: number; zone: number; size: number; phase: number; fireBurning: boolean;
  status?: 'stun' | 'root' | 'sunder' | 'slow' | 'poison' | 'charged' | 'shield' | 'ward' | 'haste'
    | 'berserk' | 'soulLink' | 'frost' | 'stoneShield' | 'pureLand' | 'sealed';
  action: 'idle' | 'attack' | 'cast' | 'hit' | 'death'; actionTime: number; actionDuration: number; dying: boolean;
  /** Freezes only the animation clock (impact punch); position keeps following the server. */
  hitStop: number;
  hitFlashTime: number;
  /** Snapshot interpolation buffer; absent on hand-built actors, which fall back to easing toward `target`. */
  track?: MotionTrack;
  /** Monster swing phase: hold the wind-up pose until the server's hit, then play the strike. */
  attackPhase?: 'windup' | 'strike';
  facingX: number; facingZ: number;
  monsterId?: Enemy['monsterId'];
  skinHeroId?: string;
  enemyRank?: Enemy['rank'];
  enemyKit?: Enemy['kit'];
  enraged?: boolean;
  authoredMonsterArt: boolean;
  stoneShield?: boolean;
  blackWaterShield?: boolean;
  /** Holds a shield from Kim Tra's golden bell (battlefield-kimtra tracker). */
  kimtraBell?: boolean;
  /** Mộc Tra in Cuồng Vũ (snapshot `berserk`, battlefield-moctra tracker): the thorn wreath. */
  moctraFrenzy?: boolean;
  /** Hình Thiên's snapshot `berserk.remaining` (seconds, > 0 while the immortal berserk holds): the armour/flame shell. */
  xingtianBerserk?: number;
  /** Kim Sí in berserk (snapshot `berserk.remaining` > 0): the golden feather bands. */
  kimsiBerserk?: boolean;
  /** Enemy bleeding from Kim Sí's feathers (snapshot `bleed.remaining` > 0 with an h016 `casterId`): the scar. */
  kimsiBleed?: boolean;
  /** Holds the ward Cự Linh Thần gave it (snapshot `ward`, battlefield-culinh tracker): the iron bulwark ring. */
  culinhBulwark?: boolean;
  /** Snapshot shield amount, used by Cự Linh's visual bulwark. */
  culinhShield?: number;
  /** Enemy slowed by Cự Linh's hammer quake (server `quake-h00E` event, 1.2 s). */
  culinhSlowed?: boolean;
  /** Enemy poisoned by Mộc Tra's vine shots (snapshot `poison` from an h00A caster): poison spores. */
  moctraPoison?: boolean;
  /** Enemy set alight by Thiết Phiến's detonation (snapshot `burn` from an h00B caster): ignition flare, then embers. */
  thietphienEmber?: 'start' | 'hold';
  /** Ally holding Mẫu Đơn's haste buff (snapshot `haste` +35% with attackBonus .15, battlefield-mandon tracker): the petal ring. */
  mandonHaste?: boolean;
  /** Monster Mạnh Bà just linked and the snapshot still holds `soulLink` (battlefield-manhba tracker): the Đồng Mệnh water ring. */
  manhbaBond?: boolean;
  /** Ally holding Nhiếp Tiểu Thiến's Frost Shield (snapshot `frostShield`, battlefield-nhieptieuthien tracker): the ice shell. */
  nhiepShield?: boolean;
  /** Enemy burning from Hồng Hài Nhi's skill (snapshot `burn` whose caster is h00C, battlefield-honghainhi tracker): the flame column. */
  honghainhiBurn?: boolean;
  lanternShielded?: boolean;
  buddhaShielded?: boolean;
  /** Game-wide statuses drawn from the snapshot with one neutral design for every element (shield bubble, stun/freeze/invulnerable sheets, marks). */
  shared?: readonly SharedMark[];
  bodhiBlessed?: boolean;
  /** Server `bodhiBlessing.remaining` (seconds): the leaf pair splits and pulls in over its last .3 s. */
  bodhiRemaining?: number;
  primordialBlessed?: boolean;
  primordialMarked?: boolean;
  peachBlessed?: boolean;
  /** Thái Bạch (h015): snapshot shows haste / divineImmortal on this hero (drawn only for recipients of her events). */
  starHaste?: boolean;
  starImmortal?: boolean;
  shadowAssault?: boolean;
  phoenixEgg?: boolean;
  exposed?: boolean;
  heroId?: string;
  summonKind?: Unit['summonKind'];
  nuwaShielded?: boolean;
  /** Seconds left of Nữ Oa's five-colour ward (0 = none); drawn by her module. */
  nuwaWard?: number;
  hienvienBlessed?: boolean;
  thunderBlessed?: boolean;
  truongFrozen?: boolean;
  truongSunder?: boolean;
  sprite?: ReturnType<typeof createHeroSprite> | ReturnType<typeof createMonsterSprite>; spriteShown: boolean; fallbackParts: Mesh[];
};

export function createActor(scene: Scene, palette: VisualMaterials, entity: Unit | Enemy, _ownerColor = '#9de8c2', _seat = 0,
  spriteActive = true): VisualActor {
  const hero = 'heroId' in entity ? HERO_BY_ID[entity.heroId] : undefined;
  const role = hero?.role ?? ('kind' in entity ? entity.kind : 'warrior');
  const enemy = !hero;
  const skinHeroId = enemy && 'skinHeroId' in entity ? entity.skinHeroId : undefined;
  const enemyRank = enemy && !('heroId' in entity) ? entity.rank : undefined;
  const enemyKit = enemy && 'kit' in entity ? entity.kit : undefined;
  const chieftain = enemyRank === 'chieftain';
  const authoredMonster = enemy && 'monsterId' in entity && Boolean(entity.monsterId);
  const boss = role === 'boss' || enemyRank === 'boss';
  const size = boss ? 2.3 : chieftain ? 1.55 : role === 'guardian' ? 1.4 : 1.25;
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
  for (const side of authoredMonster || skinHeroId ? [] : [-1, 1]) {
    piece('eye', 'sphere', [side * .23, 1.91, -.42], [.12, .13, .08], eye);
    piece('arm', 'sphere', [side * .6, 1.05, 0], [.44, .73, .46], boss ? skin : material);
    piece('foot', 'sphere', [side * .29, .24, -.12], [.4, .34, .55], material);
  }
  if (boss && !authoredMonster && !skinHeroId) {
    // Bone fists and crown give bosses a recognizable silhouette at wide camera zoom.
    for (const side of [-1, 1]) {
      piece('bone-fist', 'sphere', [side * .94, .66, -.12], [.55, .52, .55], skin);
      piece('horn', 'cylinder', [side * .48, 2.36, 0], [.35, .7, .35], skin).rotation.z = side * .45;
    }
    piece('rib-plate', 'box', [0, 1.08, -.46], [.88, .35, .1], skin);
  } else if (authoredMonster || skinHeroId) {
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
  if ('summonKind' in entity && entity.summonKind === 'ancient-tree') {
    for (const part of fallbackParts) part.visibility = 0;
  }
  const sprite = 'summonKind' in entity && entity.summonKind === 'ancient-tree' ? createMedicinalTree(scene, palette, root)
    : hero ? createHeroSprite(scene, palette, hero.id, root)
    : skinHeroId ? createHeroSprite(scene, palette, skinHeroId, root, {
      scale: enemyRankScale(enemyRank),
      actorKind: 'enemy',
      rank: enemyRank,
    })
    : 'monsterId' in entity && entity.monsterId ? createMonsterSprite(scene, palette, entity.monsterId, root,
      { active: spriteActive })
    : undefined;
  const spriteParts: { mesh: Mesh; meshes?: Mesh[] } | undefined = sprite;
  const spriteMeshes = spriteParts?.meshes ?? (sprite ? [sprite.mesh] : []);
  const authoredMonsterArt = Boolean(sprite && !hero && !skinHeroId && 'kind' in entity
    && (entity.kind === 'boss' || ('monsterId' in entity && entity.monsterId)));

  const isHero = Boolean(hero);
  const isBoss = boss || ('monsterId' in entity && entity.monsterId === 'b001');
  const shadowRadius = isBoss ? 2.3 : chieftain ? 1.35 : enemyRank === 'elite' ? 1.0 : isHero ? 0.75 : 0.85;
  const shadow = MeshBuilder.CreateDisc(`shadow-${entity.id}`, { radius: shadowRadius, tessellation: 20 }, scene);
  shadow.parent = root;
  shadow.rotation.x = Math.PI / 2;
  shadow.position.set(0, 0.02, 0);
  shadow.material = palette.dropShadow();
  shadow.isPickable = false;

  const barRoot = new TransformNode(`bar-root-${entity.id}`, scene);
  barRoot.parent = root;
  barRoot.billboardMode = Mesh.BILLBOARDMODE_ALL;
  const initialHpY = 'summonKind' in entity && entity.summonKind === 'ancient-tree' ? 5 : boss ? 3.7 : chieftain ? 3.3 : 2.75;
  barRoot.position.set(0, initialHpY, 0);

  const groupSize = sprite ? spriteMeshes.length : 1;
  const barWidth = isBoss ? groupSize > 1 ? 4.2 : 3.6 : chieftain ? 2.4 : 1.8;
  const hpHeight = isBoss ? 0.2 : isHero ? 0.15 : chieftain ? 0.13 : 0.08;
  // Bosses and chieftains get a thicker gold frame so they read apart from minions at a glance.
  const elite = isBoss || chieftain;
  const borderPad = (elite ? .06 : .035) * size;
  const barBorderMat = elite ? palette.get('bar-frame-elite', PALETTE['elite-frame']) : palette.get('wc3-bar-border', '#090b10');
  const manaBorderMat = palette.get('wc3-bar-border', '#090b10');

  const hpY = hero ? 0.06 * size : 0;
  const barBack = MeshBuilder.CreateBox('hp-back', { width: barWidth + borderPad * 2, height: hpHeight + borderPad * 2, depth: 0.08 }, scene);
  barBack.parent = barRoot;
  barBack.position.set(0, hpY, 0);
  barBack.material = barBorderMat;
  barBack.isPickable = false;

  const bar = MeshBuilder.CreateBox('hp-fill', { width: barWidth, height: hpHeight, depth: 0.1 }, scene);
  bar.parent = barRoot;
  bar.position.set(0, hpY, -0.015);
  bar.material = palette.get('faction-enemy', PALETTE['faction-enemy'], 0.45);
  bar.isPickable = false;

  let shieldBar: Mesh | undefined;
  if (hero || isBoss || chieftain) {
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
    manaBack.material = manaBorderMat;
    manaBack.isPickable = false;

    manaBar = MeshBuilder.CreateBox('mana-fill', { width: barWidth, height: manaHeight, depth: 0.1 }, scene);
    manaBar.parent = barRoot;
    manaBar.position.set(0, manaY, -0.015);
    manaBar.material = palette.get('mana-bar', PALETTE.mana, 0.45);
    manaBar.isPickable = false;
  }

  root.position.set(entity.x, 0, entity.z);
  configureCombatDrawOrder(scene);
  assignActorDrawGroups('heroId' in entity, [...parts, ...spriteMeshes], barRoot.getChildMeshes());
  return { root, barRoot, body, head, weapon, shadow, bar, barBack, shieldBar, manaBar, manaBack, barWidth,
    target: new Vector3(entity.x, 0, entity.z), hp: entity.hp, zone: entity.zone, size,
    phase: entity.id.split('').reduce((sum, c) => sum + c.charCodeAt(0), 0) * .31, fireBurning: false,
    action: 'idle', actionTime: 0, actionDuration: .38, hitStop: 0, hitFlashTime: 0, dying: false,
    track: createMotionTrack(entity.x, entity.z, performance.now() / 1000),
    facingX: 0, facingZ: 1, heroId: 'heroId' in entity ? entity.heroId : undefined,
    monsterId: 'monsterId' in entity ? entity.monsterId : undefined,
    skinHeroId,
    enemyRank,
    enemyKit,
    enraged: enemy && 'enraged' in entity ? entity.enraged : undefined,
    authoredMonsterArt,
    sprite, spriteShown: false, fallbackParts };
}

/**
 * Clip progress for a monster swing: the wind-up plays the first half of the attack clip
 * (legacy atlas: the anticipation cell) and holds it; the strike starts on the impact half.
 */
export function swingProgress(actor: Pick<VisualActor, 'attackPhase' | 'action'>, local: number): number {
  if (actor.action !== 'attack' || !actor.attackPhase) return local;
  return actor.attackPhase === 'windup' ? Math.min(.5, local * .5) : .52 + .48 * local;
}

export function faceActorTowards(actor: VisualActor, x: number, z: number): void {
  const dx = x - actor.root.position.x, dz = z - actor.root.position.z;
  if (dx * dx + dz * dz > .0001) { actor.facingX = dx; actor.facingZ = dz; }
}

export function animateActor(actor: VisualActor, dt: number, time: number, reduced: boolean,
  cameraX = 0, cameraZ = 1, _cameraAlpha = Math.PI / 2, _cameraBeta = 0.66): void {
  const frozen = actor.hitStop > 0;
  actor.hitStop = Math.max(0, actor.hitStop - dt);
  let headingX: number, headingZ: number, moving: boolean;
  if (actor.track) {
    const motion = sampleMotionTrack(actor.track, performance.now() / 1000);
    actor.root.position.x = motion.x; actor.root.position.z = motion.z;
    moving = updateMovingState(actor.track, Math.hypot(motion.vx, motion.vz), dt);
    headingX = motion.vx; headingZ = motion.vz;
  } else {
    const distance = actor.target.subtract(actor.root.position);
    moving = distance.lengthSquared() > (actor.monsterId || actor.authoredMonsterArt || actor.skinHeroId ? .0016 : .012);
    actor.root.position.addInPlace(distance.scale(Math.min(1, dt * 11)));
    headingX = distance.x; headingZ = distance.z;
  }
  if (moving && actor.actionTime <= 0 && headingX * headingX + headingZ * headingZ > 1e-4) {
    actor.facingX = headingX; actor.facingZ = headingZ;
    if (!actor.spriteShown) actor.root.rotation.y = Math.atan2(headingX, headingZ);
  }
  if (!frozen) actor.actionTime = Math.max(0, actor.actionTime - dt);
  if (!actor.actionTime && actor.action !== 'death') { actor.action = 'idle'; actor.attackPhase = undefined; }
  const pulse = reduced ? 0 : Math.sin(time * (moving ? 13 : 2.3) + actor.phase);

  // Hit flash (White Flash) using Babylon's native renderOverlay
  if (actor.hitFlashTime > 0) {
    actor.hitFlashTime = Math.max(0, actor.hitFlashTime - dt);
    if (actor.sprite?.mesh && !reduced) {
      const spriteMeshes = 'meshes' in actor.sprite ? actor.sprite.meshes : [actor.sprite.mesh];
      for (const mesh of spriteMeshes) {
        mesh.renderOverlay = true;
        mesh.overlayColor = Color3.White();
        mesh.overlayAlpha = Math.min(0.85, (actor.hitFlashTime / 0.08) * 0.85);
      }
    }
  } else if (actor.sprite?.mesh?.renderOverlay) {
    const spriteMeshes = 'meshes' in actor.sprite ? actor.sprite.meshes : [actor.sprite.mesh];
    spriteMeshes.forEach(mesh => { mesh.renderOverlay = false; });
  }

  // Attack Lunge (Lao người ra đòn)
  const len = Math.hypot(actor.facingX, actor.facingZ) || 1;
  const dirX = actor.facingX / len;
  const dirZ = actor.facingZ / len;
  let lungeX = 0, lungeZ = 0;
  if (actor.action === 'attack' && !reduced) {
    // Wind-up leans back; the strike lunges forward and recovers.
    const local = Math.max(0, Math.min(1, 1 - actor.actionTime / Math.max(.001, actor.actionDuration)));
    const lungeDist = actor.attackPhase === 'windup' ? -.12 * Math.min(1, local * 1.6)
      : actor.attackPhase === 'strike' ? .38 * Math.sin((.5 + local * .5) * Math.PI)
      : .38 * Math.sin(Math.max(0, Math.min(1, 1 - actor.actionTime / .38)) * Math.PI);
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
    const spriteMeshes = 'meshes' in actor.sprite ? actor.sprite.meshes : [actor.sprite.mesh];
    const motionRoot = 'motionRoot' in actor.sprite ? actor.sprite.motionRoot : actor.sprite.mesh;
    const ready = actor.spriteShown || actor.sprite.ready();
    if (ready !== actor.spriteShown) {
      if ('setVisible' in actor.sprite) actor.sprite.setVisible(ready);
      else spriteMeshes.forEach(mesh => mesh.setEnabled(ready));
      for (const part of actor.fallbackParts) part.dispose();
      actor.fallbackParts.length = 0;
      if (actor.sprite.healthBarY !== undefined) {
        // Move the bar with the anchored billboard after its texture is ready.
        actor.barRoot.parent = motionRoot;
        actor.barRoot.billboardMode = motionRoot === actor.sprite.mesh ? Mesh.BILLBOARDMODE_NONE : Mesh.BILLBOARDMODE_ALL;
        actor.barRoot.position.set(0, actor.sprite.healthBarY / Math.max(.001, motionRoot.scaling.y), 0);
      } else actor.barRoot.position.y = actor.sprite.restY * 2 + .45;
      actor.spriteShown = ready;
    }
    if (ready) {
      // Maintain depth sorting index along camera viewing direction
      const depth = cameraX * actor.root.position.x + cameraZ * actor.root.position.z;
      spriteMeshes.forEach((mesh, index) => { mesh.alphaIndex = Math.round(depth * 100) + index; });

      // Position sprite with lunge offset
      motionRoot.position.x = lungeX;
      motionRoot.position.z = lungeZ;

      if (actor.sprite.animated) {
        const pose: HeroPose = actor.action !== 'idle' ? actor.action
          : moving ? reduced || Math.floor(time * 8 + actor.phase) % 2 === 0 ? 'walk-a' : 'walk-b' : 'idle';
        const duration = actor.monsterId || actor.authoredMonsterArt || actor.skinHeroId ? actor.actionDuration
          : actor.action === 'cast' ? actor.heroId === 'h01B' ? .35 : .3 : .38;
        const progress = swingProgress(actor, Math.max(0, Math.min(1, 1 - actor.actionTime / Math.max(0.001, duration))));
        actor.sprite.setFrame(heroDirection(actor.facingX, actor.facingZ, cameraX, cameraZ), pose,
          frozen ? 0 : dt, actor.heroId === 'h01B' && actor.action === 'cast' ? .35 : progress, reduced);
        if (actor.authoredMonsterArt && actor.sprite.healthBarY !== undefined) {
          actor.barRoot.position.y = actor.sprite.healthBarY / Math.max(.001, motionRoot.scaling.y);
        }
        motionRoot.position.y = actor.sprite.restY + (actor.heroId === 'h01B' && actor.action === 'cast' && !reduced ? Math.sin(progress * Math.PI) * .65 : 0);
      } else {
        const duration = actor.attackPhase ? actor.actionDuration : actor.action === 'cast' ? .3 : .38;
        const progress = swingProgress(actor, Math.max(0, Math.min(1, 1 - actor.actionTime / Math.max(0.001, duration))));
        const strike = Math.sin(progress * Math.PI);

        // Walk hop: bounces up on each step
        const hop = reduced || !moving ? 0 : Math.abs(Math.sin(time * 11 + actor.phase)) * 0.16;
        // Walk sway: tilts left/right rhythmically
        const sway = reduced || !moving ? 0 : Math.sin(time * 5.5 + actor.phase) * 0.07;
        // Idle breathing: subtle height oscillation
        const breathe = reduced || moving ? 0 : Math.sin(time * 3 + actor.phase) * 0.025;

        motionRoot.position.y = actor.sprite.restY + hop
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
    const motionRoot = 'motionRoot' in actor.sprite ? actor.sprite.motionRoot : actor.sprite.mesh;
    const jumpHeight = Math.max(0, motionRoot.position.y - actor.sprite.restY);
    const shadowScale = Math.max(0.65, 1 - jumpHeight * 0.25);
    actor.shadow.scaling.set(shadowScale, shadowScale, shadowScale);
  }

  if (actor.dying && (!actor.sprite?.animated || actor.actionTime < .25)) actor.root.scaling.scaleInPlace(Math.max(.01, 1 - dt * 3));
}
