import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HudRenderGuard } from '../src/hud-render-guard.js';

describe('HUD interaction render guard', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('keeps a pressed control through snapshots and throttled forced refreshes until click', () => {
    let renderedVersion = 0, latestVersion = 0;
    const guard = new HudRenderGuard(() => { renderedVersion = latestVersion; });
    guard.begin();
    for (latestVersion = 1; latestVersion <= 5; latestVersion++) {
      expect(guard.defer()).toBe(true);
      vi.advanceTimersByTime(200);
      expect(renderedVersion).toBe(0);
    }
    guard.endAfterEvent(); // pointerup
    expect(guard.defer()).toBe(true);
    guard.end(); // click capture, before the button action
    expect(guard.defer()).toBe(false);
    vi.runAllTimers();
    expect(renderedVersion).toBe(latestVersion);
  });

  it('coalesces pending updates into one refresh after click', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    guard.begin();
    guard.defer(); guard.defer(); guard.defer();
    guard.end();
    expect(refresh).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(guard.defer()).toBe(false);
  });

  it('recovers when release is outside the control and no click follows', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    guard.begin(); guard.defer(); guard.endAfterEvent();
    vi.runAllTimers();
    expect(guard.defer()).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('releases on cancellation or window blur without invoking any button action', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    guard.begin(); guard.defer(); guard.end();
    vi.runAllTimers();
    expect(guard.defer()).toBe(false);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('does not flush an earlier interaction under a new press', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    guard.begin(); guard.defer(); guard.end(); guard.begin();
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
    expect(guard.defer()).toBe(true);
    guard.end(); vi.runAllTimers();
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it('allows ordinary refreshes and clicks without requesting extra renders', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    expect(guard.defer()).toBe(false);
    guard.end(); vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
  });

  it('cleans up a pending release when the page is disposed', () => {
    const refresh = vi.fn();
    const guard = new HudRenderGuard(refresh);
    guard.begin(); guard.defer(); guard.endAfterEvent(); guard.dispose();
    vi.runAllTimers();
    expect(refresh).not.toHaveBeenCalled();
    expect(guard.defer()).toBe(false);
  });
});
