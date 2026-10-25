import type { Command, GameState } from '../../../packages/contracts/src/types.js';
import type { ConfirmOptions } from './hud-overlay.js';

/** Drawers and overlays reachable from the rail or the keyboard. `admin` has no rail button (key K only). */
export type Panel = 'shop' | 'craft' | 'roster' | 'bonds' | 'guide' | 'admin';
/** Tabs inside the combined panels: Duyên & Trận (`bonds`) and Cẩm Nang (`guide`). */
export type PanelTab = 'synergy' | 'formation' | 'controls' | 'codex';

export interface PanelContext {
  state: GameState;
  selfId: string;
  selected: string;
  tab?: PanelTab;
  send: (command: Command) => void;
  select: (id: string) => void;
  openPanel: (panel: Panel | null, tab?: PanelTab) => void;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

export const ownUnits = (ctx: Pick<PanelContext, 'state' | 'selfId'>) =>
  Object.values(ctx.state.units).filter(unit => unit.owner === ctx.selfId);
