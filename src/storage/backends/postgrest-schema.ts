import type { PostgresClientLike } from './postgres.js';

/** Versioned security-invoker RPC surface used by the PostgREST transport. */
export const POSTGREST_SCHEMA_V1_SQL = String.raw`
CREATE OR REPLACE FUNCTION aiwg_record_v1(r aiwg_storage_records)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'identity', jsonb_build_object('tenant', r.tenant, 'subsystem', r.subsystem, 'path', r.path),
    'sourceRevision', r.source_revision, 'digest', r.digest,
    'value', CASE WHEN r.tombstone THEN NULL ELSE r.value END,
    'tombstone', CASE WHEN r.tombstone THEN jsonb_strip_nulls(jsonb_build_object(
      'deletedAt', to_char(r.deleted_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'reason', r.delete_reason)) ELSE NULL END));
$$;

CREATE OR REPLACE FUNCTION aiwg_commit_batch_v1(
  p_tenant text, p_subsystem text, p_batch_id uuid,
  p_payload_digest text, p_mutations jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  m jsonb; prior aiwg_storage_batch_receipts%ROWTYPE;
  changed aiwg_storage_records%ROWTYPE; receipts jsonb := '[]'::jsonb;
  high_water bigint := 0; result jsonb;
BEGIN
  IF jsonb_typeof(p_mutations) <> 'array' OR jsonb_array_length(p_mutations)=0 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='AIWG_POSTGREST_EMPTY_BATCH';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_tenant || chr(31) || p_subsystem || chr(31) || p_batch_id::text, 0));
  SELECT * INTO prior FROM aiwg_storage_batch_receipts
    WHERE tenant=p_tenant AND subsystem=p_subsystem AND batch_id=p_batch_id FOR UPDATE;
  IF FOUND THEN
    IF prior.payload_digest <> p_payload_digest THEN
      RAISE EXCEPTION USING ERRCODE='23505', MESSAGE='AIWG_POSTGREST_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN prior.receipt;
  END IF;
  FOR m IN SELECT value FROM jsonb_array_elements(p_mutations) LOOP
    IF m#>>'{record,identity,tenant}' <> p_tenant OR m#>>'{record,identity,subsystem}' <> p_subsystem THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='AIWG_POSTGREST_IDENTITY_MISMATCH';
    END IF;
    INSERT INTO aiwg_storage_records
      (tenant,subsystem,path,source_revision,digest,value,tombstone,deleted_at,delete_reason,idempotency_key)
    VALUES (p_tenant,p_subsystem,m#>>'{record,identity,path}',m#>>'{record,sourceRevision}',
      m#>>'{record,digest}',m#>'{record,value}',
      (m->>'operation'='delete' OR m#>'{record,tombstone}' IS NOT NULL),
      NULLIF(m#>>'{record,tombstone,deletedAt}','')::timestamptz,
      m#>>'{record,tombstone,reason}',m->>'idempotencyKey')
    ON CONFLICT (tenant,subsystem,path) DO UPDATE SET
      source_revision=EXCLUDED.source_revision,digest=EXCLUDED.digest,value=EXCLUDED.value,
      tombstone=EXCLUDED.tombstone,deleted_at=EXCLUDED.deleted_at,
      delete_reason=EXCLUDED.delete_reason,idempotency_key=EXCLUDED.idempotency_key,
      change_seq=nextval(pg_get_serial_sequence('aiwg_storage_records','change_seq')),
      updated_at=clock_timestamp()
    WHERE m->>'expectedRevision' IS NULL
       OR aiwg_storage_records.source_revision=m->>'expectedRevision'
    RETURNING * INTO changed;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='P0001', MESSAGE='AIWG_POSTGREST_REVISION_CONFLICT';
    END IF;
    high_water := changed.change_seq;
    receipts := receipts || jsonb_build_array(jsonb_build_object(
      'identity',jsonb_build_object('tenant',changed.tenant,'subsystem',changed.subsystem,'path',changed.path),
      'sourceRevision',changed.source_revision,'digest',changed.digest));
  END LOOP;
  result := jsonb_build_object('batchId',p_batch_id::text,'committed',true,
    'highWaterMark',high_water::text,'recordReceipts',receipts);
  INSERT INTO aiwg_storage_batch_receipts
    (tenant,subsystem,batch_id,payload_digest,high_water_mark,receipt)
    VALUES (p_tenant,p_subsystem,p_batch_id,p_payload_digest,high_water,result);
  RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION aiwg_get_record_v1(p_tenant text,p_subsystem text,p_path text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT aiwg_record_v1(r) FROM aiwg_storage_records r
  WHERE r.tenant=p_tenant AND r.subsystem=p_subsystem AND r.path=p_path;
$$;

CREATE OR REPLACE FUNCTION aiwg_query_records_v1(
  p_tenant text,p_subsystem text,p_filters jsonb DEFAULT '{}'::jsonb,
  p_after_path text DEFAULT NULL,p_limit integer DEFAULT 1000,
  p_include_tombstones boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit<1 OR p_limit>10000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='AIWG_POSTGREST_LIMIT_INVALID'; END IF;
  WITH page AS (SELECT r.* FROM aiwg_storage_records r
    WHERE r.tenant=p_tenant AND r.subsystem=p_subsystem
      AND (p_include_tombstones OR NOT r.tombstone)
      AND (r.value @> p_filters OR (r.tombstone AND p_filters='{}'::jsonb))
      AND (p_after_path IS NULL OR r.path>p_after_path)
    ORDER BY r.path LIMIT p_limit+1),
  kept AS (SELECT * FROM page ORDER BY path LIMIT p_limit)
  SELECT jsonb_build_object('records',COALESCE(jsonb_agg(aiwg_record_v1(k) ORDER BY k.path),'[]'::jsonb),
    'nextCursor',CASE WHEN (SELECT count(*) FROM page)>p_limit THEN max(k.path) END)
    INTO result FROM kept k;
  RETURN jsonb_strip_nulls(result);
END;
$$;

CREATE OR REPLACE FUNCTION aiwg_snapshot_v1(p_tenant text,p_subsystem text,p_limit integer DEFAULT 1000)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE record_count bigint; high_water bigint;
BEGIN
  IF p_limit<1 OR p_limit>10000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='AIWG_POSTGREST_LIMIT_INVALID'; END IF;
  SELECT count(*),COALESCE(max(change_seq),0) INTO record_count,high_water
    FROM aiwg_storage_records WHERE tenant=p_tenant AND subsystem=p_subsystem;
  IF record_count>p_limit THEN RAISE EXCEPTION USING ERRCODE='54000',MESSAGE='AIWG_POSTGREST_SNAPSHOT_CEILING'; END IF;
  RETURN jsonb_build_object('snapshot_id',txid_current()::text,'high_water_mark',high_water::text,
    'records',COALESCE((SELECT jsonb_agg(aiwg_record_v1(r) ORDER BY r.path)
      FROM aiwg_storage_records r WHERE r.tenant=p_tenant AND r.subsystem=p_subsystem),'[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION aiwg_changes_v1(
  p_tenant text,p_subsystem text,p_after_cursor bigint DEFAULT 0,p_limit integer DEFAULT 1000
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER AS $$
DECLARE result jsonb;
BEGIN
  IF p_limit<1 OR p_limit>10000 THEN RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='AIWG_POSTGREST_LIMIT_INVALID'; END IF;
  WITH page AS (SELECT r.* FROM aiwg_storage_records r
    WHERE r.tenant=p_tenant AND r.subsystem=p_subsystem AND r.change_seq>p_after_cursor
    ORDER BY r.change_seq,r.path LIMIT p_limit+1),
  kept AS (SELECT * FROM page ORDER BY change_seq,path LIMIT p_limit)
  SELECT jsonb_build_object('records',COALESCE(jsonb_agg(aiwg_record_v1(k) ORDER BY k.change_seq,k.path),'[]'::jsonb),
    'high_water_mark',COALESCE(max(k.change_seq),p_after_cursor)::text,
    'next_cursor',CASE WHEN (SELECT count(*) FROM page)>p_limit THEN max(k.change_seq)::text END)
    INTO result FROM kept k;
  RETURN jsonb_strip_nulls(result);
END;
$$;

CREATE OR REPLACE FUNCTION aiwg_health_v1(p_tenant text,p_subsystem text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY INVOKER AS $$
  SELECT jsonb_build_object('healthy',true,'ready',s.schema_version=1,
    'schemaVersion',s.schema_version::text,
    'highWaterMark',COALESCE((SELECT max(change_seq) FROM aiwg_storage_records
      WHERE tenant=p_tenant AND subsystem=p_subsystem),0)::text,
    'accessMode','postgrest','engine','postgres')
  FROM aiwg_storage_schema s WHERE singleton=true;
$$;

CREATE OR REPLACE FUNCTION aiwg_reload_schema_v1()
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY INVOKER AS $$
BEGIN PERFORM pg_notify('pgrst','reload schema'); END;
$$;
`;

/** Install with a migration-role connection; runtime requesters need only EXECUTE/table DML grants. */
export async function installPostgrestSchemaV1(client: PostgresClientLike): Promise<void> {
  await client.query('BEGIN');
  try {
    await client.query(POSTGREST_SCHEMA_V1_SQL);
    await client.query('COMMIT');
    await client.query("NOTIFY pgrst, 'reload schema'");
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch { /* preserve installation error */ }
    throw error;
  }
}
