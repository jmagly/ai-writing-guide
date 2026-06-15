export const fmtId = (id: string): string => (id && id.length > 12 ? id.slice(0, 8) + '…' : id);

// How a picked capability is referenced when inserted into a command to inject:
// commands/skills as /name, agents as @name, else the bare name.
export function capRef(type: string, name: string): string {
  if (type === 'agent') return `@${name}`;
  if (type === 'command' || type === 'skill') return `/${name}`;
  return name;
}

