#!/usr/bin/env node

import { createRequire } from 'node:module';
import { rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const require = createRequire(import.meta.url);
const Database = require('better-sqlite3');
const eventCount = Number(process.env.AIWG_SESSION_BENCH_EVENTS ?? 1_000_000);
const iterations = Number(process.env.AIWG_SESSION_BENCH_ITERATIONS ?? 25);
const databasePath = resolve(tmpdir(), `aiwg-session-search-${process.pid}.sqlite`);

const database = new Database(databasePath);
try {
  database.pragma('journal_mode = WAL');
  database.pragma('synchronous = OFF');
  database.exec(`
    CREATE TABLE sessions (
      session_id TEXT PRIMARY KEY, workspace_id TEXT NOT NULL,
      lifecycle TEXT NOT NULL, provider TEXT NOT NULL
    );
    CREATE TABLE session_events (
      event_id TEXT PRIMARY KEY, session_id TEXT NOT NULL,
      import_run_id TEXT NOT NULL, sequence_no INTEGER NOT NULL,
      occurred_at TEXT, role TEXT, sensitivity TEXT
    );
    CREATE TABLE import_runs (
      import_run_id TEXT PRIMARY KEY, status TEXT NOT NULL
    );
    CREATE VIRTUAL TABLE session_event_fts USING fts5(
      event_id UNINDEXED, searchable_text, tokenize='unicode61'
    );
  `);
  database.prepare(
    `INSERT INTO sessions(session_id, workspace_id, lifecycle, provider)
     VALUES ('session-reference', 'workspace-reference', 'complete', 'generic')`,
  ).run();
  database.prepare(
    `INSERT INTO import_runs(import_run_id, status)
     VALUES ('run-reference', 'committed')`,
  ).run();
  const insertEvent = database.prepare(
    `INSERT INTO session_events
     (event_id, session_id, import_run_id, sequence_no, occurred_at, role, sensitivity)
     VALUES (?, 'session-reference', 'run-reference', ?, '2026-07-27T00:00:00Z', ?, 'none')`,
  );
  const insertFts = database.prepare(
    'INSERT INTO session_event_fts(event_id, searchable_text) VALUES (?, ?)',
  );
  database.transaction(() => {
    for (let index = 0; index < eventCount; index += 1) {
      const eventId = `event-${String(index).padStart(9, '0')}`;
      insertEvent.run(eventId, index, index % 2 === 0 ? 'user' : 'assistant');
      insertFts.run(
        eventId,
        index % 100 === 0
          ? `reference needle decision ${index}`
          : `reference ordinary session event ${index}`,
      );
    }
  })();

  const search = database.prepare(`
    WITH authorized AS (
      SELECT e.event_id, f.searchable_text, length(f.searchable_text) AS stable_rank
      FROM session_event_fts f
      JOIN session_events e ON e.event_id=f.event_id
      JOIN sessions s ON s.session_id=e.session_id
      JOIN import_runs r ON r.import_run_id=e.import_run_id
      WHERE f.searchable_text MATCH ?
        AND e.rowid <= ?
        AND s.workspace_id=?
        AND s.lifecycle!='tombstoned'
        AND s.provider=?
        AND r.status='committed'
    )
    SELECT event_id, searchable_text FROM authorized
    ORDER BY stable_rank, event_id
    LIMIT 50
  `);
  const samples = [];
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const started = performance.now();
    const rows = search.all('needle', eventCount, 'workspace-reference', 'generic');
    samples.push(performance.now() - started);
    if (rows.length !== 50) throw new Error(`benchmark expected 50 hits, received ${rows.length}`);
  }
  samples.sort((left, right) => left - right);
  const percentileIndex = Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1);
  const result = {
    contractVersion: '1.0.0',
    benchmark: 'session-search-fts5',
    eventCount,
    iterations,
    p50Ms: Number(samples[Math.floor(samples.length * 0.5)].toFixed(2)),
    p95Ms: Number(samples[percentileIndex].toFixed(2)),
    maxMs: Number(samples.at(-1).toFixed(2)),
    targetMs: 2_000,
    passed: samples[percentileIndex] < 2_000,
  };
  console.log(JSON.stringify(result, null, 2));
  if (!result.passed) process.exitCode = 1;
} finally {
  database.close();
  rmSync(databasePath, { force: true });
  rmSync(`${databasePath}-shm`, { force: true });
  rmSync(`${databasePath}-wal`, { force: true });
}
