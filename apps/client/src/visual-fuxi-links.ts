import { Constants } from '@babylonjs/core/Engines/constants.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, billboardScale } from './visual-fuxi-assets.js';
import { cameraLook, placeStrip, resetStrip } from './visual-de-tuan-strip.js';
import { LINK_DRAW_SECONDS, linkAlpha, linkHead, linkWidth, nodeFrame, RETRACT_SECONDS } from './visual-fuxi-timeline.js';

type Link = { key: string; from: Vector3; to: Vector3; age: number; remaining: number; reduced: boolean; touched: boolean;
  missing: number; glow?: Layer; rope?: Mesh; node?: Mesh };
const MAX_LINKS = 24, ROPE_HEIGHT = 1.1, NODE_SIZE = 2.2;

/**
 * Nhân Quả: the soul-link rope between two linked monsters (server `soulLink` with the ultimate's 60 % share; the caller passes
 * the live endpoints and the shortest `remaining` of the pair every frame). Each pair keeps ONE rope for its whole life:
 * a kitLink glow draws on from the first monster to the second (shader time, wobble) under the painted braid whose knot ends
 * on the second monster, plus the looping knot sheet on its feet. In the last 0.4 s the rope lets go; a pair that disappears
 * (monster died, link refreshed away) retracts in 0.25 s. Presentation only — damage sharing stays on the server.
 */
export class FuxiLinks {
  private links = new Map<string, Link>();
  private glows: LayerPool;
  private time = 0;

  constructor(private scene: Scene, private art: KitPainted) {
    let serial = 0;
    this.glows = new LayerPool(() => {
      const layer = createGroundLayer(scene, 'kitLink', 'bagua', `fuxi-link-${serial++}`);
      layer.material.depthFunction = Constants.ALWAYS;
      return layer;
    }, MAX_LINKS, 'fuxi-link');
  }

  /** Called every frame the snapshot carries the pair. */
  mark(key: string, from: Vector3, to: Vector3, remaining: number, reduced: boolean): void {
    if (!Number.isFinite(remaining) || remaining <= 0 || Vector3.DistanceSquared(from, to) < .01) return;
    let link = this.links.get(key);
    if (!link) {
      if (this.links.size >= MAX_LINKS) { debug('visual.fuxi.cap', { layer: 'links' }); return; }
      link = { key, from: from.clone(), to: to.clone(), age: 0, remaining, reduced, touched: true, missing: 0,
        glow: this.glows.acquire(), rope: this.art.acquire('rope'), node: this.art.acquire('node', false) };
      this.links.set(key, link);
    }
    link.from.copyFrom(from); link.to.copyFrom(to); link.remaining = remaining; link.reduced = reduced;
    link.touched = true; link.missing = 0;
  }

  tick(dt: number, time: number): void {
    this.time = time;
    const up = screenUp(this.scene), look = cameraLook(this.scene);
    for (const [key, link] of this.links) {
      link.age += dt;
      if (!link.touched) {
        link.missing += dt;
        if (link.missing >= RETRACT_SECONDS) { this.drop(key, link); continue; }
      }
      link.touched = false;
      this.place(link, up, look);
    }
  }

  clear(): void {
    for (const [key, link] of this.links) this.drop(key, link);
    this.glows.releaseAll();
  }

  private place(link: Link, up: Vector3, look: Vector3): void {
    const dx = link.to.x - link.from.x, dz = link.to.z - link.from.z, length = Math.hypot(dx, dz);
    const alpha = linkAlpha(link.age, link.remaining, link.missing);
    const head = linkHead(link.age, link.reduced);
    // art may finish loading after the pair appeared
    link.rope ??= this.art.acquire('rope'); link.node ??= this.art.acquire('node', false);
    const glow = link.glow;
    if (glow) {
      const m = glow.material;
      glow.mesh.scaling.set(length, 1, linkWidth(length) * .7);
      glow.mesh.position.set((link.from.x + link.to.x) / 2, ROPE_HEIGHT, (link.from.z + link.to.z) / 2);
      glow.mesh.rotation.y = -Math.atan2(dz, dx);
      m.setFloat('uHead', head); m.setFloat('uTail', 0); m.setFloat('uWave', link.reduced ? 0 : .7);
      m.setFloat('uTaper', 0); m.setFloat('uAlpha', alpha * .7); m.setFloat('uTime', link.reduced ? 0 : this.time);
    }
    if (link.rope && length > .2) {
      // the braid reaches from the first monster to `head` of the way; its knot ends on the leading edge
      const reach = Math.max(.3, length * head), dir = new Vector3(dx / length, 0, dz / length);
      const headPoint = new Vector3(link.from.x + dir.x * reach, ROPE_HEIGHT, link.from.z + dir.z * reach);
      if (!placeStrip(link.rope, headPoint, dir, look, reach, linkWidth(length))) link.rope.visibility = 0;
      else link.rope.visibility = alpha;
    }
    const node = link.node;
    if (node) {
      const meta = artMeta('node');
      const scale = billboardScale('node', NODE_SIZE);
      node.scaling.set(scale.x, scale.y, 1);
      node.position.copyFrom(billboardCenter(link.to, scale.y, meta?.anchorY ?? .7, up));
      if (meta) this.art.frame(node, nodeFrame(this.time, link.reduced), meta.columns, meta.rows);
      node.visibility = alpha * (link.age < LINK_DRAW_SECONDS ? Math.max(0, (link.age - LINK_DRAW_SECONDS * .6) / (LINK_DRAW_SECONDS * .4)) : 1);
    }
  }

  private drop(key: string, link: Link): void {
    resetStrip(link.rope);
    this.art.release(link.rope); this.art.release(link.node);
    if (link.glow) this.glows.release(link.glow);
    this.links.delete(key);
  }
}
