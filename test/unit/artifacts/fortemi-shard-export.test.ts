import { afterEach, beforeEach, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

import {
  buildAiwgFortemiKnowledgeShard,
  writeAiwgFortemiKnowledgeShard,
  type AiwgFortemiShardConverter,
} from "../../../src/artifacts/fortemi-shard-export.js";
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
      dependencies: [],
      dependents: [],
    };
    const index: ArtifactIndex = {
      version: "1.0.0",
      builtAt: "2026-07-16T00:00:00.000Z",
      buildTimeMs: 1,
      entries: { [recordPath]: entry },
    };
    const graph: DependencyGraph = {
      [recordPath]: { upstream: [], downstream: [] },
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
      expect(index.items).toHaveLength(1);
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
      items: 1,
      outPath: path.join(tmpDir, out),
    });
  });
});
