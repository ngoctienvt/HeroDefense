import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import '@babylonjs/core/Culling/ray.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Enemy, GameEvent, GameState } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { laneCenters } from '../../../packages/game-core/src/battlefield-layout.js';
import { debug } from './debug.js';
import { createActor, animateActor, faceActorTowards, type VisualActor } from './visual-actors.js';
import { VisualAudio } from './visual-audio.js';
import { VisualEffects } from './visual-effects.js';
import { hasFireBurn } from './visual-fire.js';
import { isTierSkill } from './visual-tier-skills.js';
import { VisualMaterials } from './visual-materials.js';
import { buildTerrain } from './visual-terrain.js';
import { hasStylizedMotion } from './stylized-motion.js';

export class Battlefield {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private actors = new Map<string, VisualActor>();
  private palette: VisualMaterials;
  private effects: VisualEffects;
  private audio = new VisualAudio();
  private rings = new Map<string, ReturnType<typeof MeshBuilder.CreateTorus>>();
  private zone = 0;
  private eventId = 0;
  private hasSnapshot = false;
  private selected = new Set<string>();
  private groundEffects: NonNullable<GameState['groundEffects']> = [];
  private summonedPlants: { id: string; position: Vector3; zone: number }[] = [];
  private soulLinks: { key: string; from: Vector3; to: Vector3; zone: number }[] = [];
  private panguStatuses: { id: string; kind: 'stun' | 'sunder' | 'empower' }[] = [];
  private laneCount = 0;
  private clearTerrain: () => void;
  private time = 0;
  private perfAt = 0;
  private frames = 0;
  private fpsAt = performance.now();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private keys = { up: false, down: false, left: false, right: false };
  private mousePos: { x: number; y: number } | null = null;
  private isInteracting = false;
  private unsubscribe: () => void;
  private resize = () => this.engine.resize();
  onSelect: (id: string, append: boolean) => void = () => {};
  onAreaSelect: (ids: string[], append: boolean) => void = () => {};
  onOrder: (target: string | null, x: number, z: number) => void = () => {};
  cancelDrag: () => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(.08, .15, .16, 1);
    this.scene.fogMode = Scene.FOGMODE_EXP2; this.scene.fogDensity = .004;
    this.scene.fogColor = new Color3(.2, .34, .34);
    this.camera = new ArcRotateCamera('camera', Math.PI / 2, .66, 48, new Vector3(0, 0, -3), this.scene);
    this.camera.inputs.clear();
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = .66;
    this.camera.lowerBetaLimit = .66;
    this.camera.upperBetaLimit = .66;
    this.camera.lowerAlphaLimit = Math.PI / 2;
    this.camera.upperAlphaLimit = Math.PI / 2;
    this.camera.lowerRadiusLimit = 16;
    this.camera.upperRadiusLimit = 90;
    const light = new HemisphericLight('sky', new Vector3(-.4, 1, -.3), this.scene);
    light.intensity = 1.45; light.groundColor = new Color3(.15, .1, .2);
    this.palette = new VisualMaterials(this.scene);
    this.clearTerrain = buildTerrain(this.scene, this.palette, 1);
    this.laneCount = 1;
    this.effects = new VisualEffects(this.scene, this.palette);
    const marquee = document.createElement('div'); marquee.className = 'selection-marquee'; marquee.hidden = true; document.body.append(marquee);
    let start: { x: number; y: number; append: boolean } | null = null;
    let ctrlPanDrag: { x: number; y: number } | null = null;
    let middleDrag: { x: number; y: number } | null = null;

