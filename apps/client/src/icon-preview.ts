import { debug } from './debug.js';
import { icon, ICONS, type IconName } from './ui-icons.js';

/**
 * Dev-only icon review sheet: open the game with `?icons=1` to see every HUD icon at its real
 * sizes (16 / 20 / 28 px) on the dark HUD ink and on a light, sunlit ground. Esc closes it.
 */
export function maybeShowIconPreview(): void {
  if (typeof location === 'undefined' || !new URLSearchParams(location.search).has('icons')) return;
  const names = Object.keys(ICONS) as IconName[];
  const sheet = document.createElement('section');
  sheet.className = 'icon-preview';
  sheet.setAttribute('aria-label', 'Bảng xem trước icon');
  const grounds = [['#141c1e', 16], ['#24312f', 20], ['#24312f', 28], ['#c9d6c2', 20], ['#e9e1c9', 28]] as const;
  const labelled = document.createElement('div');
  labelled.className = 'icon-preview-grid';
  for (const name of names) {
    const cell = document.createElement('figure');
    cell.append(icon(name, { size: 40 }), Object.assign(document.createElement('figcaption'), { textContent: name }));
    labelled.append(cell);
  }
  sheet.append(labelled);
  for (const [background, size] of grounds) {
    const row = document.createElement('div');
    row.className = 'icon-preview-row';
    row.style.background = background;
    for (const name of names) row.append(icon(name, { size, label: name }));
    sheet.append(row);
  }
  const close = (event: KeyboardEvent) => { if (event.key === 'Escape') { sheet.remove(); window.removeEventListener('keydown', close); } };
  window.addEventListener('keydown', close);
  document.body.append(sheet);
  debug('ui.icon-preview', { icons: names.length });
}
