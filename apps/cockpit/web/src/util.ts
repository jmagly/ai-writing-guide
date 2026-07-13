export const fmtId = (id: string): string => (id && id.length > 12 ? id.slice(0, 8) + '…' : id);

export function runtimeFamily(kind: string | undefined): 'host' | 'container' | 'vm' | 'other' {
  const normalized = String(kind ?? '').toLowerCase();
  if (normalized === 'host') return 'host';
  if (normalized === 'container' || normalized === 'docker') return 'container';
  if (normalized === 'vm' || normalized === 'qemu' || normalized === 'kvm') return 'vm';
  return 'other';
}

// How a picked capability is referenced when inserted into a session composer:
//   - agents  → @name (stable convention across hosts)
//   - skills  → the bare skill name. AIWG's discover-first protocol resolves a skill
//     by plain name or lookup phrase, NOT a slash-command. A "/" prefix is wrong here:
//     most hosts don't expose AIWG skills as real slash-commands, and the leading "/"
//     is interpreted differently per platform (see #1642).
//   - commands → /name, only because commands ARE the slash-command surface on hosts
//     that have one. (If this ever needs to be platform-aware, thread the host in here.)
//   - anything else → bare name.
export function capRef(type: string, name: string): string {
  if (type === 'agent') return `@${name}`;
  if (type === 'command') return `/${name}`;
  return name;
}
