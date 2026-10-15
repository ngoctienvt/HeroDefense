import { Color3 } from '@babylonjs/core/Maths/math.color.js';
import { Engine } from '@babylonjs/core/Engines/engine.js';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial.js';
import { Texture } from '@babylonjs/core/Materials/Textures/texture.js';
import { Scene } from '@babylonjs/core/scene.js';
import { debug } from './debug.js';

/** One material per palette entry keeps draw calls and GPU allocations bounded. */
export class VisualMaterials {
  private cache = new Map<string, StandardMaterial>();
  constructor(private scene: Scene) {}

  get(
    key: string,
    hex: string,
    glow = 0,
    options?: { isGround?: boolean; additive?: boolean }
  ): StandardMaterial {
    let material = this.cache.get(key);
    if (material) return material;

    material = new StandardMaterial(key, this.scene);
    const baseColor = Color3.FromHexString(hex);

    material.diffuseColor = baseColor;
    material.specularColor = new Color3(0.27, 0.23, 0.36);
    material.specularPower = 32;

    material.emissiveColor = Color3.Lerp(baseColor, Color3.White(), 0.2).scale(glow);
    material.backFaceCulling = false;

    if (glow >= 0.8) {
      material.disableLighting = true;
    }

    if (options?.additive) {
      material.alphaMode = Engine.ALPHA_ADD;
      material.disableDepthWrite = true;
    }

    if (options?.isGround) {
      material.zOffset = -2;
    }

    this.cache.set(key, material);
    return material;
  }

  dropShadow(): StandardMaterial {
    const key = 'actor-drop-shadow';
    const existing = this.cache.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(key, this.scene);
    material.diffuseColor = Color3.Black();
    material.specularColor = Color3.Black();
    material.emissiveColor = Color3.Black();
    material.alpha = 0.22;
    material.backFaceCulling = false;
    material.disableLighting = true;
    material.zOffset = -1;
    this.cache.set(key, material);
    return material;
  }

  terrainGround(): StandardMaterial {
    const key = 'xianxia-valley-ground';
    const existing = this.cache.get(key);
    if (existing) return existing;
    const material = this.get(key, '#526c61');
    material.diffuseColor = Color3.White();
    material.specularColor = Color3.Black();
    material.diffuseTexture = new Texture('/assets/xianxia-valley-ground.webp', this.scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('terrain.texture-ready', { asset: key }),
      (_message, error) => {
        material.diffuseTexture = null;
        material.diffuseColor = Color3.FromHexString('#526c61');
        debug('terrain.texture-fallback', { asset: key, error: String(error ?? _message) });
      });
    return material;
  }

  heroSprite(atlas: number): StandardMaterial {
    const key = `hero-sprites-${atlas}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(key, this.scene);
    const texture = new Texture(`/assets/hero-sprites-${atlas}.webp`, this.scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('sprite.atlas-ready', { atlas }),
      (_message, error) => debug('sprite.atlas-fallback', { atlas, error: String(error ?? _message) }));
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.diffuseColor = Color3.White();
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.White();
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    this.cache.set(key, material);
    return material;
  }

  heroMotion(heroId: string): StandardMaterial {
    const key = `hero-motion-${heroId}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(key, this.scene);
    const atlasAnimation = heroId === 'h01B';
    const texture = new Texture(`/assets/${key}.webp`, this.scene, atlasAnimation, true,
      atlasAnimation ? Texture.BILINEAR_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('sprite.motion-ready', { heroId }),
      (_message, error) => debug('sprite.motion-fallback', { heroId, error: String(error ?? _message) }));
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.diffuseColor = Color3.White();
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.White();
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    this.cache.set(key, material);
    return material;
  }

  monsterSprite(monsterId: string): StandardMaterial {
    const key = `monster-${monsterId}`;
    const existing = this.cache.get(key);
    if (existing) return existing;
    const material = new StandardMaterial(key, this.scene);
    const texture = new Texture(`/assets/${key}.webp`, this.scene, false, true,
      Texture.TRILINEAR_SAMPLINGMODE,
      () => debug('sprite.monster-ready', { monsterId }),
      (_message, error) => debug('sprite.monster-fallback', { monsterId, error: String(error ?? _message) }));
    texture.hasAlpha = true;
    material.diffuseTexture = texture;
    material.diffuseColor = Color3.White();
    material.emissiveTexture = texture;
    material.emissiveColor = Color3.White();
    material.useAlphaFromDiffuseTexture = true;
    material.backFaceCulling = false;
    material.specularColor = Color3.Black();
    this.cache.set(key, material);
    return material;
  }
}
