import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { debug } from './debug.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import type { KitSpray } from './visual-kit-spray.js';
import { BOND_RADIUS, BOND_RING_URL, BOND_SECONDS, BOND_SPIN, BUBBLE_GATE, bondAlpha, bondScale, MANHBA_ATLAS, MARK_LOST_SECONDS,
  NODE_SECONDS, nodeFrame } from './visual-manhba-timeline.js';

/** 4 monsters per cast, a cast every 10.5 s per Mạnh Bà: ~3 overlapping casts on a four-player board. */
const MAX_BONDS = 16;
const MAX_NODES = 12;
/** Reduced motion: one still node frame, briefly. */
const STILL_NODE_FRAME = 2;
const STILL_NODE_SECONDS = .35;

type Ring = { mesh: Mesh; material: StandardMaterial };
type Bond = {
  ring: Ring; at: Vector3; age: number; sinceMark: number; sinceEnd: number; marked: boolean; reduced: boolean; lastBubbles: number;
};
type Node = { sprite: Sprite; age: number; reduced: boolean };

/**
 * Đồng Mệnh on each linked monster: the painted water ring decal under it (top-down, under every actor) and the one-shot
 * `manhba-node` pulse when a rope head lands. A bond lives BOND_SECONDS from the head's arrival (catalog statusSeconds);
 * snapshot marks only keep its position current and end it early when they stop (the monster died or the link dropped).
 * Keys are enemy ids, or synthetic `eventId:index` keys when ids and positions could not be matched (replays).
 */
export class ManhbaBonds {
  private texture: Texture;
  private free: Ring[] = [];
  private created = 0;
  private bonds = new Map<string, Bond>();
  private nodes: Node[] = [];
  private time = 0;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private spray: KitSpray) {
    this.texture = new Texture(BOND_RING_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'manhba-bond-ring' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'manhba-bond-ring', message: String(error ?? 'load failed') }));
    this.texture.hasAlpha = true;
  }

  /** A rope head reached `key`: node pulse now, ring grows in and the bond clock starts. */
  link(key: string, at: Vector3, reduced: boolean): void {
    this.pulse(at, reduced);
    const old = this.bonds.get(key);
    if (old) { old.age = 0; old.sinceEnd = 0; old.sinceMark = 0; old.marked = false; old.at.copyFrom(at); return; }
    const ring = this.acquire();
    if (!ring) return;
    ring.mesh.rotation.y = Math.random() * Math.PI * 2;
    ring.mesh.setEnabled(true);
    this.bonds.set(key, { ring, at: at.clone(), age: 0, sinceMark: 0, sinceEnd: 0, marked: false, reduced, lastBubbles: this.time });
    debug('visual.manhba.bond.start', { reduced, bonds: this.bonds.size });
  }

  /** Snapshot marker `bond` every frame the monster holds the soul link: keeps the ring and ropes on it. */
  mark(key: string, at: Vector3): void {
    const bond = this.bonds.get(key);
    if (!bond) return;
    bond.at.copyFrom(at);
    bond.sinceMark = 0;
    bond.marked = true;
  }

  position(key: string): Vector3 | undefined { return this.bonds.get(key)?.at; }

  /** 0 while the bond is alive, the seconds since it ended otherwise; undefined when the key is unknown. */
  sinceEnd(key: string): number | undefined { return this.bonds.get(key)?.sinceEnd; }

  tick(dt: number, time: number): void {
    this.time = time;
    for (const [key, bond] of this.bonds) {
      bond.age += dt;
      const ended = bond.age >= BOND_SECONDS || (bond.marked && bond.sinceMark >= MARK_LOST_SECONDS);
      if (bond.marked) bond.sinceMark += dt;
      if (ended) bond.sinceEnd += dt;
      if (bond.sinceEnd >= .4) { this.release(bond.ring); this.bonds.delete(key); continue; }
      const size = BOND_RADIUS * 2 * bondScale(bond.age);
      bond.ring.mesh.position.set(bond.at.x, .035, bond.at.z);
      bond.ring.mesh.scaling.set(size, 1, size);
      bond.ring.material.alpha = bondAlpha(bond.age, bond.sinceEnd);
      if (bond.reduced || ended) continue;
      bond.ring.mesh.rotation.y += BOND_SPIN * dt;
      if (time - bond.lastBubbles >= BUBBLE_GATE) {
        bond.lastBubbles = time;
        this.spray.trail(new Vector3(bond.at.x, .5, bond.at.z), new Vector3(0, 1.2, 0), 2);
      }
    }
    for (let i = this.nodes.length - 1; i >= 0; i--) {
      const node = this.nodes[i];
      node.age += dt;
      if (node.age >= (node.reduced ? STILL_NODE_SECONDS : NODE_SECONDS)) { this.flipbooks.release(MANHBA_ATLAS.node, node.sprite); this.nodes.splice(i, 1); continue; }
      node.sprite.cellIndex = node.reduced ? STILL_NODE_FRAME : nodeFrame(node.age);
    }
  }

  clear(): void {
    for (const bond of this.bonds.values()) this.release(bond.ring);
    this.bonds.clear();
    for (const node of this.nodes) this.flipbooks.release(MANHBA_ATLAS.node, node.sprite);
    this.nodes.length = 0;
  }

  private pulse(at: Vector3, reduced: boolean): void {
    if (this.nodes.length >= MAX_NODES) return;
    const sprite = this.flipbooks.spawn(MANHBA_ATLAS.node, new Vector3(at.x, 0, at.z), 1);
    if (sprite) this.nodes.push({ sprite, age: 0, reduced });
  }

  private acquire(): Ring | undefined {
    const pooled = this.free.pop();
    const ring = pooled ?? this.create();
    if (ring) ring.mesh.alphaIndex = GROUND_ALPHA_INDEX + 2; // floor decal: every actor draws over it
    return ring;
  }

  private create(): Ring | undefined {
    if (this.created >= MAX_BONDS) { debug('visual.kit.pool.cap', { pool: 'manhba-bond' }); return undefined; }
    const name = `manhba-bond-${this.created++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.texture;
    material.emissiveTexture = this.texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.disableDepthWrite = true; // like kitMaterial: the front of the ring must not slice actors' legs
    mesh.material = material;
    mesh.isPickable = false;
    mesh.setEnabled(false);
    return { mesh, material };
  }

  private release(ring: Ring): void {
    ring.mesh.setEnabled(false);
    this.free.push(ring);
  }
}
