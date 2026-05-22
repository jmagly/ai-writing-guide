import { formatCommunityFooter } from './links.js';
import { markNudgeShown, shouldShowNudge } from './nudge-policy.js';

export function maybePrintCommunityFooter(): boolean {
  if (!shouldShowNudge('discovery-footer')) return false;
  const footer = formatCommunityFooter();
  if (!footer) return false;
  console.log('');
  console.log(footer);
  markNudgeShown('discovery-footer');
  return true;
}
