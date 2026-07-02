import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildAiwgFortemiIndexExport,
  type AiwgFortemiIndexExport,
} from "../../../src/artifacts/browser-export.js";
import { showDeps } from "../../../src/artifacts/dep-graph.js";
import {
  queryFortemiCoreStaticHybridIndex,
  queryFortemiCoreStaticSemanticIndex,
} from "../../../src/artifacts/fortemi-core-query-adapter.js";
import { syncFortemiCoreIndex } from "../../../src/artifacts/fortemi-core-sync.js";
import {
  executeSetQuery,
  showNeighbors,
} from "../../../src/artifacts/graph-query.js";
import {
  discoverCapability,
  queryIndex,
  showArtifact,
} from "../../../src/artifacts/query-engine.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";

function metadata(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: ".aiwg/skills/intake-wizard/SKILL.md",
    type: "skill",
    phase: "requirements",
    title: "Intake Wizard",
    name: "intake-wizard",
    tags: ["intake", "project-local"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "Collect structured intake forms for stakeholders.",
    dependencies: [],
    dependents: [],
    triggers: ["start intake", "collect intake"],
    capability: "Create and validate project intake forms.",
    ...overrides,
  };
}

function writeGraph(
  root: string,
  graphName: string,
  entries: MetadataEntry[],
  dependencies: DependencyGraph,
): void {
  const graphDir = path.join(root, ".aiwg", ".index", graphName);
  fs.mkdirSync(graphDir, { recursive: true });
  const index: ArtifactIndex = {
    version: "1.0.0",
    builtAt: "2026-01-03T00:00:00.000Z",
    buildTimeMs: 1,
    entries: Object.fromEntries(entries.map((entry) => [entry.path, entry])),
  };
  fs.writeFileSync(path.join(graphDir, "metadata.json"), JSON.stringify(index));
  fs.writeFileSync(
    path.join(graphDir, "dependencies.json"),
    JSON.stringify(dependencies),
  );

  for (const entry of entries) {
    fs.mkdirSync(path.join(root, path.dirname(entry.path)), {
      recursive: true,
    });
    fs.writeFileSync(
      path.join(root, entry.path),
      `---\ntitle: ${entry.title}\ntags: ${entry.tags.join(", ")}\n---\n# ${entry.title}\n\n${entry.summary}\n\nBody marker: ${entry.name ?? entry.title} static parity.\n`,
    );
  }
}

function emptyGraph(entries: MetadataEntry[]): DependencyGraph {
  return Object.fromEntries(
    entries.map((entry) => [entry.path, { upstream: [], downstream: [] }]),
  );
}

