import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import fs from "fs";
import os from "os";
import path from "path";

import {
  buildAiwgFortemiKnowledgeShard,
  writeAiwgFortemiKnowledgeShard,
  type AiwgFortemiShardConverter,
} from "../../../src/artifacts/fortemi-shard-export.js";
import {
  ArchiveManager,
  exportShardWithReport,
  importShard,
  openShard,
  packTarGz,
  unpackTarGz,
  validateFullV1ShardArchive,
  validateShardArchive,
} from "@fortemi/core";
import {
  aiwgFortemiIndexFromKnowledgeShard,
  aiwgFortemiIndexToKnowledgeShardWithReport,
} from "@fortemi/core/aiwg-index-shard";
import { INDEX_DIR } from "../../../src/artifacts/types.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";

interface EmbeddedAiwgRecord {
  envelope: {
    source: { repo: string; privacy: string; graph?: string };
    schema_version: string;
  };
  record: {
    source: { checksum?: string; repo_relative_path: string };
    privacy: { classification: string };
    relationships: Array<{ type: string }>;
    chunks?: Array<{ text?: string }>;
    provenance: Array<{ source: string }>;
    operational_state?: {
      source_id: string;
      observed_state: string;
      classification: string;
    };
    state_transfer?: {
      deleted_at: string | null;
    };
    skos_concepts?: Array<{ id: string }>;
  };
}

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function sortedRecords(
  bytes: Uint8Array,
  format: "json" | "jsonl",
): Array<Record<string, unknown>> {
  const text = new TextDecoder().decode(bytes);
  const values = format === "json"
    ? JSON.parse(text)
    : text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  return (values as Array<Record<string, unknown>>)
    .sort((left, right) => String(left.id).localeCompare(String(right.id)));
}

