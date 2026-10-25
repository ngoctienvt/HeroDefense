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
import { FAN_ARC_URL, FAN_LIFE, FAN_REACH, fanAlpha, fanScale, fanTurn, ORPHAN_SECONDS, SKILL_RADIUS, STILL_SECONDS,
  STILL_STORM_FRAME, STORM_AFTER_SECONDS, stormBlowFrame, stormGatherFrame, THIETPHIEN_ATLAS, type SkillZone,
} from './visual-thietphien-timeline.js';

/** Painted storm outer diameter is ~85% of its cell; scale 1 fits a circle of SKILL_RADIUS. */
const MAX_STORMS = 4;
const MAX_FANS = 4;

type Storm = {
  key: string; at: Vector3; sprite?: Sprite; age: number; windup: number; scale: number; blowAge?: number; reduced: boolean;
};
type Fan = { mesh: Mesh; material: StandardMaterial };
type FanRun = { fan: Fan; age: number; from: Vector3; heading: number };

/**
 * Ba Tiêu Cuồng Phong Toàn, area part. Cast (server windup): sand lifts and gathers at the target (storm
 * flipbook 0-1). Ability: the banana-leaf fan swings open from her hand (painted ground decal, under every
 * actor), the cyclone ring blooms over the real hit area and settles (storm 2-15, centre left empty so
 * enemies inside stay visible), with a gritty debris spray.
 */
export class ThietphienStorm {
  private storms: Storm[] = [];
  private fans: FanRun[] = [];
  private freeFans: Fan[] = [];
  private fanTexture: Texture;
  private fansCreated = 0;
  private capLogged = false;

  constructor(private scene: Scene, private flipbooks: KitFlipbooks, private grit: KitSpray) {
    this.fanTexture = new Texture(FAN_ARC_URL, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.kit.asset.ready', { asset: 'thietphien-fan-arc' }),
      (_message, error) => debug('visual.kit.asset.error', { asset: 'thietphien-fan-arc', message: String(error ?? 'load failed') }));
    this.fanTexture.hasAlpha = true;
    this.fanTexture.wrapU = this.fanTexture.wrapV = Texture.CLAMP_ADDRESSMODE;
  }

  /** `cast skill-h00B`: `at` is the target point; the gather swirl stays small so it never claims the area. */
  cast(source: string, at: Vector3, windup: number, reduced: boolean): void {
    this.drop(source);
    if (this.storms.length >= MAX_STORMS) return;
    const storm: Storm = { key: source, at: at.clone(), age: 0, windup, scale: 1, reduced };
    storm.sprite = this.flipbooks.spawn(THIETPHIEN_ATLAS.storm, at, storm.scale);
    this.storms.push(storm);
  }

  /** `ability skill-h00B`: the storm opens over the real zone; the fan sweeps from `origin`. */
  blow(source: string, origin: Vector3, zone: SkillZone, reduced: boolean): void {
    let storm = this.storms.find(item => item.key === source && item.blowAge === undefined);
    const centre = new Vector3(zone.center.x, 0, zone.center.z);
    const scale = zone.radius / SKILL_RADIUS;
    if (!storm) {
      if (this.storms.length >= MAX_STORMS) return;
      storm = { key: source, at: centre.clone(), age: 0, windup: 0, scale, reduced };
      storm.sprite = this.flipbooks.spawn(THIETPHIEN_ATLAS.storm, centre, scale);
      this.storms.push(storm);
    }
    storm.at.copyFrom(centre);
    storm.scale = scale;
    storm.reduced = reduced;
    storm.blowAge = 0;
    if (storm.sprite) this.flipbooks.place(THIETPHIEN_ATLAS.storm, storm.sprite, centre, scale);
    if (!reduced) {
      this.grit.ring(centre, zone.radius * .8, 10, .5, 4, 3);
      this.sweepFan(origin, zone);
    }
    debug('visual.thietphien.storm', { kind: zone.kind, radius: +zone.radius.toFixed(2), reduced, sprite: Boolean(storm.sprite) });
  }

