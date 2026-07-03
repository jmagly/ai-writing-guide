import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  discoverCapability,
  queryIndex,
  showArtifact,
} from "../../../src/artifacts/query-engine.js";
import { main as indexCliMain } from "../../../src/artifacts/cli.js";
import { showDeps } from "../../../src/artifacts/dep-graph.js";
import { showNeighbors } from "../../../src/artifacts/graph-query.js";
import {
  getFortemiCoreSyncStatus,
  syncFortemiCoreIndex,
} from "../../../src/artifacts/fortemi-core-sync.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  GraphType,
  IndexStats,
  MetadataEntry,
} from "../../../src/artifacts/types.js";
import { getGraphIndexDir } from "../../../src/artifacts/types.js";

function entry(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: ".aiwg/skills/intake-wizard/SKILL.md",
    type: "skill",
    phase: "requirements",
    title: "Intake Wizard",
    name: "intake-wizard",
    tags: ["intake"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "Collect structured intake forms.",
    dependencies: [],
    dependents: [],
    triggers: ["start intake", "collect intake"],
    capability: "Create and validate project intake forms.",
    ...overrides,
  };
}

function writeProjectGraph(
  root: string,
  entries: MetadataEntry[],
  dependencies?: DependencyGraph,
  graphName = "project",
): void {
  const graphDir = getGraphIndexDir(root, graphName as GraphType);
  fs.mkdirSync(graphDir, { recursive: true });
  const index: ArtifactIndex = {
    version: "1.0.0",
    builtAt: "2026-01-03T00:00:00.000Z",
    buildTimeMs: 1,
    entries: Object.fromEntries(entries.map((item) => [item.path, item])),
  };
  const graph: DependencyGraph =
    dependencies ??
    Object.fromEntries(
      entries.map((item) => [item.path, { upstream: [], downstream: [] }]),
    );
  fs.writeFileSync(path.join(graphDir, "metadata.json"), JSON.stringify(index));
  fs.writeFileSync(
    path.join(graphDir, "dependencies.json"),
    JSON.stringify(graph),
  );
  const stats: IndexStats = {
    version: "1.0.0",
    builtAt: index.builtAt,
    buildTimeMs: index.buildTimeMs,
    totalArtifacts: entries.length,
    byPhase: {},
    byType: {},
    tagDistribution: {},
    graphMetrics: {
      totalEdges: Object.values(graph).reduce(
        (total, edges) =>
          total + edges.upstream.length + edges.downstream.length,
        0,
      ),
      orphanedArtifacts: Object.values(graph).filter(
        (edges) => edges.upstream.length === 0 && edges.downstream.length === 0,
      ).length,
      mostReferenced: null,
    },
  };
  for (const item of entries) {
    stats.byPhase[item.phase] = (stats.byPhase[item.phase] ?? 0) + 1;
    stats.byType[item.type] = (stats.byType[item.type] ?? 0) + 1;
    for (const tag of item.tags) {
      stats.tagDistribution[tag] = (stats.tagDistribution[tag] ?? 0) + 1;
    }
  }
  fs.writeFileSync(path.join(graphDir, "stats.json"), JSON.stringify(stats));
  for (const item of entries) {
    fs.mkdirSync(path.join(root, path.dirname(item.path)), { recursive: true });
    fs.writeFileSync(
      path.join(root, item.path),
      `# ${item.title}\n\n${item.summary}\n`,
    );
  }
}

