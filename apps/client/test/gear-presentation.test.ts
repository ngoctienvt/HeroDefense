import { afterEach, describe, expect, it } from 'vitest';
import { getGearPresentationKey, getGearTargetUnitId, getSelectedGearItemId, selectGearItem, setGearTargetUnit, subscribeGearPresentation } from '../src/gear-panel.js';

afterEach(() => { selectGearItem(''); setGearTargetUnit(''); });

describe('gear presentation selection', () => {
  it('keeps the item and equipment target independent and notifies only on changes', () => {
    const updates: string[] = [];
    const stop = subscribeGearPresentation(() => updates.push(getGearPresentationKey()));
    selectGearItem('gear-one'); setGearTargetUnit('bench-hero');
    expect(getSelectedGearItemId()).toBe('gear-one');
    expect(getGearTargetUnitId()).toBe('bench-hero');
    expect(updates).toHaveLength(2);
    selectGearItem('gear-one'); setGearTargetUnit('bench-hero');
    expect(updates).toHaveLength(2);
    setGearTargetUnit('deployed-hero');
    expect(getSelectedGearItemId()).toBe('gear-one');
    expect(new Set(updates).size).toBe(3);
    stop(); selectGearItem('gear-two');
    expect(updates).toHaveLength(3);
  });
});
