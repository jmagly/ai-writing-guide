import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { syncFortemiCoreIndex } from "../../../src/artifacts/fortemi-core-sync.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";
import { main, runResearchQuery } from "../../../src/research/query-cli.js";

function entry(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: ".aiwg/research/findings/REF-001.md",
    type: "research-ref",
    phase: "research",
    title: "REF-001 Static Retrieval Evaluation",
    name: "REF-001",
    tags: ["retrieval", "grade-high"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "GRADE: High. Static retrieval preserves source selection.",
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

function writeGraph(root: string, entries: MetadataEntry[]): void {
  const graphDir = path.join(root, ".aiwg", ".index", "project");
  fs.mkdirSync(graphDir, { recursive: true });
  const index: ArtifactIndex = {
    version: "1.0.0",
    builtAt: "2026-01-03T00:00:00.000Z",
    buildTimeMs: 1,
    entries: Object.fromEntries(entries.map((item) => [item.path, item])),
  };
  const graph: DependencyGraph = Object.fromEntries(
    entries.map((item) => [item.path, { upstream: [], downstream: [] }]),
  );
  fs.writeFileSync(path.join(graphDir, "metadata.json"), JSON.stringify(index));
  fs.writeFileSync(
    path.join(graphDir, "dependencies.json"),
    JSON.stringify(graph),
  );

  for (const item of entries) {
    fs.mkdirSync(path.join(root, path.dirname(item.path)), { recursive: true });
    fs.writeFileSync(
      path.join(root, item.path),
      [
        "---",
        `title: ${item.title}`,
        `tags: ${item.tags.join(", ")}`,
        "---",
        `# ${item.title}`,
        "",
        item.summary,
      ].join("\n"),
    );
  }
}

describe("research-query executable source selection", () => {
  let tmp: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-research-query-"));
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function seed(): void {
    writeGraph(tmp, [
      entry({}),
      entry({
        path: ".aiwg/research/profiles/PROF-001.md",
        type: "research-profile",
        title: "PROF-001 Retrieval Authors",
        name: "PROF-001",
        tags: ["retrieval", "profile"],
        summary: "Profile evidence for retrieval authors.",
      }),
      entry({
        path: ".aiwg/research/findings/REF-002.md",
        title: "REF-002 Prompt Injection",
        name: "REF-002",
        tags: ["security", "grade-low"],
        summary: "GRADE: Low. Prompt injection mitigations.",
      }),
      entry({
        path: ".aiwg/requirements/UC-001.md",
        type: "use-case",
        title: "Unrelated Requirement",
        name: "UC-001",
        tags: ["requirements"],
        summary: "Not part of the research corpus.",
      }),
    ]);
  }

  it("selects matching research sources from the Fortemi Core cache by default", async () => {
    seed();
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const result = await runResearchQuery(tmp, {
      question: "static retrieval source selection",
      depth: "thorough",
      maxSources: 3,
    });

    expect(result.query.backend).toBe("fortemi-core");
    expect(result.sources.map((source) => source.id)).toEqual([
      "REF-001",
      "PROF-001",
    ]);
    expect(result.sources[0]).toMatchObject({
      grade: "HIGH",
      relevance: "direct",
      path: ".aiwg/research/findings/REF-001.md",
    });
  });

  it("keeps the legacy local artifact graph behind --backend local", async () => {
    seed();

    const result = await runResearchQuery(tmp, {
      question: "static retrieval source selection",
      depth: "thorough",
      maxSources: 3,
      backend: "local",
    });

    expect(result.query.backend).toBe("local");
    expect(result.sources.map((source) => source.id)).toEqual([
      "REF-001",
      "PROF-001",
    ]);
  });

  it("keeps source-selection parity with the Fortemi Core static cache", async () => {
    seed();
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const local = await runResearchQuery(tmp, {
      question: "retrieval source selection",
      depth: "quick",
      backend: "local",
    });
    const fortemi = await runResearchQuery(tmp, {
      question: "retrieval source selection",
      depth: "quick",
    });

    expect(fortemi.query.backend).toBe("fortemi-core");
    expect(fortemi.sources.map((source) => source.id)).toEqual(
      local.sources.map((source) => source.id),
    );
  });

  it.each(["local", "fortemi-core"] as const)(
    "excludes quarantine scans and preserves curated ranking with %s retrieval",
    async (backend) => {
      const regressionQuestion =
        "hybrid retrieval multi-vector indexing semantic tool discovery runbook structured process metadata";
      const curated = [
        [
          "REF-027",
          "Reciprocal Rank Fusion",
          ["hybrid", "retrieval", "ranking"],
        ],
        [
          "REF-048",
          "ColBERT Multi-Vector Retrieval",
          ["multi-vector", "indexing", "retrieval"],
        ],
        [
          "REF-050",
          "E5 Semantic Embeddings",
          ["semantic", "retrieval", "metadata"],
        ],
        [
          "REF-068",
          "Hybrid Retrieval Architecture",
          ["hybrid", "retrieval", "structured"],
        ],
        [
          "REF-879",
          "Semantic MCP Tool Discovery",
          ["semantic", "tool", "discovery", "runbook", "process"],
        ],
      ] as const;
      const entries = curated.map(([id, title, tags]) =>
        entry({
          path: `.aiwg/research/references/${id}.md`,
          name: id,
          title: `${id} ${title}`,
          tags: [...tags, "grade-high"],
          summary: `GRADE: High. Curated source for ${tags.join(" ")}.`,
        }),
      );
      entries.push(
        entry({
          path: ".aiwg/research/quarantine/NO-REF-llm-artifact-scan.md",
          name: "NO-REF-llm-artifact-scan",
          title:
            "Hybrid retrieval multi-vector indexing semantic tool discovery runbook structured process metadata",
          tags: ["quarantine", "integrity-scan"],
          summary:
            "Severity: HIGH. Generated scan diagnostic, not research evidence.",
        }),
      );
      writeGraph(tmp, entries);
      if (backend === "fortemi-core") {
        syncFortemiCoreIndex(tmp, {
          graph: "project",
          generatedAt: "2026-01-05T00:00:00.000Z",
        });
      }

      const result = await runResearchQuery(tmp, {
        question: regressionQuestion,
        backend,
        depth: "thorough",
        maxSources: 10,
      });

      expect(result.sources.map((source) => source.id)).toEqual(
        expect.arrayContaining(curated.map(([id]) => id)),
      );
      expect(result.sources.map((source) => source.id)).not.toContain(
        "NO-REF-llm-artifact-scan",
      );
      expect(result.sources.every((source) => source.grade === "HIGH")).toBe(
        true,
      );
    },
  );

  it.each(["local", "fortemi-core"] as const)(
    "includes diagnostics only by explicit opt-in and never treats scan severity as GRADE on %s",
    async (backend) => {
      writeGraph(tmp, [
        entry({
          path: ".aiwg/research/references/REF-068.md",
          name: "REF-068",
          title: "REF-068 Hybrid Retrieval",
          tags: ["hybrid", "retrieval", "grade-moderate"],
          summary: "GRADE: Moderate. Curated retrieval evidence.",
        }),
        entry({
          path: ".aiwg/research/quarantine/REF-134-llm-artifact-scan.md",
          name: "REF-134-llm-artifact-scan",
          title: "Hybrid Retrieval Integrity Scan",
          tags: ["quarantine", "integrity-scan"],
          summary:
            "Severity: HIGH. Confidence: HIGH. Review hybrid retrieval artifact.",
        }),
      ]);
      if (backend === "fortemi-core") {
        syncFortemiCoreIndex(tmp, {
          graph: "project",
          generatedAt: "2026-01-05T00:00:00.000Z",
        });
      }

      const normal = await runResearchQuery(tmp, {
        question: "hybrid retrieval",
        backend,
      });
      const diagnostic = await runResearchQuery(tmp, {
        question: "hybrid retrieval",
        backend,
        includeDiagnostics: true,
      });

      expect(normal.sources.map((source) => source.id)).toEqual(["REF-068"]);
      expect(
        diagnostic.sources.find((source) => source.id === "REF-134")?.grade,
      ).toBe("UNKNOWN");
    },
  );

  it("uses Fortemi-cached bodies without rereading original source files", async () => {
    writeGraph(tmp, [
      entry({
        path: ".aiwg/research/references/REF-068.md",
        name: "REF-068",
        title: "REF-068 Retrieval",
        tags: ["grade-high"],
        summary: "GRADE: High.",
      }),
    ]);
    const sourcePath = path.join(tmp, ".aiwg/research/references/REF-068.md");
    fs.appendFileSync(
      sourcePath,
      "\ncache-independent multi-vector evidence\n",
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    fs.rmSync(sourcePath);

    const result = await runResearchQuery(tmp, {
      question: "cache-independent multi-vector evidence",
      backend: "fortemi-core",
      depth: "thorough",
    });

    expect(result.sources.map((source) => source.id)).toEqual(["REF-068"]);
    expect(result.sources[0].grade).toBe("HIGH");
  });

  it("fails explicitly when Fortemi Core source selection is requested before sync", async () => {
    seed();

    await expect(
      runResearchQuery(tmp, {
        question: "retrieval source selection",
        depth: "quick",
        backend: "fortemi-core",
      }),
    ).rejects.toThrow("aiwg index sync");
  });

  it("emits JSON and can save a source-selection artifact", async () => {
    seed();
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await main(
      [
        "static retrieval",
        "--sources-only",
        "--json",
        "--save",
        "--max-sources",
        "1",
      ],
      tmp,
    );

    const output = JSON.parse(consoleSpy.mock.calls[0][0] as string);
    expect(output.sources).toHaveLength(1);
    expect(output.savedPath).toMatch(
      /^\.aiwg\/research\/synthesis\/query-static-retrieval-\d{4}-\d{2}-\d{2}\.md$/,
    );
    expect(fs.existsSync(path.join(tmp, output.savedPath))).toBe(true);
  });

  it("rejects missing value-bearing flags before they can alter the question", async () => {
    seed();
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        main(["retrieval", "--backend", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--backend must be local or fortemi-core",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--depth", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--depth must be quick or thorough",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--graph", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--graph requires a graph name",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        main(["retrieval", "--max-sources", "0", "--json"], tmp),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "--max-sources must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });
});
