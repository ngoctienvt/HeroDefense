import { elementColor, shadeHex } from './ui-palette.js';

/**
 * Hand-drawn HUD icon set (24×24). Each icon is cel-shaded like the hero art: a base fill (`ib`),
 * a hard-edged shadow (`is`), gold or red accents (`ig`/`ia`), an ink outline painted under the
 * fill so it stays crisp at 16 px, interior ink lines (`io`) and one rim-light stroke (`ir`).
 * Shapes read by silhouette alone — no Han characters — and colours come from CSS variables,
 * so one icon can be tinted per element, tier or state. Style rules and how to add one: docs/ui-style-guide.md.
 */

/** Points of a regular star polygon, as an SVG path. */
function starPath(cx: number, cy: number, outer: number, inner: number, points: number, rotation = -90): string {
  const parts: string[] = [];
  for (let i = 0; i < points * 2; i++) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = ((rotation + (i * 180) / points) * Math.PI) / 180;
    parts.push(`${i === 0 ? 'M' : 'L'}${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`);
  }
  return `${parts.join(' ')} Z`;
}

/** Cog outline with square teeth plus a centre hole (even-odd fill). */
function gearPath(cx: number, cy: number, outer: number, root: number, teeth: number, hole: number): string {
  const parts: string[] = [];
  const step = (Math.PI * 2) / teeth;
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const corners = [[a - step * .25, root], [a - step * .17, outer], [a + step * .17, outer], [a + step * .25, root], [a + step * .5, root]] as const;
    for (const [angle, radius] of corners) {
      parts.push(`${parts.length === 0 ? 'M' : 'L'}${(cx + radius * Math.cos(angle)).toFixed(2)} ${(cy + radius * Math.sin(angle)).toFixed(2)}`);
    }
  }
  return `${parts.join(' ')} Z M${cx + hole} ${cy} A${hole} ${hole} 0 1 0 ${cx - hole} ${cy} A${hole} ${hole} 0 1 0 ${cx + hole} ${cy} Z`;
}

const sparkle = (x: number, y: number, r: number) =>
  `M${x} ${y - r} L${x + r * .32} ${y - r * .32} L${x + r} ${y} L${x + r * .32} ${y + r * .32} L${x} ${y + r} L${x - r * .32} ${y + r * .32} L${x - r} ${y} L${x - r * .32} ${y - r * .32} Z`;
const circle = (x: number, y: number, r: number) => `M${x + r} ${y} A${r} ${r} 0 1 0 ${x - r} ${y} A${r} ${r} 0 1 0 ${x + r} ${y} Z`;
const ring = (x: number, y: number, outer: number, inner: number) => `${circle(x, y, outer)} ${circle(x, y, inner)}`;

const b = (d: string, extra = '') => `<path class="ib" d="${d}"${extra}/>`;
const s = (d: string) => `<path class="is" d="${d}"/>`;
const g = (d: string) => `<path class="ig" d="${d}"/>`;
const a = (d: string) => `<path class="ia" d="${d}"/>`;
const o = (d: string) => `<path class="io" d="${d}"/>`;
const r = (d: string) => `<path class="ir" d="${d}"/>`;
const evenOdd = ' fill-rule="evenodd"';

const SPEAKER = 'M3 9 H7 L12.5 4.5 V19.5 L7 15 H3 Z';

