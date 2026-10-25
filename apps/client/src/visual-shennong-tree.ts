import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Matrix } from '@babylonjs/core/Maths/math.vector.js';
import { Mesh } from '@babylonjs/core/Meshes/mesh.js';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import type { TransformNode } from '@babylonjs/core/Meshes/transformNode.js';
import type { Scene } from '@babylonjs/core/scene.js';
import type { VisualMaterials } from './visual-materials.js';
import { debug } from './debug.js';
import manifest from './visual-tier6-art-manifest.json';

/** Live tree props by actor id (root name), so the grove can make each one rise from its roots. */
const props = new Map<string, Mesh>();

/**
 * Scales the real tree prop about its foot (the plane's origin). The health bar is parented to the prop, so it keeps
 * its size (inverse scale) and rides the canopy top. Unknown/disposed ids are ignored (the actor may be gone).
 */
export function growMedicinalTree(id: string, scale: number): void {
  const mesh = props.get(id);
  if (!mesh || mesh.isDisposed()) { props.delete(id); return; }
  const s = Math.max(.05, scale);
  mesh.scaling.set(s, s, 1);
  for (const child of mesh.getChildTransformNodes(true)) child.scaling.setAll(1 / s);
}

/** Real summon actor art, with a fixed foot anchor; HP/selection/death remain actor-owned. */
export function createMedicinalTree(scene: Scene, palette: VisualMaterials, root: TransformNode) {
  const spec = manifest['ancient-medicinal-tree'], height = 7;
  const material = palette.get('shennong-tree-art', '#ffffff', 1);
  if (!material.diffuseTexture) {
    const texture = new Texture(spec.url, scene, false, true, Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('visual.shennong.tree.ready'),
      () => debug('visual.kit.asset.error', { asset: 'ancient-medicinal-tree' }));
    texture.hasAlpha = true;
    material.diffuseTexture = material.emissiveTexture = texture;
    material.diffuseColor = material.emissiveColor = Color3.White();
    material.specularColor = Color3.Black();
    material.disableLighting = material.disableDepthWrite = true;
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
  }
  const mesh = MeshBuilder.CreatePlane('shennong-ancient-tree-art', { height, width: height * spec.width / spec.height }, scene);
  mesh.bakeTransformIntoVertices(Matrix.Translation(0, (spec.anchorY - .5) * height, 0));
  mesh.parent = root; mesh.billboardMode = Mesh.BILLBOARDMODE_ALL; mesh.material = material;
  mesh.position.y = .06; mesh.setEnabled(false); mesh.isPickable = true;
  mesh.metadata = { actorId: root.name };
  if (props.size > 48) for (const [key, prop] of props) if (prop.isDisposed()) props.delete(key);
  props.set(root.name, mesh);
  // Frame route prevents the generic breathing/flip deformation of a static nonhero prop.
  return { mesh, animated: true, restY: .06, healthBarY: height * spec.anchorY + .35,
    ready: () => material.diffuseTexture?.isReady() ?? false, setFrame: () => undefined };
}
