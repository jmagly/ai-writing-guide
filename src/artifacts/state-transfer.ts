export interface StateTransferProjection {
  deletedAt: string | null;
}

export function normalizeStateTransferProjection(
  value: unknown,
): StateTransferProjection | undefined {
  if (value === undefined) return undefined;
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("state_transfer must be an object");
  }

  const record = value as Record<string, unknown>;
  const unknown = Object.keys(record).filter((key) => key !== "deleted_at");
  if (unknown.length > 0) {
    throw new Error(`state_transfer has unsupported fields: ${unknown.join(", ")}`);
  }
  if (!Object.hasOwn(record, "deleted_at")) {
    throw new Error("state_transfer.deleted_at is required");
  }

  const deletedAt = record.deleted_at;
  if (deletedAt === null) return { deletedAt: null };
  if (deletedAt instanceof Date && !Number.isNaN(deletedAt.getTime())) {
    return { deletedAt: deletedAt.toISOString() };
  }
  if (
    typeof deletedAt !== "string"
    || Number.isNaN(Date.parse(deletedAt))
  ) {
    throw new Error("state_transfer.deleted_at must be null or an ISO date-time");
  }

  return { deletedAt: new Date(deletedAt).toISOString() };
}
