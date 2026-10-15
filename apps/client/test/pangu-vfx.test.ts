import { describe, expect, it } from 'vitest';
import { Matrix, Vector3 } from '@babylonjs/core/Maths/math.vector.js';
import { panguGroundSlashRotation } from '../src/visual-pangu.js';

describe('Pangu slash aligns with server damage semicircle', () => {
  it.each([{ x: 1, z: 0 }, { x: -1, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -1 }])('faces $x,$z', direction => {
    const rotation = panguGroundSlashRotation(direction);
    const matrix = Matrix.RotationYawPitchRoll(rotation.y, rotation.x, rotation.z);
    const front = Vector3.TransformNormal(Vector3.Up(), matrix);
    expect(front.x).toBeCloseTo(direction.x); expect(front.z).toBeCloseTo(direction.z); expect(front.y).toBeCloseTo(0);
    const behind = Vector3.TransformNormal(new Vector3(0, -1, 0), matrix);
    expect(behind.x * direction.x + behind.z * direction.z).toBeLessThan(0);
  });
});
