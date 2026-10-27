/**
 * Offline preview of Kim Tra's real-time bell (not the game): one scene with the battlefield camera, Kim Tra's 3D
 * model and the real VisualKimtra module, stepped with a fixed dt; window.__shots holds PNG data URLs.
 * Not part of the game build; see tools/vfx-preview/README.md.
 */
import '@babylonjs/loaders/glTF/index.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { Scene } from '@babylonjs/core/scene.js';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera.js';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight.js';
import { Color3, Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { LoadAssetContainerAsync } from '@babylonjs/core/Loading/sceneLoader.js';
import { VisualKimtra } from '../../apps/client/src/visual-kimtra.js';
import { KitFlipbooks } from '../../apps/client/src/visual-kit-flipbooks.js';
import { configureCombatDrawOrder, COMBAT_DRAW_GROUP } from '../../apps/client/src/visual-kit-draw-order.js';

const params = new URLSearchParams(location.search);
const canvas = document.getElementById('c') as HTMLCanvasElement;
const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
const scene = new Scene(engine);
scene.clearColor = new Color4(.36, .42, .33, 1);
configureCombatDrawOrder(scene);
const camera = new ArcRotateCamera('cam', Math.PI / 2 + Number(params.get('yaw') ?? 0), .84, Number(params.get('r') ?? 22),
  new Vector3(1, 3, 0), scene);
const light = new HemisphericLight('sky', new Vector3(-.4, 1, -.3), scene);
light.intensity = 1.1; light.groundColor = new Color3(.45, .42, .38);
const ground = MeshBuilder.CreateGround('g', { width: 40, height: 40 }, scene);
const gm = new StandardMaterial('gm', scene); gm.diffuseColor = new Color3(.42, .5, .34); gm.specularColor = Color3.Black(); ground.material = gm;
const ally = new Vector3(3.2, 0, -1.2);
const shots: string[] = [];
(window as unknown as { __shots: string[]; __done: boolean }).__shots = shots;

async function main() {
  const hero = await LoadAssetContainerAsync('/assets/models/kim-tra.glb', scene);
  hero.addAllToScene();
  // same as visual-hero-model.ts: a parent node scaled to the hero height
  const root = new TransformNode('kim', scene);
  for (const node of hero.rootNodes) node.parent = root;
  root.scaling.setAll(3.83);
  for (const m of hero.meshes) m.renderingGroupId = COMBAT_DRAW_GROUP.hero;
  for (const g of hero.animationGroups) g.stop();

  const idle = hero.animationGroups.find(g => g.name === 'idle');
  idle?.start(false); idle?.pause(); idle?.goToFrame(idle.from);
  await scene.whenReadyAsync();
  const vfx = new VisualKimtra(scene, new KitFlipbooks(scene));
  vfx.prepare();
  const t0 = performance.now();
  await new Promise<void>(resolve => {
    const wait = () => (vfx as unknown as { bell3d: { ready: boolean } }).bell3d.ready || performance.now() - t0 > 15000
      ? resolve() : setTimeout(wait, 50);
    wait();
  });
  const at = Vector3.Zero();
  const dt = 1 / 60;
  let time = 0, frame = 0;
  const marks = (until: number) => { if (time < until) { vfx.mark('bell', 'kim', at, false); vfx.mark('bell', 'ally', ally, false); } };
  const step = (n: number, shield: number) => { for (let i = 0; i < n; i++) { marks(shield); vfx.tick(dt, time); time += dt; frame++; } scene.render(); };
  const shot = (label: string) => { scene.render(); shots.push(label + '|' + canvas.toDataURL('image/png')); };
  scene.render();
  const cast = { id: 'c1', kind: 'cast', skillId: 'skill-h009', source: 'kim', windup: .25 } as never;
  vfx.cast(cast, at, false);
  const plan: [number, string][] = [[.08, 'forming .08'], [.22, 'forming .22'], [.3, 'hover .30']];
  const shieldUntil = 1.0 + 2.2;
  for (const [t, label] of plan) { step(Math.round((t - time) / dt), shieldUntil); shot(label); }
  const ability = { id: 'a1', kind: 'ability', skillId: 'skill-h009', source: 'kim' } as never;
  vfx.ability(ability, at, at, false);
  vfx.ability({ ...ability as object, id: 'a2' } as never, at, ally, false);
  const after: [number, string][] = [[.36, 'drop'], [.43, 'slam'], [.5, 'squash'], [.62, 'rebound'], [.78, 'burn'], [.95, 'burn2'],
    [1.3, 'shell'], [2.4, 'shell settled'], [3.26, 'break .06'], [3.4, 'break .2'], [3.6, 'break .4'], [3.9, 'break .7']];
  for (const [t, label] of after) { step(Math.max(1, Math.round((t - time) / dt)), shieldUntil); shot(label); }
  (window as unknown as { __done: boolean }).__done = true;
}
main().catch(e => { (window as unknown as { __error: string }).__error = String(e?.stack ?? e); });
