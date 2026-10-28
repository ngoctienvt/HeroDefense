import { debug } from './debug.js';

/** Keep the pressed DOM node alive until the browser has dispatched its native click. */
export class HudRenderGuard {
  private held = false;
  private pending = false;
  private timer: ReturnType<typeof setTimeout> | undefined;

  constructor(private readonly refresh: () => void) {}

  begin(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.held = true;
  }

  defer(): boolean {
    if (!this.held) return false;
    if (!this.pending) debug('ui.render-deferred', { reason: 'control-pressed' });
    this.pending = true;
    return true;
  }

  /** Capture-phase click releases the guard before the action, preserving synchronous panel focus. */
  end(): void {
    clearTimeout(this.timer);
    this.held = false;
    this.timer = setTimeout(() => {
      this.timer = undefined;
      if (!this.pending) return;
      this.pending = false;
      this.refresh();
    }, 0);
  }

  /** Pointer/key release can be followed by click; do not replace its target in that gap. */
  endAfterEvent(): void {
    if (!this.held) return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.end(), 0);
  }

  dispose(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.held = false;
    this.pending = false;
  }
}

export function installHudRenderGuard(root: HTMLElement, guard: HudRenderGuard): () => void {
  const control = (target: EventTarget | null): boolean => target instanceof Element
    && root.contains(target) && !!target.closest('button, input, select, textarea, a[href], [role="button"]');
  const pointerDown = (event: PointerEvent): void => {
    if (event.isPrimary && event.button === 0 && control(event.target)) guard.begin();
  };
  const keyDown = (event: KeyboardEvent): void => {
    if ((event.key === ' ' || event.key === 'Enter') && control(event.target)) guard.begin();
  };
  const keyUp = (event: KeyboardEvent): void => {
    if (event.key === ' ' || event.key === 'Enter') guard.endAfterEvent();
  };
  const release = (): void => guard.endAfterEvent();
  const finish = (): void => guard.end();
  // Window capture runs before overlay outside-pointer handlers, which can synchronously render.
  window.addEventListener('pointerdown', pointerDown, true);
  window.addEventListener('pointerup', release, true);
  window.addEventListener('pointercancel', finish, true);
  window.addEventListener('click', finish, true);
  window.addEventListener('keydown', keyDown, true);
  window.addEventListener('keyup', keyUp, true);
  window.addEventListener('blur', finish);
  return () => {
    window.removeEventListener('pointerdown', pointerDown, true);
    window.removeEventListener('pointerup', release, true);
    window.removeEventListener('pointercancel', finish, true);
    window.removeEventListener('click', finish, true);
    window.removeEventListener('keydown', keyDown, true);
    window.removeEventListener('keyup', keyUp, true);
    window.removeEventListener('blur', finish);
    guard.dispose();
  };
}
