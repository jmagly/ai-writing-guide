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
  openShard,
  validateShardArchive,
} from "@fortemi/core";
import { INDEX_DIR } from "../../../src/artifacts/types.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";

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

    const validation = validateShardArchive(shard);
    expect(validation).toEqual({ valid: true, errors: [] });

    const reader = await openShard(shard);
    try {
      const notes = await reader.listNotes();
      expect(notes.total).toBe(2);
      expect(notes.items[0]?.source).toBe("aiwg-index");
      const sourceRecord = notes.items
        .map((note) => JSON.parse(note.attachments?.[0]?.extracted_text ?? "{}"))
        .find((embedded) => embedded.record?.source?.checksum === "abc123");
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
});
