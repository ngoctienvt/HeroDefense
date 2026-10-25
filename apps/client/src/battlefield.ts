import { PANGU_ATTACK_SECONDS, panguAttackDuration } from './pangu-model-motion.js';
import { VisualWarmup } from './visual-warmup.js';
import { attackInterval } from '../../../packages/game-core/src/stats.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { barColorKey, barFaction } from './bar-style.js';
import { energyState } from './hero-status.js';
import { PALETTE } from './ui-palette.js';
import '@babylonjs/core/Culling/ray.js';
import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Scene } from '@babylonjs/core/scene.js';
import type { Enemy, GameEvent, GameState } from '../../../packages/contracts/src/types.js';
import { HERO_BY_ID } from '../../../content/catalog.js';
import { ARENA, clampToZone, laneCenters } from '../../../packages/game-core/src/battlefield-layout.js';
import { debug } from './debug.js';
import { createActor, animateActor, faceActorTowards, type VisualActor } from './visual-actors.js';
import { pushMotionSample, SnapshotClock } from './actor-interpolation.js';
import { preloadMonsterEncounterVisuals, releaseMonsterEncounterVisuals } from './visual-sprites.js';
import { resolveCue } from './audio-cue-routing.js';
import type { SfxSink } from './audio-sfx-player.js';
import { VisualEffects } from './visual-effects.js';
import { hasFireBurn } from './visual-fire.js';
import { isTierSkill } from './visual-tier-skills.js';
import { VisualMaterials } from './visual-materials.js';
import { buildTerrain } from './visual-terrain.js';
import { buildSky, type IslandSky } from './visual-terrain-sky.js';
import { hasStylizedMotion } from './stylized-motion.js';
import { CongcongTracker, replayCongcong } from './battlefield-congcong.js';
import { replayChucdung } from './battlefield-chucdung.js';
import { replayNhuLai } from './battlefield-nhu-lai.js';
import { KimtraTracker, replayKimtra, type KimtraReplayKind } from './battlefield-kimtra.js';
import { MoctraTracker, replayMoctra, type MoctraReplayKind } from './battlefield-moctra.js';
import { replayThietphien, ThietphienTracker, type ThietphienReplayKind } from './battlefield-thietphien.js';
import { BaoquatuTracker, replayBaoquatu } from './battlefield-baoquatu.js';
import { isLadongtanArray, ladongtanArrayId, LadongtanTracker, replayLadongtan } from './battlefield-ladongtan.js';
import { MandonTracker, replayMandon } from './battlefield-mandon.js';
import { ManhbaTracker, replayManhba } from './battlefield-manhba.js';
import { replayVothuong, VothuongTracker } from './battlefield-vothuong.js';
import { NhiepTracker, replayNhieptieuthien } from './battlefield-nhieptieuthien.js';
import { HonghainhiTracker, replayHonghainhi } from './battlefield-honghainhi.js';
import { CulinhTracker, replayCulinh } from './battlefield-culinh.js';
import { installReplay, registerReplay } from './visual-kit-replay.js';
import { truongChainTargets } from './visual-truong-dao-lang-timeline.js';
import { TruongStatusTracker } from './battlefield-truong-dao-lang.js';
import { replayTier12 } from './battlefield-tier12.js';
import { sharedStatuses } from './battlefield-shared-status.js';
import { TIER12_RECIPES } from './visual-kit-recipes-tier12.js';
import { Tier6Snapshot } from './battlefield-tier6-snapshot.js';
import { Tier3Snapshot } from './battlefield-tier3-snapshot.js';
import { Tier4Snapshot } from './battlefield-tier4-snapshot.js';
import { tier4Presentation } from './visual-tier4-recipients.js';
import { isModernTier4Event, isModernTier4Pulse, isTier4SupportRecipient, TIER4_REPLAY_IDS } from './visual-tier4-heroes.js';
import { splitCoinRecipients } from './visual-trieu-cong-minh-targets.js';
import { isModernTier3Event, isModernTier3Pulse, isTier3SupportRecipient, TIER3_REPLAY_IDS } from './visual-tier3-heroes.js';
import { FUXI } from '../../../content/fuxi-design.js';
import { REMAINING_TIER6_IDS } from './visual-tier6-replay.js';
import { isEnemySkillEvent } from './visual-enemy-skill-routing.js';

export class Battlefield {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;
  private actors = new Map<string, VisualActor>();
  /** Snapshot jumps snapped instead of interpolated since the last `visual.interp` log. */
  private interpolationSnaps = 0;
  private interpolationLoggedAt = 0;
  private sampledTick = -1;
  private palette: VisualMaterials;
  private effects: VisualEffects;
  private warmup: VisualWarmup;
  /** Server-timeline stamps for snapshot interpolation (robust to bursty arrival over VPN/Wi-Fi). */
  private snapshotClock = new SnapshotClock();
  private jitterLoggedAt = 0;
  /** Session-wide SFX player owned by main.ts; the battlefield only reports confirmed events to it. */
  private sfx?: SfxSink;
  private selfId = '';
  private rings = new Map<string, ReturnType<typeof MeshBuilder.CreateTorus>>();
  private zone = 0;
  private eventId = 0;
  private hasSnapshot = false;
  private combatResetEventId?: number;
  private selected = new Set<string>();
  private groundEffects: NonNullable<GameState['groundEffects']> = [];
  private tier6 = new Tier6Snapshot();
  private tier3 = new Tier3Snapshot();
  private tier4 = new Tier4Snapshot();
  private summonedPlants: { id: string; position: Vector3; zone: number }[] = [];
  private soulLinks: { key: string; from: Vector3; to: Vector3; zone: number }[] = [];
  private panguStatuses: { id: string; kind: 'armor-break' | 'attack-up' | 'armor-pierce-up' | 'critical-up' | 'haste' }[] = [];
  private truongStatus = new TruongStatusTracker();
  private congcong = new CongcongTracker();
  private kimtra = new KimtraTracker();
  private moctra = new MoctraTracker();
  private thietphien = new ThietphienTracker();
  private baoquatu = new BaoquatuTracker();
  private ladongtan = new LadongtanTracker();
  private mandon = new MandonTracker();
  private manhba = new ManhbaTracker();
  private vothuong = new VothuongTracker();
  private nhiep = new NhiepTracker();
  private honghainhi = new HonghainhiTracker();
  private culinh = new CulinhTracker();
  private laneCount = 0;
  private clearTerrain: () => void;
  private terrainZone = 0;
  private sky: IslandSky;
  private time = 0;
  private perfAt = 0;
  private frames = 0;
  private fpsAt = performance.now();
  private reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  private keys = { up: false, down: false, left: false, right: false };
  private mousePos: { x: number; y: number } | null = null;
  private isInteracting = false;
  private disposed = false;
  private unsubscribe: () => void;
  private resize = () => this.engine.resize();
  onSelect: (id: string, append: boolean) => void = () => {};
  onAreaSelect: (ids: string[], append: boolean) => void = () => {};
  onOrder: (target: string | null, x: number, z: number) => void = () => {};
  /** Pointer over a living hero or enemy on the current island (null when it leaves); client coordinates for the tooltip. */
  onHover: (id: string | null, x: number, y: number) => void = () => {};
  private hovered: string | null = null;
  private hoverRing: ReturnType<typeof MeshBuilder.CreateTorus> | null = null;
  cancelDrag: () => void = () => {};

