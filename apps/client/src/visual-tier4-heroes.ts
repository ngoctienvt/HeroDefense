/** Enable only heroes whose dedicated presentation has been integrated. */
export const TIER4_REPLAY_IDS: readonly string[] = ['h00R', 'h00S', 'h00T', 'h00U', 'h00V', 'h00W', 'h00X', 'h00Y', 'h00Z', 'h010', 'h03T', 'h03U', 'h03V'];
export function isModernTier4Pulse(skillId?: string): boolean {
  return skillId === 'tier3-tier4-pulse-h00T' || skillId === 'tier3-tier4-pulse-h00Z';
}
export function isModernTier4Event(skillId?: string): boolean {
  return isModernTier4Pulse(skillId) || TIER4_REPLAY_IDS.some(id => skillId === `tier3-tier4-${id}`);
}

/** Mixed events carry both units and enemies: only actual unit recipients suppress hurt feedback. */
export function isTier4SupportRecipient(skillId: string | undefined, isUnit: boolean): boolean {
  return isUnit && isModernTier4Event(skillId)
    && ['h00W', 'h010', 'h03T', 'h03U'].some(id => skillId === `tier3-tier4-${id}`);
}
