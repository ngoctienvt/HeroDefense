import { debug } from './debug.js';

// Atlas 0 holds the first eight art samples; later atlases cover the rest of
// the roster in catalog order. A failed image leaves the role glyph visible.
const groups = [
  ['h001', 'h003', 'h006', 'h007', 'h00C', 'h00F', 'h00R', 'h014'],
  ['h002', 'h004', 'h005', 'h008', 'h009', 'h00A', 'h00B', 'h00D'],
  ['h00E', 'h00G', 'h00H', 'h00I', 'h00J', 'h00K', 'h00L', 'h00M'],
  ['h00N', 'h00O', 'h00P', 'h00Q', 'h00S', 'h00T', 'h00U', 'h00V'],
  ['h00W', 'h00X', 'h00Y', 'h00Z', 'h010', 'h011', 'h012', 'h013'],
  ['h015', 'h016', 'h017', 'h018', 'h019', 'h01A', 'h01B', 'h01C'],
  ['h01D', 'h01E', 'h01F', 'h01G', 'h01H', 'h01I', 'h01J', 'h01K'],
  ['h03O', 'h03P', 'h03Q', 'h03R', 'h03S', 'h03T', 'h03U', 'h03V'],
  ['h03W', 'h03X', 'h03Y', 'h03Z', 'h040', 'h041'],
] as const;

const byHero = new Map<string, { atlas: number; tile: number; columns: number }>();
for (const [atlas, heroes] of groups.entries()) {
  const columns = atlas === 8 ? 3 : 4;
  heroes.forEach((id, tile) => byHero.set(id, { atlas, tile, columns }));
}
const loading = new Map<number, Promise<boolean>>();

export function portraitCoverage(): number { return byHero.size; }
export function hasHeroPortrait(heroId: string): boolean { return byHero.has(heroId); }
export function heroArtTile(heroId: string): { atlas: number; tile: number; columns: number } | undefined {
  return byHero.get(heroId);
}

export function spriteUv(heroId: string): number[] | undefined {
  const tile = byHero.get(heroId);
  if (!tile) return undefined;
  const col = tile.tile % tile.columns;
  const row = Math.floor(tile.tile / tile.columns);
  const u0 = col / tile.columns;
  const u1 = (col + 1) / tile.columns;
  const v0 = row === 0 ? .5 : 0;
  return [u0, v0, u1, v0, u1, v0 + .5, u0, v0 + .5];
}

export function applyHeroPortrait(node: HTMLElement, heroId: string): void {
  const tile = byHero.get(heroId);
  if (!tile) { debug('portrait.missing', { heroId }); return; }
  let ready = loading.get(tile.atlas);
  if (!ready) {
    ready = new Promise<boolean>(resolve => {
      const image = new Image();
      image.onload = () => { debug('portrait.atlas-ready', { atlas: tile.atlas }); resolve(true); };
      image.onerror = () => { debug('portrait.atlas-fallback', { atlas: tile.atlas }); resolve(false); };
      image.src = `/assets/hero-portraits-${tile.atlas}.webp`;
    });
    loading.set(tile.atlas, ready);
  }
  void ready.then(ok => {
    if (!ok) return;
    node.style.backgroundImage = `url('/assets/hero-portraits-${tile.atlas}.webp')`;
    node.style.backgroundSize = `${tile.columns * 100}% 200%`;
    node.style.backgroundPosition = `${(tile.tile % tile.columns) * 100 / (tile.columns - 1)}% ${tile.tile < tile.columns ? 0 : 100}%`;
    node.classList.add('has-art');
  });
}
