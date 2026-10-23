import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import type { Scene } from '@babylonjs/core/scene.js';
import { DE_TUAN as D } from '../../../content/new-divine-design.js';
import { debug } from './debug.js';
import { billboardCenter, screenUp } from './visual-kit-billboard.js';
import type { KitFxBank } from './visual-kit-fx-bank.js';
import type { KitPainted } from './visual-kit-painted.js';
import { artMeta, billboardScale, groundScale, type DeTuanArtId } from './visual-de-tuan-assets.js';
import { BURST_LIFT, burstFrame, burstScale, burstSeconds, MAIN_BURST_SIZE, MAX_SPLASH_BURSTS, RING_LIFE, SCORCH_SECONDS,
  scorchAlpha, SHOCK_SECONDS, solarSplashPoints, SPLASH_BURST_SIZE } from './visual-de-tuan-timeline.js';

type Kind = 'sky' | 'flat' | 'scorch';
type Piece = { mesh: Mesh; kind: Kind; art: DeTuanArtId; at: Vector3; size: number; age: number; life: number; reduced: boolean };
const MAX_PIECES = 28;

/**
 * Impact of Thập Nhật Đồng Thăng, all from the server's ability event:
 * a focused sunburst on the main target (the sword's landing), smaller ones on every splash target (opening as the ring
 * reaches them), a flat sunburst + shock ring that reach the caster's real radius R8.5, the feather ground decal as scorch
 * and a feather spray. Reduced motion keeps position and extent with a single short frame and no spray.
 */
export class DeTuanBlast {
  private pieces: Piece[] = [];

  constructor(private scene: Scene, private art: KitPainted, private bank: KitFxBank) {}

  /** The sword lands: sunburst + sparks on the main target only (the shock ring comes from `field`). */
  hit(main: Vector3, reduced: boolean): void {
    this.sky(main, MAIN_BURST_SIZE, 0, reduced);
    this.bank.ring(main, 2.4, 'solar', { life: .36, fill: .22, rim: 1, alpha: .85, reduced, order: 6 });
    if (reduced) return;
    const spray = this.bank.spray('solar');
    spray.ring(main, .9, 34, 1.4, 5.5, 8);
    spray.rise(main, 1.4, 14);
  }

  /** The whole blast: ring to the real radius, flat sunburst, scorch, splash bursts staggered by the ring's reach. */
  field(center: Vector3, targets: readonly Vector3[], main: Vector3 | undefined, reduced: boolean): void {
    const radius = D.skillRadius;
    this.bank.ring(center, radius, 'solar', { life: RING_LIFE, fill: .06, rim: 1, swirl: 1.1, alpha: .95, reduced, order: 5 });
    this.bank.ring(center, radius * .62, 'gold', { life: .5, hold: true, fill: .1, rim: .8, alpha: .5, reduced, order: 7 });
    this.flat(center, 2 * radius, reduced);
    this.scorch(center, 2 * radius, reduced);
    const splash = solarSplashPoints(targets, main);
    for (const point of splash.slice(0, MAX_SPLASH_BURSTS)) {
      const reach = Math.min(1, Math.hypot(point.x - center.x, point.z - center.z) / radius);
      this.sky(point, SPLASH_BURST_SIZE, reduced ? 0 : SHOCK_SECONDS * reach * .6, reduced);
      if (!reduced) this.bank.spray('solar').ring(point, .4, 8, 1, 3, 5);
    }
    if (!reduced) {
      const spray = this.bank.spray('solar');
      spray.ring(center, radius * .55, 46, 1.1, 6, 7);
      spray.ring(center, radius * .9, 30, .8, 4, 5);
    }
    debug('visual.detuan.blast', { splash: splash.length, main: Boolean(main), radius, reduced });
  }

  tick(dt: number): void {
    const up = screenUp(this.scene);
    for (let i = this.pieces.length - 1; i >= 0; i--) {
      const piece = this.pieces[i];
      piece.age += dt;
      if (piece.age >= piece.life) { this.art.release(piece.mesh); this.pieces.splice(i, 1); continue; }
      this.draw(piece, up);
    }
  }

  clear(): void {
    for (const piece of this.pieces) this.art.release(piece.mesh);
    this.pieces.length = 0;
  }

  private sky(at: Vector3, size: number, delay: number, reduced: boolean): void {
    this.add('sky', 'burst', at, size, -delay, burstSeconds(reduced), reduced);
  }

  private flat(at: Vector3, diameter: number, reduced: boolean): void {
    this.add('flat', 'burstFlat', at, diameter, 0, burstSeconds(reduced), reduced);
  }

  private scorch(at: Vector3, diameter: number, reduced: boolean): void {
    this.add('scorch', 'ground', at, diameter, 0, reduced ? .8 : SCORCH_SECONDS, reduced);
  }

  private add(kind: Kind, art: DeTuanArtId, at: Vector3, size: number, age: number, life: number, reduced: boolean): void {
    if (this.pieces.length >= MAX_PIECES) { debug('visual.detuan.cap', { layer: 'blast' }); return; }
    const mesh = this.art.acquire(art, kind !== 'sky');
    if (!mesh) return;
    const piece: Piece = { mesh, kind, art, at: at.clone(), size, age, life, reduced };
    this.pieces.push(piece);
    this.draw(piece, screenUp(this.scene));
  }

  private draw(piece: Piece, up: Vector3): void {
    const { mesh, age, kind, reduced } = piece;
    mesh.setEnabled(age >= 0);
    if (age < 0) return;
    const meta = artMeta(piece.art);
    if (!meta) return;
    if (kind === 'sky') {
      const scale = billboardScale(piece.art, piece.size * burstScale(age, reduced));
      mesh.scaling.set(scale.x, scale.y, 1);
      mesh.position.copyFrom(billboardCenter(piece.at, scale.y, meta.anchorY, up, BURST_LIFT));
      this.art.frame(mesh, burstFrame(age, reduced), meta.columns, meta.rows);
      mesh.visibility = 1;
      return;
    }
    const scale = groundScale(piece.art, piece.size);
    mesh.scaling.set(scale.x, scale.y, 1);
    mesh.position.set(piece.at.x, kind === 'scorch' ? .05 : .065, piece.at.z);
    if (kind === 'flat') {
      this.art.frame(mesh, burstFrame(age, reduced), meta.columns, meta.rows);
      mesh.visibility = .85;
    } else mesh.visibility = scorchAlpha(age, reduced);
  }
}
