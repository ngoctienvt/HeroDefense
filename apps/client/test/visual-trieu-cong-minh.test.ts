import { describe,expect,it,vi,beforeEach,afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import type { GameEvent,GameState,Unit } from '../../../packages/contracts/src/types.js';
import { VisualTrieuCongMinh } from '../src/visual-trieu-cong-minh.js';
import { TrieuCongMinhPieces } from '../src/visual-trieu-cong-minh-pieces.js';
import { TrieuCongMinhCharge } from '../src/visual-trieu-cong-minh-charge.js';
import { TrieuCongMinhArt } from '../src/visual-trieu-cong-minh-art.js';
import { splitCoinRecipients } from '../src/visual-trieu-cong-minh-targets.js';
import { coinDirection,coinDistance,coinArrival,coinCharge,coinPhase,coinTrail,coinTrailUvs,
  COIN_SIZE,COIN_RADIUS,FLIGHT,HIT_LIFE,TRIEU_CONG_MINH as T } from '../src/visual-trieu-cong-minh-timeline.js';
import { isTier3SupportRecipient,isModernTier3Event } from '../src/visual-tier3-heroes.js';
import { placeStrip } from '../src/visual-de-tuan-strip.js';
import { Battlefield } from '../src/battlefield.js';
import { Tier6Snapshot } from '../src/battlefield-tier6-snapshot.js';
import { TruongStatusTracker } from '../src/battlefield-truong-dao-lang.js';
import layout from '../src/visual-trieu-cong-minh-layout.json';
import inventory from '../../../assets/vfx-source/trieu-cong-minh/active-inventory.json';
import atlases from '../src/visual-kit-atlases.json';
const event:GameEvent={id:70,kind:'ability',source:'source',skillId:T.skill,x:8,z:0,zone:0};
function actor(heroId:string|undefined,x:number,zone=0) {
  return {heroId,zone,dying:false,hp:100,root:{position:new Vector3(x,0,0),setEnabled:vi.fn()},action:'idle',hitFlashTime:0,hitStop:0};
}
describe('Triệu Công Minh confirmed mixed recipients and coin material phases',()=>{
  beforeEach(()=>vi.stubGlobal('location',{search:''}));afterEach(()=>vi.unstubAllGlobals());
  it('claims only the active ultimate; classifies support by recipient and preserves offensive caster feedback',()=>{
    expect(isModernTier3Event(T.skill)).toBe(true);expect(isModernTier3Event('trait-h03S')).toBe(false);
    expect(isTier3SupportRecipient(T.skill,true)).toBe(true);expect(isTier3SupportRecipient(T.skill,false)).toBe(false);
    expect(isTier3SupportRecipient('tier3-tier4-h00K',false)).toBe(true);
    expect(isTier3SupportRecipient('tier3-tier4-h03R',false)).toBe(true);
  });
  it('keeps exact listed units regardless of client HP/block/distance and keeps dead monster actors',()=>{
    const actors=new Map([['ally',actor('h00J',90)],['dead',actor(undefined,7)],['other',actor('h00L',2,1)],['absent',actor('h00M',1)]]);
    const state={units:{ally:{zone:0,hp:0,block:0,slot:-1} as Unit},enemies:{}} as Pick<GameState,'units'|'enemies'>;
    expect(splitCoinRecipients(['ally','ally','dead','other','absent','missing'],state,actors,0))
      .toEqual({support:[new Vector3(90,0,0)],hits:[new Vector3(7,0,0)]});
  });
  it('routes mixed events to separate damage and shield lists without hurting allies',()=>{
    const field=Object.create(Battlefield.prototype) as Battlefield,show=vi.fn();
    const source=actor('h03S',0),ally=actor('h00J',2),victim=actor(undefined,6);
    Object.assign(field,{tier6:new Tier6Snapshot(),truongStatus:new TruongStatusTracker(),actors:new Map([['source',source],['ally',ally],['enemy',victim]]),
      effects:{show},audio:{play:vi.fn()},reducedMotion:{matches:true},zone:0});
    const mixed={...event,targets:['enemy','ally']};
    const handle=field as unknown as {handleEvent(e:GameEvent,s:Pick<GameState,'units'|'enemies'>):void};
    handle.handleEvent(mixed,{units:{ally:{zone:0} as Unit},enemies:{}});
    expect(show).toHaveBeenCalledWith(mixed,new Vector3(8,0,0),source.root.position,[victim.root.position],undefined,[ally.root.position]);
    expect(victim.hitFlashTime).toBeGreaterThan(0);expect(victim.action).toBe('idle');expect(ally.action).toBe('idle');expect(ally.hitFlashTime).toBe(0);
  });
  it('keeps support-only events and no origin when caster is missing, dead or in another zone',()=>{
    for(const caster of [undefined,{...actor('h03S',40),dying:true},actor('h03S',40,1)]) {
      const field=Object.create(Battlefield.prototype) as Battlefield,show=vi.fn(),ally=actor('h00J',2);
      const actors=new Map<string,ReturnType<typeof actor>>([['ally',ally]]);if(caster)actors.set('source',caster);
      Object.assign(field,{tier6:new Tier6Snapshot(),truongStatus:new TruongStatusTracker(),actors,effects:{show},audio:{play:vi.fn()},reducedMotion:{matches:true},zone:0});
      const receipt={...event,x:undefined,z:undefined,targets:['ally']};
      (field as unknown as {handleEvent(e:GameEvent,s:Pick<GameState,'units'|'enemies'>):void}).handleEvent(receipt,{units:{ally:{zone:0} as Unit},enemies:{}});
      expect(show).toHaveBeenCalledWith(receipt,ally.root.position,undefined,[],undefined,[ally.root.position]);
    }
  });
  it('withholds moved/dead caster origins for modern self-centred heroes but preserves local real hits',()=>{
    for(const skill of ['tier3-tier4-h00J','tier3-tier4-h00P','tier3-tier4-h00O','tier3-tier4-h00Q'])
      for(const caster of [undefined,{...actor('h00J',30),dying:true},actor('h00J',30,1)]) {
        const field=Object.create(Battlefield.prototype) as Battlefield,show=vi.fn(),victim=actor(undefined,5);
        const actors=new Map<string,ReturnType<typeof actor>>([['enemy',victim]]);if(caster)actors.set('source',caster);
        Object.assign(field,{tier6:new Tier6Snapshot(),truongStatus:new TruongStatusTracker(),actors,effects:{show},audio:{play:vi.fn()},reducedMotion:{matches:true},zone:0});
        const hit={...event,skillId:skill,target:'enemy',targets:['enemy']};
        (field as unknown as {handleEvent(e:GameEvent,s:Pick<GameState,'units'|'enemies'>):void}).handleEvent(hit,{units:{},enemies:{}});
        expect(show).toHaveBeenCalledWith(hit,new Vector3(8,0,0),undefined,[victim.root.position]);
      }
  });
  it('prioritizes a valid event axis, rejects a zero/invalid axis, never invents an origin or fixed travel',()=>{
    expect(coinDirection({direction:{x:0,z:-4}},{x:0,z:0},{x:8,z:0})).toEqual({x:0,z:-1});
    expect(coinDirection({direction:{x:0,z:0}},{x:0,z:0},{x:8,z:0})).toEqual({x:1,z:0});
    expect(coinDirection({direction:{x:NaN,z:0}},undefined,{x:8,z:0})).toBeUndefined();
    expect(coinDirection({},undefined,{x:8,z:0})).toBeUndefined();
    expect(coinDirection({},{x:1,z:1},{x:1,z:1})).toBeUndefined();
    const hero=Object.create(VisualTrieuCongMinh.prototype) as VisualTrieuCongMinh;
    const pieces={strike:vi.fn()},charge={cancel:vi.fn(),begin:vi.fn()};Object.assign(hero,{pieces,charge,art:{prepare:vi.fn()}});
    const at=new Vector3(8,0,0),ally=new Vector3(2,0,1);
    hero.ability(event,at,at,false,{hasOrigin:false,targets:[at],supportTargets:[ally]});
    expect(pieces.strike).toHaveBeenCalledWith(undefined,undefined,[at],[ally],false);
    hero.cast({...event,kind:'cast'},at,false,Vector3.Zero());expect(charge.begin).not.toHaveBeenCalled();
  });
  it('accepts the shared default ultimate replay, caps pending work and clears before resolution',()=>{
    const hero=Object.create(VisualTrieuCongMinh.prototype) as VisualTrieuCongMinh,cast=vi.fn(),ability=vi.fn();
    Object.assign(hero,{cast,ability,replayQueue:[],charge:{clear:vi.fn(),tick:vi.fn()},pieces:{clear:vi.fn(),tick:vi.fn()},art:{clear:vi.fn()}});
    expect(hero.replay(Vector3.Zero(),new Vector3(6,0,0),false,'ultimate')).toBe(true);
    expect(hero.replay(Vector3.Zero(),new Vector3(6,0,0),true,'skill')).toBe(true);
    expect(hero.replay(Vector3.Zero(),new Vector3(NaN,0,0),false)).toBe(false);
    hero.replay(Vector3.Zero(),new Vector3(6,0,0),false);hero.replay(Vector3.Zero(),new Vector3(6,0,0),false);
    expect(hero.replay(Vector3.Zero(),new Vector3(6,0,0),false)).toBe(false);
    hero.clear();hero.tick(.3);expect(ability).not.toHaveBeenCalled();
  });
  it('bounds the entire coin plane inside 8×2 and inverts acceleration for actual-target arrival',()=>{
    expect(COIN_SIZE*Math.SQRT2/2).toBe(COIN_RADIUS);expect(COIN_RADIUS).toBeLessThan(T.width/2);
    for(const age of [0,.1,.3,.5,FLIGHT]) {
      const distance=coinDistance(age);expect(distance-COIN_RADIUS).toBeGreaterThanOrEqual(0);
      expect(distance+COIN_RADIUS).toBeLessThanOrEqual(T.length);
      expect(coinArrival({x:0,z:0},{x:1,z:0},{x:distance,z:0})).toBeCloseTo(age);
    }
    expect(coinDistance(.2)-coinDistance(.1)).toBeLessThan(coinDistance(.5)-coinDistance(.4));
    expect(coinArrival(undefined,{x:1,z:0},{x:7,z:0})).toBe(0);
  });
  it('holds charge at exact windup, locks reduced poses/time and crops tail UV proportionately',()=>{
    expect(coinCharge(.31,.25,false)).toEqual(coinCharge(.25,.25,false));
    for(const age of [0,.2,.5]) {
      expect(coinCharge(age,.25,true)).toMatchObject({frame:0,size:1,time:0});
      expect(coinPhase(age,.8,true)).toMatchObject({frame:3});
    }
    const tail=coinTrail(.1,coinDistance(.1));expect(tail.length).toBeCloseTo(tail.fraction*3.1);
    expect(coinTrailUvs([0,0,1,0,1,1,0,1],.25)).toEqual([.75,0,1,0,1,1,.75,1]);
    for(const dir of [new Vector3(1,0,0),new Vector3(-1,0,0),new Vector3(0,0,1),new Vector3(0,0,-1)]) {
      const mesh={rotationQuaternion:null,position:Vector3.Zero(),scaling:Vector3.One(),billboardMode:7};
      expect(placeStrip(mesh as never,dir.scale(4),dir,new Vector3(0,-.669,-.743),3,.88)).toBe(true);
      expect(mesh.position).toEqual(dir.scale(2.5));expect(mesh.scaling.y).toBe(.88);
    }
  });
  it('retries cold art at original age, fires each hit once and empties all queues on clear',()=>{
    const pieces=Object.create(TrieuCongMinhPieces.prototype) as TrieuCongMinhPieces;
    const art={pose:vi.fn(),release:vi.fn()},spray={ring:vi.fn()},bank={tick:vi.fn(),ring:vi.fn(),spray:vi.fn(()=>spray),clear:vi.fn()};
    Object.assign(pieces,{scene:{activeCamera:null},art,bank,lines:{releaseAll:vi.fn()},time:0,shots:[],hits:[],receipts:[]});
    const at=new Vector3(5,0,0);pieces.strike(undefined,undefined,[at],[at],false);
    pieces.tick(.18);expect(art.pose).toHaveBeenCalledWith(expect.anything(),'hit',at,2.25,2,1);
    expect(bank.ring).toHaveBeenCalledTimes(1);expect(spray.ring).toHaveBeenCalledTimes(1);
    pieces.tick(.12);expect(bank.ring).toHaveBeenCalledTimes(1);
    pieces.clear();expect(pieces).toMatchObject({shots:[],hits:[],receipts:[]});
    const count=art.pose.mock.calls.length;pieces.tick(HIT_LIFE);expect(art.pose).toHaveBeenCalledTimes(count);
  });
  it('charge retries missing mesh, cancels after windup+.3 without resolving, and resets quaternions',()=>{
    const charge=Object.create(TrieuCongMinhCharge.prototype) as TrieuCongMinhCharge;
    const art={pose:vi.fn(),release:vi.fn()},pool={acquire:vi.fn(),release:vi.fn(),releaseAll:vi.fn()};
    Object.assign(charge,{scene:{activeCamera:null},art,cores:pool,lines:pool,live:[]});
    charge.begin('x',Vector3.Zero(),{x:1,z:0},.4,false);charge.tick(.2);expect(art.pose).toHaveBeenCalledTimes(2);
    charge.tick(.51);expect(charge).toMatchObject({live:[]});charge.clear();expect(pool.releaseAll).toHaveBeenCalledTimes(2);
    const painter=Object.create(TrieuCongMinhArt.prototype) as TrieuCongMinhArt,release=vi.fn();
    Object.assign(painter,{planes:{release}});const slot={mesh:{rotationQuaternion:{}}};
    painter.release(slot as never);expect(release).toHaveBeenCalledWith({rotationQuaternion:null});expect(slot.mesh).toBeUndefined();
  });
  it('retains raw hashes/prompts/BLOCKED_ART, measured shared canvases, true grids and runtime atlas metadata',()=>{
    for(const item of inventory.assets) {
      expect(createHash('sha256').update(readFileSync(new URL(`../../../${item.raw}`,import.meta.url))).digest('hex')).toBe(item.rawSha256);
      expect(item.historicalStatus).toBe('BLOCKED_ART');expect(item.prompt).toContain('/prompts/');
    }
    for(const key of ['spin','hit','receipt'] as const) {
      expect(layout[key]).toMatchObject({frames:8,columns:4,rows:2,cell:320,canvasSource:576});
      expect(layout[key].alphaBounds.every(b=>b.length===4&&b[0]>0&&b[1]>0&&b[2]<320&&b[3]<320)).toBe(true);
      expect(atlases.atlases.find(a=>a.id===`trieu-cong-minh-${key}`)).toMatchObject({frames:8,tile:'4x2',quality:90,depthWrite:false});
    }
  });
});
