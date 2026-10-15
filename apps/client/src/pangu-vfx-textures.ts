import { DynamicTexture } from '@babylonjs/core/Materials/Textures/dynamicTexture.js';
import type { Scene } from '@babylonjs/core/scene.js';

/** Deterministic authored fissure: opaque void, molten banks, branching cracks and embedded stars. */
export function panguRiftTexture(scene: Scene): DynamicTexture {
  const texture = new DynamicTexture('pangu-stellar-fracture', { width: 512, height: 1024 }, scene, true);
  const c = texture.getContext();
  let seed = 719;
  const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  c.clearRect(0, 0, 512, 1024);
  c.strokeStyle = 'rgba(255,210,86,.28)'; c.lineWidth = 2; c.strokeRect(2, 2, 508, 1020);
  const left: [number, number][] = [], right: [number, number][] = [];
  for (let i = 0; i <= 36; i++) {
    const y = 18 + i * 27.4, taper = Math.pow(Math.sin(Math.PI * i / 36), .6);
    const center = 256 + (random() - .5) * 65;
    left.push([center - taper * (55 + random() * 68), y]);
    right.push([center + taper * (55 + random() * 68), y]);
  }
  c.beginPath(); c.moveTo(...left[0]);
  for (const p of left) c.lineTo(...p);
  for (const p of [...right].reverse()) c.lineTo(...p);
  c.closePath(); c.fillStyle = '#110b22'; c.fill();
  c.lineJoin = 'miter';
  const trace = (points: [number, number][]) => {
    c.beginPath(); c.moveTo(...points[0]); for (const p of points) c.lineTo(...p);
  };
  for (const bank of [left, right]) {
    for (const [width, color] of [[28, 'rgba(186,89,8,.22)'], [13, '#914716'], [6, '#ffc44b'], [2, '#fff4bd']] as const) {
      trace(bank); c.lineWidth = width; c.strokeStyle = color; c.stroke();
    }
    for (let i = 3; i < bank.length - 3; i += 3) {
      const [x, y] = bank[i], side = bank === left ? -1 : 1;
      const points: [number, number][] = [[x, y], [x + side * 35, y + 14], [x + side * 50, y - 6], [x + side * (75 + random() * 35), y + 22]];
      trace(points); c.lineWidth = 7; c.strokeStyle = '#241624'; c.stroke();
      trace(points); c.lineWidth = 1.5; c.strokeStyle = '#e1a539'; c.stroke();
    }
  }
  for (let i = 0; i < 120; i++) {
    const x = 211 + random() * 90, y = 30 + random() * 960;
    c.fillStyle = i % 7 ? '#a48ed0' : '#fff2b5'; c.globalAlpha = .2 + random() * .65;
    c.fillRect(x, y, i % 7 ? 1.5 : 3, i % 7 ? 1.5 : 3);
  }
  c.globalAlpha = 1; texture.hasAlpha = true; texture.update(); return texture;
}

export function panguStatusTexture(scene: Scene, kind: 'sunder' | 'stun' | 'empower'): DynamicTexture {
  const texture = new DynamicTexture(`pangu-${kind}-icon`, 128, scene, false), c = texture.getContext();
  c.clearRect(0, 0, 128, 128); c.lineWidth = 8; c.lineJoin = 'round';
  c.strokeStyle = '#291722'; c.fillStyle = kind === 'sunder' ? '#ed5354' : '#ffdf70';
  if (kind === 'sunder') {
    c.beginPath(); c.moveTo(22, 22); c.lineTo(106, 22); c.lineTo(97, 75); c.lineTo(64, 109); c.lineTo(31, 75); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(70, 17); c.lineTo(53, 49); c.lineTo(76, 60); c.lineTo(52, 115); c.stroke();
  } else {
    const count = kind === 'stun' ? 3 : 1;
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count, x = count === 1 ? 64 : 64 + Math.cos(angle) * 35, y = count === 1 ? 64 : 64 + Math.sin(angle) * 35;
      c.beginPath();
      for (let j = 0; j < 10; j++) {
        const a = j * Math.PI / 5 - Math.PI / 2, r = j % 2 ? 9 : count === 1 ? 44 : 22;
        if (!j) c.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); else c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
      }
      c.closePath(); c.fill(); c.stroke();
    }
  }
  texture.hasAlpha = true; texture.update(); return texture;
}