describe("Fortemi Core discover/show parity adapter (#1688)", () => {
  let tmp: string;
  let originalXdgDataHome: string | undefined;
  let originalAiwgRoot: string | undefined;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-fortemi-discover-"));
    originalXdgDataHome = process.env.XDG_DATA_HOME;
    originalAiwgRoot = process.env.AIWG_ROOT;
    process.env.XDG_DATA_HOME = path.join(tmp, "xdg-data");
    process.env.AIWG_ROOT = tmp;
    consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    stdoutSpy = vi
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    stdoutSpy.mockRestore();
    if (originalXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = originalXdgDataHome;
    if (originalAiwgRoot === undefined) delete process.env.AIWG_ROOT;
    else process.env.AIWG_ROOT = originalAiwgRoot;
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function readConsoleJson(): any {
    return JSON.parse(consoleSpy.mock.calls.map((call) => call[0]).join(""));
  }

  function readStdoutJson(): any {
    return JSON.parse(stdoutSpy.mock.calls.map((call) => call[0]).join(""));
  }

  function sha256(text: string): string {
    return createHash("sha256").update(text).digest("hex");
  }

  it("returns parity-ranked discover results from the Fortemi Core cache", async () => {
    const entries = [
      entry({}),
      entry({
        path: ".aiwg/skills/deploy-checklist/SKILL.md",
        title: "Deploy Checklist",
        name: "deploy-checklist",
        tags: ["release"],
        summary: "Prepare production release checks.",
        triggers: ["ship release"],
        capability: "Prepare deployment readiness checks.",
      }),
    ];
    writeProjectGraph(tmp, entries);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await discoverCapability(tmp, {
      phrase: "collect intake forms",
      graph: "project",
      json: true,
      limit: 2,
    });
    const local = readConsoleJson();
    consoleSpy.mockClear();

    await discoverCapability(tmp, {
      phrase: "collect intake forms",
      graph: "project",
      json: true,
      limit: 2,
      backend: "fortemi-core",
    });
    const fortemi = readConsoleJson();

    expect(fortemi.query.backend).toBe("fortemi-core");
    expect(fortemi.results.map((result: any) => result.path)).toEqual(
      local.results.map((result: any) => result.path),
    );
    expect(fortemi.results[0].title).toBe("Intake Wizard");
  });

  it("defaults capability discover and show to the framework graph on Fortemi Core", async () => {
    const projectSkill = entry({
      path: ".aiwg/skills/project-intake/SKILL.md",
      title: "Project Intake",
      name: "project-intake",
      summary: "Collect project intake notes.",
      triggers: ["project intake"],
      capability: "Collect project intake notes.",
    });
    const frameworkSkill = entry({
      path: "agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md",
      title: "Doc Sync",
      name: "doc-sync",
      tags: ["documentation", "sync"],
      summary: "Synchronize code changes into documentation.",
      triggers: ["doc sync code to docs", "sync docs"],
      capability: "Keep documentation aligned with implementation changes.",
    });
    writeProjectGraph(tmp, [projectSkill], undefined, "project");
    writeProjectGraph(tmp, [frameworkSkill], undefined, "framework");
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    syncFortemiCoreIndex(tmp, {
      graph: "framework",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await discoverCapability(tmp, {
      phrase: "doc sync code to docs",
      json: true,
      limit: 3,
    });
    const discover = readConsoleJson();
    expect(discover.query.backend).toBe("fortemi-core");
    expect(discover.query.graph).toBe("capability-default");
    expect(discover.results[0].path).toContain(frameworkSkill.path);
    consoleSpy.mockClear();

    await showArtifact(tmp, {
      typeFilter: ["skill"],
      name: "doc-sync",
      json: true,
      backend: "fortemi-core",
    });
    const shown = readConsoleJson();
    expect(shown.path).toContain(frameworkSkill.path);
    expect(shown.content).toContain("# Doc Sync");
  });

  it("includes project-local custom skills in default Fortemi Core capability discovery", async () => {
    const customSkill = entry({
      path: ".aiwg/skills/custom-review/SKILL.md",
      title: "Custom Review",
      name: "custom-review",
      tags: ["custom", "review"],
      summary: "Run the team's custom review workflow.",
      triggers: ["custom review workflow", "team review"],
      capability: "Run project-local custom review workflow.",
    });
    const frameworkSkill = entry({
      path: "agentic/code/frameworks/sdlc-complete/skills/doc-sync/SKILL.md",
      title: "Doc Sync",
      name: "doc-sync",
      tags: ["documentation", "sync"],
      summary: "Synchronize code changes into documentation.",
      triggers: ["doc sync"],
      capability: "Keep documentation aligned with implementation changes.",
    });
    writeProjectGraph(tmp, [customSkill], undefined, "project");
    writeProjectGraph(tmp, [frameworkSkill], undefined, "framework");
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    syncFortemiCoreIndex(tmp, {
      graph: "framework",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await discoverCapability(tmp, {
      phrase: "custom review workflow",
      json: true,
      limit: 3,
    });
    const discover = readConsoleJson();
    expect(discover.query.backend).toBe("fortemi-core");
    expect(discover.query.graph).toBe("capability-default");
    expect(discover.results[0].path).toContain(customSkill.path);
    consoleSpy.mockClear();

    await showArtifact(tmp, {
      typeFilter: ["skill"],
      name: "custom-review",
      json: true,
      backend: "fortemi-core",
    });
    const shown = readConsoleJson();
    expect(shown.path).toContain(customSkill.path);
    expect(shown.content).toContain("# Custom Review");
  });

  it("fetches exact bodies and preserves ambiguous-name diagnostics", async () => {
    const entries = [
      entry({}),
      entry({
        path: ".aiwg/commands/intake-wizard.md",
        type: "command",
        title: "Intake Wizard Command",
        name: "intake-wizard",
        summary: "Run the intake wizard command.",
      }),
    ];
    writeProjectGraph(tmp, entries);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await showArtifact(tmp, {
      name: ".aiwg/skills/intake-wizard/SKILL.md",
      graph: "project",
      json: true,
      backend: "fortemi-core",
    });
    const fetched = readConsoleJson();
    expect(fetched.content).toContain("# Intake Wizard");
    consoleSpy.mockClear();

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    try {
      await expect(
        showArtifact(tmp, {
          name: "intake-wizard",
          graph: "project",
          json: true,
          backend: "fortemi-core",
        }),
      ).rejects.toThrow("process.exit");
      const ambiguous = readConsoleJson();
      expect(ambiguous.ambiguous).toBe(true);
      expect(ambiguous.matches.map((match: any) => match.type).sort()).toEqual([
        "command",
        "skill",
      ]);
      expect(exitSpy).toHaveBeenCalledWith(2);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("fails explicitly when the Fortemi Core cache is unavailable", async () => {
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        discoverCapability(tmp, {
          phrase: "collect intake forms",
          graph: "project",
          json: true,
          backend: "fortemi-core",
        }),
      ).rejects.toThrow("process.exit");
      const parsed = readConsoleJson();
      expect(parsed.hint).toContain("aiwg index sync");
      expect(parsed.hint).toContain(
        "pass '--backend local' to use the legacy local index",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("fails explicitly when the Fortemi Core cache has the wrong schema", async () => {
    writeProjectGraph(tmp, [entry({})]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    const status = getFortemiCoreSyncStatus(tmp);
    const wrongSchemaExport = JSON.stringify({
        schema_version: "aiwg.fortemi.index.export.v1",
        generated_at: "2026-01-05T00:00:00.000Z",
        source: { repo: "test", privacy: "sanitized" },
        items: [],
      });
    fs.writeFileSync(status.exportPath, wrongSchemaExport);
    const manifest = JSON.parse(fs.readFileSync(status.manifestPath, "utf-8"));
    fs.writeFileSync(
      status.manifestPath,
      JSON.stringify(
        {
          ...manifest,
          export_checksum: sha256(wrongSchemaExport),
        },
        null,
        2,
      ) + "\n",
    );
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        discoverCapability(tmp, {
          phrase: "collect intake forms",
          graph: "project",
          json: true,
          backend: "fortemi-core",
        }),
      ).rejects.toThrow("process.exit");
      const parsed = readConsoleJson();
      expect(parsed.hint).toContain(
        "export schema 'aiwg.fortemi.index.export.v1' does not match manifest 'aiwg.fortemi.index.export.v2'",
      );
      expect(parsed.hint).toContain(
        "Re-run 'aiwg index sync'",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("fails explicitly when the Fortemi Core cache export is corrupt", async () => {
    writeProjectGraph(tmp, [entry({})]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    const status = getFortemiCoreSyncStatus(tmp);
    fs.writeFileSync(status.exportPath, "{ not json");
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        discoverCapability(tmp, {
          phrase: "collect intake forms",
          graph: "project",
          json: true,
          backend: "fortemi-core",
        }),
      ).rejects.toThrow("process.exit");
      const parsed = readConsoleJson();
      expect(parsed.hint).toContain("export file is unreadable");
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("treats a valid empty Fortemi Core cache as an empty index", async () => {
    writeProjectGraph(tmp, []);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await queryIndex(
      tmp,
      {},
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const metadata = readConsoleJson();
    expect(metadata.query.backend).toBe("fortemi-core");
    expect(metadata.total).toBe(0);
    expect(metadata.results).toEqual([]);
    expect(metadata).not.toHaveProperty("hint");
    consoleSpy.mockClear();

    await queryIndex(
      tmp,
      { text: "retrieval", fulltext: true },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const fulltext = readConsoleJson();
    expect(fulltext.query.backend).toBe("fortemi-core");
    expect(fulltext.mode).toBe("fulltext");
    expect(fulltext.total).toBe(0);
    expect(fulltext.results).toEqual([]);
    expect(fulltext).not.toHaveProperty("hint");
    consoleSpy.mockClear();

    await discoverCapability(tmp, {
      phrase: "intake workflow",
      graph: "project",
      json: true,
      backend: "fortemi-core",
    });
    const discover = readConsoleJson();
    expect(discover.query.backend).toBe("fortemi-core");
    expect(discover.total).toBe(0);
    expect(discover.results).toEqual([]);
    expect(discover.hint).toContain(
      "among 0 Fortemi Core static-cache capabilities",
    );
    expect(discover.hint).toContain(
      "aiwg index sync",
    );
    consoleSpy.mockClear();

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    try {
      await expect(
        showArtifact(tmp, {
          type: "skill",
          name: "intake-wizard",
          graph: "project",
          backend: "fortemi-core",
        }),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy.mock.calls.join("\n")).toContain(
        'Error: no artifact found matching "intake-wizard".',
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      exitSpy.mockRestore();
    }
  });

  it("preserves index query filters and fulltext behavior on the Fortemi Core backend", async () => {
    const entries = [
      entry({}),
      entry({
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Search Architecture",
        name: "search-architecture",
        tags: ["search"],
        summary: "Choose browser-only retrieval parity for the search architecture.",
        capability: undefined,
        triggers: undefined,
      }),
    ];
    writeProjectGraph(tmp, entries);
    fs.writeFileSync(
      path.join(tmp, ".aiwg", "architecture", "search-adr.md"),
      "# Search Architecture\n\nThe body mentions browser-only retrieval parity.\n",
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await queryIndex(
      tmp,
      { text: "search architecture", type: "adr", tags: ["search"] },
      { graph: "project", json: true },
    );
    const local = readConsoleJson();
    consoleSpy.mockClear();

    await queryIndex(
      tmp,
      { text: "search architecture", type: "adr", tags: ["search"] },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const fortemi = readConsoleJson();
    expect(fortemi.query.backend).toBe("fortemi-core");
    expect(fortemi.results.map((result: any) => result.path)).toEqual(
      local.results.map((result: any) => result.path),
    );

    consoleSpy.mockClear();
    await queryIndex(
      tmp,
      { text: "browser-only retrieval parity", fulltext: true },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const fulltext = readConsoleJson();
    expect(fulltext.mode).toBe("fulltext");
    expect(fulltext.results[0].path).toBe(".aiwg/architecture/search-adr.md");
    expect(fulltext.results[0].matched).toContain("browser-only");
  });

  it("serves Fortemi fulltext from the static cache when source files are unavailable", async () => {
    const architecture = entry({
      path: ".aiwg/architecture/search-adr.md",
      type: "adr",
      phase: "architecture",
      title: "Search Architecture",
      name: "search-architecture",
      tags: ["search", "static-cache"],
      summary: "Static cache summary without the source-only search phrase.",
    });
    const requirement = entry({
      path: ".aiwg/requirements/UC-001.md",
      type: "use-case",
      phase: "requirements",
      title: "Retrieval Requirement",
      name: "retrieval-requirement",
      tags: ["retrieval"],
      summary: "Define retrieval acceptance criteria.",
    });
    writeProjectGraph(tmp, [architecture, requirement]);
    fs.writeFileSync(
      path.join(tmp, architecture.path),
      "# Search Architecture\n\nSource-only static cache phrase: browser-only retrieval parity survives source removal.\n",
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    fs.rmSync(path.join(tmp, architecture.path));

    await queryIndex(
      tmp,
      {
        text: "browser-only retrieval parity",
        fulltext: true,
        type: "adr",
        phase: "architecture",
        tags: ["search", "static-cache"],
        path: ".aiwg/architecture/*.md",
      },
      { graph: "project", json: true, backend: "fortemi-core" },
    );

    const fulltext = readConsoleJson();
    expect(fulltext.query.backend).toBe("fortemi-core");
    expect(fulltext.mode).toBe("fulltext");
    expect(fulltext.results).toHaveLength(1);
    expect(fulltext.results[0]).toMatchObject({
      path: architecture.path,
      type: "adr",
      phase: "architecture",
      title: "Search Architecture",
    });
    expect(fulltext.results[0].matched).toEqual(
      expect.arrayContaining(["browser-only", "retrieval"]),
    );
  });

  it("preserves stats, status/list, export, and sync through the public index CLI", async () => {
    const entries = [
      entry({}),
      entry({
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Search Architecture",
        name: "search-architecture",
        tags: ["search"],
        summary: "Choose the search architecture.",
      }),
    ];
    writeProjectGraph(tmp, entries);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);

    try {
      await indexCliMain(["stats", "--graph", "project", "--json"]);
      const stats = readConsoleJson();
      expect(stats.totalArtifacts).toBe(2);
      expect(stats.byType).toMatchObject({ skill: 1, adr: 1 });
      consoleSpy.mockClear();

      await indexCliMain(["status", "--json"]);
      const statusBeforeSync = readConsoleJson();
      expect(statusBeforeSync.orphanIndexDirs).toEqual([]);
      expect(statusBeforeSync.fortemiCore.optedIn).toBe(false);
      expect(
        statusBeforeSync.graphs.find((graph: any) => graph.name === "project"),
      ).toMatchObject({ built: true, entries: 2 });
      consoleSpy.mockClear();

      await indexCliMain(["list", "--json"]);
      const listAlias = readConsoleJson();
      expect(listAlias.graphs).toEqual(statusBeforeSync.graphs);
      expect(listAlias.fortemiCore).toEqual(statusBeforeSync.fortemiCore);
      consoleSpy.mockClear();

      await indexCliMain([
        "export",
        "--format",
        "fortemi",
        "--graph",
        "project",
        "--schema-version",
        "v2",
      ]);
      const exported = readStdoutJson();
      expect(exported.schema_version).toBe("aiwg.fortemi.index.export.v2");
      expect(new Set(exported.items.map((item: any) => item.type))).toEqual(
        new Set(["aiwg.skill", "aiwg.artifact"]),
      );
      stdoutSpy.mockClear();

      await indexCliMain([
        "sync",
        "--backend",
        "fortemi-core",
        "--graph",
        "project",
        "--generated-at",
        "2026-01-05T00:00:00.000Z",
        "--json",
      ]);
      const manifest = readConsoleJson();
      expect(manifest).toMatchObject({
        backend: "fortemi-core",
        graph: "project",
        item_count: 2,
      });
      consoleSpy.mockClear();

      await indexCliMain(["status", "--json"]);
      const statusAfterSync = readConsoleJson();
      expect(statusAfterSync.fortemiCore).toMatchObject({
        optedIn: true,
        built: true,
        stale: false,
        itemCount: 2,
      });
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("routes semantic CLI queries through the Fortemi Core static cache", async () => {
    const entries = [
      entry({
        path: ".aiwg/research/references/REF-001.md",
        type: "research-ref",
        phase: "research",
        title: "REF-001 Static Retrieval Evaluation",
        name: "REF-001",
        tags: ["retrieval", "grade-high"],
        summary:
          "GRADE: High. Static retrieval parity evidence with chunk matching.",
      }),
      entry({
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Search Architecture",
        name: "search-architecture",
        tags: ["search"],
        summary: "Choose browser-only retrieval architecture.",
      }),
    ];
    writeProjectGraph(tmp, entries);
    fs.writeFileSync(
      path.join(tmp, ".aiwg", "research", "references", "REF-001.md"),
      "# REF-001 Static Retrieval Evaluation\n\nGRADE: High. Citation chunk supports static retrieval parity.\n",
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    try {
      await indexCliMain([
        "query",
        "static retrieval grade citation",
        "--semantic",
        "--backend",
        "fortemi-core",
        "--graph",
        "project",
        "--json",
      ]);
    } finally {
      cwdSpy.mockRestore();
    }

    const semantic = readConsoleJson();
    expect(semantic.query.backend).toBe("fortemi-core");
    expect(semantic.mode).toBe("semantic");
    expect(semantic.results[0]).toMatchObject({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Static Retrieval Evaluation",
    });
    expect(semantic.results[0].matched).toContain("chunks");
  });

  it("routes hybrid CLI queries with filters through the Fortemi Core static cache", async () => {
    const entries = [
      entry({
        path: ".aiwg/research/references/REF-001.md",
        type: "research-ref",
        phase: "research",
        title: "REF-001 Static Retrieval Evaluation",
        name: "REF-001",
        tags: ["retrieval", "grade-high"],
        summary:
          "GRADE: High. Static retrieval parity evidence with chunk matching.",
      }),
      entry({
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Search Architecture",
        name: "search-architecture",
        tags: ["search"],
        summary: "Choose browser-only retrieval architecture.",
      }),
    ];
    writeProjectGraph(tmp, entries);
    fs.writeFileSync(
      path.join(tmp, ".aiwg", "architecture", "search-adr.md"),
      "# Search Architecture\n\nStatic retrieval architecture uses filtered hybrid matching.\n",
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    try {
      await indexCliMain([
        "query",
        "static retrieval architecture",
        "--hybrid",
        "--backend",
        "fortemi-core",
        "--graph",
        "project",
        "--type",
        "adr",
        "--tags",
        "search",
        "--path",
        ".aiwg/architecture",
        "--json",
      ]);
    } finally {
      cwdSpy.mockRestore();
    }

    const hybrid = readConsoleJson();
    expect(hybrid.query.backend).toBe("fortemi-core");
    expect(hybrid.mode).toBe("hybrid");
    expect(hybrid.results).toHaveLength(1);
    expect(hybrid.results[0]).toMatchObject({
      path: ".aiwg/architecture/search-adr.md",
      type: "adr",
      title: "Search Architecture",
    });
    expect(hybrid.results[0].matched).toEqual(
      expect.arrayContaining(["path", "type", "tags"]),
    );
  });

  it("rejects a backend flag without a value in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain(["query", "intake", "--backend"]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --backend must be local or fortemi-core",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects a graph flag without a value in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);
    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain(["query", "intake", "--graph"]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --graph requires a graph name",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain(["query", "intake", "--graph", "--json"]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --graph requires a graph name",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("parses positional graph operands after Fortemi backend flags in the public CLI", async () => {
    const refA = entry({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Agent Retrieval Evaluation",
      name: "REF-001",
      tags: ["grade-high", "retrieval"],
      summary: "GRADE: High. Evaluates retrieval quality for agent systems.",
    });
    const refB = entry({
      path: ".aiwg/research/references/REF-002.md",
      type: "research-ref",
      title: "REF-002 Citation Baseline",
      name: "REF-002",
      tags: ["grade-moderate"],
      summary: "GRADE: Moderate. Establishes a citation baseline.",
    });
    const dependencies: DependencyGraph = {
      [refA.path]: {
        upstream: [{ path: refB.path, type: "cites" }],
        downstream: [],
      },
      [refB.path]: {
        upstream: [],
        downstream: [{ path: refA.path, type: "cites" }],
      },
    };
    writeProjectGraph(tmp, [refA, refB], dependencies);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    try {
      await indexCliMain([
        "deps",
        "--backend",
        "fortemi-core",
        refA.path,
        "--graph",
        "project",
        "--direction",
        "upstream",
        "--edge-type",
        "cites",
        "--json",
      ]);
      const deps = readConsoleJson();
      expect(deps.backend).toBe("fortemi-core");
      expect(deps.artifact).toBe(refA.path);
      expect(deps.upstream).toEqual([refB.path]);
      consoleSpy.mockClear();

      await indexCliMain([
        "neighbors",
        "--backend",
        "fortemi-core",
        "--graph",
        "project",
        "REF-001",
        "--direction",
        "in",
        "--edge-type",
        "cites",
        "--json",
      ]);
      const neighbors = readConsoleJson();
      expect(neighbors.backend).toBe("fortemi-core");
      expect(neighbors.node).toBe(refA.path);
      expect(neighbors.neighbors).toEqual([refB.path]);
    } finally {
      cwdSpy.mockRestore();
    }
  });

  it("rejects invalid graph traversal direction flags in the public CLI", async () => {
    const refA = entry({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Agent Retrieval Evaluation",
      name: "REF-001",
      tags: ["grade-high", "retrieval"],
      summary: "GRADE: High. Evaluates retrieval quality for agent systems.",
    });
    const refB = entry({
      path: ".aiwg/research/references/REF-002.md",
      type: "research-ref",
      title: "REF-002 Citation Baseline",
      name: "REF-002",
      tags: ["grade-moderate"],
      summary: "GRADE: Moderate. Establishes a citation baseline.",
    });
    writeProjectGraph(tmp, [refA, refB]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "deps",
          refA.path,
          "--backend",
          "fortemi-core",
          "--direction",
          "sideways",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --direction must be upstream, downstream, or both",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "neighbors",
          "--graph",
          "project",
          "--node",
          "REF-001",
          "--backend",
          "fortemi-core",
          "--direction",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --direction must be in, out, or both",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing graph traversal operand values in the public CLI", async () => {
    const refA = entry({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Agent Retrieval Evaluation",
      name: "REF-001",
      tags: ["grade-high", "retrieval"],
      summary: "GRADE: High. Evaluates retrieval quality for agent systems.",
    });
    const refB = entry({
      path: ".aiwg/research/references/REF-002.md",
      type: "research-ref",
      title: "REF-002 Citation Baseline",
      name: "REF-002",
      tags: ["grade-moderate"],
      summary: "GRADE: Moderate. Establishes a citation baseline.",
    });
    writeProjectGraph(tmp, [refA, refB]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "neighbors",
          "--graph",
          "project",
          "--node",
          "--backend",
          "fortemi-core",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --node is required for neighbors command",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "set",
          "--graph",
          "project",
          "--op",
          "intersection",
          "--node-a",
          "--node-b",
          "REF-002",
          "--backend",
          "fortemi-core",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --node-a and --node-b are required",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing graph traversal option values in the public CLI", async () => {
    const refA = entry({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Agent Retrieval Evaluation",
      name: "REF-001",
      tags: ["grade-high", "retrieval"],
      summary: "GRADE: High. Evaluates retrieval quality for agent systems.",
    });
    const refB = entry({
      path: ".aiwg/research/references/REF-002.md",
      type: "research-ref",
      title: "REF-002 Citation Baseline",
      name: "REF-002",
      tags: ["grade-moderate"],
      summary: "GRADE: Moderate. Establishes a citation baseline.",
    });
    writeProjectGraph(tmp, [refA, refB]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "deps",
          refA.path,
          "--backend",
          "fortemi-core",
          "--depth",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --depth must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "neighbors",
          "--graph",
          "project",
          "--node",
          "REF-001",
          "--backend",
          "fortemi-core",
          "--edge-type",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --edge-type requires a value",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing Fortemi sync option values in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "sync",
          "--backend",
          "fortemi-core",
          "--repo",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --repo requires a value",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "sync",
          "--backend",
          "fortemi-core",
          "--privacy",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --privacy must be private, sanitized, or public",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing Fortemi export option values in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "export",
          "--format",
          "fortemi",
          "--schema-version",
          "--graph",
          "project",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --schema-version must be v1 or v2",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "export",
          "--format",
          "fortemi",
          "--out",
          "--graph",
          "project",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --out requires a file path",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing Fortemi query filter values in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "query",
          "intake",
          "--backend",
          "fortemi-core",
          "--hybrid",
          "--type",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --type requires a value",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "query",
          "intake",
          "--backend",
          "fortemi-core",
          "--semantic",
          "--limit",
          "0",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --limit must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("rejects missing Fortemi discover filter values in the public CLI", async () => {
    writeProjectGraph(tmp, [entry({})]);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const cwdSpy = vi.spyOn(process, "cwd").mockReturnValue(tmp);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });

    try {
      await expect(
        indexCliMain([
          "discover",
          "intake",
          "--backend",
          "fortemi-core",
          "--type",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --type requires a value",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
      consoleErrorSpy.mockClear();
      exitSpy.mockClear();

      await expect(
        indexCliMain([
          "discover",
          "intake",
          "--backend",
          "fortemi-core",
          "--limit",
          "many",
          "--json",
        ]),
      ).rejects.toThrow("process.exit");
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        "Error: --limit must be a positive integer",
      );
      expect(exitSpy).toHaveBeenCalledWith(1);
    } finally {
      cwdSpy.mockRestore();
      exitSpy.mockRestore();
    }
  });

  it("preserves research citation graph traversal on the Fortemi Core backend", async () => {
    const refA = entry({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Agent Retrieval Evaluation",
      name: "REF-001",
      tags: ["grade-high", "retrieval"],
      summary: "GRADE: High. Evaluates retrieval quality for agent systems.",
    });
    const refB = entry({
      path: ".aiwg/research/references/REF-002.md",
      type: "research-ref",
      title: "REF-002 Citation Baseline",
      name: "REF-002",
      tags: ["grade-moderate"],
      summary: "GRADE: Moderate. Establishes a citation baseline.",
    });
    const profile = entry({
      path: ".aiwg/research/profiles/PROF-001.md",
      type: "research-profile",
      title: "PROF-001 Retrieval Authors",
      name: "PROF-001",
      tags: ["profile"],
      summary: "Research profile connected to retrieval evaluation sources.",
    });
    const dependencies: DependencyGraph = {
      [refA.path]: {
        upstream: [{ path: refB.path, type: "cites" }],
        downstream: [{ path: profile.path, type: "profiles" }],
      },
      [refB.path]: {
        upstream: [],
        downstream: [{ path: refA.path, type: "cites" }],
      },
      [profile.path]: {
        upstream: [{ path: refA.path, type: "profiles" }],
        downstream: [],
      },
    };
    writeProjectGraph(tmp, [refA, refB, profile], dependencies);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await queryIndex(
      tmp,
      { text: "retrieval", type: "research-ref", tags: ["grade-high"] },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const query = readConsoleJson();
    expect(query.results[0].path).toBe(refA.path);
    expect(query.results[0].summary).toContain("GRADE: High");
    consoleSpy.mockClear();

    await showDeps(tmp, refA.path, {
      graph: "project",
      direction: "upstream",
      edgeType: "cites",
      json: true,
      backend: "fortemi-core",
    });
    const deps = readConsoleJson();
    expect(deps.backend).toBe("fortemi-core");
    expect(deps.upstream).toEqual([refB.path]);
  });

  it("preserves KB and semantic-memory neighbor traversal on the Fortemi Core backend", async () => {
    const kbPage = entry({
      path: ".aiwg/kb/concepts/retrieval.md",
      type: "kb-page",
      title: "Retrieval",
      name: "retrieval",
      tags: ["kb", "concept"],
      summary: "Knowledge-base concept page for retrieval.",
    });
    const memoryEntry = entry({
      path: ".aiwg/memory/entries/retrieval-note.md",
      type: "memory-entry",
      title: "Retrieval Note",
      name: "retrieval-note",
      tags: ["memory"],
      summary: "Semantic-memory entry captured from retrieval work.",
    });
    const dependencies: DependencyGraph = {
      [kbPage.path]: {
        upstream: [{ path: memoryEntry.path, type: "references" }],
        downstream: [],
      },
      [memoryEntry.path]: {
        upstream: [],
        downstream: [{ path: kbPage.path, type: "references" }],
      },
    };
    writeProjectGraph(tmp, [kbPage, memoryEntry], dependencies, "kb");
    syncFortemiCoreIndex(tmp, {
      graph: "kb",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await showNeighbors(tmp, {
      graph: "kb",
      node: "retrieval.md",
      direction: "in",
      edgeType: "references",
      json: true,
      backend: "fortemi-core",
    });
    const neighbors = readConsoleJson();
    expect(neighbors.backend).toBe("fortemi-core");
    expect(neighbors.node).toBe(kbPage.path);
    expect(neighbors.neighbors).toEqual([memoryEntry.path]);
  });
});
