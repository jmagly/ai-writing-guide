import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import {
  buildAiwgFortemiV1CompatibilityExport,
  buildAiwgFortemiIndexExport,
  writeAiwgFortemiIndexExport,
} from "../../../src/artifacts/browser-export.js";
import { INDEX_DIR } from "../../../src/artifacts/types.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";

function entry(overrides: Partial<MetadataEntry>): MetadataEntry {
  return {
    path: ".aiwg/requirements/UC-001.md",
    type: "use-case",
    phase: "requirements",
    title: "CRM Review Queue",
    tags: ["crm", "fortemi"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "Review CRM candidates with Fortemi React.",
    dependencies: [],
    dependents: [],
    ...overrides,
  };
}

async function loadOptionalFortemiAiwgIndex(): Promise<{
  validateAiwgFortemiIndexExport?: (value: unknown) => {
    ok?: boolean;
    valid?: boolean;
    errors?: string[];
  };
  queryAiwgFortemiIndex?: (
    index: unknown,
    query?: string,
    options?: Record<string, unknown>,
  ) => {
    total: number;
    items: unknown[];
    rankedItems?: Array<{ rank: number; matches?: unknown[] }>;
  };
} | null> {
  try {
    return (await import(/* @vite-ignore */ "@fortemi/core/aiwg-index")) as {
      validateAiwgFortemiIndexExport?: (value: unknown) => {
        ok?: boolean;
        valid?: boolean;
        errors?: string[];
      };
      queryAiwgFortemiIndex?: (
        index: unknown,
        query?: string,
        options?: Record<string, unknown>,
      ) => {
        total: number;
        items: unknown[];
        rankedItems?: Array<{ rank: number; matches?: unknown[] }>;
      };
    };
  } catch (error) {
    if (process.env.AIWG_FORTEMI_CORE_PACKAGE_REQUIRED === "1") {
      throw error;
    }
    return null;
  }
}

function fortemiValidationPassed(result: { ok?: boolean; valid?: boolean }) {
  return result.ok === true || result.valid === true;
}

function loadFortemiExportSchemaValidator() {
  const schema = JSON.parse(
    fs.readFileSync(
      path.resolve("schemas/aiwg-fortemi-index-export.json"),
      "utf-8",
    ),
  );
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  return ajv.compile(schema);
}

describe("AIWG Fortemi browser index export", () => {
  let tmpDir: string;

  function writeIndex(
    entries: Record<string, MetadataEntry>,
    graph: DependencyGraph,
  ): void {
    const indexDir = path.join(tmpDir, INDEX_DIR);
    fs.mkdirSync(indexDir, { recursive: true });
    const index: ArtifactIndex = {
      version: "1.0.0",
      builtAt: "2026-01-03T00:00:00.000Z",
      buildTimeMs: 5,
      entries,
    };
    fs.writeFileSync(
      path.join(indexDir, "metadata.json"),
      JSON.stringify(index),
    );
    fs.writeFileSync(
      path.join(indexDir, "dependencies.json"),
      JSON.stringify(graph),
    );
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-fortemi-export-"));
    writeIndex(
      {
        ".aiwg/design/ADR-001.md": entry({
          path: ".aiwg/design/ADR-001.md",
          type: "adr",
          phase: "architecture",
          title: "Use Fortemi React",
          tags: ["architecture"],
          summary: "Use Fortemi React for the local CRM UX.",
          updated: "2026-01-04T00:00:00.000Z",
          dependents: [".aiwg/requirements/UC-001.md"],
        }),
        ".aiwg/requirements/UC-001.md": entry({
          dependencies: [".aiwg/design/ADR-001.md"],
        }),
      },
      {
        ".aiwg/design/ADR-001.md": {
          upstream: [],
          downstream: [
            { path: ".aiwg/requirements/UC-001.md", type: "depends-on" },
          ],
        },
        ".aiwg/requirements/UC-001.md": {
          upstream: [{ path: ".aiwg/design/ADR-001.md", type: "depends-on" }],
          downstream: [],
        },
      },
    );
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("emits deterministic Fortemi-compatible AIWG artifact records", () => {
    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/crm",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    const validate = loadFortemiExportSchemaValidator();

    expect(exported.schema_version).toBe("aiwg.fortemi.index.export.v1");
    expect(validate(exported), JSON.stringify(validate.errors, null, 2)).toBe(
      true,
    );
    expect(exported.source).toEqual({
      repo: "roctinam/crm",
      privacy: "sanitized",
    });
    expect(exported.items).toHaveLength(2);
    expect(exported.items.map((item) => item.id)).toEqual(
      [...exported.items.map((item) => item.id)].sort(),
    );

    const requirement = exported.items.find(
      (item) => item.source.path === ".aiwg/requirements/UC-001.md",
    );
    expect(requirement).toMatchObject({
      schema_version: "aiwg.fortemi.index.record.v1",
      type: "aiwg.artifact",
      title: "CRM Review Queue",
      privacy: { classification: "sanitized", pii: false },
    });
    expect(requirement?.facets).toMatchObject({
      artifact_type: ["use-case"],
      phase: ["requirements"],
      graph: ["project"],
      privacy: ["sanitized"],
    });
    expect(requirement?.tags).toEqual(["crm", "fortemi"]);
    expect(requirement?.relationships[0]).toMatchObject({
      type: "depends-on",
      source_path: ".aiwg/design/ADR-001.md",
    });
    expect(requirement?.relationships[0]).not.toHaveProperty("target_path");
    expect(requirement?.relationships[0]).not.toHaveProperty("direction");
    expect(requirement?.relationships[0]).not.toHaveProperty("metadata");
    expect(requirement?.provenance[0]).toMatchObject({
      source: "aiwg-index",
      confidence: "source",
      privacy: "sanitized",
    });
  });

  it("writes the export JSON for browser import without mutating the index", () => {
    const out = path.join(tmpDir, "exports", "aiwg-fortemi-index.json");
    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    writeAiwgFortemiIndexExport(exported, out);

    const parsed = JSON.parse(fs.readFileSync(out, "utf-8"));
    expect(parsed.schema_version).toBe("aiwg.fortemi.index.export.v1");
    expect(parsed.items[0].id).toBe(exported.items[0].id);
    expect(fs.existsSync(path.join(tmpDir, INDEX_DIR, "metadata.json"))).toBe(
      true,
    );
  });

  it("preserves operational live-state provenance in v2 and drops it from v1 compatibility", async () => {
    const issuePath = ".aiwg/issues/AIWG-1827.md";
    writeIndex(
      {
        [issuePath]: entry({
          path: issuePath,
          type: "issue",
          phase: "planning",
          title: "Operational provenance",
          summary: "Track live-state provenance in operational memory.",
          operationalState: {
            source_repo: "roctinam/aiwg",
            source_kind: "issue",
            source_id: "aiwg#1827",
            observed_state: "open",
            observed_at: "2026-07-21T10:00:00.000Z",
            source_updated_at: "2026-07-21T09:00:00.000Z",
            evidence_url: "https://git.integrolabs.net/roctinam/aiwg/issues/1827",
            observer: "gitea-mcp",
            classification: "fresh",
            confidence: "source",
            current_action_selector: true,
          },
        }),
      },
      { [issuePath]: { upstream: [], downstream: [] } },
    );

    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-07-21T10:00:00.000Z",
      schemaVersion: "v2",
    });
    const validate = loadFortemiExportSchemaValidator();
    expect(validate(exported), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(exported.items[0]?.operational_state).toMatchObject({
      source_id: "aiwg#1827",
      observed_state: "open",
      classification: "fresh",
      current_action_selector: true,
    });
    const fortemi = await loadOptionalFortemiAiwgIndex();
    if (fortemi?.validateAiwgFortemiIndexExport) {
      const result = fortemi.validateAiwgFortemiIndexExport(exported);
      expect(
        fortemiValidationPassed(result),
        JSON.stringify(result.errors, null, 2),
      ).toBe(true);
    }

    const compat = buildAiwgFortemiV1CompatibilityExport(exported);
    expect(validate(compat), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(compat.items[0]).not.toHaveProperty("operational_state");
  });

  it("keeps explicit state-transfer lifecycle separate from operational state", () => {
    const artifactPath = ".aiwg/archive/retired.md";
    writeIndex(
      {
        [artifactPath]: entry({
          path: artifactPath,
          stateTransfer: { deletedAt: "2026-07-20T12:30:00.000Z" },
        }),
      },
      { [artifactPath]: { upstream: [], downstream: [] } },
    );

    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      generatedAt: "2026-07-21T10:00:00.000Z",
      schemaVersion: "v2",
    });
    const validate = loadFortemiExportSchemaValidator();
    expect(validate(exported), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(exported.items[0]?.state_transfer).toEqual({
      deleted_at: "2026-07-20T12:30:00.000Z",
    });
    expect(exported.items[0]).not.toHaveProperty("operational_state");

    const compat = buildAiwgFortemiV1CompatibilityExport(exported);
    expect(validate(compat), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(compat.items[0]).not.toHaveProperty("state_transfer");
  });

  it("emits deterministic v2 all-domain records validated by the latest Fortemi Core contract", async () => {
    writeIndex(
      {
        "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md": entry({
          path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
          type: "skill",
          phase: "operations",
          title: "AIWG Doctor",
          name: "aiwg-doctor",
          summary: "Run workspace health diagnostics.",
          triggers: ["doctor", "health check"],
          capability: "Diagnose the AIWG workspace.",
          kernel: true,
          script: {
            entrypoint: "scripts/doctor.mjs",
            runtime: "node",
            cwd: "project-root",
          },
        }),
        ".opencode/agent/software-implementer.md": entry({
          path: ".opencode/agent/software-implementer.md",
          type: "agent",
          phase: "construction",
          title: "Software Implementer",
          name: "software-implementer",
          summary: "Deliver code changes.",
        }),
        "agentic/code/addons/aiwg-utils/commands/discover.md": entry({
          path: "agentic/code/addons/aiwg-utils/commands/discover.md",
          type: "command",
          phase: "operations",
          title: "AIWG Discover",
          name: "discover",
          summary: "Find AIWG capabilities.",
        }),
        ".opencode/rule/token-security.md": entry({
          path: ".opencode/rule/token-security.md",
          type: "rule",
          phase: "security",
          title: "Token Security",
          name: "token-security",
          summary: "Protect credentials.",
        }),
        ".opencode/rule/provenance-tracking.md": entry({
          path: ".opencode/rule/provenance-tracking.md",
          type: "behavior",
          phase: "governance",
          title: "Provenance Tracking",
          name: "provenance-tracking",
          summary: "Preserve provenance metadata across generated artifacts.",
        }),
        ".opencode/rule/tao-loop.md": entry({
          path: ".opencode/rule/tao-loop.md",
          type: "flow",
          phase: "delivery",
          title: "TAO Loop",
          name: "tao-loop",
          summary: "Iterative execution flow.",
        }),
        ".codex/provider/codex.md": entry({
          path: ".codex/provider/codex.md",
          type: "provider",
          phase: "operations",
          title: "Codex Provider",
          name: "codex",
          summary: "Provider capability metadata for Codex.",
        }),
        "agentic/code/addons/aiwg-utils/manifest.md": entry({
          path: "agentic/code/addons/aiwg-utils/manifest.md",
          type: "bundle",
          phase: "operations",
          title: "AIWG Utils Bundle",
          name: "aiwg-utils",
          summary: "Utility addon bundle manifest.",
        }),
        ".aiwg/research/references/REF-001.md": entry({
          path: ".aiwg/research/references/REF-001.md",
          type: "research-ref",
          phase: "research",
          title: "REF-001 Fortemi Search",
          name: "REF-001",
          summary: "Research reference.",
        }),
        ".aiwg/research/profiles/PROF-001.md": entry({
          path: ".aiwg/research/profiles/PROF-001.md",
          type: "research-profile",
          phase: "research",
          title: "PROF-001 Search Profile",
          name: "PROF-001",
          summary: "Research profile.",
        }),
        ".aiwg/research/views/by-topic.md": entry({
          path: ".aiwg/research/views/by-topic.md",
          type: "research-view",
          phase: "research",
          title: "Research by Topic",
          name: "by-topic",
          summary: "Generated research corpus topic view.",
        }),
        ".aiwg/research/synthesis/query-fortemi.md": entry({
          path: ".aiwg/research/synthesis/query-fortemi.md",
          type: "research-synthesis",
          phase: "research",
          title: "Fortemi Search Synthesis",
          name: "query-fortemi",
          summary: "Research synthesis output for Fortemi search.",
        }),
        ".aiwg/kb/pages/search.md": entry({
          path: ".aiwg/kb/pages/search.md",
          type: "kb-page",
          phase: "knowledge",
          title: "Search KB Page",
          name: "search",
          summary: "Knowledge base page.",
        }),
        ".aiwg/memory/entries/search-note.md": entry({
          path: ".aiwg/memory/entries/search-note.md",
          type: "memory-entry",
          phase: "knowledge",
          title: "Search Memory Note",
          name: "search-note",
          summary: "Semantic-memory entry for search decisions.",
        }),
        ".aiwg/issues/ISSUE-001.md": entry({
          path: ".aiwg/issues/ISSUE-001.md",
          type: "issue",
          phase: "planning",
          title: "ISSUE-001 Search Follow-up",
          name: "ISSUE-001",
          summary: "Local issue record for search migration follow-up.",
        }),
        ".aiwg/requirements/UC-SEARCH.md": entry({
          path: ".aiwg/requirements/UC-SEARCH.md",
          type: "use-case",
          phase: "requirements",
          title: "Search Use Case",
          name: "UC-SEARCH",
          summary: "Generic SDLC artifact for search migration.",
        }),
      },
      {
        "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md": {
          upstream: [
            {
              path: "agentic/code/addons/aiwg-utils/commands/discover.md",
              type: "references",
            },
          ],
          downstream: [],
        },
        "agentic/code/addons/aiwg-utils/commands/discover.md": {
          upstream: [],
          downstream: [
            {
              path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
              type: "references",
            },
          ],
        },
        ".aiwg/research/synthesis/query-fortemi.md": {
          upstream: [
            {
              path: ".aiwg/research/references/REF-001.md",
              type: "cites",
            },
          ],
          downstream: [],
        },
      },
    );
    const skillSourcePath = path.join(
      tmpDir,
      "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
    );
    fs.mkdirSync(path.dirname(skillSourcePath), { recursive: true });
    fs.writeFileSync(
      skillSourcePath,
      [
        "---",
        "title: AIWG Doctor",
        "skos:",
        "  concepts:",
        "    - id: aiwg-concept:diagnostics",
        "      prefLabel: Diagnostics",
        "      definition: Workspace health checks and repair guidance.",
        "      scheme: aiwg-capabilities",
        "      altLabels:",
        "        - doctor",
        "  relations:",
        "    - type: broader",
        "      source_id: aiwg-concept:diagnostics",
        "      target_id: aiwg-concept:operations",
        "      metadata:",
        "        source: fixture",
        "---",
        "# AIWG Doctor",
        "",
        "Source-only body phrase for Fortemi chunks.",
        "",
      ].join("\n"),
    );

    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
      schemaVersion: "v2",
    });
    const validate = loadFortemiExportSchemaValidator();

    expect(validate(exported), JSON.stringify(validate.errors, null, 2)).toBe(
      true,
    );
    expect(exported.schema_version).toBe("aiwg.fortemi.index.export.v2");
    expect(exported.compatibility).toEqual({
      previous_schema_version: "aiwg.fortemi.index.export.v1",
      strategy: "supported",
    });
    expect(exported.items.map((item) => item.id)).toEqual(
      [...exported.items.map((item) => item.id)].sort(),
    );
    expect(new Set(exported.items.map((item) => item.type))).toEqual(
      new Set([
        "aiwg.agent",
        "aiwg.artifact",
        "aiwg.behavior",
        "aiwg.bundle",
        "aiwg.command",
        "aiwg.flow",
        "aiwg.issue",
        "aiwg.kb.page",
        "aiwg.memory.entry",
        "aiwg.provider",
        "aiwg.research.profile",
        "aiwg.research.ref",
        "aiwg.research.synthesis",
        "aiwg.research.view",
        "aiwg.rule",
        "aiwg.skill",
      ]),
    );

    const skill = exported.items.find((item) => item.type === "aiwg.skill");
    const command = exported.items.find((item) => item.type === "aiwg.command");
    const synthesis = exported.items.find(
      (item) => item.type === "aiwg.research.synthesis",
    );
    const ref = exported.items.find(
      (item) => item.type === "aiwg.research.ref",
    );
    expect(skill).toMatchObject({
      schema_version: "aiwg.fortemi.index.record.v2",
      name: "aiwg-doctor",
      search: {
        triggers: ["doctor", "health check"],
        capability: "Diagnose the AIWG workspace.",
        frontmatter: {
          kernel: true,
          aiwg_script: {
            entrypoint: "scripts/doctor.mjs",
            runtime: "node",
            cwd: "project-root",
          },
        },
      },
      privacy: {
        locality: "framework",
      },
    });
    expect(skill?.relationships[0]).toMatchObject({
      type: "references",
      source_path: "agentic/code/addons/aiwg-utils/commands/discover.md",
      direction: "upstream",
    });
    expect(skill?.relationships[0].target_id).toBe(command?.id);
    expect(skill?.search?.body).toContain(
      "Source-only body phrase for Fortemi chunks.",
    );
    expect(skill?.chunks?.[0].text).toBe(skill?.search?.body);
    expect(skill?.chunks?.[0].checksum).not.toBe("abcdef1234567890");
    expect(skill?.skos_concepts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: "aiwg-concept:diagnostics",
          prefLabel: "Diagnostics",
          scheme: "aiwg-capabilities",
          altLabels: ["doctor"],
        }),
        expect.objectContaining({
          id: "aiwg-tags:crm",
          prefLabel: "crm",
          scheme: "aiwg-tags",
        }),
      ]),
    );
    expect(skill?.concepts).toEqual(
      expect.arrayContaining([
        "aiwg-concept:diagnostics",
        "aiwg-tags:crm",
      ]),
    );
    expect(skill?.skos_relations).toEqual([
      {
        type: "broader",
        source_id: "aiwg-concept:diagnostics",
        target_id: "aiwg-concept:operations",
        source_path:
          "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
        metadata: {
          source: "fixture",
        },
      },
    ]);
    expect(synthesis?.relationships[0]).toMatchObject({
      type: "cites",
      target_id: ref?.id,
      direction: "upstream",
      target_path: ".aiwg/research/references/REF-001.md",
    });
    expect(synthesis?.source.generated).toBe(false);

    const fortemi = await loadOptionalFortemiAiwgIndex();
    if (
      process.env.AIWG_FORTEMI_CORE_PACKAGE_REQUIRED === "1" &&
      (!fortemi?.validateAiwgFortemiIndexExport ||
        !fortemi?.queryAiwgFortemiIndex)
    ) {
      throw new Error(
        "AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1 but @fortemi/core/aiwg-index does not expose the latest validation/query contract",
      );
    }
    if (fortemi?.validateAiwgFortemiIndexExport) {
      const result = fortemi.validateAiwgFortemiIndexExport(exported);
      expect(
        fortemiValidationPassed(result),
        JSON.stringify(result.errors, null, 2),
      ).toBe(true);
    }
    if (fortemi?.queryAiwgFortemiIndex) {
      const queried = fortemi.queryAiwgFortemiIndex(
        exported,
        "doctor health check",
        {
          searchProfile: "aiwg-discovery",
          limit: 2,
          includeMatches: true,
        },
      );
      expect(queried.total).toBeGreaterThan(0);
      expect(queried.items[0]).toMatchObject({
        id: skill?.id,
        type: "aiwg.skill",
      });
      expect(queried.rankedItems?.[0]?.rank).toBeGreaterThan(0);
    }
  });

  it("omits binary and oversized source bodies from v2 records while preserving searchable metadata", () => {
    writeIndex(
      {
        "pdfs/full/REF-001-security.pdf": entry({
          path: "pdfs/full/REF-001-security.pdf",
          type: "research-ref",
          phase: "research",
          title: "Security PDF",
          name: "REF-001",
          summary: "A PDF reference that should stay metadata-only.",
          tags: ["pdf"],
        }),
        ".aiwg/notes/large.md": entry({
          path: ".aiwg/notes/large.md",
          type: "document",
          phase: "research",
          title: "Large Note",
          name: "large-note",
          summary: "A text source over the source-body guard.",
          tags: ["large"],
        }),
        ".aiwg/notes/small.md": entry({
          path: ".aiwg/notes/small.md",
          type: "document",
          phase: "research",
          title: "Small Note",
          name: "small-note",
          summary: "A text source under the source-body guard.",
          tags: ["small"],
        }),
      },
      {},
    );
    const pdfPath = path.join(tmpDir, "pdfs/full/REF-001-security.pdf");
    const largePath = path.join(tmpDir, ".aiwg/notes/large.md");
    const smallPath = path.join(tmpDir, ".aiwg/notes/small.md");
    fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
    fs.mkdirSync(path.dirname(largePath), { recursive: true });
    fs.writeFileSync(pdfPath, Buffer.from("%PDF-1.7\n\0binary body that must not enter search"));
    fs.writeFileSync(largePath, "large body phrase\n".repeat(32));
    fs.writeFileSync(smallPath, "---\ntitle: Small Note\n---\nsmall body phrase\n");

    const exported = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
      schemaVersion: "v2",
      maxSourceBodyBytes: 128,
    });
    const validate = loadFortemiExportSchemaValidator();

    expect(validate(exported), JSON.stringify(validate.errors, null, 2)).toBe(
      true,
    );
    const pdf = exported.items.find(
      (item) => item.source.path === "pdfs/full/REF-001-security.pdf",
    );
    const large = exported.items.find(
      (item) => item.source.path === ".aiwg/notes/large.md",
    );
    const small = exported.items.find(
      (item) => item.source.path === ".aiwg/notes/small.md",
    );

    expect(pdf?.search?.body).toContain("Security PDF");
    expect(pdf?.search?.body).not.toContain("%PDF");
    expect(pdf?.search?.body).not.toContain("binary body");
    expect(pdf?.chunks?.[0].text).toBe(pdf?.search?.body);
    expect(large?.search?.body).toContain("Large Note");
    expect(large?.search?.body).not.toContain("large body phrase");
    expect(small?.search?.body).toContain("small body phrase");
  });

  it("keeps the legacy v2-to-v1 compatibility projection valid", async () => {
    writeIndex(
      {
        "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md": entry({
          path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
          type: "skill",
          phase: "operations",
          title: "AIWG Doctor",
          name: "aiwg-doctor",
          summary: "Run workspace health diagnostics.",
          triggers: ["doctor", "health check"],
          capability: "Diagnose the AIWG workspace.",
        }),
        "agentic/code/addons/aiwg-utils/commands/discover.md": entry({
          path: "agentic/code/addons/aiwg-utils/commands/discover.md",
          type: "command",
          phase: "operations",
          title: "AIWG Discover",
          name: "discover",
          summary: "Find AIWG capabilities.",
        }),
      },
      {
        "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md": {
          upstream: [
            {
              path: "agentic/code/addons/aiwg-utils/commands/discover.md",
              type: "references",
            },
          ],
          downstream: [],
        },
        "agentic/code/addons/aiwg-utils/commands/discover.md": {
          upstream: [],
          downstream: [
            {
              path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
              type: "references",
            },
          ],
        },
      },
    );
    const v2 = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
      schemaVersion: "v2",
    });

    const compat = buildAiwgFortemiV1CompatibilityExport(v2);
    const skill = compat.items.find((item) => item.type === "aiwg.skill");
    const command = compat.items.find((item) => item.type === "aiwg.command");

    expect(compat.schema_version).toBe("aiwg.fortemi.index.export.v1");
    expect(compat.source).toEqual({
      repo: "roctinam/aiwg",
      privacy: "sanitized",
    });
    expect(compat).not.toHaveProperty("compatibility");
    const validate = loadFortemiExportSchemaValidator();
    expect(validate(compat), JSON.stringify(validate.errors, null, 2)).toBe(
      true,
    );
    expect(skill).toMatchObject({
      schema_version: "aiwg.fortemi.index.record.v1",
      type: "aiwg.skill",
      source: {
        path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
        repo_relative_path:
          "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
        locator: "aiwg-doctor",
      },
      text: expect.stringContaining("Diagnose the AIWG workspace."),
      privacy: {
        classification: "sanitized",
        pii: false,
      },
    });
    expect(skill).not.toHaveProperty("search");
    expect(skill).not.toHaveProperty("chunks");
    expect(skill).not.toHaveProperty("embeddings");
    expect(skill?.source).not.toHaveProperty("origin");
    expect(skill?.privacy).not.toHaveProperty("locality");
    expect(skill?.relationships).toEqual([
      {
        type: "references",
        target_id: command?.id,
        source_path: "agentic/code/addons/aiwg-utils/commands/discover.md",
      },
    ]);
    expect(command?.relationships).toEqual([]);

    const fortemi = await loadOptionalFortemiAiwgIndex();
    if (
      process.env.AIWG_FORTEMI_CORE_PACKAGE_REQUIRED === "1" &&
      !fortemi?.validateAiwgFortemiIndexExport
    ) {
      throw new Error(
        "AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1 but @fortemi/core/aiwg-index is unavailable",
      );
    }
    if (fortemi?.validateAiwgFortemiIndexExport) {
      expect(
        fortemiValidationPassed(fortemi.validateAiwgFortemiIndexExport(compat)),
      ).toBe(true);
    }
  });

  it("rejects v2-only fields in the v1 compatibility schema", () => {
    const v2 = buildAiwgFortemiIndexExport(tmpDir, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
      schemaVersion: "v2",
    });
    const compat = buildAiwgFortemiV1CompatibilityExport(v2);
    const validate = loadFortemiExportSchemaValidator();

    expect(
      validate({
        ...compat,
        compatibility: {
          previous_schema_version: "aiwg.fortemi.index.export.v1",
          strategy: "supported",
        },
      }),
    ).toBe(false);
    expect(
      validate({
        ...compat,
        source: { ...compat.source, graph: "project" },
      }),
    ).toBe(false);
    expect(
      validate({
        ...compat,
        items: [
          {
            ...compat.items[0],
            schema_version: "aiwg.fortemi.index.record.v2",
          },
        ],
      }),
    ).toBe(false);
    expect(
      validate({
        ...compat,
        items: [
          {
            ...compat.items[0],
            search: {
              title: compat.items[0]?.title ?? "",
              body: compat.items[0]?.text ?? "",
              triggers: [],
              aliases: [],
              tags: [],
              frontmatter: {},
            },
          },
        ],
      }),
    ).toBe(false);
    expect(
      validate({
        ...compat,
        items: [
          {
            ...compat.items[0],
            relationships: [
              {
                type: "depends-on",
                target_id: "aiwg:artifact:downstream",
                target_path: ".aiwg/requirements/UC-001.md",
                direction: "downstream",
              },
            ],
          },
        ],
      }),
    ).toBe(false);
  });
});
