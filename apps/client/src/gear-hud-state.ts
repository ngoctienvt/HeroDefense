interface FocusIdentity { item?: string; unit?: string; slot?: string; key?: string; bag?: boolean; scope: string }
const scopeOf = (node: Element): string => node.closest('.gear-panel') ? 'panel' : node.closest('.hud-gear-tray') ? 'tray' : node.closest('.dock-holder') ? 'dock' : 'roster';

/** Preserve keyboard ownership and nested scroll regions across snapshot-driven HUD rebuilds. */
export function captureGearHudState(root: HTMLElement): () => void {
  const active = document.activeElement;
  const focused = active instanceof HTMLElement && root.contains(active) ? active : null;
  let identity: FocusIdentity | null = null;
  if (focused) {
    const { gearItemId: item, gearTargetUnitId: unit, gearSlot: slot, gearFocusKey: key } = focused.dataset;
    const bag = focused.hasAttribute('data-gear-bag-drop');
    if (item || unit || key || bag) identity = { item, unit, slot, key, bag, scope: scopeOf(focused) };
  }
  const scrolls = ['.gear-inventory-grid', '.gear-selected-detail'].map(selector => {
    const node = root.querySelector<HTMLElement>(selector);
    return { selector, top: node?.scrollTop ?? 0, item: node?.dataset.gearDetailItem };
  });
  return () => {
    for (const saved of scrolls) {
      const node = root.querySelector<HTMLElement>(saved.selector);
      if (node && node.dataset.gearDetailItem === saved.item) node.scrollTop = saved.top;
    }
    if (!identity || focused?.isConnected) return;
    const wanted = identity;
    const matches = [...root.querySelectorAll<HTMLElement>('[data-gear-item-id],[data-gear-target-unit-id],[data-gear-focus-key],[data-gear-bag-drop]')].filter(node => {
      if (wanted.key) return node.dataset.gearFocusKey === wanted.key;
      if (wanted.item) return node.dataset.gearItemId === wanted.item;
      if (wanted.bag) return node.hasAttribute('data-gear-bag-drop') && node.tabIndex >= 0;
      return node.dataset.gearTargetUnitId === wanted.unit && node.dataset.gearSlot === wanted.slot;
    }).filter(node => node.tabIndex >= 0 && !node.matches(':disabled') && node.getClientRects().length > 0);
    let next = matches.find(node => scopeOf(node) === wanted.scope) ?? matches[0];
    // At the first/last page the pressed pager becomes disabled; retain focus on its usable peer.
    if (!next && wanted.key && /:(next|previous)$/.test(wanted.key)) {
      const peer = wanted.key.endsWith(':next') ? wanted.key.replace(/:next$/, ':previous') : wanted.key.replace(/:previous$/, ':next');
      next = [...root.querySelectorAll<HTMLElement>('[data-gear-focus-key]')].find(node => node.dataset.gearFocusKey === peer && !node.matches(':disabled') && node.getClientRects().length > 0);
    }
    next?.focus({ preventScroll: true });
  };
}
