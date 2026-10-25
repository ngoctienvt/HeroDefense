import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { GameEvent } from '../../../packages/contracts/src/types.js';
import type { AbilityExtra, HeroVfx } from './visual-kit-hero.js';
import { KitFlipbooks } from './visual-kit-flipbooks.js';
import { debug } from './debug.js';
import { TrieuCongMinhArt } from './visual-trieu-cong-minh-art.js';
import { TrieuCongMinhCharge } from './visual-trieu-cong-minh-charge.js';
import { TrieuCongMinhPieces } from './visual-trieu-cong-minh-pieces.js';
import { coinDirection, TRIEU_CONG_MINH as T } from './visual-trieu-cong-minh-timeline.js';
export class VisualTrieuCongMinh implements HeroVfx {
  readonly heroId=T.id;
  private art: TrieuCongMinhArt;
  private charge: TrieuCongMinhCharge;
  private pieces: TrieuCongMinhPieces;
  private replayQueue: {left:number; event:GameEvent; origin:Vector3; aim:Vector3; reduced:boolean; allies:Vector3[]}[]=[];
  constructor(scene:Scene) {
    this.art=new TrieuCongMinhArt(scene);
    this.charge=new TrieuCongMinhCharge(scene,this.art);
    this.pieces=new TrieuCongMinhPieces(scene,this.art,new KitFlipbooks(scene));
  }
  prepare():void {this.art.prepare();}
  cast(event:GameEvent,at:Vector3,reduced:boolean,origin?:Vector3):boolean {
    if (event.kind!=='cast' || event.skillId!==T.skill) return false;
    this.prepare();const dir=coinDirection(event,origin,at);
    if (event.windup === undefined || !Number.isFinite(event.windup) || event.windup < 0) {
      debug('visual.trieu-cong-minh.cast.invalid-windup',{}); return true;
    }
    this.charge.begin(event.source??'',origin,dir,event.windup,reduced);
    debug('visual.trieu-cong-minh.cast',{windup:event.windup,origin:Boolean(origin),direction:dir});
    return true;
  }
  ability(event:GameEvent,origin:Vector3,at:Vector3,reduced:boolean,extra?:AbilityExtra):boolean {
    if (event.kind!=='ability' || event.skillId!==T.skill) return false;
    this.prepare();this.charge.cancel(event.source??'');
    const from=extra?.hasOrigin && [origin.x,origin.y,origin.z].every(Number.isFinite) ? origin : undefined,dir=coinDirection(event,from,at);
    const finite=(point:Vector3)=>[point.x,point.y,point.z].every(Number.isFinite);
    const targets=(extra?.targets??[]).filter(finite),allies=(extra?.supportTargets??[]).filter(finite);
    this.pieces.strike(from,dir,targets,allies,reduced);
    debug('visual.trieu-cong-minh.resolve',{origin:Boolean(from),direction:dir,enemyCount:targets.length,allyCount:allies.length,reduced});
    return true;
  }
  tick(dt:number):void {
    this.charge.tick(dt);this.pieces.tick(dt);
    this.replayQueue=this.replayQueue.filter(job=>{
      job.left-=dt;if(job.left>0)return true;
      this.ability(job.event,job.origin,job.aim,job.reduced,{hasOrigin:true,targets:[job.aim],supportTargets:job.allies});return false;
    });
  }
  replay(origin:Vector3,at:Vector3,reduced:boolean,kind='ultimate'):boolean {
    if(!['skill','ultimate'].includes(kind) || ![origin.x,origin.y,origin.z,at.x,at.y,at.z].every(Number.isFinite))return false;
    if(this.replayQueue.length>=4)return false;
    debug('visual.trieu-cong-minh.replay',{kind,reduced});
    const event:GameEvent={id:-1,kind:'ability',source:'replay-fortune',skillId:T.skill,direction:coinDirection({},origin,at)};
    this.cast({...event,kind:'cast',windup:.25},at,reduced,origin);
    this.replayQueue.push({left:.25,event,origin:origin.clone(),aim:at.clone(),reduced,allies:[origin.add(new Vector3(1.5,0,-2))]});
    return true;
  }
  clear():void {this.replayQueue=[];this.charge.clear();this.pieces.clear();this.art.clear();debug('visual.trieu-cong-minh.clear',{});}
}
