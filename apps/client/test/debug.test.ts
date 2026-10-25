import { afterEach, describe, expect, it, vi } from 'vitest';
import { debug, debugLog } from '../src/debug.js';

describe('visual debug environment boundary', () => {
  afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
  it('records diagnostics without browser globals', () => {
    vi.stubGlobal('location', undefined);
    const output = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    expect(() => debug('visual.test.headless', { ready: false })).not.toThrow();
    expect(debugLog().at(-1)).toMatchObject({ event: 'visual.test.headless', detail: { ready: false } });
    expect(output).not.toHaveBeenCalled();
  });
  it('prints browser diagnostics only when debug is enabled', () => {
    const output = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    vi.stubGlobal('location', { search: '' }); debug('visual.test.browser');
    expect(output).not.toHaveBeenCalled();
    vi.stubGlobal('location', { search: '?debug=1' }); debug('visual.test.browser');
    expect(output).toHaveBeenCalledOnce();
  });
});