    const pickAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      return this.scene.pick((event.clientX - rect.left) * this.engine.getRenderWidth() / rect.width, (event.clientY - rect.top) * this.engine.getRenderHeight() / rect.height);
    };
    const groundAt = (event: PointerEvent): Vector3 | null => {
      const rect = canvas.getBoundingClientRect();
      const ray = this.scene.createPickingRay(
        (event.clientX - rect.left) * this.engine.getRenderWidth() / rect.width,
        (event.clientY - rect.top) * this.engine.getRenderHeight() / rect.height,
        Matrix.Identity(), this.camera,
      );
      if (Math.abs(ray.direction.y) < 1e-6) return null;
      const distance = -ray.origin.y / ray.direction.y;
      return Number.isFinite(distance) && distance >= 0 ? ray.origin.add(ray.direction.scale(distance)) : null;
    };

    const down = (event: PointerEvent) => {
      this.isInteracting = true;
      try { canvas.setPointerCapture(event.pointerId); } catch {}
      if (event.button === 0) {
        if (event.ctrlKey) {
          ctrlPanDrag = { x: event.clientX, y: event.clientY };
        } else {
          start = { x: event.clientX, y: event.clientY, append: event.shiftKey };
        }
      } else if (event.button === 1) {
        event.preventDefault();
        middleDrag = { x: event.clientX, y: event.clientY };
      } else if (event.button === 2) {
        event.preventDefault();
        const pick = pickAt(event), point = pick?.pickedPoint ?? groundAt(event);
        if (point) this.onOrder((pick?.pickedMesh?.metadata?.actorId as string) ?? null, point.x, point.z);
      }
    };

    const move = (event: PointerEvent) => {
      if (ctrlPanDrag) {
        const dx = event.clientX - ctrlPanDrag.x;
        const dy = event.clientY - ctrlPanDrag.y;
        ctrlPanDrag.x = event.clientX;
        ctrlPanDrag.y = event.clientY;
        this.pan(dx, dy);
        return;
      }
      if (middleDrag) {
        const dx = event.clientX - middleDrag.x;
        const dy = event.clientY - middleDrag.y;
        middleDrag.x = event.clientX;
        middleDrag.y = event.clientY;
        this.pan(dx, dy);
        return;
      }
      if (!start) return;
      const x = Math.min(start.x, event.clientX), y = Math.min(start.y, event.clientY), width = Math.abs(event.clientX - start.x), height = Math.abs(event.clientY - start.y);
      marquee.hidden = width < 6 && height < 6;
      Object.assign(marquee.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    };

    const up = (event: PointerEvent) => {
      this.isInteracting = false;
      try { canvas.releasePointerCapture(event.pointerId); } catch {}
      if (event.button === 0) {
        ctrlPanDrag = null;
        if (start) {
          const drag = Math.hypot(event.clientX - start.x, event.clientY - start.y) >= 6;
          if (drag) {
            const rect = canvas.getBoundingClientRect(), left = Math.min(start.x, event.clientX), right = Math.max(start.x, event.clientX), top = Math.min(start.y, event.clientY), bottom = Math.max(start.y, event.clientY);
            const ids: string[] = [];
            for (const [id, actor] of this.actors) {
              if (!id.startsWith('u') || actor.zone !== this.zone || !actor.root.isEnabled()) continue;
              const point = Vector3.Project(actor.root.position.add(new Vector3(0, 1, 0)), Matrix.Identity(), this.scene.getTransformMatrix(), this.camera.viewport.toGlobal(this.engine.getRenderWidth(), this.engine.getRenderHeight()));
              const x = rect.left + point.x * rect.width / this.engine.getRenderWidth(), y = rect.top + point.y * rect.height / this.engine.getRenderHeight();
              if (x >= left && x <= right && y >= top && y <= bottom) ids.push(id);
            }
            this.onAreaSelect(ids, start.append);
          } else {
            const id = pickAt(event)?.pickedMesh?.metadata?.actorId as string | undefined;
            if (id) this.onSelect(id, start.append);
            else this.onAreaSelect([], start.append);
          }
          start = null; marquee.hidden = true;
        }
      } else if (event.button === 1) {
        middleDrag = null;
      }
    };

    const cancel = () => {
      this.isInteracting = false;
      start = null;
      ctrlPanDrag = null;
      middleDrag = null;
      marquee.hidden = true;
    };
    this.cancelDrag = cancel;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      this.zoom(event.deltaY < 0);
    };

    const isInputFocused = () => {
      const active = document.activeElement;
      return active instanceof HTMLInputElement || active instanceof HTMLSelectElement ||
        active instanceof HTMLTextAreaElement || (active instanceof HTMLElement && active.isContentEditable);
    };

    const keydown = (event: KeyboardEvent) => {
      if (isInputFocused() || event.metaKey || event.ctrlKey) return;
      const code = event.code;
      const key = event.key.toLowerCase();

      // WASD + Arrow Keys: Di chuyển khung hình chuẩn Warcraft 3
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') {
        this.keys.up = true; event.preventDefault(); return;
      }
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') {
        this.keys.down = true; event.preventDefault(); return;
      }
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') {
        this.keys.left = true; event.preventDefault(); return;
      }
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') {
        this.keys.right = true; event.preventDefault(); return;
      }

      switch (code) {
        case 'PageUp':
        case 'NumpadAdd':
        case 'Equal':
          this.zoom(true); event.preventDefault(); break;
        case 'PageDown':
        case 'NumpadSubtract':
        case 'Minus':
          this.zoom(false); event.preventDefault(); break;
      }
    };

    const keyup = (event: KeyboardEvent) => {
      const code = event.code;
      const key = event.key.toLowerCase();
      if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') this.keys.up = false;
      if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') this.keys.down = false;
      if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') this.keys.left = false;
      if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') this.keys.right = false;
    };

    const onBlur = () => {
      this.keys = { up: false, down: false, left: false, right: false };
      this.mousePos = null;
      cancel();
    };

    const onWindowPointerMove = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') {
        this.mousePos = { x: event.clientX, y: event.clientY };
      }
    };

    const onWindowPointerLeave = () => {
      this.mousePos = null;
    };

    const context = (event: Event) => event.preventDefault();
    const auxclick = (event: MouseEvent) => event.preventDefault();

    canvas.addEventListener('pointerdown', down);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel);
    canvas.addEventListener('lostpointercapture', cancel);
    canvas.addEventListener('contextmenu', context);
    canvas.addEventListener('auxclick', auxclick);
    canvas.addEventListener('wheel', onWheel, { passive: false });

    window.addEventListener('keydown', keydown);
    window.addEventListener('keyup', keyup);
    window.addEventListener('blur', onBlur);
    window.addEventListener('pointermove', onWindowPointerMove);
    window.addEventListener('pointerleave', onWindowPointerLeave);

    this.unsubscribe = () => {
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('lostpointercapture', cancel);
      canvas.removeEventListener('contextmenu', context);
      canvas.removeEventListener('auxclick', auxclick);
      canvas.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', keydown);
      window.removeEventListener('keyup', keyup);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('pointermove', onWindowPointerMove);
      window.removeEventListener('pointerleave', onWindowPointerLeave);
      marquee.remove();
    };
    window.addEventListener('resize', this.resize); this.engine.runRenderLoop(() => this.render());
    debug('battlefield.created', { style: 'jade-valley', effectsCap: 64 });
  }

  setAudioEnabled(enabled: boolean): void { this.audio.setEnabled(enabled); debug('battlefield.audio', { enabled }); }

  update(state: GameState, _selfId: string, selected: string[]): void {
    this.selected = new Set(selected);
    this.groundEffects = state.groundEffects ?? [];
    this.panguStatuses = [];
    for (const enemy of Object.values(state.enemies)) {
      if ((enemy.stun ?? 0) > 0) this.panguStatuses.push({ id: enemy.id, kind: 'stun' });
      if (enemy.sunder && enemy.sunder.remaining > 0) this.panguStatuses.push({ id: enemy.id, kind: 'sunder' });
    }
    for (const unit of Object.values(state.units)) if (unit.empower && unit.empower.remaining > 0)
      this.panguStatuses.push({ id: unit.id, kind: 'empower' });
    this.summonedPlants = Object.values(state.units).filter(unit => unit.heroId === 'summon_plant' && unit.hp > 0)
      .map(unit => ({ id: unit.id, position: new Vector3(unit.x, 0, unit.z), zone: unit.zone }));
    this.soulLinks = [];
    const linkedGroups = new Set<string>();
    for (const enemy of Object.values(state.enemies)) {
      if (!enemy.soulLink || enemy.soulLink.remaining <= 0) continue;
      const linked = enemy.soulLink.group.map(id => state.enemies[id])
        .filter((other): other is Enemy => Boolean(other && other.zone === enemy.zone));
      const groupKey = linked.map(other => other.id).join('|');
      if (linkedGroups.has(groupKey)) continue;
      linkedGroups.add(groupKey);
      for (let i = 1; i < linked.length; i++) {
        const previous = linked[i - 1], next = linked[i];
        this.soulLinks.push({ key: `${groupKey}:${i}`, from: new Vector3(previous.x, 0, previous.z),
          to: new Vector3(next.x, 0, next.z), zone: enemy.zone });
      }
    }
    const count = Object.keys(state.players).length;
    if (count !== this.laneCount) { this.clearTerrain(); this.clearTerrain = buildTerrain(this.scene, this.palette, count); this.laneCount = count; this.resetCamera(); }
    const present = new Set<string>();
    for (const entity of [...Object.values(state.units).filter(unit => unit.slot >= 0), ...Object.values(state.enemies)]) {
      present.add(entity.id);
      let actor = this.actors.get(entity.id);
      if (!actor) { actor = createActor(this.scene, this.palette, entity, state.players[entity.owner]?.color, Math.max(0, Object.keys(state.players).indexOf(entity.owner))); this.actors.set(entity.id, actor); }
      actor.target.set(entity.x, 0, entity.z); actor.hp = entity.hp; actor.zone = entity.zone;
      actor.stoneShield = !('heroId' in entity) && entity.monsterId === 'b001' && (entity.shield ?? 0) > 0;
      actor.fireBurning = !('heroId' in entity) && hasFireBurn(entity, state.units);
      actor.status = 'heroId' in entity
        ? (entity.stun ?? 0) > 0 ? 'stun'
          : entity.frostShield && entity.frostShield.remaining > 0 ? 'frost'
          : entity.berserk && entity.berserk.remaining > 0 ? 'berserk'
            : entity.shield > 0 ? 'shield' : entity.ward ? 'ward' : entity.haste ? 'haste' : undefined
        : (entity.stun ?? 0) > 0 ? 'stun' : (entity.root ?? 0) > 0 ? 'root' : entity.sunder ? 'sunder'
          : entity.soulLink && entity.soulLink.remaining > 0 ? 'soulLink'
          : entity.monsterId === 'b001' && (entity.shield ?? 0) > 0 ? 'stoneShield'
          : (entity.shield ?? 0) > 0 ? 'shield'
          : entity.armorBuff ? 'ward' : entity.slow > 0 ? 'slow'
          : entity.burn && !actor.fireBurning ? ['h00A', 'h03P'].includes(state.units[entity.burn.casterId]?.heroId ?? '') ? 'poison' : 'charged' : undefined;
      if (entity.hp > 0 && !actor.dying) actor.root.scaling.setAll(1);

      // Overhead Warcraft 3 HP bar (color shift: Green > 70%, Yellow 35-70%, Red <= 35%)
      const hpRatio = Math.max(0, Math.min(1, entity.maxHp > 0 ? entity.hp / entity.maxHp : 0));
      const hpColorKey = hpRatio > 0.7 ? 'wc3-hp-high' : hpRatio > 0.35 ? 'wc3-hp-mid' : 'wc3-hp-low';
      const hpColorHex = hpRatio > 0.7 ? '#22c55e' : hpRatio > 0.35 ? '#eab308' : '#ef4444';
      actor.bar.material = this.palette.get(hpColorKey, hpColorHex, 0.45);
      actor.bar.scaling.x = Math.max(0.001, hpRatio);
      actor.bar.position.x = -actor.barWidth * (1 - hpRatio) * 0.5;
      if (actor.shieldBar) {
        const shield = 'heroId' in entity ? entity.shield : entity.shield ?? 0;
        const shieldRatio = Math.max(0, Math.min(1, entity.maxHp > 0 ? shield / entity.maxHp : 0));
        actor.shieldBar.setEnabled(shield > 0);
        actor.shieldBar.scaling.x = Math.max(.001, shieldRatio);
        actor.shieldBar.position.x = -actor.barWidth * (1 - shieldRatio) * .5;
      }

      // Overhead Warcraft 3 Mana bar (for heroes)
      if (actor.manaBar && 'heroId' in entity) {
        const hero = HERO_BY_ID[entity.heroId];
        const isRage = entity.energyType === 'rage_on_attack' || entity.energyType === 'rage_on_hit';
        let manaRatio = 0;
        if (isRage) {
          manaRatio = Math.max(0, Math.min(1, (entity.energy ?? 0) / (entity.maxEnergy ?? 100)));
        } else {
          const maxCd = hero?.ability ? hero.ability.cooldown / (1 + .1 * (entity.equipment?.[2] ?? 0)) : 0;
          manaRatio = Math.max(0, Math.min(1, maxCd > 0 ? 1 - (entity.abilityCooldown ?? 0) / maxCd : 1));
        }
        actor.manaBar.scaling.x = Math.max(0.001, manaRatio);
        actor.manaBar.position.x = -actor.barWidth * (1 - manaRatio) * 0.5;
        if (isRage) {
          actor.manaBar.material = this.palette.get('rage-bar', '#f97316', 0.45);
        } else {
          actor.manaBar.material = this.palette.get('mana-bar', '#38bdf8', 0.45);
        }
      }

      if (actor.manaBar && actor.manaBack && 'heroId' in entity) {
        const hasAbility = Boolean(HERO_BY_ID[entity.heroId]?.ability);
        actor.manaBar.setEnabled(hasAbility); actor.manaBack.setEnabled(hasAbility);
      }
      const isHeroOrBoss = 'heroId' in entity || ('kind' in entity && entity.kind === 'boss');
      const showBar = isHeroOrBoss || entity.hp < entity.maxHp;
      actor.barRoot.setEnabled(!actor.dying && entity.hp > 0 && showBar);
      actor.shadow.setEnabled(entity.zone === this.zone && entity.hp > 0 && !actor.dying);
      actor.root.setEnabled(entity.zone === this.zone && (entity.hp > 0 || actor.dying));
    }
    // Fresh snapshots carry historical events after reconnect; skip those once.
    if (!this.hasSnapshot) {
      this.eventId = Math.max(this.eventId, ...state.events.map(event => event.id), 0);
      this.hasSnapshot = true;
    } else {
      for (const event of state.events) {
        if (event.id <= this.eventId) continue;
        this.eventId = event.id; this.handleEvent(event);
      }
    }
    for (const [id, actor] of this.actors) if (!present.has(id) && !actor.dying) { actor.root.dispose(false, false); this.actors.delete(id); }
  }

  private handleEvent(event: GameEvent): void {
    if (event.kind !== 'attack' && event.kind !== 'trait' && event.kind !== 'cast' && event.kind !== 'ability' && event.kind !== 'death') return;
    const source = this.actors.get(event.source ?? '');
    const target = this.actors.get(event.target ?? '');
    if (event.kind === 'cast') {
      if (source?.zone === this.zone) {
        source.action = 'cast'; source.actionTime = event.windup ?? .3;
        if (target) faceActorTowards(source, target.root.position.x, target.root.position.z);
        else if (event.x !== undefined && event.z !== undefined) faceActorTowards(source, event.x, event.z);
        if (event.skillId?.startsWith('boss-')) this.effects.show(event, source.root.position);
        else this.effects.showCast(event, source.root.position);
        this.audio.play(event);
      }
      return;
    }
    if (event.skillId === 'cataclysm-h01B') {
      if (this.zone === 0) this.effects.show(event, this.camera.target, this.camera.target);
      return;
    }
    if (source && event.kind !== 'death') {
      const supportive = event.ability === 'heal' || event.ability === 'shield';
      const stylized = hasStylizedMotion(source.heroId ?? '');
      source.action = event.kind === 'ability' && event.skillId !== 'skill-h01B' && !stylized ? 'cast' : 'attack';
      source.actionTime = stylized && event.kind === 'ability' ? .2 : .38;
      if (event.kind === 'ability' && !supportive && !this.reducedMotion.matches) source.hitStop = .045;
      const aim = target?.root.position;
      if (aim) faceActorTowards(source, aim.x, aim.z);
      else if (event.x !== undefined && event.z !== undefined) faceActorTowards(source, event.x, event.z);
    }
    const affected = event.kind === 'ability' || event.skillId?.endsWith('-h01B') ? event.targets?.length ? event.targets : event.target ? [event.target] : []
      : event.target ? [event.target] : [];
    for (const id of affected) {
      const hit = this.actors.get(id);
      if (!hit || hit.dying) continue;
      if (event.kind === 'death') { hit.action = 'death'; hit.actionTime = hit.sprite?.animated ? .75 : .45; hit.dying = true; hit.hp = 0; hit.barRoot.setEnabled(false); hit.shadow.setEnabled(false); }
      else if (hit !== source && event.ability !== 'heal' && event.ability !== 'shield') {
        hit.action = 'hit'; hit.actionTime = .2; hit.hitFlashTime = .08;
        if (!this.reducedMotion.matches && source) {
          if (event.kind === 'ability') hit.hitStop = .045;
          const away = hit.root.position.subtract(source.root.position);
          if (away.lengthSquared() > .01) hit.root.position.addInPlace(away.normalize().scale(.3));
        }
      }
      if (hit.zone === this.zone) hit.root.setEnabled(true);
    }
    if (event.kind === 'ability' && isTierSkill(event.skillId)) {
      const hits = affected.map(id => this.actors.get(id)).filter((hit): hit is VisualActor =>
        Boolean(hit && hit.zone === this.zone)).map(hit => hit.root.position.clone());
      if (source?.zone !== this.zone && target?.zone !== this.zone && hits.length === 0) return;
      const center = event.x !== undefined && event.z !== undefined
        ? new Vector3(event.x, 0, event.z) : target?.root.position ?? source?.root.position;
      if (center) this.effects.show(event, center, source?.root.position, hits);
      this.audio.play(event);
      return;
    }
    const defensive = event.kind === 'ability' && (event.ability === 'heal' || event.ability === 'shield');
    if (defensive && affected.length) {
      for (const id of affected) {
        const ally = this.actors.get(id);
        if (ally?.zone === this.zone) this.effects.show(event, ally.root.position, source?.root.position);
      }
      this.audio.play(event);
      return;
    }
    const actor = target ?? source;
    if (actor?.zone !== this.zone) return;
    const position = event.x !== undefined && event.z !== undefined && !defensive
      ? new Vector3(event.x, 0, event.z) : actor?.root.position;
    if (!position) return;
    if (event.kind !== 'death') this.effects.show(event, position, source?.root.position);
    if (event.kind === 'ability' && event.ability === 'chain') {
      let previous = source?.root.position;
      for (const id of affected) {
        const hit = this.actors.get(id);
        if (!hit || hit.zone !== this.zone) continue;
        if (id !== event.target) this.effects.show({ ...event, kind: 'attack' }, hit.root.position, previous);
        previous = hit.root.position;
      }
    }
    this.audio.play(event);
  }

  setZone(zone: number): void {
    this.zone = zone; this.effects.clear();
    this.camera.targetScreenOffset.set(0, 0);
    for (const actor of this.actors.values()) {
      actor.root.setEnabled(actor.zone === zone && (actor.hp > 0 || actor.dying));
      actor.shadow.setEnabled(actor.zone === zone && actor.hp > 0 && !actor.dying);
    }
    this.resetCamera();
  }
  resizeCanvas(): void { this.engine.resize(); }
  clear(): void {
    for (const actor of this.actors.values()) actor.root.dispose(false, false);
    this.actors.clear(); this.effects.clear(); this.eventId = 0; this.zone = 0; this.hasSnapshot = false; this.selected.clear(); this.groundEffects = []; this.summonedPlants = []; this.soulLinks = [];
  }
  pan(dx: number, dy: number): void {
    const lookDirX = Math.cos(this.camera.alpha);
    const lookDirZ = Math.sin(this.camera.alpha);
    const rightDirX = -Math.sin(this.camera.alpha);
    const rightDirZ = Math.cos(this.camera.alpha);
    const factor = (this.camera.radius / 1000) * 1.8;
    this.camera.target.x += (-rightDirX * dx - lookDirX * dy) * factor;
    this.camera.target.z += (-rightDirZ * dx - lookDirZ * dy) * factor;
  }

  rotate(deltaAlpha: number, deltaBeta: number): void {
    this.camera.alpha += deltaAlpha;
    const lower = this.camera.lowerBetaLimit ?? 0.05;
    const upper = this.camera.upperBetaLimit ?? 1.45;
    this.camera.beta = Math.max(lower, Math.min(upper, this.camera.beta + deltaBeta));
  }

  zoom(inward: boolean, factor = 1.08): void {
    const current = this.camera.radius;
    const next = inward ? current / factor : current * factor;
    const lower = this.camera.lowerRadiusLimit ?? 16;
    const upper = this.camera.upperRadiusLimit ?? 90;
    this.camera.radius = Math.max(lower, Math.min(upper, next));
  }

  focusOn(x: number, z: number): void {
    this.camera.setTarget(new Vector3(x, 0, z));
    debug('battlefield.focus', { x, z });
  }

  resetCamera(lane?: number): void {
    this.camera.setTarget(new Vector3(lane === undefined ? 0 : laneCenters(this.laneCount)[lane] ?? 0, 0, -3));
    this.camera.radius = lane === undefined ? [0, 42, 48, 56, 64][this.laneCount] ?? 52 : 36;
    this.camera.alpha = Math.PI / 2; this.camera.beta = .66;
    debug('battlefield.camera', { lanes: this.laneCount, lane, radius: this.camera.radius });
  }
  private render(): void {
    const dt = Math.min(.05, this.engine.getDeltaTime() / 1000); this.time += dt;

    let moveX = 0, moveZ = 0;
    const lookDirX = Math.cos(this.camera.alpha);
    const lookDirZ = Math.sin(this.camera.alpha);
    const rightDirX = -Math.sin(this.camera.alpha);
    const rightDirZ = Math.cos(this.camera.alpha);

    // 1. WASD + Phím mũi tên di chuyển khung hình chuẩn Warcraft 3
    if (this.keys.up) { moveX += lookDirX; moveZ += lookDirZ; }
    if (this.keys.down) { moveX -= lookDirX; moveZ -= lookDirZ; }
    if (this.keys.right) { moveX += rightDirX; moveZ += rightDirZ; }
    if (this.keys.left) { moveX -= rightDirX; moveZ -= rightDirZ; }

    // 2. Rê chuột viền màn hình (Edge scrolling) chuẩn Warcraft 3
    if (!this.isInteracting && this.mousePos) {
      const margin = 20;
      let edgeX = 0, edgeZ = 0;
      if (this.mousePos.x <= margin) edgeX -= 1;
      if (this.mousePos.x >= window.innerWidth - margin) edgeX += 1;
      if (this.mousePos.y <= margin) edgeZ += 1;
      if (this.mousePos.y >= window.innerHeight - margin) edgeZ -= 1;

      if (edgeX !== 0 || edgeZ !== 0) {
        moveX += rightDirX * edgeX + lookDirX * edgeZ;
        moveZ += rightDirZ * edgeX + lookDirZ * edgeZ;
      }
    }

    const len = Math.hypot(moveX, moveZ);
    if (len > 0) {
      const speed = Math.max(30, this.camera.radius * 1.5);
      const step = speed * dt / len;
      this.camera.target.x += moveX * step;
      this.camera.target.z += moveZ * step;
    }

    const cameraFacing = this.camera.position.subtract(this.camera.target);
    for (const [id, actor] of this.actors) {
      animateActor(actor, dt, this.time, this.reducedMotion.matches, cameraFacing.x, cameraFacing.z, this.camera.alpha, this.camera.beta);
      if (actor.dying && actor.actionTime <= 0) { actor.dying = false; actor.root.setEnabled(false); }
      if (actor.fireBurning && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markBurning(id, actor.root.position, actor.phase);
      if (actor.stoneShield && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markStatus(id, actor.root.position, 'stoneShield');
      if (actor.status && actor.status !== 'sunder' && actor.status !== 'stoneShield'
        && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markStatus(id, actor.root.position, actor.status);
    }
    for (const [id, ring] of this.rings) if (!this.selected.has(id) || !this.actors.has(id)) { ring.dispose(); this.rings.delete(id); }
    for (const ground of this.groundEffects) if (ground.zone === this.zone) {
      if (ground.kind === 'pangu-rift') this.effects.markPanguRift(ground);
      else this.effects.markGround(`${ground.casterId}:${ground.x}:${ground.z}`, new Vector3(ground.x, 0, ground.z), ground.radius);
    }
    for (const status of this.panguStatuses) {
      const actor = this.actors.get(status.id);
      if (actor?.zone === this.zone && actor.hp > 0 && !actor.dying) this.effects.markPanguStatus(status.id, actor.root.position, status.kind);
    }
    for (const plant of this.summonedPlants) if (plant.zone === this.zone) {
      this.effects.markPlant(plant.id, plant.position);
    }
    for (const link of this.soulLinks) if (link.zone === this.zone) {
      this.effects.markSoulLink(link.key, link.from, link.to);
    }
    for (const id of this.selected) {
      const actor = this.actors.get(id); if (!actor) continue;
      let ring = this.rings.get(id);
      if (!ring) { ring = MeshBuilder.CreateTorus('selection', { diameter: 3.4, thickness: .13, tessellation: 32 }, this.scene); ring.material = this.palette.get('selection', '#f2d58f', .55); ring.isPickable = false; this.rings.set(id, ring); }
      ring.setEnabled(actor.zone === this.zone && actor.hp > 0); ring.position.set(actor.root.position.x, .2, actor.root.position.z);
    }
    this.effects.tick(dt);
    const shake = this.effects.cameraShake(); this.camera.targetScreenOffset.set(shake.x, shake.y);
    this.scene.render();
    if (this.time - this.perfAt >= 10) {
      this.perfAt = this.time;
      debug('battlefield.performance', { fps: Math.round(this.engine.getFps()), meshes: this.scene.meshes.length,
        actors: this.actors.size, width: this.engine.getRenderWidth(), height: this.engine.getRenderHeight() });
    }
    this.frames++;
    const now = performance.now();
    if (now - this.fpsAt >= 5000) {
      debug('battlefield.fps', { fps: Math.round(this.frames * 1000 / (now - this.fpsAt)), actors: this.actors.size,
        lanes: this.laneCount, width: this.engine.getRenderWidth(), height: this.engine.getRenderHeight() });
      this.frames = 0; this.fpsAt = now;
    }
  }
  dispose(): void {
    window.removeEventListener('resize', this.resize); this.unsubscribe();
    this.engine.stopRenderLoop(); this.audio.dispose(); this.clearTerrain(); this.scene.dispose(); this.engine.dispose();
  }
}
