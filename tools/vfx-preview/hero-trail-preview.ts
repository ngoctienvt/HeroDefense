/**
 * Offline preview of a 3D hero's attack with its weapon trail (not the game): the real loader (createHeroModel) and
 * pose sampling, stepped with a fixed dt. ?hero=h009&face=side|front&r=14. window.__shots holds PNG data URLs.
 */
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { createHeroModel } from '../../apps/client/src/visual-hero-model.js';
import { HERO_MODELS } from '../../apps/client/src/hero-models.js';
import { configureCombatDrawOrder } from '../../apps/client/src/visual-kit-draw-order.js';

const params = new URLSearchParams(location.search);
const spec = HERO_MODELS[params.get('hero') ?? 'h009'];
const canvas = document.getElementById('c') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(.36, .42, .33, 1);
configureCombatDrawOrder(scene);
new ArcRotateCamera('cam', Math.PI / 2 + Number(params.get('yaw') ?? 0), .84, Number(params.get('r') ?? 13), new Vector3(0, 2, 0), scene);
const light = new HemisphericLight('sky', new Vector3(-.4, 1, -.3), scene);
light.intensity = 1.1; light.groundColor = new Color3(.45, .42, .38);
const ground = MeshBuilder.CreateGround('g', { width: 40, height: 40 }, scene);
const gm = new StandardMaterial('gm', scene); gm.diffuseColor = new Color3(.42, .5, .34); gm.specularColor = Color3.Black(); ground.material = gm;
const shots: string[] = [];
const w = window as unknown as { __shots: string[]; __done: boolean; __error: string };
w.__shots = shots;

async function main() {
  if (!spec) throw new Error('no model for ' + params.get('hero'));
  const actor = new TransformNode('actor-1', scene);
  const model = createHeroModel(scene, actor, true, spec);
  const t0 = performance.now();
  while (!model.ready() && performance.now() - t0 < 20000) await new Promise(r => setTimeout(r, 50));
  await scene.whenReadyAsync();
  const side = params.get('face') !== 'front';
  const base = { moving: false, facingX: side ? 1 : 0, facingZ: side ? 0 : 1, reduced: false, frozen: false, flash: 0 };
  const dt = 1 / 60;
  model.update({ ...base, action: 'idle', progress: 0, dt });
  scene.render();
  const n = Math.round(spec.attackSeconds / dt);
  const marks = [spec.raisedProgress, (spec.raisedProgress + spec.impactProgress) / 2, spec.impactProgress,
    Math.min(.99, spec.impactProgress + .08), Math.min(.99, spec.impactProgress + .2)];
  let next = 0;
  for (let i = 0; i <= n; i++) {
    const progress = i / n;
    model.update({ ...base, action: 'attack', progress, dt });
    scene.render();
    if (next < marks.length && progress >= marks[next]) {
      shots.push(`p${progress.toFixed(2)}|` + canvas.toDataURL('image/png')); next++;
    }
  }
  w.__done = true;
}
main().catch(e => { w.__error = String(e?.stack ?? e); });
