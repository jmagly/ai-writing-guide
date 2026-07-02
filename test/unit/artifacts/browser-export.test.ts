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
  };
} | null> {
  try {
    return (await import(/* @vite-ignore */ "@fortemi/core/aiwg-index")) as {
      validateAiwgFortemiIndexExport?: (value: unknown) => {
        ok?: boolean;
        valid?: boolean;
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

    expect(exported.schema_version).toBe("aiwg.fortemi.index.export.v1");
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

  it("emits deterministic v2 all-domain records validated by the published schema", () => {
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
      "---\ntitle: AIWG Doctor\n---\n# AIWG Doctor\n\nSource-only body phrase for Fortemi chunks.\n",
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
    expect(synthesis?.relationships[0]).toMatchObject({
      type: "cites",
      target_id: ref?.id,
      direction: "upstream",
      target_path: ".aiwg/research/references/REF-001.md",
    });
    expect(synthesis?.source.generated).toBe(false);
  });

  it("projects v2 records into the current Fortemi Core v1 package contract", async () => {
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
