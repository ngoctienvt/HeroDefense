import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { NHU_LAI as N } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { NhuLaiAccents } from './visual-nhu-lai-accents.js';
import { PALM_ANCHOR_Y, PALM_CAST_GRACE, PALM_CONTACT_SECONDS, PALM_SIZE, palmCastAlpha, palmCastFrame,
  palmContactFrame, palmContactScale, palmLift } from './visual-nhu-lai-timeline.js';

type Palm = { mesh?: Mesh; rim?: Layer; at: Vector3; age: number; windup: number; reduced: boolean;
  source?: string; contactAge?: number };
const MAX_PALMS = 4;

/**
 * Như Lai Thần Chưởng (the Codex "buddha-palm-descent" sheet). Cast event: a gold rim at the locked point grows
 * to the real radius while the palm forms high above and accelerates down (frames 0–5, held if the ability is late).
 * Ability event: the same palm lands (frames 6–15: contact, rubble, fracture, motes) with the stone-imprint impact and shock ring.
 * A lost ability event frees the telegraph after windup + grace.
 */
export class NhuLaiPalm {
  private rims: LayerPool;
  private palms: Palm[] = [];

  constructor(private scene: Scene, private art: KitPainted, private accents: NhuLaiAccents) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'gold', `nhulai-rim-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_PALMS, 'nhulai-rims');
  }

  prepare(): void {
    this.art.prepare('palm', '/assets/vfx-nhulai-palm.webp', { foreground: true });
  }

  cast(at: Vector3, windup: number, reduced: boolean, source?: string): void {
    this.prepare();
    this.drop(source);
    if (this.palms.length >= MAX_PALMS) { debug('visual.nhulai.cap', { layer: 'palm' }); return; }
    this.palms.push({ at: at.clone(), age: 0, windup: Math.max(.05, windup), reduced, source, rim: this.rims.acquire() });
  }

  /** Server ability: the palm lands at the event point (the locked point the cast telegraphed). */
  contact(at: Vector3, reduced: boolean, source?: string): void {
    this.prepare();
    const palm = this.palms.find(p => p.source === source && p.contactAge === undefined);
    if (palm) { palm.contactAge = 0; palm.at.copyFrom(at); palm.reduced = reduced; }
    else if (this.palms.length < MAX_PALMS) this.palms.push({ at: at.clone(), age: 0, windup: .05, reduced, source, contactAge: 0 });
    this.accents.impact(at, 1, reduced);
    debug('visual.nhulai.contact', { reduced, lateCast: !palm });
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (let i = this.palms.length - 1; i >= 0; i--) {
      const palm = this.palms[i];
      palm.age += dt;
      if (palm.contactAge !== undefined) palm.contactAge += dt;
      const lost = palm.contactAge === undefined && palm.age >= palm.windup + PALM_CAST_GRACE;
      if (lost || (palm.contactAge ?? 0) >= PALM_CONTACT_SECONDS) { this.free(palm); this.palms.splice(i, 1); continue; }
      this.place(palm, up, time);
    }
  }

  clear(): void {
    for (const palm of this.palms) this.free(palm);
    this.palms.length = 0;
    this.rims.releaseAll();
  }

  private drop(source?: string): void {
    for (let i = this.palms.length - 1; i >= 0; i--) if (this.palms[i].source === source) {
      this.free(this.palms[i]); this.palms.splice(i, 1);
    }
  }

  private place(palm: Palm, up: Vector3, time: number): void {
    palm.mesh ??= this.art.acquire('palm');
    const landed = palm.contactAge !== undefined;
    const charge = Math.min(1, palm.age / palm.windup);
    if (palm.rim) {
      // The telegraph rim tightens to full strength as the palm arrives, then cools out with the contact.
      const fade = landed ? Math.max(0, 1 - (palm.contactAge ?? 0) / .3) : 1;
      palm.rim.mesh.position.set(palm.at.x, .045, palm.at.z);
      palm.rim.mesh.scaling.set(N.skillRadius * 2, 1, N.skillRadius * 2);
      const m = palm.rim.material;
      m.setFloat('uTime', time); m.setFloat('uAlpha', (.3 + .6 * charge) * fade);
      m.setFloat('uFill', .1 + .18 * charge); m.setFloat('uRim', charge); m.setFloat('uRings', 0);
      m.setFloat('uSwirl', palm.reduced ? 0 : 1.1);
    }
    const mesh = palm.mesh;
    if (!mesh) return;
    const frame = landed ? palmContactFrame(palm.contactAge ?? 0, palm.reduced) : palmCastFrame(palm.age, palm.windup, palm.reduced);
    const size = PALM_SIZE * (landed ? palmContactScale(palm.contactAge ?? 0) : 1);
    const lift = landed ? 0 : palmLift(palm.age, palm.windup, palm.reduced);
    mesh.position.copyFrom(billboardCenter(palm.at, size, PALM_ANCHOR_Y, up, lift));
    mesh.scaling.setAll(size);
    mesh.visibility = landed ? 1 : palmCastAlpha(palm.age, palm.windup);
    this.art.frame(mesh, frame, 4, 4);
  }

  private free(palm: Palm): void {
    this.art.release(palm.mesh);
    if (palm.rim) this.rims.release(palm.rim);
    palm.mesh = undefined; palm.rim = undefined;
  }
}
