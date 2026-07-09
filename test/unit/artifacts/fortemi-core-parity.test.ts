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

  function seedQueryFilterGraph(): void {
    const entries = [
      metadata({
        path: ".aiwg/requirements/UC-001.md",
        type: "use-case",
        phase: "requirements",
        title: "User Login",
        name: "user-login",
        tags: ["auth", "security"],
        summary: "Users can log in with email and password.",
      }),
      metadata({
        path: ".aiwg/requirements/UC-002.md",
        type: "use-case",
        phase: "requirements",
        title: "User Registration",
        name: "user-registration",
        tags: ["auth"],
        summary: "New users can create an account.",
        updated: "2026-03-01T00:00:00.000Z",
      }),
      metadata({
        path: ".aiwg/architecture/adr-001.md",
        type: "adr",
        phase: "architecture",
        title: "Use JWT for Auth",
        name: "use-jwt-for-auth",
        tags: ["auth", "architecture"],
        summary: "Decision to use JSON Web Tokens for authentication.",
      }),
      metadata({
        path: ".aiwg/testing/tp-001.md",
        type: "test-plan",
        phase: "testing",
        title: "Login Test Plan",
        name: "login-test-plan",
        tags: ["testing"],
        summary: "Comprehensive test plan for user login functionality.",
      }),
    ];
    writeGraph(tmp, "project", entries, emptyGraph(entries));
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
  }

  function seedFulltextGraph(): void {
    const inference = metadata({
      path: ".aiwg/requirements/UC-001.md",
      type: "use-case",
      phase: "requirements",
      title: "Inference Doc",
      name: "inference-doc",
      tags: ["inference"],
      summary: "Summary that does NOT mention the body term.",
    });
    const cache = metadata({
      path: ".aiwg/requirements/UC-002.md",
      type: "use-case",
      phase: "requirements",
      title: "Caching Doc",
      name: "caching-doc",
      tags: ["cache"],
      summary: "A caching document summary.",
    });
    writeGraph(tmp, "project", [inference, cache], emptyGraph([inference, cache]));
    fs.writeFileSync(
      path.join(tmp, inference.path),
      [
        "---",
        "title: Inference Doc",
        "tags: [inference]",
        "---",
        "",
        "This document covers post-training quantization of the weight matrices in detail.",
        "",
      ].join("\n"),
    );
    fs.writeFileSync(
      path.join(tmp, cache.path),
      [
        "---",
        "title: Caching Doc",
        "tags: [cache]",
        "---",
        "",
        "This document is entirely about response caching and has nothing else.",
        "",
      ].join("\n"),
    );
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
  }

  function seedGraphTraversalGraph(): void {
    const paths = [
      "citations/REF-008-citations.md",
      "citations/REF-016-citations.md",
      "citations/REF-029-citations.md",
      "citations/REF-009-citations.md",
      "citations/REF-015-citations.md",
      "citations/REF-042-citations.md",
      "citations/REF-052-citations.md",
      "citations/REF-001-citations.md",
    ];
    const entries = paths.map((entryPath) =>
      metadata({
        path: entryPath,
        type: "research-ref",
        phase: "research",
        title: path.basename(entryPath, ".md"),
        name: path.basename(entryPath, "-citations.md"),
        tags: ["citation"],
        summary: `Citation fixture for ${entryPath}.`,
      }),
    );
    writeGraph(tmp, "citation-network", entries, {
      "citations/REF-008-citations.md": {
        upstream: [
          { path: "citations/REF-029-citations.md", type: "cites" },
          { path: "citations/REF-009-citations.md", type: "cites" },
        ],
        downstream: [
          { path: "citations/REF-015-citations.md", type: "cited-by" },
          { path: "citations/REF-042-citations.md", type: "cited-by" },
        ],
      },
      "citations/REF-016-citations.md": {
        upstream: [
          { path: "citations/REF-029-citations.md", type: "cites" },
          { path: "citations/REF-052-citations.md", type: "cites" },
        ],
        downstream: [{ path: "citations/REF-015-citations.md", type: "cited-by" }],
      },
      "citations/REF-029-citations.md": {
        upstream: [],
        downstream: [
          { path: "citations/REF-008-citations.md", type: "cites" },
          { path: "citations/REF-016-citations.md", type: "cites" },
        ],
      },
      "citations/REF-009-citations.md": {
        upstream: [],
        downstream: [{ path: "citations/REF-008-citations.md", type: "cites" }],
      },
      "citations/REF-015-citations.md": {
        upstream: [
          { path: "citations/REF-008-citations.md", type: "cites" },
          { path: "citations/REF-016-citations.md", type: "cites" },
        ],
        downstream: [],
      },
      "citations/REF-042-citations.md": {
        upstream: [{ path: "citations/REF-008-citations.md", type: "cites" }],
        downstream: [],
      },
      "citations/REF-052-citations.md": {
        upstream: [],
        downstream: [{ path: "citations/REF-016-citations.md", type: "cites" }],
      },
      "citations/REF-001-citations.md": {
        upstream: [
          { path: "citations/REF-029-citations.md", type: "cites" },
          { path: "citations/REF-008-citations.md", type: "depends-on" },
        ],
        downstream: [],
      },
    });
    syncFortemiCoreIndex(tmp, {
      graph: "citation-network",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
  }

  function seedDiscoveryRegressionGraph(): void {
    const entries = [
      metadata({
        path: "agentic/code/frameworks/fx/skills/intake-wizard/SKILL.md",
        type: "skill",
        phase: "",
        title: "intake-wizard",
        name: "intake-wizard",
        tags: ["intake"],
        summary: "Generate or complete intake forms interactively.",
        triggers: ["intake wizard", "create intake"],
        capability: "Generate or complete intake forms interactively.",
      }),
      metadata({
        path: "agentic/code/frameworks/sdlc-complete/skills/sdlc-accelerate/SKILL.md",
        type: "skill",
        phase: "",
        title: "SDLC Accelerate",
        name: "sdlc-accelerate",
        tags: ["sdlc"],
        summary: "Accelerate SDLC delivery with recommended workflows.",
        triggers: ["sdlc accelerate"],
        capability: "Accelerate SDLC delivery with recommended workflows.",
      }),
      metadata({
        path: "agentic/code/frameworks/aiwg-utils/skills/aiwg-doctor/SKILL.md",
        type: "skill",
        phase: "",
        title: "AIWG Doctor",
        name: "aiwg-doctor",
        tags: ["doctor"],
        summary: "Run a comprehensive health check.",
        triggers: ["aiwg doctor"],
        capability: "Run a comprehensive health check.",
        kernel: true,
      }),
      metadata({
        path: "agentic/code/frameworks/security-engineering/skills/npm-supply-chain-audit/SKILL.md",
        type: "skill",
        phase: "",
        title: "npm-supply-chain-audit",
        name: "npm-supply-chain-audit",
        tags: ["npm", "supply-chain"],
        summary:
          "Audit npm projects for Shai-Hulud-class supply-chain exposure: lifecycle scripts, Git dependency prepare hooks, publish-token exposure.",
        triggers: ["npm supply chain audit", "Shai-Hulud", "malicious npm package"],
        capability:
          "Audit npm projects for Shai-Hulud-class supply-chain exposure.",
      }),
      metadata({
        path: "agentic/code/frameworks/security-engineering/skills/cargo-supply-chain-audit/SKILL.md",
        type: "skill",
        phase: "",
        title: "cargo-supply-chain-audit",
        name: "cargo-supply-chain-audit",
        tags: ["cargo", "rust", "supply-chain"],
        summary:
          "Audit Rust/Cargo crates for supply-chain exposure: crates.io metadata + checksum verification against Cargo.lock, .crate tarball provenance, build-script review, cargo audit / cargo deny / cargo vet.",
        triggers: [
          "cargo crate supply chain audit",
          "crates.io supply chain",
          "rust dependency audit",
          "malicious crate",
        ],
        capability: "Audit Rust/Cargo crates for supply-chain exposure.",
      }),
      metadata({
        path: "agentic/code/addons/aiwg-utils/skills/package-all-plugins/SKILL.md",
        type: "skill",
        phase: "",
        title: "package-all-plugins",
        name: "package-all-plugins",
        tags: ["plugin", "packaging"],
        summary:
          "Batch package every AIWG/Codex plugin in the workspace into distributable plugin archives.",
        triggers: [
          "package all the plugins",
          "build all plugin archives",
          "bundle all plugins",
          "batch package the plugins",
          "publish all plugins",
        ],
        capability:
          "Batch package every AIWG/Codex plugin in the workspace into distributable plugin archives.",
      }),
      metadata({
        path: "agentic/code/frameworks/sdlc-complete/skills/flow-release/SKILL.md",
        type: "skill",
        phase: "",
        title: "flow-release",
        name: "flow-release",
        tags: ["release"],
        summary:
          "Config-driven release orchestration reads release config plus optional release-plan sidecars and walks the selected release plan's gates.",
        triggers: ["run the release", "release prep", "cut a release"],
        capability: "Config-driven release orchestration for native releases.",
      }),
      metadata({
        path: "agentic/code/frameworks/sdlc-complete/skills/release-publication-verify/SKILL.md",
        type: "skill",
        phase: "",
        title: "release-publication-verify",
        name: "release-publication-verify",
        tags: ["release", "verification"],
        summary:
          "Post-tag release publication verifier checks release assets, SHA256SUMS, native package checksums, GHCR container images, and installer dry-runs.",
        triggers: [
          "verify the release publication",
          "post-tag release asset verifier",
          "check GHCR images and release assets for a tag",
        ],
        capability: "Verify release publication evidence after a tag.",
      }),
      metadata({
        path: "agentic/code/frameworks/fx/commands/addr-issues.md",
        type: "command",
        phase: "",
        title: "addr-issues",
        name: "addr-issues",
        tags: ["issues"],
        summary: "Address selected issues in bounded slices.",
        capability: "Address selected issues in bounded slices.",
      }),
      metadata({
        path: "agentic/code/frameworks/fx/flows/flow-ship-it.playbook.yaml",
        type: "flow",
        phase: "",
        title: "flow-ship-it",
        name: "flow-ship-it",
        tags: ["release"],
        summary: "Ship the release through the gate sequence to production.",
        capability: "Ship the release through the gate sequence to production.",
      }),
    ];
    writeGraph(tmp, "project", entries, emptyGraph(entries));
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
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

  it("mirrors legacy discovery routing regressions on the Fortemi backend", async () => {
    seedDiscoveryRegressionGraph();
    const previousAiwgRoot = process.env.AIWG_ROOT;
    process.env.AIWG_ROOT = tmp;

    const run = async (phrase: string, typeFilter?: string[]) => {
      await discoverCapability(tmp, {
        phrase,
        graph: "project",
        typeFilter,
        json: true,
        limit: 5,
        backend: "fortemi-core",
      });
      const parsed = readConsoleJson();
      consoleSpy.mockClear();
      return parsed;
    };

    try {
      let parsed = await run("Find an AIWG skill that handles intake forms");
      expect(parsed.results[0].path).toContain("intake-wizard");
      expect(parsed.relaxed_overlap).toBeFalsy();

      for (const phrase of ["intake skill", "find an intake skill"]) {
        parsed = await run(phrase);
        expect(parsed.results.length, `"${phrase}" should not dead-end`).toBeGreaterThan(0);
        expect(parsed.results[0].path).toContain("intake-wizard");
      }

      parsed = await run("sdlc-acclerate");
      expect(parsed.results[0].path).toContain("sdlc-accelerate");
      expect(parsed.results[0].score).toBeGreaterThanOrEqual(0.95);

      for (const phrase of ["aiwg-doctor", "aiwg doctor", "aiwg_doctor"]) {
        parsed = await run(phrase);
        expect(parsed.results[0].path).toMatch(/aiwg-doctor\/SKILL\.md$/);
        expect(path.isAbsolute(parsed.results[0].path)).toBe(true);
        expect(parsed.results[0].score).toBe(1);
        expect(parsed.results[0].kernel).toBe(true);
      }

      parsed = await run("cargo crate supply chain audit");
      const cargoIdx = parsed.results.findIndex((result: { path: string }) =>
        result.path.endsWith("cargo-supply-chain-audit/SKILL.md"),
      );
      const npmIdx = parsed.results.findIndex((result: { path: string }) =>
        result.path.endsWith("npm-supply-chain-audit/SKILL.md"),
      );
      expect(cargoIdx).toBe(0);
      expect(cargoIdx).toBeLessThan(npmIdx === -1 ? Number.MAX_SAFE_INTEGER : npmIdx);

      parsed = await run("addr-issues", ["command"]);
      expect(parsed.results[0].path).toContain("commands/addr-issues.md");
      expect(parsed.results[0].type).toBe("command");

      parsed = await run("ship release to production");
      expect(
        parsed.results.some((result: { path: string; type: string }) =>
          result.path.endsWith("flow-ship-it.playbook.yaml") && result.type === "flow",
        ),
      ).toBe(true);

      parsed = await run(
        "release prep validation cargo pkgid build package artifacts version 2026.6.2",
      );
      expect(parsed.results[0]?.path ?? "").not.toContain("package-all-plugins");
      const releaseRank = parsed.results.findIndex((result: { path: string }) =>
        result.path.includes("/flow-release/SKILL.md"),
      );
      const pluginRank = parsed.results.findIndex((result: { path: string }) =>
        result.path.includes("/package-all-plugins/SKILL.md"),
      );
      expect(releaseRank).toBeGreaterThanOrEqual(0);
      if (pluginRank >= 0) expect(releaseRank).toBeLessThan(pluginRank);

      parsed = await run("package all the plugins for release");
      expect(parsed.results[0].path).toContain("package-all-plugins");

      parsed = await run("post tag release asset verifier GHCR packages installer release assets");
      expect(parsed.results[0].path).toContain("release-publication-verify");
    } finally {
      if (previousAiwgRoot === undefined) delete process.env.AIWG_ROOT;
      else process.env.AIWG_ROOT = previousAiwgRoot;
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

  it("mirrors legacy metadata query filters, limits, and empty-result behavior", async () => {
    seedQueryFilterGraph();

    await queryIndex(tmp, { text: "Login" }, { graph: "project", backend: "fortemi-core" });
    let output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    consoleSpy.mockClear();
    expect(output).toContain("Login");
    expect(output).toContain("Results for");
    expect(output).toContain("Score");

    await queryIndex(tmp, { type: "adr" }, { graph: "project", json: true, backend: "fortemi-core" });
    let parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].type).toBe("adr");

    await queryIndex(tmp, { phase: "testing" }, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].phase).toBe("testing");

    await queryIndex(tmp, { tags: ["auth", "security"] }, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].path).toBe(".aiwg/requirements/UC-001.md");

    await queryIndex(tmp, {}, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(4);

    await queryIndex(tmp, { limit: 2 }, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(2);

    await queryIndex(tmp, { text: "nonexistent-xyz" }, { graph: "project", backend: "fortemi-core" });
    output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    expect(output).toContain("No results found");
  });

  it("mirrors legacy fulltext query semantics over the Fortemi static cache", async () => {
    seedFulltextGraph();

    await queryIndex(tmp, { text: "quantization" }, { graph: "project", json: true, backend: "fortemi-core" });
    let parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.mode).toBe("metadata");
    expect(parsed.results).toHaveLength(0);

    await queryIndex(tmp, { text: "quantization", fulltext: true }, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.mode).toBe("fulltext");
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].path).toBe(".aiwg/requirements/UC-001.md");
    expect(parsed.results[0].matched).toContain("quantization");
    expect(parsed.results[0].score).toBeCloseTo(1.0, 6);

    await queryIndex(
      tmp,
      { text: "quantization", fulltext: true, tags: ["cache"] },
      { graph: "project", json: true, backend: "fortemi-core" },
    );
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.results).toHaveLength(0);

    fs.rmSync(path.join(tmp, ".aiwg", "requirements", "UC-001.md"));
    await queryIndex(tmp, { text: "quantization", fulltext: true }, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    expect(parsed.results.map((result: { path: string }) => result.path)).toEqual([
      ".aiwg/requirements/UC-001.md",
    ]);
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

  it("mirrors legacy dependency direction, orphan, depth, and missing-node behavior", async () => {
    const uc = metadata({
      path: ".aiwg/requirements/UC-001.md",
      type: "use-case",
      title: "User Login",
      name: "user-login",
      tags: ["auth"],
      summary: "Users can log in.",
    });
    const adr = metadata({
      path: ".aiwg/architecture/adr-001.md",
      type: "adr",
      title: "Use JWT for Auth",
      name: "use-jwt-for-auth",
      tags: ["auth"],
      summary: "Decision to use JWT.",
    });
    const testPlan = metadata({
      path: ".aiwg/testing/tp-001.md",
      type: "test-plan",
      title: "Login Test Plan",
      name: "login-test-plan",
      tags: ["testing"],
      summary: "Test user login.",
    });
    const orphan = metadata({
      path: ".aiwg/risks/risk-register.md",
      type: "risk",
      title: "Risk Register",
      name: "risk-register",
      tags: ["risk"],
      summary: "No dependency edges.",
    });
    writeGraph(tmp, "project", [uc, adr, testPlan, orphan], {
      [uc.path]: {
        upstream: [],
        downstream: [
          { path: adr.path, type: "depends-on" },
          { path: testPlan.path, type: "depends-on" },
        ],
      },
      [adr.path]: {
        upstream: [{ path: uc.path, type: "depends-on" }],
        downstream: [{ path: testPlan.path, type: "depends-on" }],
      },
      [testPlan.path]: {
        upstream: [
          { path: uc.path, type: "depends-on" },
          { path: adr.path, type: "depends-on" },
        ],
        downstream: [],
      },
      [orphan.path]: { upstream: [], downstream: [] },
    });
    syncFortemiCoreIndex(tmp, {
      graph: "project",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    await showDeps(tmp, adr.path, { graph: "project", backend: "fortemi-core" });
    let output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    consoleSpy.mockClear();
    expect(output).toContain("UPSTREAM");
    expect(output).toContain("DOWNSTREAM");

    await showDeps(tmp, adr.path, { graph: "project", direction: "upstream", backend: "fortemi-core" });
    output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    consoleSpy.mockClear();
    expect(output).toContain("UPSTREAM");
    expect(output).not.toContain("DOWNSTREAM");

    await showDeps(tmp, uc.path, { graph: "project", direction: "downstream", backend: "fortemi-core" });
    output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    consoleSpy.mockClear();
    expect(output).not.toContain("UPSTREAM");
    expect(output).toContain("DOWNSTREAM");

    await showDeps(tmp, uc.path, { graph: "project", depth: 1, json: true, backend: "fortemi-core" });
    let parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.downstream).toContain(adr.path);
    expect(parsed.downstream).toContain(testPlan.path);
    expect(parsed.downstreamCount).toBe(2);

    await showDeps(tmp, orphan.path, { graph: "project", json: true, backend: "fortemi-core" });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.upstream).toHaveLength(0);
    expect(parsed.downstream).toHaveLength(0);

    const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit");
    });
    await expect(
      showDeps(tmp, ".aiwg/nonexistent.md", { graph: "project", backend: "fortemi-core" }),
    ).rejects.toThrow("process.exit");
    exitSpy.mockRestore();
  });

  it("mirrors legacy graph neighbor and set operations on the Fortemi backend", async () => {
    seedGraphTraversalGraph();

    await showNeighbors(tmp, {
      graph: "citation-network",
      node: "REF-008",
      direction: "in",
      edgeType: "cites",
      json: true,
      backend: "fortemi-core",
    });
    let parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.node).toBe("citations/REF-008-citations.md");
    expect(parsed.neighbors).toHaveLength(2);
    expect(parsed.count).toBe(2);

    await showNeighbors(tmp, {
      graph: "citation-network",
      node: "REF-008",
      direction: "out",
      backend: "fortemi-core",
    });
    const output = consoleSpy.mock.calls.map((call) => call[0]).join("\n");
    consoleSpy.mockClear();
    expect(output).toContain("REF-015");
    expect(output).toContain("REF-042");
    expect(output).toContain("Total: 2");

    await executeSetQuery(tmp, {
      graph: "citation-network",
      op: "intersection",
      nodeA: "REF-008",
      nodeB: "REF-016",
      direction: "out",
      json: true,
      backend: "fortemi-core",
    });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.op).toBe("intersection");
    expect(parsed.result).toContain("citations/REF-015-citations.md");
    expect(parsed.count).toBe(1);

    await executeSetQuery(tmp, {
      graph: "citation-network",
      op: "difference",
      nodeA: "REF-008",
      nodeB: "REF-016",
      direction: "in",
      edgeType: "cites",
      json: true,
      backend: "fortemi-core",
    });
    parsed = readConsoleJson();
    consoleSpy.mockClear();
    expect(parsed.op).toBe("difference");
    expect(parsed.result).toContain("citations/REF-009-citations.md");
    expect(parsed.result).not.toContain("citations/REF-029-citations.md");

    await executeSetQuery(tmp, {
      graph: "citation-network",
      op: "union",
      nodeA: "REF-008",
      nodeB: "REF-016",
      direction: "in",
      edgeType: "cites",
      json: true,
      backend: "fortemi-core",
    });
    parsed = readConsoleJson();
    expect(parsed.op).toBe("union");
    expect(parsed.result).toHaveLength(3);
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
