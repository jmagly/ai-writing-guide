export const fmtId = (id: string): string => (id && id.length > 12 ? id.slice(0, 8) + '…' : id);