describe("AIWG portable Fortemi shard export", () => {
  let tmpDir: string;
  const encoded = new TextEncoder().encode("portable-shard");

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-fortemi-shard-"));
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });
    const recordPath = ".aiwg/design/ADR-001.md";
    const targetPath = ".aiwg/requirements/UC-001.md";
    const entry: MetadataEntry = {
      path: recordPath,
      type: "adr",
      phase: "architecture",
      title: "Portable Fortemi transport",
      tags: ["fortemi"],
      created: "2026-07-15T00:00:00.000Z",
      updated: "2026-07-16T00:00:00.000Z",
      checksum: "abc123",
      summary: "Preserve the complete AIWG record in a Knowledge Shard.",
      dependencies: [targetPath],
      dependents: [],
      operationalState: {
        source_repo: "roctinam/aiwg",
        source_kind: "issue",
        source_id: "aiwg#1827",
        observed_state: "open",
        observed_at: "2026-07-16T00:00:00.000Z",
        source_updated_at: "2026-07-16T00:00:00.000Z",
        evidence_url: "https://git.integrolabs.net/roctinam/aiwg/issues/1827",
        observer: "gitea-mcp",
        classification: "fresh",
        confidence: "source",
        current_action_selector: true,
      },
      stateTransfer: {
        deletedAt: null,
      },
    };
    const target: MetadataEntry = {
      path: targetPath,
      type: "requirement",
      phase: "requirements",
      title: "Shard import compatibility",
      tags: ["fortemi"],
      created: "2026-07-15T00:00:00.000Z",
      updated: "2026-07-16T00:00:00.000Z",
      checksum: "def456",
      summary: "Import the shard without custom transformation.",
      dependencies: [],
      dependents: [recordPath],
      stateTransfer: {
        deletedAt: "2026-07-25T09:30:00.000Z",
      },
    };
    const index: ArtifactIndex = {
      version: "1.0.0",
      builtAt: "2026-07-16T00:00:00.000Z",
      buildTimeMs: 1,
      entries: { [recordPath]: entry, [targetPath]: target },
    };
    const graph: DependencyGraph = {
      [recordPath]: {
        upstream: [{ path: targetPath, type: "depends-on" }],
        downstream: [],
      },
      [targetPath]: {
        upstream: [],
        downstream: [{ path: recordPath, type: "depended-by" }],
      },
    };
    fs.writeFileSync(path.join(indexDir, "metadata.json"), JSON.stringify(index));
    fs.writeFileSync(path.join(indexDir, "dependencies.json"), JSON.stringify(graph));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("always sends a v2 export to the canonical converter", async () => {
    const converter: AiwgFortemiShardConverter = async (index, options) => {
      expect(index.schema_version).toBe("aiwg.fortemi.index.export.v2");
      expect(index.items).toHaveLength(2);
      expect(options).toMatchObject({
        createdAt: "2026-07-16T00:00:00.000Z",
        matricVersion: "aiwg",
      });
      return encoded;
    };

    const shard = await buildAiwgFortemiKnowledgeShard(
      tmpDir,
      {
        repo: "roctinam/aiwg",
        privacy: "sanitized",
        generatedAt: "2026-07-16T00:00:00.000Z",
      },
      converter,
    );

    expect(shard).toEqual(encoded);
  });

  it("writes binary shard output and reports the exported record count", async () => {
    const out = path.join("artifacts", "aiwg-project.shard");
    const result = await writeAiwgFortemiKnowledgeShard(
      tmpDir,
      out,
      { generatedAt: "2026-07-16T00:00:00.000Z" },
      async () => encoded,
    );

    expect(fs.readFileSync(path.join(tmpDir, out))).toEqual(Buffer.from(encoded));
    expect(result).toEqual({
      bytes: encoded.byteLength,
      items: 2,
      outPath: path.join(tmpDir, out),
    });
  });

  it("uses the current Fortemi Core converter to produce an importable cross-repository shard", async () => {
    const shard = await buildAiwgFortemiKnowledgeShard(tmpDir, {
      repo: "Fortemi/fortemi-react",
      privacy: "sanitized",
      generatedAt: "2026-07-16T00:00:00.000Z",
    });
    const repeated = await buildAiwgFortemiKnowledgeShard(tmpDir, {
      repo: "Fortemi/fortemi-react",
      privacy: "sanitized",
      generatedAt: "2026-07-16T00:00:00.000Z",
    });

    const validation = validateShardArchive(shard);
    expect(validation).toEqual({ valid: true, errors: [] });
    expect(repeated).toEqual(shard);

    const reader = await openShard(shard);
    try {
      const notes = await reader.listNotes();
      expect(notes.total).toBe(1);
      expect(notes.items[0]?.source).toBe("aiwg-index");
      const sourceRecord = notes.items
        .map((note) => note.ai_metadata?.aiwg_fortemi_index as EmbeddedAiwgRecord | undefined)
        .find((embedded) => embedded?.record.source.checksum === "abc123");
      expect(sourceRecord).toBeDefined();
      expect(sourceRecord.envelope.source).toMatchObject({
        repo: "Fortemi/fortemi-react",
        privacy: "sanitized",
        graph: "project",
      });
      expect(sourceRecord.envelope.schema_version).toBe(
        "aiwg.fortemi.index.export.v2",
      );
      expect(sourceRecord.record).toMatchObject({
        source: {
          checksum: "abc123",
          repo_relative_path: ".aiwg/design/ADR-001.md",
        },
        privacy: { classification: "sanitized" },
      });
      expect(sourceRecord.record.relationships).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            type: "depends-on",
            target_path: ".aiwg/requirements/UC-001.md",
          }),
        ]),
      );
      expect(sourceRecord.record.chunks).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ text: expect.any(String) }),
        ]),
      );
      expect(sourceRecord.record.provenance).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ source: "aiwg-index" }),
        ]),
      );
      expect(sourceRecord.record.operational_state).toMatchObject({
        source_id: "aiwg#1827",
        observed_state: "open",
        classification: "fresh",
      });
      expect(sourceRecord.record.state_transfer).toEqual({
        deleted_at: null,
      });
      expect(sourceRecord.record.skos_concepts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "aiwg-tags:fortemi" }),
        ]),
      );
    } finally {
      reader.close();
    }
  });

  it("consumes the released public full-v1 converter deterministically without changing the default profile", async () => {
    const fixtureRoot = path.resolve(
      process.cwd(),
      "test/fixtures/fortemi-shard",
    );
    const sourceBytes = fs.readFileSync(
      path.join(fixtureRoot, "aiwg-full-v1-source.json"),
    );
    const expectedArchive = new Uint8Array(
      fs.readFileSync(path.join(fixtureRoot, "aiwg-full-v1.shard")),
    );
    const source = JSON.parse(sourceBytes.toString("utf8")) as Parameters<
      typeof aiwgFortemiIndexToKnowledgeShardWithReport
    >[0];
    const options = {
      createdAt: "2026-07-22T12:00:00.000Z",
      matricVersion: "2026.7.13-candidate",
    };

    const first = await aiwgFortemiIndexToKnowledgeShardWithReport(
      source,
      options,
    );
    const repeated = await aiwgFortemiIndexToKnowledgeShardWithReport(
      source,
      options,
    );

    expect(first.success).toBe(true);
    expect(first.lossless).toBe(true);
    expect(first.losses).toEqual([]);
    expect(first.archive).toEqual(expectedArchive);
    expect(repeated.archive).toEqual(expectedArchive);
    expect(repeated.receipt).toEqual(first.receipt);
    expect(sha256(sourceBytes)).toBe(
      "4cb6d89768f0ec37851012e3df4aedf09622dce911d76233916f099e10d5cfde",
    );
    expect(sha256(expectedArchive)).toBe(
      "df87edc5725e3f0c8d95d8d4328c64a263e9b021520a127d9df5b7301c2afee5",
    );
    expect(await validateFullV1ShardArchive(expectedArchive)).toEqual({
      valid: true,
      errors: [],
    });
    expect(first.receipt).toMatchObject({
      schema_version: "fortemi.aiwg-full-v1-conversion-receipt.v1",
      authority_commit: "6343bd899958445bbc7e7e87b0dc92a8429d5a06",
      authority_contract_sha256:
        "5bf8d2fd8147d8df92599b1a3ce6b405ce022c83893f37547aefa7ca659f0783",
      authority_schema_bundle_sha256:
        "66dee80876c73fdc8756541c72e96ae189c098113a831c849d619381c4121c02",
      contract_valid: true,
      signed: false,
    });

    const files = unpackTarGz(expectedArchive);
    const manifest = JSON.parse(
      new TextDecoder().decode(files.get("manifest.json")!),
    ) as {
      version: string;
      profile: string;
      components: string[];
    };
    expect(manifest).toMatchObject({
      version: "2.0.0",
      profile: "full-v1",
    });
    expect(manifest.components).toHaveLength(33);
  });

  it("round-trips through a fresh PGlite destination without transforming package bytes", async () => {
    const shard = await buildAiwgFortemiKnowledgeShard(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-07-16T00:00:00.000Z",
    });
    if (process.env.AIWG_FORTEMI_FIXTURE_OUT) {
      fs.writeFileSync(process.env.AIWG_FORTEMI_FIXTURE_OUT, shard);
    }
    const committedCoreV1 = new Uint8Array(
      fs.readFileSync(
        path.resolve(
          process.cwd(),
          "test/fixtures/fortemi-shard/aiwg-core-v1.shard",
        ),
      ),
    );
    expect(shard).toEqual(committedCoreV1);
    const manager = new ArchiveManager("memory");
    try {
      const destination = await manager.create("aiwg-shard-receipt");
      const before = await destination.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM note",
      );
      expect(before.rows[0]?.count).toBe(0);

      const imported = await importShard(destination, shard);
      expect(imported.success).toBe(true);
      expect(imported.counts).toMatchObject({
        notes: 2,
        collections: 3,
        tags: 2,
        links: 2,
      });
      const repeated = await importShard(destination, shard);
      expect(repeated.success).toBe(true);
      expect(repeated.counts).toMatchObject({
        notes: 0,
        collections: 0,
        tags: 0,
        links: 0,
      });

      const persisted = await destination.query<{
        title: string;
        deleted_at: string | null;
        collection_name: string;
        parent_name: string;
      }>(`
        SELECT
          n.title,
          CASE
            WHEN n.deleted_at IS NULL THEN NULL
            ELSE to_char(
              n.deleted_at AT TIME ZONE 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            )
          END AS deleted_at,
          c.name AS collection_name,
          p.name AS parent_name
        FROM note n
        JOIN collection_note cn ON cn.note_id = n.id
        JOIN collection c ON c.id = cn.collection_id
        LEFT JOIN collection p ON p.id = c.parent_id
        ORDER BY n.title
      `);
      expect(persisted.rows).toEqual([
        {
          title: "Portable Fortemi transport",
          deleted_at: null,
          collection_name: "design",
          parent_name: ".aiwg",
        },
        {
          title: "Shard import compatibility",
          deleted_at: "2026-07-25T09:30:00.000Z",
          collection_name: "requirements",
          parent_name: ".aiwg",
        },
      ]);

      const reexport = await exportShardWithReport(destination, { profile: "core-v1" });
      expect(reexport.success).toBe(true);
      expect(reexport.capability_report).toMatchObject({
        requested_profile: "core-v1",
        authority_status: "supported",
        portable: true,
        losses: [],
      });
      expect(reexport.archive).not.toBeNull();
      const sourceFiles = unpackTarGz(shard);
      const reexportedFiles = unpackTarGz(reexport.archive!);
      expect(
        sortedRecords(reexportedFiles.get("collections.json")!, "json"),
      ).toEqual(sortedRecords(sourceFiles.get("collections.json")!, "json"));
      expect(
        sortedRecords(reexportedFiles.get("notes.jsonl")!, "jsonl"),
      ).toEqual(sortedRecords(sourceFiles.get("notes.jsonl")!, "jsonl"));
      const restored = aiwgFortemiIndexFromKnowledgeShard(reexport.archive!);
      expect(restored.source).toMatchObject({
        repo: "roctinam/aiwg",
        privacy: "sanitized",
        graph: "project",
      });
      expect(restored.items).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            source: expect.objectContaining({ checksum: "abc123" }),
            privacy: expect.objectContaining({ classification: "sanitized" }),
            relationships: expect.arrayContaining([
              expect.objectContaining({ type: "depends-on" }),
            ]),
            operational_state: expect.objectContaining({
              source_id: "aiwg#1827",
              observed_state: "open",
              classification: "fresh",
            }),
            state_transfer: { deleted_at: null },
          }),
          expect.objectContaining({
            source: expect.objectContaining({ checksum: "def456" }),
            state_transfer: {
              deleted_at: "2026-07-25T09:30:00.000Z",
            },
          }),
        ]),
      );

      const oldestDefinedFiles = unpackTarGz(shard);
      const oldestDefinedNotes = new TextDecoder()
        .decode(oldestDefinedFiles.get("notes.jsonl")!)
        .split("\n")
        .filter(Boolean)
        .map((line) => {
          const note = JSON.parse(line);
          delete note.deleted_at;
          return JSON.stringify(note);
        });
      const oldestDefinedNoteBytes = new TextEncoder().encode(
        oldestDefinedNotes.join("\n"),
      );
      oldestDefinedFiles.set("notes.jsonl", oldestDefinedNoteBytes);
      const oldestDefinedManifest = JSON.parse(
        new TextDecoder().decode(oldestDefinedFiles.get("manifest.json")!),
      );
      oldestDefinedManifest.version = "1.0.0";
      oldestDefinedManifest.min_reader_version = "1.0.0";
      oldestDefinedManifest.checksums["notes.jsonl"] = sha256(
        oldestDefinedNoteBytes,
      );
      oldestDefinedFiles.set(
        "manifest.json",
        new TextEncoder().encode(JSON.stringify(oldestDefinedManifest, null, 2)),
      );
      const oldestDestination = await manager.create("aiwg-shard-current-minus-two");
      const oldestImported = await importShard(
        oldestDestination,
        packTarGz(oldestDefinedFiles),
      );
      expect(oldestImported.success, oldestImported.errors.join("; ")).toBe(true);
      expect(oldestImported.counts).toMatchObject({
        notes: 2,
        collections: 3,
        tags: 2,
        links: 2,
      });
    } finally {
      await manager.close();
    }
  }, 45_000);

  it("rejects malformed, checksum, profile, version, and resource-limit input with zero mutation", async () => {
    const shard = await buildAiwgFortemiKnowledgeShard(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-07-16T00:00:00.000Z",
    });
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    const replaceManifest = (
      mutate: (manifest: { profile?: unknown; version?: unknown }) => void,
    ) => {
      const files = unpackTarGz(shard);
      const manifest = JSON.parse(decoder.decode(files.get("manifest.json")!));
      mutate(manifest);
      files.set("manifest.json", encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`));
      return packTarGz(files);
    };
    const checksumDrift = (() => {
      const files = unpackTarGz(shard);
      files.set("notes.jsonl", encoder.encode("{}\n"));
      return packTarGz(files);
    })();
    const oversized = Uint8Array.from(shard);
    new DataView(oversized.buffer, oversized.byteOffset, oversized.byteLength)
      .setUint32(oversized.byteLength - 4, 300 * 1024 * 1024, true);
    const cases = [
      { name: "malformed gzip", bytes: encoder.encode("not-a-shard") },
      { name: "checksum drift", bytes: checksumDrift },
      { name: "unsupported profile", bytes: replaceManifest(manifest => { manifest.profile = "unknown-v1"; }) },
      { name: "future version", bytes: replaceManifest(manifest => { manifest.version = "2.0.0"; }) },
      { name: "resource limit", bytes: oversized },
    ];

    const manager = new ArchiveManager("memory");
    try {
      const destination = await manager.create("aiwg-shard-zero-mutation");
      for (const testCase of cases) {
        const result = await importShard(destination, testCase.bytes).catch(error => error);
        expect(
          result instanceof Error || result?.success === false,
          `${testCase.name} must be rejected`,
        ).toBe(true);
        const count = await destination.query<{ count: number }>(
          "SELECT COUNT(*)::int AS count FROM note",
        );
        expect(count.rows[0]?.count, `${testCase.name} mutated the destination`).toBe(0);
      }
    } finally {
      await manager.close();
    }
  }, 20_000);
});
