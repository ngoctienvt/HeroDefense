/** Added only after each hero's source integration is complete; Long Vương stays in its dedicated module. */
export const TIER3_REPLAY_IDS: readonly string[] = ['h00J', 'h00K', 'h00L', 'h00M', 'h00N', 'h00O', 'h00P', 'h03Q', 'h03R', 'h03S'];
export function isModernTier3Pulse(skillId?: string): boolean { return skillId === 'tier3-tier4-pulse-h00M'; }
export function isModernTier3Event(skillId?: string): boolean {
  return skillId === 'tier3-tier4-h00Q' || skillId === 'water-shield-burst-h00J' || isModernTier3Pulse(skillId)
    || TIER3_REPLAY_IDS.some(id => skillId === `tier3-tier4-${id}`);
}

/** Tier3 combat events omit ability.kind; classify only the known support ultimate, never normal attacks. */
export function isTier3SupportRecipient(skillId?: string, isUnit = true): boolean {
  return skillId === 'tier3-tier4-h00K' || skillId === 'tier3-tier4-h03R' || (skillId === 'tier3-tier4-h03S' && isUnit);
}