  tick(dt: number): void {
    for (let i = this.storms.length - 1; i >= 0; i--) {
      const storm = this.storms[i];
      storm.age += dt;
      let done = false;
      if (storm.blowAge !== undefined) {
        storm.blowAge += dt;
        const limit = storm.reduced ? STILL_SECONDS : STORM_AFTER_SECONDS;
        if (storm.sprite) storm.sprite.cellIndex = storm.reduced ? STILL_STORM_FRAME : stormBlowFrame(storm.blowAge);
        done = storm.blowAge >= limit;
      } else {
        if (storm.sprite) storm.sprite.cellIndex = stormGatherFrame(storm.age, storm.windup);
        done = storm.age >= ORPHAN_SECONDS;
      }
      if (done) { this.flipbooks.release(THIETPHIEN_ATLAS.storm, storm.sprite); this.storms.splice(i, 1); }
    }
    for (let i = this.fans.length - 1; i >= 0; i--) {
      const run = this.fans[i];
      run.age += dt;
      if (run.age >= FAN_LIFE) { this.releaseFan(run.fan); this.fans.splice(i, 1); continue; }
      this.layoutFan(run);
    }
  }

  clear(): void {
    for (const storm of this.storms) this.flipbooks.release(THIETPHIEN_ATLAS.storm, storm.sprite);
    this.storms.length = 0;
    for (const run of this.fans) this.releaseFan(run.fan);
    this.fans.length = 0;
    this.capLogged = false;
  }

  private drop(key: string): void {
    const index = this.storms.findIndex(storm => storm.key === key);
    if (index < 0) return;
    this.flipbooks.release(THIETPHIEN_ATLAS.storm, this.storms[index].sprite);
    this.storms.splice(index, 1);
  }

  private sweepFan(origin: Vector3, zone: SkillZone): void {
    const fan = this.acquireFan();
    if (!fan) return;
    const run: FanRun = { fan, age: 0, from: new Vector3(origin.x, 0, origin.z), heading: Math.atan2(zone.dir.z, zone.dir.x) };
    fan.mesh.setEnabled(true);
    this.fans.push(run);
    this.layoutFan(run);
  }

  /** The decal's pivot (left edge centre) stays on her hand; the plane is centred half a reach ahead. */
  private layoutFan(run: FanRun): void {
    const reach = FAN_REACH * fanScale(run.age);
    const heading = run.heading + fanTurn(run.age);
    const { mesh, material } = run.fan;
    mesh.position.set(run.from.x + Math.cos(heading) * reach / 2, .04, run.from.z + Math.sin(heading) * reach / 2);
    mesh.rotation.y = -heading;
    mesh.scaling.set(reach, 1, reach);
    material.alpha = fanAlpha(run.age);
  }

  private acquireFan(): Fan | undefined {
    const pooled = this.freeFans.pop();
    if (pooled) return pooled;
    if (this.fansCreated >= MAX_FANS) {
      if (!this.capLogged) { this.capLogged = true; debug('visual.kit.pool.cap', { pool: 'thietphien-fan' }); }
      return undefined;
    }
    const name = `thietphien-fan-${this.fansCreated++}`;
    const mesh = MeshBuilder.CreateGround(`kit-${name}`, { width: 1, height: 1 }, this.scene);
    const material = new StandardMaterial(name, this.scene);
    material.diffuseTexture = this.fanTexture;
    material.emissiveTexture = this.fanTexture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.disableDepthWrite = true; // like kitMaterial: actors drawn later must not be clipped by the quad
    mesh.material = material;
    mesh.isPickable = false;
    mesh.alphaIndex = GROUND_ALPHA_INDEX + 4;
    mesh.setEnabled(false);
    return { mesh, material };
  }

  private releaseFan(fan: Fan): void {
    fan.mesh.setEnabled(false);
    this.freeFans.push(fan);
  }
}
