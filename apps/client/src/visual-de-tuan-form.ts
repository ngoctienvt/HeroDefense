import type { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { screenUp } from './visual-kit-billboard.js';
import { actorAlphaIndex, GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import type { KitSpray } from './visual-kit-spray.js';
import { artMeta, billboardScale, groundScale } from './visual-de-tuan-assets.js';
import { FORM_CENTER_HEIGHT, FORM_FEET_DIAMETER, FORM_GRACE, FORM_WIDTH, formAlpha, formFrame } from './visual-de-tuan-timeline.js';

type Form = { wreath?: Mesh; feet?: Mesh; rim?: Layer; at: Vector3; remaining: number; touched: boolean; reduced: boolean; idle: number };
const MAX_FORMS = 4;

/**
 * Hóa thần (berserk 6.5 s): the Kim Ô feather wreath stands behind the caster (crown just above the head, wing tips at the
 * feet, drawn under the hero so his face and weapon stay clear) with the small feather decal and a slow rim under his feet.
 * Everything follows the snapshot's `berserk.remaining`: grow / hold loop / release over the last FORM_EXIT seconds, and a
 * client joining late starts in the hold. A marker that disappears early frees its layers at once.
 */
export class DeTuanForm {
  private forms = new Map<string, Form>();
  private rims: LayerPool;

  constructor(private scene: Scene, private art: KitPainted, private spray: KitSpray) {
    let serial = 0;
    this.rims = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitGround', 'solar', `detuan-form-${serial++}`);
      layer.mesh.alphaIndex = GROUND_ALPHA_INDEX + 1;
      layer.material.setFloat('uSpiral', 0);
      return layer;
    }, MAX_FORMS, 'detuan-forms');
  }

  mark(id: string, at: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || !Number.isFinite(at.x) || !Number.isFinite(at.z)) return;
    let form = this.forms.get(id);
    if (!form) {
      if (this.forms.size >= MAX_FORMS) { debug('visual.detuan.cap', { layer: 'form' }); return; }
      form = { wreath: this.art.acquire('form'), feet: this.art.acquire('ground', true), rim: this.rims.acquire(),
        at: at.clone(), remaining, touched: true, reduced, idle: 0 };
      this.forms.set(id, form);
      debug('visual.detuan.form', { remaining: +remaining.toFixed(2), reduced, wreath: Boolean(form.wreath) });
    }
    form.touched = true; form.idle = 0; form.remaining = remaining; form.reduced = reduced; form.at.copyFrom(at);
  }

  tick(dt: number, time: number): void {
    const up = screenUp(this.scene);
    for (const [id, form] of this.forms) {
      // The snapshot loop marks less often than frames render: only a marker silent past the grace is really gone.
      if (form.touched) form.idle = 0; else form.idle += dt;
      if (form.idle > FORM_GRACE) { this.free(form); this.forms.delete(id); continue; }
      form.touched = false;
      this.place(form, up, time);
      if (!form.reduced && Math.random() < .14) this.spray.rise(form.at, 2.2, 2);
    }
  }

  clear(): void {
    for (const form of this.forms.values()) this.free(form);
    this.forms.clear();
    this.rims.releaseAll();
  }

  private place(form: Form, up: Vector3, time: number): void {
    // Art that was still loading when the marker first appeared joins as soon as its texture is ready.
    form.wreath ??= this.art.acquire('form');
    form.feet ??= this.art.acquire('ground', true);
    const { wreath, feet, rim, at, remaining, reduced } = form;
    const meta = artMeta('form');
    if (wreath && meta) {
      const scale = billboardScale('form', FORM_WIDTH);
      wreath.scaling.set(scale.x, scale.y, 1);
      const bob = reduced ? 0 : Math.sin(time * 2.2) * .12;
      wreath.position.copyFrom(at.add(up.scale(FORM_CENTER_HEIGHT + bob)));
      // World pass: sort just before the caster so monsters in front of him still draw over the feathers.
      wreath.alphaIndex = actorAlphaIndex(this.scene, at.x, at.z) - 1;
      this.art.frame(wreath, formFrame(remaining, reduced), meta.columns, meta.rows);
      wreath.visibility = .96;
    }
    const alpha = formAlpha(remaining);
    if (feet) {
      const scale = groundScale('ground', FORM_FEET_DIAMETER);
      feet.scaling.set(scale.x, scale.y, 1);
      feet.position.set(at.x, .05, at.z);
      feet.visibility = .72 * alpha;
    }
    if (rim) {
      rim.mesh.position.set(at.x, .045, at.z);
      rim.mesh.scaling.set(FORM_FEET_DIAMETER, 1, FORM_FEET_DIAMETER);
      const m = rim.material;
      m.setFloat('uTime', reduced ? 0 : time); m.setFloat('uAlpha', .6 * alpha);
      m.setFloat('uFill', .05); m.setFloat('uRim', .9); m.setFloat('uBand', 0);
      m.setFloat('uRings', 0); m.setFloat('uSwirl', reduced ? 0 : .9);
    }
  }

  private free(form: Form): void {
    this.art.release(form.wreath); this.art.release(form.feet);
    if (form.rim) this.rims.release(form.rim);
    form.wreath = form.feet = form.rim = undefined;
  }
}