  constructor(private canvas: HTMLCanvasElement) {
    this.engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    this.engine.setHardwareScalingLevel(Math.max(1, devicePixelRatio / 1.5));
    this.scene = new Scene(this.engine);
    this.sky = buildSky(this.scene);
    this.camera = new ArcRotateCamera('camera', Math.PI / 2, 0.84, 30, new Vector3(0, 0, 2), this.scene);
    this.camera.inputs.clear();
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = 0.84;
    this.camera.lowerBetaLimit = 0.55;
    this.camera.upperBetaLimit = 1.15;
    this.camera.lowerAlphaLimit = Math.PI / 6;
    this.camera.upperAlphaLimit = 5 * Math.PI / 6;
    this.camera.lowerRadiusLimit = 16;
    this.camera.upperRadiusLimit = 75;
    const light = new HemisphericLight('sky', new Vector3(-.4, 1, -.3), this.scene);
    light.intensity = 1.45; light.diffuse = new Color3(1, .97, .9); light.groundColor = new Color3(.34, .26, .28);
    this.palette = new VisualMaterials(this.scene);
    this.clearTerrain = buildTerrain(this.scene, this.palette, 1, 0);
    this.laneCount = 1;
    this.effects = new VisualEffects(this.scene, this.palette);
    this.warmup = new VisualWarmup(this.scene, this.palette, this.effects);
    const marquee = document.createElement('div'); marquee.className = 'selection-marquee'; marquee.hidden = true; document.body.append(marquee);
    let start: { x: number; y: number; append: boolean } | null = null;
    let ctrlPanDrag: { x: number; y: number } | null = null;
    let altRotateDrag: { x: number; y: number } | null = null;
    let middleDrag: { x: number; y: number } | null = null;

    const pickAt = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      // Only actor bodies count: VFX planes, bars and terrain under the cursor must not turn an attack into a move.
      return this.scene.pick((event.clientX - rect.left) * this.engine.getRenderWidth() / rect.width,
        (event.clientY - rect.top) * this.engine.getRenderHeight() / rect.height,
        mesh => mesh.isPickable && mesh.isEnabled() && typeof mesh.metadata?.actorId === 'string');
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
        } else if (event.altKey) {
          altRotateDrag = { x: event.clientX, y: event.clientY };
        } else {
          start = { x: event.clientX, y: event.clientY, append: event.shiftKey };
        }
      } else if (event.button === 1) {
        event.preventDefault();
        middleDrag = { x: event.clientX, y: event.clientY };
      } else if (event.button === 2) {
        event.preventDefault();
        const pick = pickAt(event), point = groundAt(event) ?? pick?.pickedPoint ?? null;
        // A click just beside a monster's sprite still means "attack it", never "walk onto it".
        const id = (pick?.pickedMesh?.metadata?.actorId as string | undefined)
          ?? (point ? this.monsterNear(point.x, point.z) : undefined);
        if (id && !pick?.pickedMesh) debug('battlefield.order-snap', { zone: this.zone, target: id });
        if (point) {
          // Clicks on cliffs, clouds or sky walk to the nearest edge instead of failing on the server.
          const inside = clampToZone(this.zone, { x: point.x, z: point.z });
          if (inside.x !== point.x || inside.z !== point.z) {
            debug('battlefield.click-clamped', { zone: this.zone, from: { x: point.x, z: point.z }, to: inside });
            point.x = inside.x; point.z = inside.z;
          }
        }
        if (point) this.onOrder(id && (this.actors.get(id)?.summonKind === 'buddha-clone'
          || this.actors.get(id)?.summonKind === 'ancient-tree'
          || this.actors.get(id)?.summonKind === 'blood-warrior'
          || this.actors.get(id)?.summonKind === 'blood-general') ? null : id ?? null, point.x, point.z);
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
      if (altRotateDrag) {
        const dx = event.clientX - altRotateDrag.x;
        const dy = event.clientY - altRotateDrag.y;
        altRotateDrag.x = event.clientX;
        altRotateDrag.y = event.clientY;
        this.rotate(-dx * 0.005, dy * 0.005);
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
      if (!start) { hoverAt(event); return; }
      const x = Math.min(start.x, event.clientX), y = Math.min(start.y, event.clientY), width = Math.abs(event.clientX - start.x), height = Math.abs(event.clientY - start.y);
      marquee.hidden = width < 6 && height < 6;
      Object.assign(marquee.style, { left: `${x}px`, top: `${y}px`, width: `${width}px`, height: `${height}px` });
    };

    // Hover picking is throttled (~16 picks/s) and skips summons, the dead and other islands.
    let hoverPickAt = 0;
    const hoverAt = (event: PointerEvent) => {
      const now = performance.now();
      if (now - hoverPickAt >= 60) {
        hoverPickAt = now;
        const id = pickAt(event)?.pickedMesh?.metadata?.actorId as string | undefined;
        const actor = id ? this.actors.get(id) : undefined;
        const next = id && actor && !actor.summonKind && !actor.dying && actor.hp > 0 && actor.zone === this.zone ? id : null;
        if (next !== this.hovered) {
          this.hovered = next;
          canvas.classList.toggle('hover-enemy', !!next && !actor?.heroId);
          canvas.classList.toggle('hover-ally', !!next && !!actor?.heroId);
          if (!next) this.onHover(null, event.clientX, event.clientY);
        }
      }
      if (this.hovered) this.onHover(this.hovered, event.clientX, event.clientY);
    };
    const leave = (event: PointerEvent) => {
      if (!this.hovered) return;
      this.hovered = null;
      canvas.classList.remove('hover-enemy', 'hover-ally');
      this.onHover(null, event.clientX, event.clientY);
    };

    const up = (event: PointerEvent) => {
      this.isInteracting = false;
      try { canvas.releasePointerCapture(event.pointerId); } catch {}
      if (event.button === 0) {
        ctrlPanDrag = null;
        altRotateDrag = null;
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
            if (id && this.actors.get(id)?.summonKind !== 'buddha-clone'
              && this.actors.get(id)?.summonKind !== 'ancient-tree'
              && this.actors.get(id)?.summonKind !== 'blood-warrior'
              && this.actors.get(id)?.summonKind !== 'blood-general') this.onSelect(id, start.append);
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
      altRotateDrag = null;
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
    canvas.addEventListener('pointerleave', leave);
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
      canvas.removeEventListener('pointerleave', leave);
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
      removeReplay();
      unregisterCongcongReplay();
      unregisterTruongReplay();
      unregisterHienvienReplay();
      unregisterHauNgheReplay();
      unregisterLucnhiReplay();
      unregisterDouzhanReplay();
      unregisterNhienDangReplay();
      unregisterKimsiReplay();
      unregisterKhuongtuReplay();
      unregisterTayvuongmauReplay();
      unregisterXingtianReplay();
      unregisterHangngaReplay();
      unregisterThaibachReplay();
      unregisterKimthienReplay();
      unregisterBodhiReplay();
      unregisterNhuLaiReplay();
      unregisterPanguReplay();
      unregisterPhoenixReplay();
      unregisterLongVuongReplay();
      for (const unregister of unregisterTier3Replays) unregister();
      for (const unregister of unregisterTier4Replays) unregister();
      unregisterChucdungReplay();
      unregisterKimtraReplay();
      unregisterMoctraReplay();
      unregisterThietphienReplay();
      unregisterBaoquatuReplay();
      unregisterLadongtanReplay();
      unregisterMandonReplay();
      unregisterManhbaReplay();
      unregisterVothuongReplay();
      unregisterNhiepReplay();
      unregisterHonghainhiReplay();
      unregisterCulinhReplay();
      for (const unregister of unregisterTier12Replays) unregister();
      for (const unregister of unregisterRemainingTier6) unregister();
    };
    // ?debug=1: `__vfxReplay('h01G')` replays Cộng Công's ultimate VFX locally; `('h01G', 'cleave', x, z)` one basic swing, `('h01G', 'cage')` the ice cage.
    const unregisterCongcongReplay = registerReplay('h01G', (kind, x, z) => {
      if (kind !== undefined && kind !== 'ultimate' && kind !== 'cleave' && kind !== 'cage') return false;
      return replayCongcong(this.actors, this.zone, this.effects, this.congcong, (fx, fz) => this.focusOn(fx, fz),
        { kind, direction: x === undefined || z === undefined ? undefined : { x, z } });
    });
    const unregisterTruongReplay = registerReplay('h040', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h040' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.clone() : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayTruong(kind ?? 'skill', at);
    });
    // ?debug=1: `__vfxReplay('h01F')` Hiên Viên's giant sword + 5 s Cửu Đỉnh zone + 15 rain pulses + blessing;
    // kinds `lobby` (impact without cast/zone), `attack` (five-sword fan), `blessing`; optional x, z = locked point.
    const unregisterHienvienReplay = registerReplay('h01F', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h01F' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      if (kind === 'attack' || kind === 'blessing') at.copyFrom(actor.root.position);
      this.focusOn(at.x, at.z);
      return this.effects.replayHienvien(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h03W')` Nhiên Đăng's windup, three shield pearls, 5.5 s pearl cage, a reflect and a basic hit; kinds
    // `lobby` (ability without cast), `reflect` (one reflect burst), `attack` (basic flame); optional x, z = the hit point.
    const unregisterNhienDangReplay = registerReplay('h03W', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h03W' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -4)) : new Vector3(x, 0, z);
      this.focusOn(actor.root.position.x, actor.root.position.z);
      return this.effects.replayNhienDang(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h03Y')` Lục Nhĩ's lock boundary + vanish + six pulses + return + weakness seals; kinds `attack`
    // (basic cudgel), `exposed` (seals only); optional x, z = locked point.
    const unregisterLucnhiReplay = registerReplay('h03Y', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h03Y' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      if (kind === 'attack') at.copyFrom(actor.root.position.add(new Vector3(0, 0, -6)));
      this.focusOn(at.x, at.z);
      return this.effects.replayLucnhi(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h017')` Hậu Nghệ's windup + arrow + R6.5 blast; kinds `lobby` (ability without cast or
    // origin), `attack` (basic pierce arrow); optional x, z = locked point.
    const unregisterHauNgheReplay = registerReplay('h017', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h017' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -9)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayHauNghe(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h012')` Đấu Chiến's staff windup, slam, lane fracture and three clones; kinds `lobby`
    // (ability + summon without a cast), `clone` (three clone strikes); optional x, z = a point on the lane. Clones share
    // the hero id, so the caster is the non-clone unit.
    const unregisterDouzhanReplay = registerReplay('h012', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h012' && a.summonKind !== 'buddha-clone'
        && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -8)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayDouzhan(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h016')` Kim Sí's gather + R6.5 storm + one wave of cuts; kinds `lobby` (resolve without
    // cast), `attack` (double strike), `berserk` (5.5 s feather bands + 3 s bleed scars, then the fold); focus = the caster.
    const unregisterKimsiReplay = registerReplay('h016', kind => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h016' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      this.focusOn(actor.root.position.x, actor.root.position.z);
      return this.effects.replayKimsi(kind ?? 'skill', actor.root.position.clone(), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h019')` Khương Tử Nha's scroll + seal over the locked point with the eight bolts and the 5 s
    // zone; kinds `lobby` (resolve without cast or marker), `attack` (five-link chain), `bolt` (one strike); optional x, z = locked point.
    const unregisterKhuongtuReplay = registerReplay('h019', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h019' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayKhuongtu(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h01A')` Tây Vương Mẫu's pin crown + rain over the locked point; kinds `lobby` (ability
    // without cast or origin), `attack` (basic five-pin volley), `peach` (three peaches + 5 s blessing); optional x, z = locked point.
    // ?debug=1: `__vfxReplay('h011')` Hình Thiên's windup + R6 vortex + 5 s shell with a fire wave every 0.47 s, centred on
    // him; kinds `lobby` (ability without cast), `wave` (one wave, three monsters in the lane), `shell` (shell only).
    const unregisterXingtianReplay = registerReplay('h011', (kind) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h011' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      this.focusOn(actor.root.position.x, actor.root.position.z);
      return this.effects.replayXingtian(kind ?? 'skill', actor.root.position.clone());
    });
    const unregisterTayvuongmauReplay = registerReplay('h01A', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h01A' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayTayvuongmau(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h018')` Hằng Nga's moon + silk heal with the 4 s shield wrap and the zone freeze; kinds `lobby`
    // (ability without cast), `attack` (basic silk), `shield` (wrap only), `freeze` (silk drop on six monsters); x, z = field point.
    const unregisterHangngaReplay = registerReplay('h018', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h018' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayHangnga(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h03X')` Bồ Đề's canopy + two links + blessings + 5 s leaf pair; kinds `lobby` (no cast/origin),
    // `attack` (basic whisk), `blessing` (blessings, marker and double-hit accents only); optional x, z = accent target point.
    const unregisterBodhiReplay = registerReplay('h03X', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h03X' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -6)) : new Vector3(x, 0, z);
      this.focusOn(actor.root.position.x, actor.root.position.z);
      return this.effects.replayBodhi(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h013')` Kim Thiền's windup + bowl for 5 s + fold; kinds `lobby` (ability never confirmed by a
    // ground effect), `late` (ground markers only, 2.5 s left), `attack` (basic contact ring); optional x, z = locked point.
    const unregisterKimthienReplay = registerReplay('h013', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h013' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const at = x === undefined || z === undefined ? actor.root.position.add(new Vector3(0, 0, -7)) : new Vector3(x, 0, z);
      this.focusOn(at.x, at.z);
      return this.effects.replayKimthien(kind ?? 'skill', new Vector3(at.x, 0, at.z), actor.root.position.clone());
    });
    // ?debug=1: `__vfxReplay('h015')` Thái Bạch's star gather + guidance ribbon to one ally; kinds `revive`, `guard`
    // (passive, no cast), `idle` (cast with no resolve), `lobby` (ability without cast or origin).
    const unregisterThaibachReplay = registerReplay('h015', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h015' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      this.focusOn(actor.root.position.x, actor.root.position.z);
      return this.effects.replayThaibach(kind ?? 'skill', new Vector3(x ?? actor.root.position.x, 0, z ?? actor.root.position.z), actor.root.position.clone());
    });
    const unregisterNhuLaiReplay = registerReplay('h01J', (kind, x, z) =>
      replayNhuLai(this.actors, this.zone, this.effects, (fx, fz) => this.focusOn(fx, fz), this.camera.target, kind, x, z));
    // ?debug=1: `__vfxReplay('h01B')` Bàn Cổ's ultimate (windup, strike, cataclysm cracks, 5 s rift); `('h01B','rift')` the fissure only; x,z = locked point.
    const unregisterPanguReplay = registerReplay('h01B', (kind, x, z) => {
      const actor = [...this.actors.values()].find(a => a.heroId === 'h01B' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const caster = actor.root.position.clone();
      const point = x === undefined || z === undefined ? new Vector3(caster.x + 9, 0, caster.z) : new Vector3(x, 0, z);
      this.focusOn((caster.x + point.x) / 2, (caster.z + point.z) / 2);
      return this.effects.replayPangu(kind ?? 'ultimate', caster, point);
    });
    const unregisterChucdungReplay = registerReplay('h01H', (kind, x, z) => {
      if (kind !== undefined && kind !== 'ultimate' && kind !== 'trait' && kind !== 'burst') return false;
      return replayChucdung(this.actors, this.zone, this.effects, (fx, fz) => this.focusOn(fx, fz),
        { kind, point: x === undefined || z === undefined ? undefined : { x, z } });
    });
    // ?debug=1: `__vfxReplay('h009')` Kim Tra's bell; `('h009', 'trait'|'crit', x, z)` one sword arc, `('h009', 'reflect')` the counter ring-out.
    const unregisterKimtraReplay = registerReplay('h009', (kind, x, z) => {
      if (kind !== undefined && kind !== 'skill' && kind !== 'trait' && kind !== 'crit' && kind !== 'reflect') return false;
      return replayKimtra(this.actors, this.zone, this.effects, this.kimtra, (fx, fz) => this.focusOn(fx, fz),
        { kind: kind as KimtraReplayKind | undefined, point: x === undefined || z === undefined ? undefined : { x, z } });
    });
    // ?debug=1: `__vfxReplay('h00B')` Thiết Phiến's windup + sandstorm aimed at the far enemy (circle); `('h00B', 'near')` aimed at a near one (cone); `('h00B', 'skill', x, z)` aims at a point.
    const unregisterThietphienReplay = registerReplay('h00B', (kind, x, z) => {
      if (kind !== undefined && kind !== 'skill' && kind !== 'near') return false;
      return replayThietphien(this.actors, this.zone, this.effects, this.thietphien, (fx, fz) => this.focusOn(fx, fz),
        { kind: kind as ThietphienReplayKind | undefined, point: x === undefined || z === undefined ? undefined : { x, z } });
    });
    // ?debug=1: `__vfxReplay('h00A')` Mộc Tra's awakening + 5 s frenzy with vine shots; `('h00A', 'vine', x, z)` one pair of shots.
    const unregisterMoctraReplay = registerReplay('h00A', (kind, x, z) => {
      if (kind !== undefined && kind !== 'skill' && kind !== 'vine') return false;
      return replayMoctra(this.actors, this.zone, this.effects, this.moctra, (fx, fz) => this.focusOn(fx, fz),
        { kind: kind as MoctraReplayKind | undefined, point: x === undefined || z === undefined ? undefined : { x, z } });
    });
    // ?debug=1: `__vfxReplay('h00D')` Lã Động Tân's falling sword on the nearest monster, shock wave and 3 s sword array.
    const unregisterLadongtanReplay = registerReplay('h00D', kind => (kind === undefined || kind === 'skill')
      && replayLadongtan(this.actors, this.zone, this.effects, this.ladongtan, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h00F')` Mẫu Đơn's windup, peony bloom, petal streams to up to 4 allies and 4.5 s haste rings.
    // ?debug=1: `__vfxReplay('h00H')` Vô Thường's snipe that kills (windup → chain → cut → soul flies back); `('h00H', 'hit')` a survivor.
    const unregisterVothuongReplay = registerReplay('h00H', kind => (kind === undefined || kind === 'skill' || kind === 'hit')
      && replayVothuong(this.actors, this.zone, this.effects, this.vothuong, kind === 'hit' ? 'hit' : 'skill', (fx, fz) => this.focusOn(fx, fz)));
    const unregisterMandonReplay = registerReplay('h00F', kind => (kind === undefined || kind === 'skill')
      && replayMandon(this.actors, this.zone, this.effects, this.mandon, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h00I')` Mạnh Bà's windup, pour, strand fan, soul ropes to up to 4 monsters in chain order and the 4 s Đồng Mệnh bond.
    const unregisterManhbaReplay = registerReplay('h00I', kind => (kind === undefined || kind === 'skill')
      && replayManhba(this.actors, this.zone, this.effects, this.manhba, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h03O')` Nhiếp Tiểu Thiến's windup, music wreath, note ribbons to up to 3 allies and 5 s frost shells.
    const unregisterNhiepReplay = registerReplay('h03O', kind => (kind === undefined || kind === 'skill')
      && replayNhieptieuthien(this.actors, this.zone, this.effects, this.nhiep, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h00C')` Hồng Hài Nhi's windup, 360 degree fire-spear sweep, scorched ring and 4 s flame columns on enemies within 4.2.
    const unregisterHonghainhiReplay = registerReplay('h00C', kind => (kind === undefined || kind === 'skill')
      && replayHonghainhi(this.actors, this.zone, this.effects, this.honghainhi, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h00E')` Cự Linh's hammer slam, iron wall ring and 4.5 s bulwark rings on him and nearby allies.
    const unregisterCulinhReplay = registerReplay('h00E', kind => (kind === undefined || kind === 'skill')
      && replayCulinh(this.actors, this.zone, this.effects, this.culinh, (fx, fz) => this.focusOn(fx, fz)));
    // ?debug=1: `__vfxReplay('h001')` plain attack of a tier 1–2 recipe hero; `('h001', 'special')` its crit/bounce/burst/quake events.
    const unregisterTier12Replays = TIER12_RECIPES.map(recipe => registerReplay(recipe.heroId, (kind, x, z) =>
      (kind === undefined || kind === 'trait' || kind === 'special' || kind === 'skill')
        && replayTier12(recipe.heroId, this.actors, this.zone, this.effects, (fx, fz) => this.focusOn(fx, fz),
          { kind, point: x === undefined || z === undefined ? undefined : { x, z } })));
    // ?debug=1: `__vfxReplay('h03P')` Bảo Quả Tử's seed blast, plant and mist; `('h03P', 'skill', x, z)` blasts that point. Registered after the tier recipes so it wins.
    const unregisterBaoquatuReplay = registerReplay('h03P', (kind, x, z) => {
      if (kind !== undefined && kind !== 'skill') return false;
      return replayBaoquatu(this.actors, this.zone, this.effects, this.baoquatu, (fx, fz) => this.focusOn(fx, fz),
        { point: x === undefined || z === undefined ? undefined : { x, z } });
    });
    const unregisterTier3Replays = TIER3_REPLAY_IDS.map(heroId => registerReplay(heroId, (kind, x, z) => {
      if ((x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z))) return false;
      const actor = [...this.actors.values()].find(a => a.heroId === heroId && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const origin = actor.root.position.clone();
      const right = this.camera.getDirection(Vector3.Right());
      const direction = new Vector3(right.x, 0, right.z);
      const at = x !== undefined && z !== undefined ? new Vector3(x, 0, z)
        : direction.lengthSquared() > .001 ? origin.add(direction.normalize().scale(7)) : origin.clone();
      this.focusOn((origin.x + at.x) / 2, (origin.z + at.z) / 2);
      return this.effects.replayTier3(heroId, kind ?? 'ultimate', origin, at);
    }));
    const unregisterTier4Replays = TIER4_REPLAY_IDS.map(heroId => registerReplay(heroId, (kind, x, z) => {
      if ((x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z))) return false;
      const actor = [...this.actors.values()].find(a => a.heroId === heroId && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const origin = actor.root.position.clone(), right = this.camera.getDirection(Vector3.Right());
      const dir = new Vector3(right.x, 0, right.z);
      const at = x !== undefined && z !== undefined ? new Vector3(x, 0, z)
        : dir.lengthSquared() > .001 ? origin.add(dir.normalize().scale(7)) : origin.clone();
      this.focusOn((origin.x + at.x) / 2, (origin.z + at.z) / 2);
      return this.effects.replayTier4(heroId, kind ?? 'ultimate', origin, at);
    }));
    const unregisterLongVuongReplay = registerReplay('h00Q', (kind, x, z) => {
      if (kind !== undefined && kind !== 'ultimate' && kind !== 'skill') return false;
      if ((x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z))) return false;
      const actor = [...this.actors.values()].find(a => a.heroId === 'h00Q' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!actor) return false;
      const origin = actor.root.position.clone();
      // Replay defaults toward camera-right; the production path only uses server direction.
      const right = this.scene.activeCamera?.getDirection(Vector3.Right());
      const direction = right ? new Vector3(right.x, 0, right.z).normalize() : undefined;
      if ((x === undefined || z === undefined) && (!direction || direction.lengthSquared() < .01)) return false;
      const at = x !== undefined && z !== undefined ? new Vector3(x, 0, z) : direction ? origin.add(direction.scale(8)) : undefined;
      if (!at) return false;
      this.focusOn((origin.x + at.x) / 2, (origin.z + at.z) / 2);
      return this.effects.replayLongVuong(origin, at);
    });
    const unregisterPhoenixReplay = registerReplay('h041', (kind, x, z) => {
      if (kind !== undefined && !['ultimate', 'lobby', 'ground', 'rebirth'].includes(kind)) return false;
      if ((x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z))) return false;
      const entry = [...this.actors.entries()].find(([, a]) => a.heroId === 'h041' && a.zone === this.zone && a.hp > 0 && !a.dying);
      if (!entry) return false;
      const [actorId, actor] = entry;
      const caster = actor.root.position.clone();
      const point = kind === 'rebirth' ? caster.clone()
        : x !== undefined && z !== undefined ? new Vector3(x, 0, z) : caster.add(new Vector3(6, 0, 0));
      this.focusOn((caster.x + point.x) / 2, (caster.z + point.z) / 2);
      return this.effects.replayPhoenix(kind ?? 'ultimate', caster, point, actorId);
    });
    const unregisterRemainingTier6 = REMAINING_TIER6_IDS.map(heroId => registerReplay(heroId, (kind, x, z) => {
      const entry = [...this.actors.values()].find(actor => actor.heroId === heroId && actor.zone === this.zone && actor.hp > 0 && !actor.dying);
      if (!entry || (x !== undefined && !Number.isFinite(x)) || (z !== undefined && !Number.isFinite(z))) return false;
      const caster = entry.root.position.clone();
      const point = x !== undefined && z !== undefined ? new Vector3(x, 0, z) : caster.add(new Vector3(4, 0, 1));
      this.focusOn((caster.x + point.x) / 2, (caster.z + point.z) / 2);
      return this.effects.replayTier6(heroId, kind ?? 'ultimate', caster, point);
    }));
    const removeReplay = installReplay(window);
    window.addEventListener('resize', this.resize); this.engine.runRenderLoop(() => this.render());
    debug('battlefield.created', { style: 'floating-island', effectsCap: 64 });
  }

  setSfx(sink: SfxSink): void { this.sfx = sink; }

  update(state: GameState, selfId: string, selected: string[]): void {
    this.selfId = selfId;
    this.syncCombatReset(state);
    this.warmup.update(state, selfId);
    this.tier6.update(state);
    this.tier3.update(state);
    this.tier4.update(state);
    this.selected = new Set(selected);
    this.groundEffects = state.groundEffects ?? [];
    this.panguStatuses = [];
    this.vothuong.refresh(Object.values(state.enemies), Object.values(state.units), this.zone);
    for (const enemy of Object.values(state.enemies)) {
      if (enemy.sunder && enemy.sunder.remaining > 0 && !this.truongStatus.active('sunder',enemy.id,enemy.sunder.remaining))
        this.panguStatuses.push({ id: enemy.id, kind: 'armor-break' });
    }
    for (const unit of Object.values(state.units)) if (unit.empower && unit.empower.remaining > 0) {
      if (unit.empower.attackBonus > 0) this.panguStatuses.push({ id: unit.id, kind: 'attack-up' });
      if (unit.empower.armorPierce > 0) this.panguStatuses.push({ id: unit.id, kind: 'armor-pierce-up' });
    }
    // Hiên Viên's imperial blessing (critBlessing, only h01F grants it) carries +crit and +attack speed for 6 s.
    for (const unit of Object.values(state.units)) if ((unit.critBlessing?.remaining ?? 0) > 0) {
      if ((unit.critBlessing?.chance ?? 0) > 0) this.panguStatuses.push({ id: unit.id, kind: 'critical-up' });
    }
    this.summonedPlants = Object.values(state.units).filter(unit => unit.heroId === 'summon_plant' && unit.hp > 0)
      .map(unit => ({ id: unit.id, position: new Vector3(unit.x, 0, unit.z), zone: unit.zone }));
    this.soulLinks = [];
    const linkedGroups = new Set<string>();
    for (const enemy of Object.values(state.enemies)) {
      if (!enemy.soulLink || enemy.soulLink.remaining <= 0) continue;
      if (this.tier3.ownsLink(enemy.id) || this.tier4.ownsLink(enemy.id)) continue;
      if (enemy.soulLink.sharePercent === FUXI.skillLinkShare) continue;
      if (this.manhba.owns(enemy.soulLink.group)) continue; // Mạnh Bà's ropes and rings draw her Đồng Mệnh
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
    if (count !== this.laneCount) { this.laneCount = count; this.rebuildTerrain(); this.resetCamera(); }
    const present = new Set<string>();
    const receivedAt = performance.now() / 1000;
    // Session views also refresh on UI-only changes; sample motion once per server tick.
    const freshSnapshot = state.tick !== this.sampledTick;
    this.sampledTick = state.tick;
    const sampleAt = freshSnapshot ? this.snapshotClock.stamp(receivedAt, state.elapsed, state.speed) : receivedAt;
    if (freshSnapshot && this.snapshotClock.extraDelay > .05 && receivedAt - this.jitterLoggedAt > 10) {
      debug('visual.interp-jitter', { extraDelayMs: Math.round(this.snapshotClock.extraDelay * 1000) });
      this.jitterLoggedAt = receivedAt;
    }
    if (this.interpolationSnaps && receivedAt - this.interpolationLoggedAt > 10) {
      debug('visual.interp', { teleports: this.interpolationSnaps, zone: this.zone });
      this.interpolationSnaps = 0; this.interpolationLoggedAt = receivedAt;
    }
    for (const entity of [...Object.values(state.units).filter(unit => unit.slot >= 0 || unit.summonKind === 'buddha-clone'
      || unit.summonKind === 'ancient-tree' || unit.summonKind === 'blood-warrior'
      || unit.summonKind === 'blood-general'), ...Object.values(state.enemies)]) {
      present.add(entity.id);
      let actor = this.actors.get(entity.id);
      if (!actor) {
        actor = createActor(this.scene, this.palette, entity, state.players[entity.owner]?.color,
          Math.max(0, Object.keys(state.players).indexOf(entity.owner)), entity.zone === this.zone, state.wave);
        this.actors.set(entity.id, actor);
      }
      actor.target.set(entity.x, 0, entity.z); actor.hp = entity.hp; actor.zone = entity.zone;
      if ('heroId' in entity && entity.heroId === 'h01B' && actor.model) {
        actor.modelAttackDuration = panguAttackDuration(attackInterval(state, entity), state.speed);
        actor.modelMotionSpeed = state.speed;
      }
      if (actor.zone === this.zone) actor.model?.activate();
      if (freshSnapshot && actor.track && pushMotionSample(actor.track, sampleAt, entity.x, entity.z)) this.interpolationSnaps++;
      if (actor.zone === this.zone && actor.sprite && 'activate' in actor.sprite
          && typeof actor.sprite.activate === 'function') actor.sprite.activate();
      actor.summonKind = 'summonKind' in entity ? entity.summonKind : undefined;
      actor.nuwaShielded = 'heroId' in entity
        && (entity.nuwaShields?.some(shield => shield.remaining > 0 && shield.amount > 0) ?? false);
      actor.nuwaWard = 'heroId' in entity && entity.ward?.kind === 'five-color' ? Math.max(0, entity.ward.remaining) : 0;
      actor.hienvienBlessed = 'heroId' in entity && (entity.critBlessing?.remaining ?? 0) > 0;
      actor.starHaste = 'heroId' in entity && (entity.haste?.remaining ?? 0) > 0 && (entity.haste?.amount ?? 0) > 0;
      actor.starImmortal = 'heroId' in entity && (entity.divineImmortal ?? 0) > 0;
      actor.thunderBlessed = 'heroId' in entity && (entity.thunderBlessing?.remaining ?? 0) > 0;
      actor.truongFrozen = !('heroId' in entity)
        && (this.truongStatus.active('frozen', entity.id, entity.frozen ?? 0)
          || ((entity.frozen ?? 0) > 0 && (state.groundEffects ?? []).some(ground => ground.kind === 'beidou' && ground.remaining > 0
            && ground.zone === entity.zone && Math.hypot(entity.x-ground.x,entity.z-ground.z) <= ground.radius)));
      actor.truongSunder = !('heroId' in entity) && this.truongStatus.active('sunder', entity.id, entity.sunder?.remaining ?? 0);
      actor.stoneShield = !('heroId' in entity) && entity.monsterId === 'b001' && (entity.shield ?? 0) > 0;
      actor.blackWaterShield = 'heroId' in entity && entity.ward?.kind === 'black-water'
        && entity.ward.remaining > 0;
      actor.kimtraBell = 'heroId' in entity && this.kimtra.bell(entity.id, entity.shield);
      actor.moctraFrenzy = 'heroId' in entity && this.moctra.frenzy(entity.id, entity);
      actor.culinhBulwark = 'heroId' in entity && this.culinh.ward(entity.id, entity);
      actor.culinhShield = 'heroId' in entity ? entity.shield : undefined;
      actor.culinhSlowed = !('heroId' in entity) && this.culinh.slowed(entity.id);
      actor.moctraPoison = !('heroId' in entity)
        && this.moctra.poisoned(entity.id, entity, entity.poison ? state.units[entity.poison.casterId]?.heroId : undefined);
      actor.thietphienEmber = !('heroId' in entity)
        ? this.thietphien.ember(entity.id, entity, entity.burn ? state.units[entity.burn.casterId]?.heroId : undefined) : undefined;
      actor.mandonHaste = 'heroId' in entity && this.mandon.haste(entity.id, entity);
      actor.manhbaBond = !('heroId' in entity) && this.manhba.bond(entity.id, entity);
      actor.nhiepShield = 'heroId' in entity && this.nhiep.shield(entity.id, entity);
      actor.honghainhiBurn = !('heroId' in entity)
        && this.honghainhi.burning(entity.id, entity, entity.burn ? state.units[entity.burn.casterId]?.heroId : undefined);
      actor.lanternShielded = 'heroId' in entity && (entity.lanternShield?.remaining ?? 0) > 0
        && (entity.lanternShield?.amount ?? 0) > 0;
      actor.buddhaShielded = 'heroId' in entity && (entity.divineShield?.remaining ?? 0) > 0
        && (entity.divineShield?.amount ?? 0) > 0;
      actor.bodhiBlessed = 'heroId' in entity && (entity.bodhiBlessing?.remaining ?? 0) > 0;
      actor.bodhiRemaining = 'heroId' in entity ? entity.bodhiBlessing?.remaining ?? 0 : 0;
      actor.primordialBlessed = 'heroId' in entity && (entity.primordialBlessing?.remaining ?? 0) > 0;
      actor.primordialMarked = !('heroId' in entity) && (entity.primordialMark?.remaining ?? 0) > 0;
      actor.peachBlessed = 'heroId' in entity && entity.empower?.kind === 'peach'
        && entity.empower.remaining > 0;
      actor.enraged = !('heroId' in entity) ? entity.enraged : undefined;
      actor.xingtianBerserk = 'heroId' in entity && entity.heroId === 'h011'
        ? entity.berserk?.remaining
        : (!('heroId' in entity) && entity.kit === 'hinh-thien' && entity.enraged ? 1.5 : undefined);
      actor.shadowAssault = 'heroId' in entity && entity.heroId === 'h03Y'
        && (entity.shadowAssault?.remaining ?? 0) > 0;
      actor.phoenixEgg = 'heroId' in entity && entity.heroId === 'h041'
        && (entity.phoenixEgg?.remaining ?? 0) > 0;
      actor.exposed = !('heroId' in entity) && (entity.critVulnerability?.remaining ?? 0) > 0;
      actor.fireBurning = !('heroId' in entity) && hasFireBurn(entity, state.units);
      // Kim Sí: berserk and the bleed he applied, from the real `remaining` (a stun or shield never hides them).
      actor.kimsiBerserk = 'heroId' in entity && entity.heroId === 'h016' && (entity.berserk?.remaining ?? 0) > 0;
      actor.kimsiBleed = !('heroId' in entity) && (entity.bleed?.remaining ?? 0) > 0
        && state.units[entity.bleed?.casterId ?? '']?.heroId === 'h016';
      actor.status = 'heroId' in entity
        ? (entity.stun ?? 0) > 0 ? 'stun'
          : entity.frostShield && entity.frostShield.remaining > 0 ? 'frost'
          : entity.berserk && entity.berserk.remaining > 0 ? 'berserk'
            : entity.shield > 0 ? 'shield' : entity.ward ? 'ward' : entity.haste ? 'haste' : undefined
        : (entity.frozen ?? 0) > 0 ? 'frost' : (entity.stun ?? 0) > 0 ? 'stun' : (entity.sealed ?? 0) > 0 ? 'sealed'
          : (entity.root ?? 0) > 0 ? 'root' : entity.sunder ? 'sunder'
          : entity.soulLink && entity.soulLink.remaining > 0 ? 'soulLink'
          : entity.pureLand && entity.pureLand.remaining > 0 ? 'pureLand'
          : entity.monsterId === 'b001' && (entity.shield ?? 0) > 0 ? 'stoneShield'
          : (entity.shield ?? 0) > 0 ? 'shield'
          : entity.armorBuff ? 'ward' : entity.slow > 0 ? 'slow'
          : entity.burn && !actor.fireBurning ? ['h00A', 'h03P'].includes(state.units[entity.burn.casterId]?.heroId ?? '') ? 'poison' : 'charged' : undefined;
      actor.shared = sharedStatuses(entity, 'heroId' in entity, actor,
        !('heroId' in entity) && entity.burn ? state.units[entity.burn.casterId]?.heroId : undefined);
      if (entity.hp > 0 && !actor.dying) actor.root.scaling.setAll('summonKind' in entity
        ? entity.summonKind === 'buddha-clone' ? .72
          : entity.summonKind === 'blood-warrior' ? .52
            : entity.summonKind === 'blood-general' ? .76 : 1
        : 1);

      // Overhead HP bar: hue = faction (own / ally / enemy / elite), darker hue below 35%; length = HP.
      const hpRatio = Math.max(0, Math.min(1, entity.maxHp > 0 ? entity.hp / entity.maxHp : 0));
      const isHeroEntity = 'heroId' in entity;
      const faction = barFaction({ hero: isHeroEntity, owner: entity.owner, kind: 'kind' in entity ? entity.kind : undefined,
        rank: 'rank' in entity && typeof entity.rank === 'string' ? entity.rank : undefined }, selfId);
      const barKey = barColorKey(faction, hpRatio);
      actor.bar.material = this.palette.get(barKey, PALETTE[barKey], 0.45);
      actor.bar.scaling.x = Math.max(0.001, hpRatio);
      actor.bar.position.x = -actor.barWidth * (1 - hpRatio) * 0.5;
      if (faction === 'self' && !actor.ownMark) {
        // Gold tab at the bar's left end: a shape cue for "mine" that does not rely on colour alone.
        const mark = MeshBuilder.CreateBox('own-mark', { width: .16, height: .26, depth: .12 }, this.scene);
        mark.parent = actor.barRoot; mark.position.set(-actor.barWidth * .5 - .16, actor.bar.position.y, -.02);
        mark.material = this.palette.get('self-mark', PALETTE['self-mark']); mark.isPickable = false;
        actor.ownMark = mark;
      }
      if (actor.shieldBar) {
        const shield = 'heroId' in entity ? entity.shield : entity.shield ?? 0;
        const shieldRatio = Math.max(0, Math.min(1, entity.maxHp > 0 ? shield / entity.maxHp : 0));
        actor.shieldBar.setEnabled(shield > 0);
        actor.shieldBar.scaling.x = Math.max(.001, shieldRatio);
        actor.shieldBar.position.x = -actor.barWidth * (1 - shieldRatio) * .5;
      }

      // Skill bar under the HP bar (heroes with an active skill): blue cooldown or orange Nộ, same rules as the HUD.
      if (actor.manaBar && 'heroId' in entity) {
        const energy = energyState(entity, HERO_BY_ID[entity.heroId]);
        const manaRatio = energy.kind === 'none' ? 0 : energy.percent / 100;
        actor.manaBar.scaling.x = Math.max(0.001, manaRatio);
        actor.manaBar.position.x = -actor.barWidth * (1 - manaRatio) * 0.5;
        const manaKey = energy.kind === 'rage' ? 'rage' : 'mana';
        actor.manaBar.material = this.palette.get(energy.ready ? `${manaKey}-bar-full` : `${manaKey}-bar`, PALETTE[manaKey], energy.ready ? .8 : .45);
      }

      if (actor.manaBar && actor.manaBack && 'heroId' in entity) {
        const hasAbility = Boolean(HERO_BY_ID[entity.heroId]?.ability);
        actor.manaBar.setEnabled(hasAbility); actor.manaBack.setEnabled(hasAbility);
      }
      const isHeroOrBoss = 'heroId' in entity || ('kind' in entity && (entity.kind === 'boss' || entity.rank === 'boss' || entity.rank === 'chieftain'));
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
        this.eventId = event.id; this.handleEvent(event, state);
      }
    }
    for (const [id, actor] of this.actors) if (!present.has(id) && !actor.dying) {
      this.disposeActorVisuals(actor);
      this.actors.delete(id);
    }
  }

  /** The one place combat events become sound: zone, actor role/element and ownership pick the cue. */
  private playEventCue(event: GameEvent, state?: Pick<GameState, 'units'> & Partial<Pick<GameState, 'enemies'>>): void {
    if (!this.sfx) return;
    const source = this.actors.get(event.source ?? ''), target = this.actors.get(event.target ?? '');
    const sourceUnit = event.source ? state?.units[event.source] : undefined;
    const sourceEnemy = event.source ? state?.enemies?.[event.source] : undefined;
    // Clones, plants and pets attack under their own ids; their skillId ends with the owning hero (e.g. monkey-clone-h00R).
    const heroId = source?.heroId ?? sourceUnit?.heroId ?? (source?.enemyRank || sourceEnemy ? undefined : /-(h[0-9A-Z]{3})$/.exec(event.skillId ?? '')?.[1]);
    const request = resolveCue(event, {
      viewZone: this.zone,
      eventZone: event.zone ?? (event.kind === 'death' ? target?.zone : source?.zone ?? target?.zone),
      sourceHero: heroId ? HERO_BY_ID[heroId] : undefined,
      sourceEnemyRank: heroId ? undefined : source?.enemyRank ?? sourceEnemy?.rank ?? (source || sourceEnemy ? 'minion' : undefined),
      targetIsHero: Boolean(target?.heroId),
      ownSource: Boolean(sourceUnit && sourceUnit.owner === this.selfId),
    });
    if (request) this.sfx.play(request);
  }

  private handleEvent(event: GameEvent, state?: Pick<GameState, 'units'> & Partial<Pick<GameState, 'enemies'>>): void {
    this.tier6.record(event);
    this.truongStatus.record(event);
    this.playEventCue(event, state);
    if (event.kind !== 'attack' && event.kind !== 'trait' && event.kind !== 'cast' && event.kind !== 'ability' && event.kind !== 'death') return;
    const source = this.actors.get(event.source ?? '');
    const target = this.actors.get(event.target ?? '');
    // Auxiliary confirmed poison application: no second attacker pose, hurt feedback, support accent or audio.
    if (event.kind === 'trait' && event.skillId === 'peacock-poison-hit-h03R') {
      if (event.zone !== this.zone) return;
      const confirmed = target && !target.heroId && target.zone === this.zone ? target.root.position.clone()
        : Number.isFinite(event.x) && Number.isFinite(event.z) ? new Vector3(event.x!, 0, event.z!) : undefined;
      if (confirmed) this.effects.show(event, confirmed, undefined, [confirmed]);
      return;
    }
    // Double-hit accent: only an attack by an ally who has Bồ Đề's blessing (never Bồ Đề's own hits), on the monster it hits.
    if (event.source && source?.bodhiBlessed && source.zone === this.zone && target && !target.heroId && !target.dying
      && (event.kind === 'attack' || (event.kind === 'trait' && event.skillId?.startsWith('trait-'))))
      this.effects.bodhiAccent(event.source, target.root.position.clone());
    if (event.kind === 'death') this.vothuong.noteDeath(event);
    if (event.kind === 'ability' && event.skillId === 'skill-h01G') this.congcong.record(event);
    if (event.kind === 'ability' && event.skillId === 'skill-h009') this.kimtra.record(event);
    if (event.kind === 'ability' && event.skillId === 'skill-h00E') this.culinh.record(event);
    if (event.kind === 'cast' && event.skillId === 'monster-windup') {
      // Server-timed monster wind-up: hold the anticipation pose until its `attack` (the hit) arrives.
      if (source?.zone === this.zone && !source.dying) {
        source.action = 'attack'; source.attackPhase = 'windup';
        source.actionTime = (event.windup ?? .4) + .25;
        source.actionDuration = source.actionTime;
        if (target) faceActorTowards(source, target.root.position.x, target.root.position.z);
      }
      return;
    }
    if (event.kind === 'cast') {
      if (source?.zone === this.zone) {
        const stylizedEnemy = Boolean(source.skinHeroId && hasStylizedMotion(source.skinHeroId));
        source.action = event.skillId === 'boss-earthquake-windup' || stylizedEnemy ? 'attack' : 'cast';
        source.attackPhase = stylizedEnemy ? 'windup' : undefined;
        source.actionTime = event.windup ?? .3;
        source.actionDuration = source.actionTime;
        if (target) faceActorTowards(source, target.root.position.x, target.root.position.z);
        else if (event.x !== undefined && event.z !== undefined) faceActorTowards(source, event.x, event.z);
        if (isEnemySkillEvent(event.skillId)) {
          const castSpot = event.x !== undefined && event.z !== undefined
            ? new Vector3(event.x, 0, event.z)
            : target?.root.position ?? source.root.position;
          this.effects.show(event, castSpot, source.root.position);
        }
        else this.effects.showCast(event, (event.skillId === 'skill-h013' || event.skillId === 'skill-h019'
          || event.skillId === 'skill-h01H' || event.skillId === 'skill-h01E'
          || event.skillId === 'skill-h01F' || event.skillId === 'skill-h01D' || event.skillId === 'skill-h03Z' || event.skillId === 'skill-h041' || event.skillId === 'skill-h040'
          || event.skillId === 'skill-h03W' || event.skillId === 'skill-h03X' || event.skillId === 'skill-h01I' || event.skillId === 'skill-h01J' || event.skillId === 'skill-h014'
          || event.skillId === 'skill-h01K' || event.skillId === 'skill-h00D' || event.skillId === 'skill-h01A'
          || event.skillId === 'tier3-tier4-h03Q' || event.skillId === 'tier3-tier4-h03S' || isModernTier4Event(event.skillId))
          && event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : source.root.position, source.root.position);
      }
      return;
    }
    if (event.skillId === 'cataclysm-h01B') {
      // Aftershock: one crack under each zone-0 enemy the server listed; nothing when viewing another zone.
      if (this.zone !== 0) return;
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === 0 && hit.hp > 0 && !hit.dying))
        .map(hit => hit.root.position.clone());
      if (hits.length) this.effects.show(event, hits[0], source?.root.position, hits);
      return;
    }
    if (event.skillId === 'quake-h00E') {
      // Cự Linh's hammer quake: the server lists the enemies it slowed (1.2 s); no attack pose, the cast already played.
      this.culinh.recordSlow(event);
      if (source?.zone === this.zone) {
        const hits = (event.targets ?? []).map(id => this.actors.get(id))
          .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone && hit.hp > 0))
          .map(hit => hit.root.position.clone());
        this.effects.show(event, source.root.position, source.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'reflect-h009') {
      // Kim Tra's bell rings out on the counter; no attack pose (he is the one being hit).
      if (source?.zone === this.zone) this.effects.show(event, source.root.position, source.root.position);
      return;
    }
    if (event.kind === 'trait' && event.skillId === 'immortal-h03U') {
      // The blessed unit is the source, not the caster: activation must not play an attack pose.
      const blessed = event.source ? state?.units[event.source] : undefined;
      if (source?.heroId && source.zone === this.zone && !source.dying && blessed && blessed.hp > 0
        && blessed.zone === this.zone && blessed.respawn <= 0 && (blessed.slot >= 0 || blessed.summonDuration !== undefined)
        && (blessed.tierImmortal?.activeRemaining ?? 0) > 0)
        this.effects.show(event, source.root.position, undefined, [source.root.position]);
      return;
    }
    if (event.skillId === 'revive-h015' || event.skillId === 'star-guard-h015') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (hits.length) this.effects.show(event, hits[0], source?.root.position, hits);
      else if (event.skillId === 'revive-h015' && source?.zone === this.zone && event.x !== undefined && event.z !== undefined) {
        // The revived ally's actor can still be in another zone/place in this frame: stand them up where the server put them.
        const spot = new Vector3(event.x, 0, event.z);
        this.effects.show(event, spot, source.root.position, [spot]);
      }
      return;
    }
    if (event.skillId === 'freeze-h018') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (hits.length) this.effects.show(event, hits[0], source?.root.position, hits);
      return;
    }
    if (source && event.kind !== 'death' && !isModernTier4Pulse(event.skillId) && event.skillId !== 'bolt-h019'
      && event.skillId !== 'shield-h01G') {
      const supportive = event.ability === 'heal' || event.ability === 'shield' || isTier3SupportRecipient(event.skillId, false);
      const stylized = hasStylizedMotion(source.heroId ?? source.skinHeroId ?? '');
      source.action = event.skillId === 'boss-earthquake' ? 'attack'
        : event.kind === 'ability' && event.skillId !== 'skill-h01B' && !stylized ? 'cast' : 'attack';
      source.actionTime = source.heroId === 'h01B' && source.model ? source.modelAttackDuration ?? PANGU_ATTACK_SECONDS
        : stylized && event.kind === 'ability' ? .2 : .38;
      source.actionDuration = source.actionTime;
      // A monster hit is the impact of the wind-up it already showed: play only the strike half.
      source.attackPhase = !source.heroId && (event.kind === 'attack' || (stylized && event.kind === 'ability')) ? 'strike' : undefined;
      if (source.attackPhase) { source.actionTime = .32; source.actionDuration = .32; }
      if (event.kind === 'ability' && !supportive && !this.reducedMotion.matches)
        source.hitStop = event.skillId === 'skill-h01G' ? .09 : .045; // heavier ram for Bất Chu Sơn
      const aim = target?.root.position;
      if (aim) faceActorTowards(source, aim.x, aim.z);
      else if (event.x !== undefined && event.z !== undefined) faceActorTowards(source, event.x, event.z);
    }
    const multiHit = event.kind === 'ability' || event.skillId?.endsWith('-h01B')
      || event.skillId === 'trait-h012'
      || event.skillId === 'trait-h013'
      || event.skillId === 'trait-h018'
      || event.skillId === 'trait-h01C'
      || event.skillId === 'trait-h01F'
      || event.skillId === 'trait-h01E'
      || event.skillId === 'trait-h01K'
      || event.skillId === 'trait-h01D'
      || event.skillId === 'trait-h03Z'
      || event.skillId === 'trait-h041' || event.skillId === 'phoenix-rebirth-h041'
      || event.skillId === 'trait-h017'
      || event.skillId === 'trait-h016'
      || event.skillId === 'trait-h019'
      || event.skillId === 'trait-h01H' || event.skillId === 'burst-h01H'
      || event.skillId === 'trait-h01G'
      || event.skillId === 'trait-h01A'
      || event.skillId === 'trait-h03Y' || event.skillId === 'shadow-hit-h03Y'
      || event.skillId === 'trait-h040'
      || event.skillId === 'water-shield-burst-h00J'
      || isModernTier3Pulse(event.skillId) || isModernTier4Pulse(event.skillId) || event.skillId === 'monkey-clone-h00R'
      || isEnemySkillEvent(event.skillId)
      || event.skillId === 'trait-h011' || event.skillId === 'fire-wave-h011';
    const affected = multiHit ? event.targets?.length ? event.targets : event.target ? [event.target] : []
      : event.target ? [event.target] : [];
    for (const id of affected) {
      const hit = this.actors.get(id);
      if (!hit || hit.dying) continue;
      if (event.kind === 'death') { hit.action = 'death'; hit.actionTime = hit.sprite?.animated ? .75 : .45; hit.dying = true; hit.hp = 0; hit.barRoot.setEnabled(false); hit.shadow.setEnabled(false); }
      else if (hit !== source && event.ability !== 'heal' && event.ability !== 'shield'
        && !isTier3SupportRecipient(event.skillId, Boolean(hit.heroId)) && !isTier4SupportRecipient(event.skillId, Boolean(hit.heroId))) {
        // Flash only: being hit never interrupts the target's walk, wind-up, attack or cast, nor moves it.
        hit.hitFlashTime = .08;
      }
      if (hit.zone === this.zone) hit.root.setEnabled(true);
    }
    if (event.kind === 'ability' && (event.skillId === 'skill-h01I' || event.skillId === 'skill-h014')) {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : source.root.position;
        this.effects.show(event, center, source.root.position, hits, target?.zone === this.zone ? target.root.position : undefined);
        for (const id of this.tier6.brokenBosses(event)) {
          const boss = this.actors.get(id);
          if (boss?.zone === this.zone) this.effects.showPrimordialBreak(event, boss.root.position);
        }
      }
      return;
    }
    if (event.skillId === 'blood-general-hit-h03Z') {
      if (target?.zone === this.zone) this.effects.showBloodGeneralHit(event, target.root.position);
      return;
    }
    if (event.skillId === 'skill-h01C' || event.skillId === 'trait-h01C'
      || event.skillId === 'stone-blessing-h01C' || event.skillId === 'blessing-h01C'
      || event.skillId === 'revive-h01C') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (hits.length || (source?.zone === this.zone && event.skillId === 'skill-h01C'))
        this.effects.show(event, source?.root.position ?? hits[0], source?.root.position, hits);
      if (event.skillId === 'blessing-h01C')
        for (const point of hits) this.effects.playSharedStatus('heal', point);
      return;
    }
    if (event.skillId === 'skill-h01F' || event.skillId === 'trait-h01F'
      || event.skillId === 'sword-rain-h01F' || event.skillId === 'imperial-blessing-h01F') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone && hit.hp > 0))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'skill-h01E' || event.skillId === 'trait-h01E'
      || event.skillId === 'herb-heal-h01E') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'skill-h01K' || event.skillId === 'summer-h01K'
      || event.skillId === 'trait-h01K') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
        if (center) this.tier6.timeGift(event, this.effects, this.zone, center, id => {
          const ally = this.actors.get(id);
          return ally ? { at: ally.root.position, zone: ally.zone, alive: ally.hp > 0 && !ally.dying } : undefined;
        });
      }
      return;
    }
    if (event.skillId === 'skill-h01D' || event.skillId === 'trait-h01D') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'skill-h03Z' || event.skillId === 'trait-h03Z'
      || event.skillId === 'blood-general-h03Z' || event.skillId === 'blood-warrior-h03Z') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'skill-h041' || event.skillId === 'trait-h041'
      || event.skillId === 'phoenix-egg-h041' || event.skillId === 'phoenix-rebirth-h041') {
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone || hits.length) {
        const center = event.x !== undefined && event.z !== undefined
          ? new Vector3(event.x, 0, event.z) : hits[0] ?? source?.root.position;
        if (center) this.effects.show(event, center, source?.root.position, hits);
      }
      return;
    }
    if (event.kind === 'attack' && event.skillId === 'monkey-clone-h00R') {
      const hits = affected.map(id => this.actors.get(id)).filter((a): a is VisualActor => Boolean(a && !a.heroId && a.zone === this.zone))
        .map(a => a.root.position.clone());
      const origin = source?.zone === this.zone && !source.dying ? source.root.position : undefined;
      const at = event.x !== undefined && event.z !== undefined ? new Vector3(event.x, 0, event.z) : hits[0] ?? origin;
      if (at && (origin || hits.length)) this.effects.showMonkeyCloneSweep(event, origin, at, hits);
      return;
    }
    if ((event.kind === 'ability' && (isTierSkill(event.skillId) || isModernTier3Event(event.skillId) || isModernTier4Event(event.skillId)))
      || event.skillId === 'water-shield-burst-h00J' || (event.kind === 'trait' && (isModernTier3Pulse(event.skillId) || isModernTier4Pulse(event.skillId)))) {
      const tier4Support = isModernTier4Event(event.skillId) ? (event.supportTargets ?? []).filter(id => {
        const unit = state?.units[id], actor = this.actors.get(id);
        return Boolean(unit && unit.zone === this.zone && unit.hp > 0 && unit.respawn <= 0
          && (unit.slot >= 0 || unit.summonDuration !== undefined) && actor?.heroId && !actor.dying);
      }) : [];
      const coin = event.skillId === 'tier3-tier4-h03S' || isModernTier4Event(event.skillId)
        ? splitCoinRecipients([...affected, ...tier4Support], state, this.actors, this.zone, event.skillId === 'tier3-tier4-h00V') : undefined;
      const hits = coin?.hits ?? affected.map(id => this.actors.get(id)).filter((hit): hit is VisualActor =>
        Boolean(hit && hit.zone === this.zone)).map(hit => hit.root.position.clone());
      const support = coin?.support ?? (event.skillId === 'tier3-tier4-h03Q'
        ? [...new Set(event.supportTargets ?? [])].filter(id => {
          const ally = state?.units[id];
          return Boolean(ally && ally.zone === this.zone && ally.hp > 0 && ally.respawn <= 0
            && (ally.slot >= 0 || ally.summonDuration !== undefined));
        })
          .map(id => this.actors.get(id))
          .filter((ally): ally is VisualActor => Boolean(ally && ally.heroId && ally.zone === this.zone && !ally.dying))
          .map(ally => ally.root.position.clone()) : []);
      if (source?.zone !== this.zone && target?.zone !== this.zone && hits.length === 0
        && support.length === 0 && !((isModernTier3Pulse(event.skillId) || isModernTier4Pulse(event.skillId) || event.skillId === 'tier3-tier4-h03Q' || event.skillId === 'tier3-tier4-h03S')
          && event.zone === this.zone)) return;
      const center = event.x !== undefined && event.z !== undefined
        ? new Vector3(event.x, 0, event.z) : isModernTier3Event(event.skillId) || isModernTier4Event(event.skillId)
          ? hits[0] ?? support[0]
            ?? (target?.zone === this.zone ? target.root.position : undefined)
            ?? (source?.zone === this.zone ? source.root.position : undefined)
          : target?.root.position ?? source?.root.position;
      if (center) {
        if (isModernTier4Event(event.skillId)) this.effects.show(event, center,
          source?.zone === this.zone && !source.dying ? source.root.position : undefined, hits, undefined, support,
          tier4Presentation(event, state, this.zone, id => this.actors.get(id)));
        else if (event.skillId === 'tier3-tier4-h03Q' || event.skillId === 'tier3-tier4-h03S') this.effects.show(event, center,
          source?.zone === this.zone && !source.dying ? source.root.position : undefined, hits, undefined, support);
        else this.effects.show(event, center, isModernTier3Event(event.skillId)
          ? source?.zone === this.zone && !source.dying ? source.root.position : undefined : source?.root.position, hits);
      }
      return;
    }
    if (event.skillId === 'trait-h018' || event.skillId === 'trait-h019'
      || event.skillId === 'trait-h01A' || event.skillId === 'trait-h03Y') {
      const hits = affected.map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (hits.length) this.effects.show(event, hits[0], source?.root.position, hits);
      return;
    }
    if (event.skillId === 'skill-h03X' && event.kind === 'ability') {
      // `targets` are only the (at most two) allies the server blessed, not everyone healed inside R10.
      const chosen = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone && !actor.dying))
        .map(actor => actor.root.position.clone());
      if (source?.zone === this.zone) this.effects.show(event, source.root.position, source.root.position, chosen);
      return;
    }
    if ((event.skillId === 'skill-h011' && event.kind === 'ability') || event.skillId === 'fire-wave-h011') {
      // Hình Thiên: the blast's R6 monsters (state at event time) and the monsters the fire wave listed in its 6 x 2 lane.
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone && hit.hp > 0))
        .map(hit => hit.root.position.clone());
      if (source?.zone === this.zone && event.x !== undefined && event.z !== undefined)
        this.effects.show(event, new Vector3(event.x, 0, event.z), source.root.position, hits);
      return;
    }
    if (event.skillId === 'skill-h01A' && event.kind === 'ability') {
      // Pin rain: the point is the server's locked point; the monsters it listed get a pin each (state at event time).
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (source?.zone === this.zone && event.x !== undefined && event.z !== undefined)
        this.effects.show(event, new Vector3(event.x, 0, event.z), source.root.position, hits);
      return;
    }
    if (event.skillId === 'skill-h016' && event.kind === 'ability') {
      // Kim Sí storm: one cut over each monster the server listed (state at event time); the burst is centred on the caster.
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (source?.zone === this.zone && event.x !== undefined && event.z !== undefined)
        this.effects.show(event, new Vector3(event.x, 0, event.z), source.root.position, hits);
      return;
    }
    if (event.skillId === 'skill-h018') {
      // Quảng Hàn: the module needs every healed ally's position (silk flights); ids stay on the event for the shield wrap.
      const hits = (event.targets ?? []).map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      if (source?.zone === this.zone) this.effects.show(event, source.root.position, source.root.position, hits);
      return;
    }
    if (event.skillId === 'skill-h00I' && event.kind === 'ability') {
      // Vong Xuyên Hồn Liên: the module needs the linked monsters' positions in the server's chain order.
      const hits = affected.map(id => this.actors.get(id))
        .filter((actor): actor is VisualActor => Boolean(actor && actor.zone === this.zone))
        .map(actor => actor.root.position.clone());
      this.manhba.register(event.targets ?? []);
      if (source?.zone === this.zone && hits.length) this.effects.show(event, source.root.position, source.root.position, hits);
      return;
    }
    const defensive = event.kind === 'ability' && (event.ability === 'heal' || event.ability === 'shield');
    if (defensive && affected.length) {
      for (const id of affected) {
        const ally = this.actors.get(id);
        if (ally?.zone === this.zone) this.effects.show(event, ally.root.position, source?.root.position);
      }
      return;
    }
    const actor = target ?? source;
    if (actor?.zone !== this.zone) return;
    const position = event.x !== undefined && event.z !== undefined && !defensive
      ? new Vector3(event.x, 0, event.z) : actor?.root.position;
    if (!position) return;
    if (event.kind !== 'death') {
      const chain = truongChainTargets(event, id => {
        const hit = this.actors.get(id);
        return hit?.zone === this.zone ? hit.root.position.clone() : undefined;
      });
      const enemyHits = isEnemySkillEvent(event.skillId)
        ? affected.map(id => this.actors.get(id)).filter((hit): hit is VisualActor => Boolean(hit && hit.zone === this.zone)).map(hit => hit.root.position.clone())
        : undefined;
      this.effects.show(event, position, source?.root.position, enemyHits ?? chain);
    }
    if (event.kind === 'ability' && event.ability === 'chain') {
      let previous = source?.root.position;
      for (const id of affected) {
        const hit = this.actors.get(id);
        if (!hit || hit.zone !== this.zone) continue;
        if (id !== event.target) this.effects.show({ ...event, kind: 'attack' }, hit.root.position, previous);
        previous = hit.root.position;
      }
    }
  }

  /** Rebuild the island when the lane count changes or the view moves between the main island and a dungeon islet. */
  private rebuildTerrain(): void {
    this.clearTerrain();
    this.terrainZone = this.zone;
    this.clearTerrain = buildTerrain(this.scene, this.palette, this.laneCount, this.zone);
  }
  /** Keep the camera target over the walkable island of the current zone. */
  private clampCameraTarget(x: number, z: number): void {
    if (this.zone === 0) {
      this.camera.target.x = Math.max(ARENA.minX - 10, Math.min(ARENA.maxX + 10, x));
      this.camera.target.z = Math.max(ARENA.minZ - 10, Math.min(ARENA.maxZ + 10, z));
      return;
    }
    const edge = clampToZone(this.zone, { x, z });
    const dx = x - edge.x, dz = z - edge.z, over = Math.hypot(dx, dz), margin = 6;
    this.camera.target.x = edge.x + (over > 0 ? dx / over * Math.min(over, margin) : 0);
    this.camera.target.z = edge.z + (over > 0 ? dz / over * Math.min(over, margin) : 0);
  }
  setZone(zone: number): void {
    if (this.disposed) return;
    this.zone = zone;
    void preloadMonsterEncounterVisuals(this.palette, zone, () => !this.disposed && this.zone === zone);
    this.truongStatus.clear();
    if ((zone === 0) !== (this.terrainZone === 0)) this.rebuildTerrain();
    this.effects.clear(); this.vothuong.clear();this.congcong.clear(); this.kimtra.clear(); this.moctra.clear(); this.thietphien.clear(); this.baoquatu.clear(); this.mandon.clear(); this.manhba.clear(); this.ladongtan.clear(); this.nhiep.clear(); this.honghainhi.clear(); this.culinh.clear();
    this.camera.targetScreenOffset.set(0, 0);
    for (const actor of this.actors.values()) {
      if (actor.zone === zone && actor.sprite && 'activate' in actor.sprite
          && typeof actor.sprite.activate === 'function') actor.sprite.activate();
      actor.root.setEnabled(actor.zone === zone && (actor.hp > 0 || actor.dying));
      actor.shadow.setEnabled(actor.zone === zone && actor.hp > 0 && !actor.dying);
    }
    this.resetCamera();
  }
  /** Live monster in the viewed zone whose body is within reach of a ground click. */
  private monsterNear(x: number, z: number, slack = 1.6): string | undefined {
    let best: string | undefined, bestGap = slack;
    for (const [id, actor] of this.actors) {
      if (actor.heroId || actor.summonKind || actor.dying || actor.hp <= 0 || actor.zone !== this.zone) continue;
      const gap = Math.hypot(actor.root.position.x - x, actor.root.position.z - z);
      if (gap < bestGap) { best = id; bestGap = gap; }
    }
    return best;
  }

  private disposeActorVisuals(actor: VisualActor): void {
    if (actor.sprite && 'meshes' in actor.sprite && actor.sprite.meshes.length > 1) {
      debug('sprite.monster-boss-group-cleanup', { zone: actor.zone, childCount: actor.sprite.meshes.length });
    }
    // Disposing the actor root recursively disposes every sprite child and group hitbox.
    actor.root.dispose(false, false);
    if (actor.sprite && 'release' in actor.sprite && typeof actor.sprite.release === 'function') actor.sprite.release();
  }
  /** Clear even when snapshots skip preparation; never replay a finished wave's skill events. */
  private syncCombatReset(state: GameState): void {
    const boundary = state.combatResetEventId;
    if (boundary === undefined || boundary === this.combatResetEventId) return;
    this.combatResetEventId = boundary;
    this.eventId = Math.max(this.eventId, boundary);
    this.tier6.clear(); this.tier3.clear(); this.tier4.clear();
    this.effects.clear(); this.truongStatus.clear(); this.vothuong.clear();
    this.congcong.clear(); this.kimtra.clear(); this.moctra.clear(); this.thietphien.clear();
    this.baoquatu.clear(); this.mandon.clear(); this.manhba.clear(); this.ladongtan.clear();
    this.nhiep.clear(); this.honghainhi.clear(); this.culinh.clear();
    this.groundEffects = []; this.summonedPlants = []; this.soulLinks = []; this.panguStatuses = [];
    for (const [id, actor] of this.actors) {
      if (!state.units[id]) {
        this.disposeActorVisuals(actor);
        this.actors.delete(id);
      } else {
        actor.action = 'idle'; actor.actionTime = 0; actor.actionDuration = 0;
        actor.hitStop = 0; actor.hitFlashTime = 0; actor.dying = false;
      }
    }
    debug('visual.wave-reset', { wave: state.wave, eventId: boundary });
  }
  resizeCanvas(): void { this.engine.resize(); }
  clear(): void {
    this.combatResetEventId = undefined;
    releaseMonsterEncounterVisuals(this.palette);
    this.tier6.clear();
    this.tier3.clear();
    this.tier4.clear();
    this.truongStatus.clear();
    for (const actor of this.actors.values()) this.disposeActorVisuals(actor);
    this.actors.clear(); this.effects.clear(); this.vothuong.clear();this.congcong.clear(); this.kimtra.clear(); this.moctra.clear(); this.thietphien.clear(); this.baoquatu.clear(); this.mandon.clear(); this.manhba.clear(); this.ladongtan.clear(); this.nhiep.clear(); this.honghainhi.clear(); this.culinh.clear(); this.eventId = 0; this.zone = 0; if (this.terrainZone !== 0) this.rebuildTerrain(); this.hasSnapshot = false; this.selected.clear(); this.groundEffects = []; this.summonedPlants = []; this.soulLinks = [];
  }
  pan(dx: number, dy: number): void {
    const lookDirX = -Math.cos(this.camera.alpha);
    const lookDirZ = -Math.sin(this.camera.alpha);
    const rightDirX = -Math.sin(this.camera.alpha);
    const rightDirZ = Math.cos(this.camera.alpha);
    const factor = (this.camera.radius / 1000) * 1.8;
    const nextX = this.camera.target.x + (-rightDirX * dx + lookDirX * dy) * factor;
    const nextZ = this.camera.target.z + (-rightDirZ * dx + lookDirZ * dy) * factor;
    this.clampCameraTarget(nextX, nextZ);
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

  private cameraPresetIndex = 0;
  resetCamera(lane?: number): void {
    const x = lane === undefined ? 0 : laneCenters(this.laneCount)[lane] ?? 0;
    this.camera.setTarget(new Vector3(x, 0, 2));
    this.camera.radius = lane === undefined ? [0, 30, 36, 44, 52][this.laneCount] ?? 36 : 26;
    this.camera.alpha = Math.PI / 2;
    this.camera.beta = 0.84;
    this.cameraPresetIndex = 0;
    debug('battlefield.camera', { lanes: this.laneCount, lane, radius: this.camera.radius, beta: this.camera.beta });
  }

  cycleCameraView(lane?: number): string {
    const x = lane === undefined ? 0 : laneCenters(this.laneCount)[lane] ?? 0;
    this.camera.setTarget(new Vector3(x, 0, 2));
    this.cameraPresetIndex = (this.cameraPresetIndex + 1) % 3;
    const presets = [
      { name: '2.5D Chuẩn', alpha: Math.PI / 2, beta: 0.84, radius: [0, 30, 36, 44, 52][this.laneCount] ?? 36 },
      { name: 'Isometric 3D', alpha: Math.PI / 2 + 0.38, beta: 0.82, radius: [0, 32, 38, 46, 54][this.laneCount] ?? 38 },
      { name: 'Bao quát chiến thuật', alpha: Math.PI / 2, beta: 0.70, radius: [0, 42, 48, 56, 64][this.laneCount] ?? 48 },
    ];
    const p = presets[this.cameraPresetIndex];
    this.camera.alpha = p.alpha;
    this.camera.beta = p.beta;
    this.camera.radius = p.radius;
    debug('battlefield.camera-preset', { preset: p.name, alpha: p.alpha, beta: p.beta, radius: p.radius });
    return p.name;
  }
  private render(): void {
    const dt = Math.min(.05, this.engine.getDeltaTime() / 1000); this.time += dt;

    let moveX = 0, moveZ = 0;
    const lookDirX = -Math.cos(this.camera.alpha);
    const lookDirZ = -Math.sin(this.camera.alpha);
    const rightDirX = -Math.sin(this.camera.alpha);
    const rightDirZ = Math.cos(this.camera.alpha);

    // 1. WASD + Phím mũi tên di chuyển khung hình chuẩn Warcraft 3
    if (this.keys.up) { moveX += lookDirX; moveZ += lookDirZ; }
    if (this.keys.down) { moveX -= lookDirX; moveZ -= lookDirZ; }
    if (this.keys.right) { moveX += rightDirX; moveZ += rightDirZ; }
    if (this.keys.left) { moveX -= rightDirX; moveZ -= rightDirZ; }

    // 2. Rê chuột viền màn hình (Edge scrolling) chuẩn Warcraft 3
    if (!this.isInteracting && this.mousePos && this.canvas.dataset.vfxReviewBusy !== 'true') {
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
      const nextX = this.camera.target.x + moveX * step;
      const nextZ = this.camera.target.z + moveZ * step;
      this.clampCameraTarget(nextX, nextZ);
    }

    this.sky.update(dt, this.camera.position, this.reducedMotion.matches);
    const cameraFacing = this.camera.position.subtract(this.camera.target);
    const motionNow = performance.now() / 1000 - this.snapshotClock.extraDelay;
    for (const [id, actor] of this.actors) {
      animateActor(actor, dt, this.time, this.reducedMotion.matches, cameraFacing.x, cameraFacing.z, this.camera.alpha, this.camera.beta, motionNow);
      if (actor.heroId === 'h03Y') {
        if (actor.spriteShown && actor.sprite) actor.sprite.mesh.visibility = actor.shadowAssault ? 0 : 1;
        else for (const part of actor.fallbackParts) part.visibility = actor.shadowAssault ? 0 : 1;
        if (actor.shadowAssault) actor.shadow.setEnabled(false);
        if (actor.shadowAssault && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
          this.effects.markHero('h03Y', 'assault', id, actor.root.position);
      }
      if (actor.heroId === 'h041') {
        const egg = actor.phoenixEgg || this.effects.phoenixReplayEgg(id, actor.root.position);
        if (actor.spriteShown && actor.sprite) actor.sprite.mesh.visibility = egg ? 0 : 1;
        else for (const part of actor.fallbackParts) part.visibility = egg ? 0 : 1;
        actor.shadow.setEnabled(!egg);
        if (egg && actor.zone === this.zone)
          this.effects.markPhoenixEgg(id, actor.root.position);
      }
      if (actor.dying && actor.actionTime <= 0) { actor.dying = false; actor.root.setEnabled(false); }
      if (actor.fireBurning && actor.zone === this.zone && actor.hp > 0 && !actor.dying && !this.tier4.ownsBurning(id))
        this.effects.markBurning(id, actor.root.position, actor.phase);
      if (actor.summonKind === 'buddha-clone' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markDouzhanClone(id, actor.root.position);
      // Hằng Nga's silk wrap follows the shared shield flag; the module only wraps allies her own event listed.
      if (actor.heroId && actor.shared?.includes('shield') && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h018', 'shield', id, actor.root.position);
      if (actor.nuwaShielded && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markNuwaShield(id, actor.root.position);
      if ((actor.nuwaWard ?? 0) > 0 && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markNuwaWard(id, actor.root.position, actor.nuwaWard ?? 0);
      if (actor.hienvienBlessed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h01F', 'blessing', id, actor.root.position);
      if (actor.thunderBlessed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h040', 'blessing', id, actor.root.position);
      if (actor.truongFrozen && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h040', 'frozen', id, actor.root.position);
      if (actor.truongSunder && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h040', 'sunder', id, actor.root.position);
      if (actor.stoneShield && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markStatus(id, actor.root.position, 'stoneShield');
      if (actor.heroId && actor.zone === this.zone && actor.hp > 0 && !actor.dying) this.effects.prepareHero(actor.heroId);
      // Kim Sí: the feather gather follows him; berserk bands and bleed scars live only while the snapshot reports them.
      if (actor.heroId === 'h016' && actor.zone === this.zone && actor.hp > 0 && !actor.dying) {
        this.effects.markHero('h016', 'caster', id, actor.root.position);
        if (actor.kimsiBerserk) this.effects.markHero('h016', 'berserk', id, actor.root.position);
      }
      if (actor.kimsiBleed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h016', 'bleed', id, actor.root.position);
      // Hậu Nghệ's hovering suns follow him: his live position every frame.
      if (actor.heroId === 'h017' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h017', 'caster', id, actor.root.position);
      // Nhiên Đăng's lit pearl array follows him during the windup.
      if (actor.heroId === 'h03W' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h03W', 'caster', id, actor.root.position);
      // Thái Bạch's star follows her; haste / invulnerability rings only draw for recipients of her own events.
      if (actor.heroId === 'h015' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h015', 'caster', id, actor.root.position);
      if (actor.zone === this.zone && actor.hp > 0 && !actor.dying) {
        if (actor.starHaste) this.effects.markHero('h015', 'haste', id, actor.root.position);
        if (actor.starImmortal) this.effects.markHero('h015', 'immortal', id, actor.root.position);
      }
      if ((actor.blackWaterShield || this.congcong.ward(id)) && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h01G', 'shield', id, actor.root.position);
      if (actor.heroId === 'h01G' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h01G', 'aura', id, actor.root.position);
      if (actor.heroId === 'h007' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h007', 'shell', id, actor.root.position);
      if (actor.kimtraBell && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h009', 'bell', id, actor.root.position);
      if (actor.moctraFrenzy && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00A', 'frenzy', id, actor.root.position);
      if (actor.culinhBulwark && actor.zone === this.zone && actor.hp > 0 && !actor.dying) {
        const phase = this.culinh.shieldPhase(id, actor.culinhShield ?? 0);
        this.effects.markHero('h00E', phase.worn ? 'bulwark-worn' : 'bulwark', id, actor.root.position);
        if (phase.hit) this.effects.markHero('h00E', 'bulwark-hit', id, actor.root.position);
      }
      if (actor.culinhSlowed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00E', 'slowed', id, actor.root.position);
      if (actor.moctraPoison && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00A', 'poison', id, actor.root.position);
      if (actor.thietphienEmber && actor.zone === this.zone && actor.hp > 0 && !actor.dying) {
        if (actor.thietphienEmber === 'start') this.effects.markHero('h00B', 'ignite', id, actor.root.position);
        this.effects.markHero('h00B', 'ember', id, actor.root.position);
      }
      if (actor.honghainhiBurn && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00C', 'burn', id, actor.root.position);
      if (actor.mandonHaste && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00F', 'haste', id, actor.root.position);
      if (actor.manhbaBond && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00I', 'bond', id, actor.root.position);
      if (!actor.heroId && this.vothuong.marked(id) && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h00H', 'mark', id, actor.root.position);
      if (actor.nhiepShield && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h03O', 'frostshield', id, actor.root.position);
      const blackIce = this.congcong.cage(id, actor.status);
      if (blackIce && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h01G', 'frozen', id, actor.root.position);
      // Lantern shields are drawn by the shared shield (snapshot `shield`); the old lantern aura sphere is gone.
      if (actor.buddhaShielded && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h01J', 'shield', id, actor.root.position);
      if (actor.bodhiBlessed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markBodhiBlessing(id, actor.root.position, actor.bodhiRemaining ?? 0);
      // Bồ Đề's gathering canopy follows him: his live position every frame.
      if (actor.heroId === 'h03X' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h03X', 'caster', id, actor.root.position);
      if (actor.primordialMarked && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markDivineAura(id, 'primordial', actor.root.position);
      if (actor.heroId === 'h01I' && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markDivineAura(id, 'solar', actor.root.position);
      if (actor.peachBlessed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markPeachBlessing(id, actor.root.position);
      if (actor.exposed && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markHero('h03Y', 'exposed', id, actor.root.position);
      if (actor.zone === this.zone && actor.hp > 0 && !actor.dying) {
        for (const kind of actor.shared ?? []) this.effects.markSharedStatus(id, actor.root.position, kind);
        if (actor.status === 'frost' && !actor.heroId && !blackIce && !actor.truongFrozen && !actor.nhiepShield)
          this.effects.markSharedStatus(id, actor.root.position, 'freeze');
      }
      // Hình Thiên's armour/flame shell: from the snapshot berserk (stun or frost on him must not break it), every frame.
      if ((actor.xingtianBerserk ?? 0) > 0 && actor.zone === this.zone && actor.hp > 0 && !actor.dying)
        this.effects.markXingtianShell(id, actor.root.position, actor.xingtianBerserk!);
    }
    for (const [id, ring] of this.rings) if (!this.selected.has(id) || !this.actors.has(id)) { ring.dispose(); this.rings.delete(id); }
    for (const ground of this.groundEffects) if (ground.zone === this.zone) {
      if (ground.kind === 'pangu-rift') this.effects.markPanguRift(ground);
      else if (ground.kind === 'golden-bowl' && ground.id)
        this.effects.markKimthienBowl(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining);
      else if (ground.kind === 'phong-than' && ground.id)
        this.effects.markPhongThan(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining);
      else if (ground.kind === 'beidou' && ground.id)
        this.effects.markBeidou(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining);
      else if (ground.kind === 'lantern-cage' && ground.id)
        this.effects.markNhienDangCage(ground.casterId, new Vector3(ground.x, 0, ground.z),
          ground.radius, ground.remaining);
      else if (ground.kind === 'five-finger' && ground.id)
        this.effects.markNhuLaiZone(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining);
      else if (ground.kind === 'xuanyuan-sword' && ground.id)
        this.effects.markHienvienZone(ground.id, new Vector3(ground.x, 0, ground.z), ground.remaining);
      else if (ground.kind === 'shennong-grove' && ground.id)
        this.effects.markShennongGrove(ground.id, new Vector3(ground.x, 0, ground.z), ground.radius, ground.remaining);
      else if (ground.kind === 'fuxi-bagua' && ground.id)
        this.effects.markFuxiBagua(ground.id, new Vector3(ground.x, 0, ground.z), ground.radius, ground.remaining);
      else if (ground.kind === 'blood-sea' && ground.id)
        this.effects.markBloodSea(ground.id, new Vector3(ground.x, 0, ground.z), ground.radius, ground.remaining);
      else if (ground.kind === 'phoenix-carpet' && ground.id)
        this.effects.markPhoenixCarpet(ground.id, new Vector3(ground.x, 0, ground.z), ground.radius,
          ground.remaining, ground.rainRemaining ?? 0);
      else if ((ground.kind === 'chucdung-ember' || ground.kind === 'chucdung-lava') && ground.id)
        this.effects.markHero('h01H', ground.kind === 'chucdung-lava' ? 'lava' : 'ember', ground.id, new Vector3(ground.x, 0, ground.z));
      else if (isLadongtanArray(ground, this.actors.get(ground.casterId)?.heroId))
        this.effects.markHero('h00D', 'array', ladongtanArrayId(ground), new Vector3(ground.x, 0, ground.z));
      else if (ground.kind === 'tier-water')
        this.effects.markLongVuongPool(`${ground.casterId}:${ground.x}:${ground.z}`, new Vector3(ground.x, 0, ground.z), ground.radius, ground.remaining);
      else if (!this.tier3.ownsGround(ground, this.zone) && !this.tier4.ownsGround(ground, this.zone))
        this.effects.markGround(`${ground.casterId}:${ground.x}:${ground.z}`, new Vector3(ground.x, 0, ground.z), ground.radius, ground.kind);
    }
    this.tier4.draw(this.effects, this.zone, id => {
      const actor = this.actors.get(id);
      return actor ? { at: actor.root.position, zone: actor.zone, alive: actor.hp > 0 && !actor.dying } : undefined;
    });
    this.tier3.draw(this.effects, this.zone, id => {
      const actor = this.actors.get(id);
      return actor ? { at: actor.root.position, zone: actor.zone, alive: actor.hp > 0 && !actor.dying } : undefined;
    });
    this.tier6.draw(this.effects, this.zone, id => {
      const actor = this.actors.get(id);
      return actor ? { at: actor.root.position, zone: actor.zone, alive: actor.hp > 0 && !actor.dying } : undefined;
    });
    for (const status of this.panguStatuses) {
      const actor = this.actors.get(status.id);
      if (actor?.zone === this.zone && actor.hp > 0 && !actor.dying) this.effects.markSharedStatus(status.id, actor.root.position, status.kind);
    }
    // Hoa Ăn Thịt of h03P (summon_plant) is drawn by the h03P module; debug replays add client-only plants.
    for (const plant of [...this.summonedPlants, ...this.baoquatu.plants()]) if (plant.zone === this.zone) {
      this.effects.markHero('h03P', 'plant', plant.id, plant.position);
    }
    for (const link of this.soulLinks) if (link.zone === this.zone) {
      this.effects.markSoulLink(link.key, link.from, link.to);
    }
    for (const id of this.selected) {
      const actor = this.actors.get(id); if (!actor) continue;
      let ring = this.rings.get(id);
      if (!ring) { ring = MeshBuilder.CreateTorus('selection', { diameter: 3.4, thickness: .13, tessellation: 32 }, this.scene); ring.material = this.palette.get('selection', PALETTE.selection, .55); ring.isPickable = false; this.rings.set(id, ring); }
      ring.setEnabled(actor.zone === this.zone && actor.hp > 0); ring.position.set(actor.root.position.x, .2, actor.root.position.z);
    }
    const hoveredActor = this.hovered ? this.actors.get(this.hovered) : undefined;
    if (hoveredActor && hoveredActor.zone === this.zone && hoveredActor.hp > 0 && !hoveredActor.dying && !this.selected.has(this.hovered!)) {
      if (!this.hoverRing) {
        this.hoverRing = MeshBuilder.CreateTorus('hover-ring', { diameter: 3.1, thickness: .08, tessellation: 32 }, this.scene);
        this.hoverRing.isPickable = false;
      }
      const ringKey = hoveredActor.heroId ? 'faction-ally' : hoveredActor.enemyRank === 'boss' || hoveredActor.enemyRank === 'chieftain' ? 'faction-elite' : 'faction-enemy';
      this.hoverRing.material = this.palette.get(`hover-${ringKey}`, PALETTE[ringKey], .6);
      this.hoverRing.setEnabled(true);
      this.hoverRing.position.set(hoveredActor.root.position.x, .18, hoveredActor.root.position.z);
    } else this.hoverRing?.setEnabled(false);
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
    this.disposed = true;
    this.warmup.dispose();
    releaseMonsterEncounterVisuals(this.palette);
    for (const actor of this.actors.values()) this.disposeActorVisuals(actor);
    this.actors.clear();
    window.removeEventListener('resize', this.resize); this.unsubscribe();
    this.engine.stopRenderLoop(); this.clearTerrain(); this.sky.dispose(); this.scene.dispose(); this.engine.dispose();
  }
}
