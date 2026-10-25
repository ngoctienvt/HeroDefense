import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { KitFlipbooks } from './visual-kit-flipbooks.js';
import { KitFxBank } from './visual-kit-fx-bank.js';
import { cameraLook, placeStrip } from './visual-de-tuan-strip.js';
import { createGroundLayer, LayerPool, type Layer } from './visual-kit-layers.js';
import { GROUND_ALPHA_INDEX } from './visual-kit-depth.js';
import { TrieuCongMinhArt, type CoinSlot } from './visual-trieu-cong-minh-art.js';
import { FLIGHT, HIT_LIFE, RECEIPT_LIFE, RETURN_LIFE, COIN_SIZE, coinDistance, coinArrival, coinPhase,
  coinTrail, coinTrailUvs, TRIEU_CONG_MINH as T, type Point } from './visual-trieu-cong-minh-timeline.js';
interface Shot extends CoinSlot { age: number; at: Vector3; dir: Point; reduced: boolean; tail: CoinSlot; line?: Layer }
interface Contact extends CoinSlot { age: number; delay: number; at: Vector3; reduced: boolean; fired: boolean }
interface Receipt extends CoinSlot { age: number; from?: Vector3; at: Vector3; reduced: boolean; returning: CoinSlot }
/** Pending slots keep authoritative phase age across cold loads and cap pressure; every queue has a fixed bound. */
export class TrieuCongMinhPieces {
  private shots: Shot[] = [];
  private hits: Contact[] = [];
  private receipts: Receipt[] = [];
  private bank: KitFxBank;
  private time = 0;
  private lines: LayerPool;
  constructor(private scene: Scene, private art: TrieuCongMinhArt, books: KitFlipbooks) {
    this.bank = new KitFxBank(scene, books);
    this.lines = new LayerPool(() => createGroundLayer(scene, 'kitLink', 'fortune', 'fortune-static-line'), 12, 'fortune-static-line');
  }
  strike(origin: Vector3 | undefined, dir: Point | undefined, targets: readonly Vector3[], allies: readonly Vector3[], reduced: boolean): void {
    if (origin && dir && this.shots.length < 12)
      this.shots.push({ at: origin.clone(), dir, reduced, age: 0, tail: {} });
    for (const at of targets.slice(0, Math.max(0, 96-this.hits.length)))
      this.hits.push({ at: at.clone(), age: 0, delay: reduced ? 0 : coinArrival(origin, dir, at), reduced, fired: false });
    const end = origin && dir ? origin.add(new Vector3(dir.x*coinDistance(FLIGHT), 1.1, dir.z*coinDistance(FLIGHT))) : undefined;
    for (const at of allies.slice(0, Math.max(0, 48-this.receipts.length)))
      this.receipts.push({ age: 0, from: end?.clone(), at: at.clone(), reduced, returning: {} });
    this.tick(0);
  }
  private releaseShot(item: Shot): void {
    this.art.release(item); this.art.release(item.tail); if (item.line) this.lines.release(item.line);
  }
  tick(dt: number): void {
    this.time += dt; this.bank.tick(dt, this.time);
    this.shots = this.shots.filter(item => {
      item.age += dt;
      if (item.age >= FLIGHT+.24) { this.releaseShot(item); return false; }
      const exiting = Math.max(0, (item.age-FLIGHT)/.24);
      const distance = item.reduced ? T.length / 2 : coinDistance(item.age)-.35*Math.sin(exiting*Math.PI/2);
      const at = item.at.add(new Vector3(item.dir.x*distance, 1.2+(item.reduced ? 0 : .25*Math.sin(exiting*Math.PI)), item.dir.z*distance));
      this.art.pose(item, 'spin', at, COIN_SIZE*(item.reduced ? 1 : 1-exiting*.45),
        item.reduced ? 0 : Math.floor(item.age/.055)%8, item.reduced ? .85 : 1-exiting);
      if (item.reduced) {
        item.line ??= this.lines.acquire();
        if (item.line) {
          const {mesh,material:m} = item.line;
          mesh.position.set(item.at.x+item.dir.x*T.length/2,.055,item.at.z+item.dir.z*T.length/2);
          mesh.scaling.set(T.length,1,T.width); mesh.rotation.y=-Math.atan2(item.dir.z,item.dir.x); mesh.alphaIndex=GROUND_ALPHA_INDEX+3;
          for (const [key,value] of Object.entries({uHead:1,uTail:0,uWave:0,uTaper:0,uTime:0,uAlpha:.42})) m.setFloat(key,value);
        }
      } else if (item.age < FLIGHT) {
        const tail = coinTrail(item.age,distance);
        if (tail.length > .01) {
          const mesh=this.art.pose(item.tail,'trail',at,1,0,tail.alpha);
          if (mesh) {
            placeStrip(mesh,at,new Vector3(item.dir.x,0,item.dir.z),cameraLook(this.scene),tail.length,.88);
            this.art.planes.mapUvs(mesh,base=>coinTrailUvs(base,tail.fraction));
          }
        }
      } else this.art.release(item.tail);
      return true;
    });
    this.hits = this.hits.filter(item => {
      item.age += dt; const age=item.age-item.delay;
      if (age < 0) return true;
      if (age >= HIT_LIFE) { this.art.release(item); return false; }
      if (!item.fired) {
        item.fired=true;
        this.bank.ring(item.at,.62,'fortune',{life:.52,hold:true,fill:.32,rim:.3,alpha:.55,reduced:item.reduced});
        if (!item.reduced) this.bank.spray('fortune').ring(item.at,.24,6,.5,2.6,3.1);
      }
      const pose=coinPhase(age,HIT_LIFE,item.reduced,2);
      this.art.pose(item,'hit',item.at,2.25,pose.frame,pose.alpha);
      return true;
    });
    this.receipts = this.receipts.filter(item => {
      item.age+=dt;
      const start=item.reduced || !item.from ? 0 : FLIGHT;
      const hop=item.reduced || !item.from ? 0 : RETURN_LIFE;
      const age=item.age-start;
      if (age<0) return true;
      if (age>=hop+RECEIPT_LIFE) { this.art.release(item); this.art.release(item.returning); return false; }
      if (age<hop && item.from) {
        const p=age/hop, eased=1-(1-p)**3;
        const at=Vector3.Lerp(item.from,item.at,eased);
        at.y+=Math.sin(p*Math.PI)*1.1;
        this.art.pose(item.returning,'spin',at,.65*(1-p*.4),Math.floor(age/.04)%8,1-p*.4);
      } else {
        this.art.release(item.returning);
        const pose=coinPhase(age-hop,RECEIPT_LIFE,item.reduced,4);
        const mesh=this.art.pose(item,'receipt',item.at,2.15,pose.frame,pose.alpha);
        // Closing sheet curls inward/down and loses its lustre; never loops a guessed shield duration.
        if (mesh && !item.reduced && age-hop>RECEIPT_LIFE*.7) {
          const close=(age-hop-RECEIPT_LIFE*.7)/(RECEIPT_LIFE*.3);
          mesh.scaling.scaleInPlace(1-close*.22); mesh.position.y-=close*.12;
        }
      }
      return true;
    });
  }
  clear(): void {
    for (const item of this.shots) this.releaseShot(item);
    for (const item of this.hits) this.art.release(item);
    for (const item of this.receipts) {this.art.release(item);this.art.release(item.returning);}
    this.shots=[];this.hits=[];this.receipts=[];this.time=0;this.lines.releaseAll();this.bank.clear();
  }
}
