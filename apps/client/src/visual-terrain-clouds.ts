import '@babylonjs/core/Shaders/sprites.vertex.js';
import '@babylonjs/core/Shaders/sprites.fragment.js';
import '@babylonjs/core/Sprites/spriteSceneComponent.js';
import { Color4 } from '@babylonjs/core/Maths/math.color.js';
import { Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { Sprite } from '@babylonjs/core/Sprites/sprite.js';
import { SpriteManager } from '@babylonjs/core/Sprites/spriteManager.js';
import type { Scene } from '@babylonjs/core/scene.js';

/**
 * Soft volumetric-looking clouds and a few gliding birds, all as camera-facing sprites.
 * Sprites are cheap, alpha-feathered (no hard sheet edges) and depth-tested, so the island always
 * draws over them. Everything stays outside the commandable ground and never receives clicks.
 */
const rngFrom = (seed: number) => () => (seed = (seed * 16807) % 2147483647) / 2147483647;

/** One fluffy puff: overlapping feathered discs, sunlit top, blue-grey belly. PNG data URL. */
export function puffImage(): string {
  const size = 256, canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  const rnd = rngFrom(11);
  const disc = (x: number, y: number, r: number, alpha: number) => {
    const g = c.createRadialGradient(x, y, r * .15, x, y, r);
    g.addColorStop(0, `rgba(255,255,255,${alpha})`); g.addColorStop(.6, `rgba(255,255,255,${alpha * .55})`); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2);
  };
  for (let i = 0; i < 9; i++) disc(size * (.22 + rnd() * .56), size * (.38 + rnd() * .3), size * (.16 + rnd() * .14), .95);
  c.globalCompositeOperation = 'source-atop'; // shade the belly, warm the sunlit top
  const shade = c.createLinearGradient(0, size * .25, 0, size * .8);
  shade.addColorStop(0, 'rgba(255,244,222,.55)'); shade.addColorStop(.45, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(110,135,190,.7)');
  c.fillStyle = shade; c.fillRect(0, 0, size, size);
  return canvas.toDataURL('image/png');
}

function birdImage(): string {
  const canvas = document.createElement('canvas');
  canvas.width = 128; canvas.height = 64;
  const c = canvas.getContext('2d')!;
  c.strokeStyle = '#2b2f4a'; c.lineWidth = 7; c.lineCap = 'round'; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(6, 40); c.quadraticCurveTo(34, 6, 64, 36); c.quadraticCurveTo(94, 6, 122, 40); c.stroke(); // gull "M"
  return canvas.toDataURL('image/png');
}

interface Cloud { sprite: Sprite; x: number; y: number; z: number; speed: number; phase: number }
interface Mist { sprite: Sprite; angle: number; radius: number; speed: number; y: number; phase: number }
interface Bird { sprite: Sprite; radius: number; angle: number; speed: number; y: number; flap: number; size: number }

export interface SkyCreatures { update(dt: number, time: number): void; dispose(): void }

export function buildCloudsAndBirds(scene: Scene): SkyCreatures {
  const rnd = rngFrom(97);
  const puffs = new SpriteManager('island-cloud-puffs', puffImage(), 160, 256, scene);
  puffs.isPickable = false;
  const clouds: Cloud[] = [];
  const add = (x: number, y: number, z: number, size: number, tint: [number, number, number], alpha: number, speed: number) => {
    const sprite = new Sprite('puff', puffs);
    sprite.position = new Vector3(x, y, z); sprite.size = size; sprite.color = new Color4(tint[0], tint[1], tint[2], alpha);
    sprite.angle = (rnd() - .5) * .3;
    clouds.push({ sprite, x, y, z, speed, phase: rnd() * 6.28 });
  };
  // Cloud sea far below: big, hazier toward the distance (bluer, more transparent).
  for (let i = 0; i < 70; i++) {
    const angle = rnd() * Math.PI * 2, distance = 70 + Math.sqrt(rnd()) * 330;
    const far = distance / 400;
    add(Math.cos(angle) * distance, -46 - rnd() * 22, Math.sin(angle) * distance, 70 + rnd() * 70,
      [1 - far * .22, 1 - far * .12, 1], .95 - far * .3, (i % 2 ? 1 : -1) * (1.5 + rnd() * 1.5));
  }
  // Drifting banks around the island's belly, clear of the playable top.
  for (let i = 0; i < 36; i++) {
    const side = i % 2 ? 1 : -1, x = side * (62 + rnd() * 110), z = -90 + rnd() * 190;
    add(x, -4 - rnd() * 24, z, 24 + rnd() * 26, [1, 1, 1], .88, side * -(2 + rnd() * 2.5));
  }

  // Mist hugging the cliffs: slow orbits just outside the island rim, never over the playable top.
  const mist: Mist[] = Array.from({ length: 22 }, (_, i) => {
    const sprite = new Sprite('mist', puffs);
    sprite.size = 30 + rnd() * 22; sprite.color = new Color4(.93, .96, 1, .42); sprite.angle = rnd() * 3;
    return { sprite, angle: rnd() * 6.28, radius: 58 + rnd() * 16, speed: (.012 + rnd() * .012) * (i % 2 ? 1 : -1), y: -3 - rnd() * 16, phase: rnd() * 6.28 };
  });

  const birdManager = new SpriteManager('island-birds', birdImage(), 16, { width: 128, height: 64 }, scene);
  birdManager.isPickable = false;
  const birds: Bird[] = Array.from({ length: 7 }, (_, i) => {
    const sprite = new Sprite('bird', birdManager);
    const size = 5 + rnd() * 2.5;
    sprite.width = size; sprite.height = size / 2;
    return { sprite, radius: 95 + rnd() * 40, angle: rnd() * 6.28, speed: (.05 + rnd() * .03) * (i % 2 ? 1 : -1), y: 14 + rnd() * 20, flap: rnd() * 6.28, size };
  });

  return {
    update(dt, time) {
      for (const cloud of clouds) {
        cloud.x += cloud.speed * dt;
        if (cloud.x > 260) cloud.x = -260; else if (cloud.x < -260) cloud.x = 260;
        cloud.sprite.position.x = cloud.x; cloud.sprite.position.y = cloud.y + Math.sin(time * .25 + cloud.phase) * .8;
      }
      for (const m of mist) {
        m.angle += m.speed * dt;
        m.sprite.position.set(Math.cos(m.angle) * m.radius * 1.12, m.y + Math.sin(time * .3 + m.phase), -5 + Math.sin(m.angle) * m.radius * .95);
      }
      for (const bird of birds) {
        bird.angle += bird.speed * dt;
        bird.sprite.position.set(Math.cos(bird.angle) * bird.radius, bird.y + Math.sin(bird.angle * 3) * 2, -5 + Math.sin(bird.angle) * bird.radius * .8);
        bird.sprite.height = bird.size / 2 * (.35 + .65 * Math.abs(Math.sin(time * 5 + bird.flap))); // wing beat
      }
    },
    dispose() { puffs.dispose(); birdManager.dispose(); },
  };
}
