import { describe, expect, it } from 'vitest';
import { GUIDE_SECTIONS, PANEL_KEYS, RAIL_ITEMS } from '../src/hud-keymap.js';
import { ELEMENT_ICONS, GEAR_ICONS, ICONS, ROLE_ICONS, iconTint, type IconName } from '../src/ui-icons.js';

describe('HUD icon set', () => {
  const names = Object.keys(ICONS) as IconName[];

  it('draws every icon with base fill and no scripts, links or emoji', () => {
    for (const name of names) {
      const markup = ICONS[name];
      expect(markup, name).toMatch(/class="i[bg]"/);
      expect(markup, name).not.toMatch(/<script|href|on\w+=/i);
      expect(markup, name).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u);
      expect(markup, name).not.toMatch(/NaN|undefined/);
      expect(iconTint(name), name).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });

  it('covers every role, element, gear slot and rail entry', () => {
    for (const icon of [...Object.values(ROLE_ICONS), ...Object.values(ELEMENT_ICONS), ...GEAR_ICONS, ...RAIL_ITEMS.map(item => item.icon)]) expect(names).toContain(icon);
    expect(Object.keys(ELEMENT_ICONS)).toHaveLength(5);
  });
});

describe('panel keys, rail and guide', () => {
  it('keeps Admin off the rail and out of the guide but reachable with K', () => {
    expect(RAIL_ITEMS.some(item => item.panel === 'admin')).toBe(false);
    expect(PANEL_KEYS.k).toEqual({ panel: 'admin' });
    const guideKeys = GUIDE_SECTIONS.flatMap(section => section.rows.flatMap(row => row.keys));
    expect(guideKeys).not.toContain('K');
    expect(GUIDE_SECTIONS.flatMap(section => section.rows.map(row => row.text)).join(' ')).not.toMatch(/admin/i);
  });

  it('documents every single-letter panel key it binds (except K)', () => {
    const guideKeys = new Set(GUIDE_SECTIONS.flatMap(section => section.rows.flatMap(row => row.keys)).map(key => key.toLowerCase()));
    for (const key of Object.keys(PANEL_KEYS).filter(key => /^[a-z]$/.test(key) && key !== 'k')) expect(guideKeys.has(key), key).toBe(true);
  });

  it('opens T and F as two tabs of one panel, and Tab cycles the camera rather than centring it', () => {
    expect(PANEL_KEYS.t).toEqual({ panel: 'bonds', tab: 'synergy' });
    expect(PANEL_KEYS.f).toEqual({ panel: 'bonds', tab: 'formation' });
    const tabRow = GUIDE_SECTIONS.flatMap(section => section.rows).find(row => row.keys.includes('Tab'));
    expect(tabRow?.text).toMatch(/góc nhìn/i);
  });

  it('exposes the gear inventory on the rail and I shortcut', () => {
    expect(RAIL_ITEMS).toHaveLength(6);
    expect(PANEL_KEYS.i).toEqual({ panel: 'gear' });
    expect(RAIL_ITEMS.find(item => item.panel === 'gear')?.keys).toBe('I');
    for (const item of RAIL_ITEMS) expect(item.keys.length).toBeGreaterThan(0);
  });
});
