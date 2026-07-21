import { afterEach, beforeEach, describe, expect, it } from "vitest";
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
  validateShardArchive,
} from "@fortemi/core";
import { aiwgFortemiIndexFromKnowledgeShard } from "@fortemi/core/aiwg-index";
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
    skos_concepts?: Array<{ id: string }>;
  };
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
      expect(notes.total).toBe(2);
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
      expect(sourceRecord.record.skos_concepts).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "aiwg-tags:fortemi" }),
        ]),
      );
    } finally {
      reader.close();
    }
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
    const manager = new ArchiveManager("memory");
    try {
      const destination = await manager.create("aiwg-shard-receipt");
      const before = await destination.query<{ count: number }>(
        "SELECT COUNT(*)::int AS count FROM note",
      );
      expect(before.rows[0]?.count).toBe(0);

      const imported = await importShard(destination, shard);
      expect(imported.success).toBe(true);
      expect(imported.counts).toMatchObject({ notes: 2, tags: 2, links: 2 });

      const reexport = await exportShardWithReport(destination, { profile: "core-v1" });
      expect(reexport.success).toBe(true);
      expect(reexport.capability_report).toMatchObject({
        requested_profile: "core-v1",
        authority_status: "supported",
        portable: true,
        losses: [],
      });
      expect(reexport.archive).not.toBeNull();
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
          }),
        ]),
      );
    } finally {
      await manager.close();
    }
  }, 20_000);

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
