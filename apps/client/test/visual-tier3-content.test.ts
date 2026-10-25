import { describe, expect, it } from 'vitest';
import { tier3Ability } from '../src/visual-tier3-content.js';
import { debugLog } from '../src/debug.js';

describe('active tier3 VFX content boundary', () => {
  it('requires the catalog skill without inventing fallback skills', () => {
    expect(tier3Ability('h00Q').id).toBe('tier3-tier4-h00Q');
    expect(() => tier3Ability('missing-vfx-hero')).toThrow('Missing active VFX ability');
    expect(() => tier3Ability('h001')).toThrow('Missing active VFX ability');
    expect(debugLog().at(-1)).toMatchObject({ event: 'visual.tier3.content.invalid' });
  });
});