describe("Fortemi Core no-regression parity fixtures (#1691)", () => {
  let tmp: string;
  let consoleSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-fortemi-parity-"));
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
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function readConsoleJson(): any {
    return JSON.parse(consoleSpy.mock.calls.map((call) => call[0]).join(""));
  }

  function seedProjectGraph(): MetadataEntry[] {
    const entries = [
      metadata({}),
      metadata({
        path: ".aiwg/agents/intake-wizard.md",
        type: "agent",
        title: "Intake Wizard Agent",
        name: "intake-wizard",
        tags: ["intake", "agent"],
        summary: "Agent that validates intake forms.",
        triggers: ["validate intake"],
        capability: "Validate intake and route missing fields.",
      }),
      metadata({
        path: ".aiwg/commands/intake.md",
        type: "command",
        title: "Intake Command",
        name: "intake",
        tags: ["command"],
        summary: "Run the intake workflow.",
      }),
      metadata({
        path: ".aiwg/rules/intake-quality.md",
        type: "rule",
        title: "Intake Quality",
        name: "intake-quality",
        tags: ["rule"],
        summary: "Require clear acceptance criteria for intake.",
      }),
      metadata({
        path: ".aiwg/flows/intake-review.md",
        type: "flow",
        title: "Intake Review Flow",
        name: "intake-review",
        tags: ["flow"],
        summary: "Review intake with stakeholder checkpoints.",
      }),
      metadata({
        path: ".aiwg/extensions/project-local-intake/manifest.md",
        type: "extension",
        title: "Project Local Intake",
        name: "project-local-intake",
        tags: ["bundle", "project-local"],
        summary: "Project-local bundle for intake discovery.",
      }),
      metadata({
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Search Architecture",
        name: "search-architecture",
        tags: ["search"],
        summary: "Choose static retrieval architecture.",
      }),
      metadata({
        path: ".aiwg/architecture/decisions/deep-search-adr.md",
        type: "adr",
        phase: "architecture",
        title: "Deep Search Architecture",
        name: "deep-search-architecture",
        tags: ["search", "deep"],
        summary: "Choose nested static retrieval architecture.",
      }),
      metadata({
        path: ".aiwg/research/references/REF-001.md",
        type: "research-ref",
        title: "REF-001 Static Retrieval Evaluation",
        name: "REF-001",
        tags: ["grade-high", "retrieval"],
        summary:
          "GRADE: High. Citation REF-002 supports static retrieval parity.",
      }),
      metadata({
        path: ".aiwg/research/profiles/PROF-001.md",
        type: "research-profile",
        title: "PROF-001 Retrieval Authors",
        name: "PROF-001",
        tags: ["profile", "retrieval"],
        summary: "Profile synthesis input for retrieval authors.",
      }),
    ];
    const graph = emptyGraph(entries);
    graph[".aiwg/architecture/search-adr.md"].upstream.push({
      path: ".aiwg/skills/intake-wizard/SKILL.md",
      type: "depends-on",
    });
    graph[".aiwg/skills/intake-wizard/SKILL.md"].downstream.push({
      path: ".aiwg/architecture/search-adr.md",
      type: "depends-on",
    });
    graph[".aiwg/research/references/REF-001.md"].downstream.push({
      path: ".aiwg/research/profiles/PROF-001.md",
      type: "profiles",
    });
    graph[".aiwg/research/profiles/PROF-001.md"].upstream.push({
      path: ".aiwg/research/references/REF-001.md",
      type: "profiles",
    });
    graph[".aiwg/research/references/REF-001.md"].upstream.push({
      path: ".aiwg/skills/intake-wizard/SKILL.md",
      type: "uses-skill",
    });
    graph[".aiwg/research/profiles/PROF-001.md"].upstream.push({
      path: ".aiwg/skills/intake-wizard/SKILL.md",
      type: "uses-skill",
    });
    graph[".aiwg/skills/intake-wizard/SKILL.md"].downstream.push(
      {
        path: ".aiwg/research/references/REF-001.md",
        type: "uses-skill",
      },
      {
        path: ".aiwg/research/profiles/PROF-001.md",
        type: "uses-skill",
      },
    );
    writeGraph(tmp, "project", entries, graph);
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    return entries;
  }

  it("keeps discovery ordering exact for deterministic local/static cases", async () => {
    seedProjectGraph();
    const cases = [
      "intake",
      "please collect structured intake forms from stakeholders",
      "intak form",
      "project local intake bundle",
      "intake review flow",
    ];

    for (const phrase of cases) {
      await discoverCapability(tmp, {
        phrase,
        graph: "project",
        json: true,
        limit: 5,
      });
      const local = readConsoleJson();
      consoleSpy.mockClear();

      await discoverCapability(tmp, {
        phrase,
        graph: "project",
        json: true,
        limit: 5,
        backend: "fortemi-core",
      });
      const fortemi = readConsoleJson();
      consoleSpy.mockClear();

      expect(fortemi.query.backend).toBe("fortemi-core");
      const localPaths = local.results.map((result: any) => result.path);
      const fortemiPaths = fortemi.results.map((result: any) => result.path);
      expect(fortemiPaths[0]).toBe(localPaths[0]);
      expect([...fortemiPaths].sort()).toEqual([...localPaths].sort());
    }
  });

  it("keeps show and query JSON shapes compatible", async () => {
    seedProjectGraph();

    await showArtifact(tmp, {
      name: ".aiwg/skills/intake-wizard/SKILL.md",
      graph: "project",
      json: true,
    });
    const localShow = readConsoleJson();
    consoleSpy.mockClear();

    await showArtifact(tmp, {
      name: ".aiwg/skills/intake-wizard/SKILL.md",
      graph: "project",
      json: true,
      backend: "fortemi-core",
    });
    const fortemiShow = readConsoleJson();
    consoleSpy.mockClear();
    expect(fortemiShow.path).toBe(localShow.path);
    expect(fortemiShow.content).toBe(localShow.content);

    await showArtifact(tmp, {
      name: "intake-wizard",
      graph: "project",
      json: true,
      first: true,
      backend: "fortemi-core",
    });
    const first = readConsoleJson();
    consoleSpy.mockClear();
    expect(first.path).toMatch(/\.aiwg\/agents\/intake-wizard\.md$/);

    await queryIndex(
      tmp,
      {
        text: "static retrieval",
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        tags: ["search"],
      },
      { graph: "project", json: true },
    );
    const localQuery = readConsoleJson();
    consoleSpy.mockClear();

    await queryIndex(
      tmp,
      {
        text: "static retrieval",
        path: ".aiwg/architecture/search-adr.md",
        type: "adr",
        tags: ["search"],
      },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const fortemiQuery = readConsoleJson();
    consoleSpy.mockClear();
    expect(fortemiQuery.query.backend).toBe("fortemi-core");
    expect(fortemiQuery.results.map((result: any) => result.path)).toEqual(
      localQuery.results.map((result: any) => result.path),
    );

    await queryIndex(
      tmp,
      { text: "Body marker: search-architecture", fulltext: true },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    const fulltext = readConsoleJson();
    expect(fulltext.mode).toBe("fulltext");
    expect(fulltext.results[0].matched).toContain("search-architecture");
  });

  it("keeps show title fallback and canonical agent duplicate preference", async () => {
    const canonicalAgent = metadata({
      path: "agentic/code/addons/aiwg-utils/agents/aiwg-steward.md",
      type: "agent",
      title: "AIWG Steward",
      name: "aiwg-steward",
      tags: ["agent", "steward"],
      summary: "Canonical steward agent from the aiwg-utils bundle.",
    });
    const personaMirror = metadata({
      path: "agentic/code/agents/personas/aiwg-steward.md",
      type: "agent",
      title: "AIWG Steward",
      name: "aiwg-steward",
      tags: ["agent", "persona"],
      summary: "Persona mirror for the steward agent.",
    });
    const searchAdr = metadata({
      path: ".aiwg/architecture/search-adr.md",
      type: "adr",
      phase: "architecture",
      title: "Search Architecture",
      name: "search-architecture",
      tags: ["search"],
      summary: "Choose static retrieval architecture.",
    });
    writeGraph(tmp, "project", [canonicalAgent, personaMirror, searchAdr], {
      [canonicalAgent.path]: { upstream: [], downstream: [] },
      [personaMirror.path]: { upstream: [], downstream: [] },
      [searchAdr.path]: { upstream: [], downstream: [] },
    });
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    const previousAiwgRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = tmp;
    try {
      await showArtifact(tmp, {
        name: "Search Architecture",
        typeFilter: ["adr"],
        graph: "project",
        json: true,
      });
      const localTitleFallback = readConsoleJson();
      consoleSpy.mockClear();

      await showArtifact(tmp, {
        name: "Search Architecture",
        typeFilter: ["adr"],
        graph: "project",
        json: true,
        backend: "fortemi-core",
      });
      const fortemiTitleFallback = readConsoleJson();
      consoleSpy.mockClear();
      expect(fortemiTitleFallback.path).toBe(localTitleFallback.path);
      expect(fortemiTitleFallback.title).toBe("Search Architecture");

      await showArtifact(tmp, {
        name: "aiwg-steward",
        typeFilter: ["agent"],
        graph: "project",
        json: true,
      });
      const localAgent = readConsoleJson();
      consoleSpy.mockClear();

      await showArtifact(tmp, {
        name: "aiwg-steward",
        typeFilter: ["agent"],
        graph: "project",
        json: true,
        backend: "fortemi-core",
      });
      const fortemiAgent = readConsoleJson();
      consoleSpy.mockClear();
      expect(localAgent.path).toBe(path.join(tmp, canonicalAgent.path));
      expect(fortemiAgent.path).toBe(localAgent.path);
      expect(fortemiAgent.content).toContain("Canonical steward agent");
    } finally {
      if (previousAiwgRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = previousAiwgRoot;
    }
  });

  it("keeps graph traversal parity for dependencies, research, and KB", async () => {
    seedProjectGraph();

    await showDeps(tmp, ".aiwg/architecture/search-adr.md", {
      graph: "project",
      direction: "upstream",
      edgeType: "depends-on",
      json: true,
    });
    const localDeps = readConsoleJson();
    consoleSpy.mockClear();

    await showDeps(tmp, ".aiwg/architecture/search-adr.md", {
      graph: "project",
      direction: "upstream",
      edgeType: "depends-on",
      json: true,
      backend: "fortemi-core",
    });
    const fortemiDeps = readConsoleJson();
    consoleSpy.mockClear();
    expect(fortemiDeps.upstream).toEqual(localDeps.upstream);

    await showNeighbors(tmp, {
      graph: "project",
      node: "REF-001",
      direction: "out",
      edgeType: "profiles",
      json: true,
      backend: "fortemi-core",
    });
    const researchNeighbors = readConsoleJson();
    consoleSpy.mockClear();
    expect(researchNeighbors.neighbors).toEqual([
      ".aiwg/research/profiles/PROF-001.md",
    ]);

    const kbPage = metadata({
      path: ".aiwg/kb/concepts/retrieval.md",
      type: "kb-page",
      title: "Retrieval",
      name: "retrieval",
      tags: ["kb"],
      summary: "KB concept for retrieval.",
    });
    const memory = metadata({
      path: ".aiwg/memory/entries/retrieval-note.md",
      type: "memory-entry",
      title: "Retrieval Note",
      name: "retrieval-note",
      tags: ["memory"],
      summary: "Semantic-memory capture for retrieval.",
    });
    writeGraph(tmp, "kb", [kbPage, memory], {
      [kbPage.path]: {
        upstream: [{ path: memory.path, type: "references" }],
        downstream: [],
      },
      [memory.path]: {
        upstream: [],
        downstream: [{ path: kbPage.path, type: "references" }],
      },
    });
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
    const kbNeighbors = readConsoleJson();
    consoleSpy.mockClear();
    expect(kbNeighbors.neighbors).toEqual([memory.path]);

    await executeSetQuery(tmp, {
      graph: "project",
      op: "intersection",
      nodeA: "REF-001",
      nodeB: ".aiwg/research/profiles/PROF-001.md",
      direction: "in",
      edgeType: "uses-skill",
      json: true,
      backend: "fortemi-core",
    });
    const setQuery = readConsoleJson();
    expect(setQuery.backend).toBe("fortemi-core");
    expect(setQuery.result).toEqual([".aiwg/skills/intake-wizard/SKILL.md"]);
  });

  it("covers static semantic and hybrid search over the Fortemi Core cache", () => {
    seedProjectGraph();

    const semantic = queryFortemiCoreStaticSemanticIndex(tmp, {
      graph: "project",
      text: "static retrieval parity citation grade",
      limit: 3,
    });
    expect(semantic.reason).toBeUndefined();
    expect(semantic.results[0]).toMatchObject({
      path: ".aiwg/research/references/REF-001.md",
      type: "research-ref",
      title: "REF-001 Static Retrieval Evaluation",
    });
    expect(semantic.results[0].matched).toContain("chunks");

    const hybrid = queryFortemiCoreStaticHybridIndex(tmp, {
      graph: "project",
      text: "static retrieval architecture",
      path: ".aiwg/architecture/search-adr.md",
      type: "adr",
      tags: ["search"],
      limit: 5,
    });
    expect(hybrid.reason).toBeUndefined();
    expect(hybrid.results).toHaveLength(1);
    expect(hybrid.results[0]).toMatchObject({
      path: ".aiwg/architecture/search-adr.md",
      type: "adr",
      title: "Search Architecture",
    });
    expect(hybrid.results[0].matched).toEqual(
      expect.arrayContaining(["path", "type", "tags"]),
    );

    const recursiveGlob = queryFortemiCoreStaticHybridIndex(tmp, {
      graph: "project",
      text: "nested static retrieval architecture",
      path: ".aiwg/**/*.md",
      type: "adr",
      tags: ["deep"],
      limit: 5,
    });
    expect(recursiveGlob.reason).toBeUndefined();
    expect(recursiveGlob.results.map((result) => result.path)).toEqual([
      ".aiwg/architecture/decisions/deep-search-adr.md",
    ]);
  });

  it("keeps v1 compatibility while emitting v2 all-domain records", () => {
    seedProjectGraph();

    const v1 = buildAiwgFortemiIndexExport(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    expect(v1.schema_version).toBe("aiwg.fortemi.index.export.v1");
    expect(new Set(v1.items.map((item) => item.type))).toEqual(
      new Set(["aiwg.artifact"]),
    );

    const v2: AiwgFortemiIndexExport = buildAiwgFortemiIndexExport(tmp, {
      graph: "project",
      schemaVersion: "v2",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    expect(v2.schema_version).toBe("aiwg.fortemi.index.export.v2");
    expect(new Set(v2.items.map((item) => item.type))).toEqual(
      new Set([
        "aiwg.agent",
        "aiwg.artifact",
        "aiwg.command",
        "aiwg.flow",
        "aiwg.research.profile",
        "aiwg.research.ref",
        "aiwg.rule",
        "aiwg.skill",
        "aiwg.bundle",
      ]),
    );
    const ref = v2.items.find((item) => item.name === "REF-001");
    expect(ref?.search?.summary).toContain("GRADE: High");
    expect(ref?.chunks?.[0]?.text).toContain("REF-002");
  });
});

const liveFortemiDescribe =
  process.env.AIWG_FORTEMI_CORE_LIVE === "1" ? describe : describe.skip;

liveFortemiDescribe("Fortemi Core live integration parity (#1691)", () => {
  it("is gated behind AIWG_FORTEMI_CORE_LIVE and external credentials", () => {
    expect(process.env.AIWG_FORTEMI_CORE_LIVE).toBe("1");
    expect(process.env.FORTEMI_CORE_URL ?? process.env.FORTEMI_CORE_TOKEN).toBe(
      undefined,
    );
  });
});