export const ICONS = {
  // --- Resources ---
  'linh-thach': b('M12 2 L19 8 L16 21.5 L8 21.5 L5 8 Z') + s('M12 9.5 L19 8 L16 21.5 L12.5 21.5 Z') + o('M5 8 L12 9.5 L19 8 M12 9.5 L12.5 21.5') + r('M7 8.4 L10.8 4.2'),
  'dao-duyen': b('M12 1.8 L14.6 9.4 L22.2 12 L14.6 14.6 L12 22.2 L9.4 14.6 L1.8 12 L9.4 9.4 Z') + s('M12 12 L22.2 12 L14.6 14.6 L12 22.2 Z') + g(sparkle(19, 4.5, 2.6)) + r('M9.9 9.6 L11.4 5.4'),
  'linh-dan': g('M2.6 16.4 H21.4 C20.6 19.8 16.8 21.8 12 21.8 C7.2 21.8 3.4 19.8 2.6 16.4 Z') + b(circle(12, 10.4, 6.6)) + s('M5.4 10.4 A6.6 6.6 0 0 0 18.6 10.4 C15.8 12.8 8.2 13.2 5.4 10.4 Z') + g(sparkle(4.4, 4.6, 2.2)) + r('M8.2 7.8 A4.4 4.4 0 0 1 11.6 5.6'),
  'diem-tran-phap': b('M8.5 2.5 H15.5 L21.5 8.5 V15.5 L15.5 21.5 H8.5 L2.5 15.5 V8.5 Z') + s(circle(12, 12, 4.6)) + g(circle(12, 12, 1.8)) + o('M12 2.5 V7.4 M12 16.6 V21.5 M2.5 12 H7.4 M16.6 12 H21.5') + r('M9 4 H15'),

  // --- Gear ---
  'vu-khi': b('M20.6 2.2 L21.8 3.4 L11.4 16.2 L7.8 12.6 Z') + s('M21.8 3.4 L11.4 16.2 L9.8 14.6 Z') + g('M5.2 13.2 L10.8 18.8 L9.2 20.4 L3.6 14.8 Z') + s('M7.9 17.6 L4.2 21.3 L2.7 19.8 L6.4 16.1 Z') + g(circle(3, 21, 1.5)) + r('M18.6 4.6 L12 12'),
  'giap': b('M2.4 8.6 C2.4 5.6 4.6 3.6 7.6 3.6 L9.6 3.6 L12 7.4 L14.4 3.6 L16.4 3.6 C19.4 3.6 21.6 5.6 21.6 8.6 L18.4 9.8 V18.6 Q12 22.6 5.6 18.6 V9.8 Z') + s('M12 7.4 L14.4 3.6 L16.4 3.6 C19.4 3.6 21.6 5.6 21.6 8.6 L18.4 9.8 V18.6 Q15.2 20.6 12 21.1 Z') + g('M9.6 3.6 L12 7.4 L14.4 3.6 L13.2 3.6 L12 5.4 L10.8 3.6 Z') + o('M12 7.4 V20.8 M7.6 13.4 Q12 15.4 16.4 13.4 M2.4 8.6 L5.6 9.8 M21.6 8.6 L18.4 9.8') + r('M4 7.6 C4.4 6 5.6 5 7.2 4.8'),
  'phap-khi': b('M12 3 C14.5 3 15.6 5 15.1 7 C14.8 8.3 13.9 9 13.9 9.6 C17 10.5 19 13 19 16 C19 19.6 16 22 12 22 C8 22 5 19.6 5 16 C5 13 7 10.5 10.1 9.6 C10.1 9 9.2 8.3 8.9 7 C8.4 5 9.5 3 12 3 Z') + s('M18.6 13.6 C18.9 14.4 19 15.2 19 16 C19 19.6 16 22 12 22 C10.8 22 9.7 21.8 8.7 21.4 C13.4 21 17.6 18 18.6 13.6 Z') + g('M9.6 9.1 H14.4 V10.7 H9.6 Z') + s('M10.9 1.4 H13.1 V3.4 H10.9 Z') + r('M7.4 14.6 Q7.9 12.4 10 11.4'),

  // --- Roles ---
  'chien-si': b('M3 3 H6.5 L18 14.5 L14.5 18 L3 6.5 Z') + b('M21 3 H17.5 L6 14.5 L9.5 18 L21 6.5 Z') + g('M12.9 19.6 L19.6 12.9 L21.1 14.4 L14.4 21.1 Z') + g('M11.1 19.6 L4.4 12.9 L2.9 14.4 L9.6 21.1 Z') + r('M5.2 4.2 L11 10'),
  'xa-thu': b('M4.4 1.8 C14.8 2.8 21.2 9.2 22.2 19.6 L18.8 19.8 C17.8 11.6 12.6 6.4 4.2 5.2 Z') + s('M18.8 19.8 C18.4 15.6 17 12 14.8 9.4 C17.8 11.2 21.4 14.6 22.2 19.6 Z') + o('M5.2 3.6 L20.4 18.8') + g('M2.6 21.4 L14.4 9.6 L15.4 10.6 L3.6 22.4 Z') + a('M18.4 5.6 L13 7.6 L16.4 11 Z') + r('M8 3.6 C12 4.6 15 6.6 17.2 9.4'),
  'phap-su': b('M6 5 H18 V19 H6 Z') + s('M4 3 H20 V6.6 H4 Z') + s('M4 17.4 H20 V21 H4 Z') + o('M9 9.6 H15 M9 12.2 H15 M9 14.8 H13') + g(sparkle(18.4, 10.6, 3.2)) + r('M5.4 4.3 H12'),
  'ho-ve': b('M12 2 L20 5 V11 C20 16.5 16.5 20 12 22 C7.5 20 4 16.5 4 11 V5 Z') + s('M12 2 L20 5 V11 C20 16.5 16.5 20 12 22 Z') + g(circle(12, 11, 2.6)) + r('M6 6.4 L11 4.4'),
  'ho-tro': b('M3 9 C7.5 9 11 12 12 16 C7.5 16.5 4 13.5 3 9 Z') + s('M21 9 C16.5 9 13 12 12 16 C16.5 16.5 20 13.5 21 9 Z') + b('M12 2.6 C15 6.6 15 12 12 16 C9 12 9 6.6 12 2.6 Z') + g('M5.6 18 H18.4 L16.8 21 H7.2 Z') + r('M10.8 6 C10.3 8 10.3 10 10.7 12'),

  // --- Ngũ Hành (tinted by element colour) ---
  kim: b('M2.4 11.6 C5 11.6 6 12.8 7.6 12.8 C8 9.4 9.8 6.8 12 6.8 C14.2 6.8 16 9.4 16.4 12.8 C18 12.8 19 11.6 21.6 11.6 C21 17 17.5 19.8 12 19.8 C6.5 19.8 3 17 2.4 11.6 Z') + s('M3.4 15 C5.6 18.2 8.6 19.8 12 19.8 C15.4 19.8 18.4 18.2 20.6 15 C17 17 15 17.4 12 17.4 C9 17.4 7 17 3.4 15 Z') + r('M9.6 10 C10.2 8.8 11 8.2 12 8.1'),
  moc: b('M3.6 20.4 C3.6 11 10 3.6 20.4 3.6 C20.4 13 14 20.4 3.6 20.4 Z') + s('M3.6 20.4 L20.4 3.6 C20.4 13 14 20.4 3.6 20.4 Z') + o('M3.6 20.4 L15.4 8.6 M9.4 14.6 L9.6 10.6 M12.6 11.4 L16.4 11.2') + r('M6.8 15.2 C7.8 10.2 11.8 6.6 16.4 5.4'),
  thuy: b('M12 2.4 C16 8 19 11.5 19 15 C19 19.1 15.9 21.6 12 21.6 C8.1 21.6 5 19.1 5 15 C5 11.5 8 8 12 2.4 Z') + s('M17.6 10.6 C18.5 12 19 13.5 19 15 C19 19.1 15.9 21.6 12 21.6 C10.6 21.6 9.4 21.3 8.4 20.7 C14 20.4 17.8 16.4 17.6 10.6 Z') + r('M8 14.6 C8 12.6 9 10.6 10.6 8.6'),
  hoa: b('M12 1.8 C13 6 18.4 8 18.4 14 C18.4 18.6 15.6 22 12 22 C8.4 22 5.6 18.6 5.6 14.6 C5.6 11.4 7.2 9.4 8.8 7.8 C8.8 10 9.8 11.4 10.9 12 C10.4 8 11 5 12 1.8 Z') + g('M12 11.6 C13.6 13.8 15.2 15 15.2 17.6 C15.2 19.6 13.8 21 12 21 C10.2 21 8.8 19.6 8.8 17.8 C8.8 16 10.4 14.8 12 11.6 Z') + r('M7.8 13 C7.8 11.6 8.2 10.6 8.8 9.8'),
  tho: b('M1.8 20.4 L9 6.6 L12.6 11.8 L15.2 8.6 L22.2 20.4 Z') + s('M15.2 8.6 L22.2 20.4 H16.2 Z M9 6.6 L12.5 11.9 L11.2 20.4 H8.2 Z') + g('M7.3 9.9 L9 6.6 L10.7 9.1 L9.6 10.2 L8.6 9.3 Z') + r('M4.2 17.6 L7.6 11.2'),

  // --- Rail & panels ---
  'chieu-mo': b('M3 21.5 V10 C3 5 7 2 12 2 C17 2 21 5 21 10 V21.5 Z') + s('M7 21.5 V11 C7 8 9.2 6 12 6 C14.8 6 17 8 17 11 V21.5 Z') + g(sparkle(12, 13.5, 4.6)) + r('M5 9 C5.5 6.4 7.6 4.4 10 4'),
  'ghep-tuong': s(circle(5, 5, 2.6)) + s(circle(12, 3.8, 2.6)) + s(circle(19, 5, 2.6)) + o('M6.4 7.4 L10.4 12.6 M12 6.4 V12.2 M17.6 7.4 L13.6 12.6') + b('M12 11 L17.4 15.6 L12 22.2 L6.6 15.6 Z') + s('M12 11 L17.4 15.6 L12 22.2 Z') + r('M8.8 15.2 L11.4 12.8'),
  'doi-hinh': b('M2.5 3.5 A1 1 0 0 1 3.5 2.5 H7.5 A1 1 0 0 1 8.5 3.5 V7.5 A1 1 0 0 1 7.5 8.5 H3.5 A1 1 0 0 1 2.5 7.5 Z') + b('M15.5 3.5 A1 1 0 0 1 16.5 2.5 H20.5 A1 1 0 0 1 21.5 3.5 V7.5 A1 1 0 0 1 20.5 8.5 H16.5 A1 1 0 0 1 15.5 7.5 Z') + g('M9 10 A1 1 0 0 1 10 9 H14 A1 1 0 0 1 15 10 V14 A1 1 0 0 1 14 15 H10 A1 1 0 0 1 9 14 Z') + b('M2.5 16.5 A1 1 0 0 1 3.5 15.5 H7.5 A1 1 0 0 1 8.5 16.5 V20.5 A1 1 0 0 1 7.5 21.5 H3.5 A1 1 0 0 1 2.5 20.5 Z') + b('M15.5 16.5 A1 1 0 0 1 16.5 15.5 H20.5 A1 1 0 0 1 21.5 16.5 V20.5 A1 1 0 0 1 20.5 21.5 H16.5 A1 1 0 0 1 15.5 20.5 Z'),
  'duyen-tran': b(ring(8.6, 12, 6.2, 3.4), evenOdd) + `<path class="ig" fill-rule="evenodd" d="${ring(15.4, 12, 6.2, 3.4)}"/>` + r('M4.4 9.4 A4.8 4.8 0 0 1 7.4 6.8'),
  'cam-nang': b('M2.8 4.4 C6 3.4 9 3.4 12 5 C15 3.4 18 3.4 21.2 4.4 V19.6 C18 18.6 15 18.6 12 20.2 C9 18.6 6 18.6 2.8 19.6 Z') + s('M12 5 C15 3.4 18 3.4 21.2 4.4 V19.6 C18 18.6 15 18.6 12 20.2 Z') + o('M12 5 V20.2 M5.6 8 C7.2 7.6 8.8 7.7 9.8 8.1 M5.6 11 C7.2 10.6 8.8 10.7 9.8 11.1 M5.6 14 C7.2 13.6 8.8 13.7 9.8 14.1') + r('M4.2 5.6 C6 5 8 5 9.6 5.6'),

  // --- Top bar ---
  dot: s('M4.6 1.8 H6.8 V22.2 H4.6 Z') + b('M6.8 3 H19.6 L16.8 7.6 L19.6 12.2 H6.8 Z') + s('M6.8 9.6 H18.1 L19.6 12.2 H6.8 Z') + r('M8.4 4.6 H15.6'),
  'dong-ho': s('M4.6 1.8 H19.4 V4.2 H4.6 Z') + s('M4.6 19.8 H19.4 V22.2 H4.6 Z') + b('M6.8 4.2 H17.2 C17.2 8.2 13.6 10 13.6 12 C13.6 14 17.2 15.8 17.2 19.8 H6.8 C6.8 15.8 10.4 14 10.4 12 C10.4 10 6.8 8.2 6.8 4.2 Z') + g('M8.8 6 H15.2 C14.8 7.6 13.3 8.6 12 9.6 C10.7 8.6 9.2 7.6 8.8 6 Z') + g('M8.8 18.6 C9.4 16.6 10.9 15.6 12 15.1 C13.1 15.6 14.6 16.6 15.2 18.6 Z') + r('M8.2 5.2 C8.4 6.6 9.2 7.6 10 8.4'),
  'linh-tru': s('M6.4 2.6 H17.6 V6 H6.4 Z') + b('M8.4 6 H15.6 V18.8 H8.4 Z') + s('M12.6 6 H15.6 V18.8 H12.6 Z') + s('M5.6 18.8 H18.4 V22 H5.6 Z') + g('M12 8.4 L14.2 12.4 L12 16.4 L9.8 12.4 Z') + r('M9.8 7.4 V17'),
  boss: b('M5 9 C5 5 8 3.4 12 3.4 C16 3.4 19 5 19 9 V14 C19 17 17 19 15 19.5 V21.6 H9 V19.5 C7 19 5 17 5 14 Z') + s('M14 3.6 C17 4.2 19 6 19 9 V14 C19 17 17 19 15 19.5 V21.6 H12.4 V18.6 C15 18 16.6 16 16.6 13 V9 C16.6 6.6 15.6 4.8 14 3.6 Z') + s('M5.4 7.8 C3 7 1.8 4.4 2.4 1.8 C4 3.6 5.8 4.6 7.6 5 Z M18.6 7.8 C21 7 22.2 4.4 21.6 1.8 C20 3.6 18.2 4.6 16.4 5 Z') + g('M7.4 10.8 L10.6 11.8 L10.1 13.6 L7.7 13 Z M16.6 10.8 L13.4 11.8 L13.9 13.6 L16.3 13 Z') + o('M10 17.4 H14 M11.2 19.5 V21.6 M12.8 19.5 V21.6'),
  'cai-dat': `<path class="ib" fill-rule="evenodd" d="${gearPath(12, 12, 10.6, 8.2, 8, 3.2)}"/>` + r('M5.6 8.4 A7.4 7.4 0 0 1 9 5'),
  'am-thanh-bat': b(SPEAKER) + s('M7 15 L12.5 19.5 V12 Z') + g('M14.6 8.4 L16 7 C18.6 9.6 18.6 14.4 16 17 L14.6 15.6 C16.4 13.8 16.4 10.2 14.6 8.4 Z') + g('M17.6 5.4 L19 4 C23.4 8.4 23.4 15.6 19 20 L17.6 18.6 C21.2 15 21.2 9 17.6 5.4 Z'),
  'am-thanh-tat': b(SPEAKER) + s('M7 15 L12.5 19.5 V12 Z') + a('M15 9.6 L16.4 8.2 L18.6 10.4 L20.8 8.2 L22.2 9.6 L20 11.8 L22.2 14 L20.8 15.4 L18.6 13.2 L16.4 15.4 L15 14 L17.2 11.8 Z'),
  'goc-nhin': b('M1.4 12 C4.4 6.4 8 4.4 12 4.4 C16 4.4 19.6 6.4 22.6 12 C19.6 17.6 16 19.6 12 19.6 C8 19.6 4.4 17.6 1.4 12 Z') + g(circle(12, 12, 4.4)) + s(circle(12, 12, 1.9)) + r('M5 10 C7 7.6 9.4 6.3 12 6.2'),
  'roi-phong': b('M3.6 2.4 H13.6 V21.6 H3.6 Z') + s('M5.2 4 H12 V20 H5.2 Z') + g(circle(10.6, 12, 1)) + a('M13.6 9.6 H18 V6.4 L23 12 L18 17.6 V14.4 H13.6 Z'),
  'toc-do': b('M1.8 4.6 L11.2 12 L1.8 19.4 Z') + b('M12.2 4.6 L21.6 12 L12.2 19.4 Z') + s('M12.2 12 H21.6 L12.2 19.4 Z M1.8 12 H11.2 L1.8 19.4 Z') + r('M3.4 7.6 L6.4 10'),
  'sao-chep': s('M8 2.6 H19.4 V16.2 H8 Z') + b('M4.6 7.4 H15.8 V21.4 H4.6 Z') + o('M7.4 11.4 H13 M7.4 14.2 H13 M7.4 17 H11'),

  // --- Actions ---
  'ky-nang': b('M13.8 1.6 L4.6 13.6 H11 L9.4 22.4 L19.4 9.6 H13 Z') + s('M13 9.6 H19.4 L9.4 22.4 L11 13.6 Z') + r('M12.2 4.6 L7.6 10.8'),
  'hop-nhat': b(starPath(10, 13.4, 8.6, 3.8, 5)) + s('M10 13.4 L18.18 10.74 L13.66 14.59 L15.06 20.36 Z') + g('M18.4 1.8 L22.4 6.4 H19.8 V10 H17 V6.4 H14.4 Z') + r('M8 8.6 L9.4 5.4'),
  'xuat-tran': b('M12 1.8 L22.2 12 L12 22.2 L1.8 12 Z') + s('M12 1.8 L22.2 12 L12 22.2 Z') + g('M10.6 6.8 H13.4 V10.6 H17.2 V13.4 H13.4 V17.2 H10.6 V13.4 H6.8 V10.6 H10.6 Z') + r('M4.4 11.2 L10.8 4.8'),
  'thu-hoi': s('M2.8 13.4 H21.2 V21.4 H2.8 Z') + b('M10.4 2.2 H13.6 V8.4 H17.4 L12 14.4 L6.6 8.4 H10.4 Z') + o('M2.8 13.4 H8 M16 13.4 H21.2'),
  neo: b('M12 22.2 C8 16.6 4.8 13 4.8 9 C4.8 5 8 1.8 12 1.8 C16 1.8 19.2 5 19.2 9 C19.2 13 16 16.6 12 22.2 Z') + s('M15 2.4 C17.4 3.4 19.2 6 19.2 9 C19.2 13 16 16.6 12 22.2 C12.6 18.4 16.6 13.6 16.6 9 C16.6 6 15.8 3.8 15 2.4 Z') + g(circle(12, 9, 2.8)) + r('M7 7.6 C7.4 6 8.6 4.6 10.2 4.2'),
  ban: b('M8 7 L7 3.8 L10 4.8 L12 2.8 L14 4.8 L17 3.8 L16 7 C19.6 9 21.2 12.6 21.2 15.6 C21.2 19.6 17 21.6 12 21.6 C7 21.6 2.8 19.6 2.8 15.6 C2.8 12.6 4.4 9 8 7 Z') + s('M7.4 7 H16.6 V8.8 H7.4 Z') + s('M17.6 10 C19.8 11.8 21.2 13.8 21.2 15.6 C21.2 19.6 17 21.6 12 21.6 C15.6 20.6 18.4 18.4 17.6 10 Z') + g(circle(12, 15, 3.2)) + r('M5.6 13.4 C6 11.6 7 10.2 8.4 9.4'),
  'xac-nhan': b('M2.8 12.6 L5.9 9.5 L10 13.6 L18.1 5.5 L21.2 8.6 L10 19.8 Z') + s('M10 19.8 L21.2 8.6 L19.7 7.1 L10 16.8 Z'),
  dong: b('M5 2.8 L12 9.8 L19 2.8 L21.2 5 L14.2 12 L21.2 19 L19 21.2 L12 14.2 L5 21.2 L2.8 19 L9.8 12 L2.8 5 Z'),

  // --- Status ---
  sao: b(starPath(12, 12.6, 10.4, 4.4, 5)) + s('M12 12.6 L21.89 9.39 L16.18 14.04 L18.11 21.02 Z') + r('M9.6 7.6 L11.2 3.8'),
  khoa: s('M6.8 11 V7.6 C6.8 4.6 9.1 2.4 12 2.4 C14.9 2.4 17.2 4.6 17.2 7.6 V11 H14.6 V7.6 C14.6 6 13.4 5 12 5 C10.6 5 9.4 6 9.4 7.6 V11 Z') + b('M4.2 10.4 H19.8 V21.6 H4.2 Z') + s('M14.6 10.4 H19.8 V21.6 H14.6 Z') + s(`${circle(12, 14.4, 1.7)} M11.2 15.6 H12.8 V18.8 H11.2 Z`),
  'nguyen-lieu': b('M2.8 7 L12 2.4 L21.2 7 V17 L12 21.6 L2.8 17 Z') + s('M12 11.6 L21.2 7 V17 L12 21.6 Z') + o('M2.8 7 L12 11.6 L21.2 7 M12 11.6 V21.6 M7.4 4.7 L16.6 9.3') + r('M4.4 9.2 V15.6'),

  // --- Summon packs: rising rarity reads as paper → silver cloud → golden sun seal ---
  'goi-pham': b('M6.6 2.2 H17.4 V21.8 L12 18.6 L6.6 21.8 Z') + s('M14.4 2.2 H17.4 V21.8 L14.4 20 Z') + a(circle(12, 8, 3)) + o('M9.4 13.2 H14.6 M9.4 15.8 H14.6') + r('M8.2 3.8 V12'),
  'goi-tien': b('M6 18.4 C3 18.4 1.8 16.2 1.8 14.2 C1.8 12 3.6 10.6 5.6 10.6 C5.8 7.6 8.2 5.4 11 5.4 C13.4 5.4 15.4 6.9 16.1 9.1 C16.6 9 17 8.9 17.5 8.9 C20.1 8.9 22.2 11 22.2 13.6 C22.2 16.2 20.1 18.4 17.5 18.4 Z') + s('M2.6 16.4 C3.6 17.8 4.6 18.4 6 18.4 H17.5 C19.3 18.4 20.8 17.4 21.6 15.9 C18 16.9 8.8 17.1 2.6 16.4 Z') + g(sparkle(19.4, 4.2, 2.8)) + r('M7.6 10.2 C8.2 8.4 9.6 7.2 11.4 7'),
  'goi-thien': g(starPath(12, 12, 11.6, 7.2, 12, -90)) + b(circle(12, 12, 6.4)) + s('M18.4 12 A6.4 6.4 0 0 1 8 17 C12.6 17.6 17.4 15.6 18.4 12 Z') + a(sparkle(12, 12, 3)) + r('M7.8 9.6 A4.6 4.6 0 0 1 10.4 7.4'),
} as const;

export type IconName = keyof typeof ICONS;

/** Default base tint per icon; elements use the Ngũ Hành palette so the icon and card border agree. */
const TINTS: Partial<Record<IconName, string>> = {
  'linh-thach': '#5fd0c0', 'dao-duyen': '#b48cf0', 'linh-dan': '#e8964a', 'diem-tran-phap': '#e9c46a',
  'vu-khi': '#d9dee3', giap: '#c08a4a', 'phap-khi': '#59b88a',
  'chien-si': '#e7dcc0', 'xa-thu': '#d9b47a', 'phap-su': '#e7dcc0', 'ho-ve': '#9fb4c8', 'ho-tro': '#f0b8c8',
  kim: elementColor(1), moc: elementColor(2), thuy: elementColor(3), hoa: elementColor(4), tho: elementColor(5),
  'chieu-mo': '#d6a65a', 'ghep-tuong': '#e9c46a', 'doi-hinh': '#9fc8d8', 'duyen-tran': '#e07a8a', 'cam-nang': '#c9a46a',
  dot: '#d8483a', 'dong-ho': '#bfe3ea', 'linh-tru': '#5fd0c0', boss: '#b8282e', 'cai-dat': '#c9ced3',
  'am-thanh-bat': '#e7dcc0', 'am-thanh-tat': '#9aa3a8', 'goc-nhin': '#e7dcc0', 'roi-phong': '#a9784a', 'toc-do': '#e9c46a', 'sao-chep': '#e7dcc0',
  'ky-nang': '#ffd36a', 'hop-nhat': '#e9c46a', 'xuat-tran': '#52c46a', 'thu-hoi': '#7fc6d8', neo: '#e9c46a', ban: '#c08a4a',
  'xac-nhan': '#52c46a', dong: '#e7dcc0', sao: '#ffd36a', khoa: '#c9a46a', 'nguyen-lieu': '#c08a4a',
  'goi-pham': '#e8d6a8', 'goi-tien': '#cfe0ec', 'goi-thien': '#ffcf5a',
};

export const ROLE_ICONS: Record<string, IconName> = { warrior: 'chien-si', ranger: 'xa-thu', mage: 'phap-su', guardian: 'ho-ve', support: 'ho-tro' };
export const ELEMENT_ICONS: Record<number, IconName> = { 1: 'kim', 2: 'moc', 3: 'thuy', 4: 'hoa', 5: 'tho' };
export const GEAR_ICONS: readonly IconName[] = ['vu-khi', 'giap', 'phap-khi'];

export function iconTint(name: IconName): string { return TINTS[name] ?? '#e7dcc0'; }

export interface IconOptions { size?: number; label?: string; tint?: string; className?: string }

/** Builds an inline SVG icon. Decorative unless a label is given (then role="img" + aria-label). */
export function icon(name: IconName, options: IconOptions = {}): SVGSVGElement {
  const { size = 20, label, tint = iconTint(name), className = '' } = options;
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('class', `icon icon-${name} ${className}`.trim());
  svg.style.setProperty('--ib', tint);
  svg.style.setProperty('--is', shadeHex(tint, .38));
  if (label) { svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', label); }
  else svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = ICONS[name];
  return svg;
}
