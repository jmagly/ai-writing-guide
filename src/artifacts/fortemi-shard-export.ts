import fs from "fs";
import path from "path";

import {
  buildAiwgFortemiIndexExport,
  type AiwgFortemiIndexExport,
} from "./browser-export.js";
import type { GraphType } from "./types.js";

interface FortemiShardCoreModule {
  aiwgFortemiIndexToKnowledgeShard?: (
    index: AiwgFortemiIndexExport,
    options?: { createdAt?: string; matricVersion?: string },
  ) => Promise<Uint8Array>;
  aiwgFortemiIndexToKnowledgeShardWithReport?: (
    index: AiwgFortemiIndexExport,
    options?: { createdAt?: string; matricVersion?: string },
  ) => Promise<{
    success: boolean;
    archive: Uint8Array | null;
    profile: "full-v1";
    schema_version: "2.0.0";
    lossless: boolean;
    losses: unknown[];
    receipt: unknown;
  }>;
}

export type AiwgFortemiShardConverter = NonNullable<
  FortemiShardCoreModule["aiwgFortemiIndexToKnowledgeShard"]
>;
export type AiwgFortemiShardReportConverter = NonNullable<
  FortemiShardCoreModule["aiwgFortemiIndexToKnowledgeShardWithReport"]
>;

export interface AiwgFortemiShardExportOptions {
  graph?: GraphType;
  repo?: string;
  privacy?: "private" | "sanitized" | "public";
  generatedAt?: string;
  schemaVersion?: "1.2.0" | "2.0.0";
  profile?: "core-v1" | "full-v1";
  failOnLoss?: boolean;
  dryRun?: boolean;
  overwrite?: boolean;
}

export interface AiwgFortemiShardConversionReport {
  schemaVersion: "1.2.0" | "2.0.0";
  profile: "core-v1" | "full-v1";
  success: boolean;
  lossless: boolean;
  losses: unknown[];
  receipt: unknown | null;
  archive: Uint8Array;
}

const SUPPORTED_SHARD_TUPLES = new Set([
  "1.2.0/core-v1",
  "2.0.0/full-v1",
]);

export function resolveAiwgFortemiShardTuple(
  options: Pick<AiwgFortemiShardExportOptions, "schemaVersion" | "profile">,
): { schemaVersion: "1.2.0" | "2.0.0"; profile: "core-v1" | "full-v1" } {
  const schemaVersion = options.schemaVersion ?? "2.0.0";
  const profile = options.profile ?? "full-v1";
  if (!SUPPORTED_SHARD_TUPLES.has(`${schemaVersion}/${profile}`)) {
    throw new Error(
      `Unsupported Fortemi Knowledge Shard tuple ${schemaVersion}/${profile}; `
      + "supported tuples are 2.0.0/full-v1 and 1.2.0/core-v1.",
    );
  }
  return { schemaVersion, profile };
}

async function loadFortemiShardConverters(): Promise<Required<FortemiShardCoreModule>> {
  let core: FortemiShardCoreModule;
  try {
    core = (await import(
      /* @vite-ignore */ "@fortemi/core/aiwg-index-shard"
    )) as FortemiShardCoreModule;
  } catch {
    throw new Error(
      "Portable Fortemi shard export requires @fortemi/core with aiwgFortemiIndexToKnowledgeShard.",
    );
  }
  if (
    !core.aiwgFortemiIndexToKnowledgeShard
    || !core.aiwgFortemiIndexToKnowledgeShardWithReport
  ) {
    throw new Error(
      "Installed @fortemi/core does not support both public AIWG shard converters; "
      + "upgrade to a compatible published release.",
    );
  }
  return core as Required<FortemiShardCoreModule>;
}

export async function buildAiwgFortemiKnowledgeShardWithReport(
  cwd: string,
  options: AiwgFortemiShardExportOptions = {},
  converter?: AiwgFortemiShardConverter,
  reportConverter?: AiwgFortemiShardReportConverter,
): Promise<AiwgFortemiShardConversionReport> {
  const exported = buildAiwgFortemiIndexExport(cwd, {
    ...options,
    schemaVersion: "v2",
  });
  const tuple = resolveAiwgFortemiShardTuple(options);
  const needsCore = tuple.profile === "core-v1" ? !converter : !reportConverter;
  const core = needsCore ? await loadFortemiShardConverters() : null;
  if (tuple.profile === "core-v1") {
    const archive = await (converter ?? core!.aiwgFortemiIndexToKnowledgeShard)(
      exported,
      { createdAt: options.generatedAt, matricVersion: "aiwg" },
    );
    return {
      ...tuple,
      success: true,
      lossless: true,
      losses: [],
      receipt: null,
      archive,
    };
  }
  const result = await (reportConverter ?? core!.aiwgFortemiIndexToKnowledgeShardWithReport)(
    exported,
    { createdAt: options.generatedAt, matricVersion: "aiwg" },
  );
  if (!result.success || !result.archive) {
    throw new Error(
      "Fortemi full-v1 conversion failed without producing an archive; losses="
      + JSON.stringify(result.losses),
    );
  }
  if (options.failOnLoss && (!result.lossless || result.losses.length > 0)) {
    throw new Error(
      `Fortemi full-v1 conversion reported ${result.losses.length} loss(es); `
      + "archive was not written because --fail-on-loss was set.",
    );
  }
  return {
    ...tuple,
    success: result.success,
    lossless: result.lossless,
    losses: result.losses,
    receipt: result.receipt,
    archive: result.archive,
  };
}

export async function buildAiwgFortemiKnowledgeShard(
  cwd: string,
  options: AiwgFortemiShardExportOptions = {},
  converter?: AiwgFortemiShardConverter,
  reportConverter?: AiwgFortemiShardReportConverter,
): Promise<Uint8Array> {
  return (await buildAiwgFortemiKnowledgeShardWithReport(
    cwd,
    options,
    converter,
    reportConverter,
  )).archive;
}

export async function writeAiwgFortemiKnowledgeShard(
  cwd: string,
  outPath: string,
  options: AiwgFortemiShardExportOptions = {},
  converter?: AiwgFortemiShardConverter,
  reportConverter?: AiwgFortemiShardReportConverter,
): Promise<{
  bytes: number;
  items: number;
  outPath: string;
  written: boolean;
  conversion: Omit<AiwgFortemiShardConversionReport, "archive">;
}> {
  const exported = buildAiwgFortemiIndexExport(cwd, {
    ...options,
    schemaVersion: "v2",
  });
  const conversion = await buildAiwgFortemiKnowledgeShardWithReport(
    cwd,
    options,
    converter,
    reportConverter,
  );
  const resolved = path.resolve(cwd, outPath);
  const report = {
    bytes: conversion.archive.byteLength,
    items: exported.items.length,
    outPath: resolved,
    written: !options.dryRun,
    conversion: {
      schemaVersion: conversion.schemaVersion,
      profile: conversion.profile,
      success: conversion.success,
      lossless: conversion.lossless,
      losses: conversion.losses,
      receipt: conversion.receipt,
    },
  };
  if (options.dryRun) return report;
  if (fs.existsSync(resolved) && !options.overwrite) {
    throw new Error(
      `Refusing to overwrite existing shard ${resolved}; choose a new path or pass --force.`,
    );
  }
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  const temporary = `${resolved}.tmp-${process.pid}`;
  try {
    fs.writeFileSync(temporary, conversion.archive, { flag: "wx" });
    if (options.overwrite) {
      fs.renameSync(temporary, resolved);
    } else {
      fs.linkSync(temporary, resolved);
      fs.unlinkSync(temporary);
    }
  } catch (error) {
    if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    throw error;
  }
  return report;
}

export function diagnoseAiwgFortemiShardMigration(
  cwd: string,
  inputPath: string,
): {
  supported: false;
  inputPath: string;
  mutationPlanned: false;
  diagnostic: string;
  action: string;
} {
  const resolved = path.resolve(cwd, inputPath);
  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    throw new Error(`Legacy shard input does not exist or is not a regular file: ${resolved}`);
  }
  return {
    supported: false,
    inputPath: resolved,
    mutationPlanned: false,
    diagnostic:
      "Source-less core-v1 to full-v1 conversion is unsupported because omitted rich "
      + "components cannot be reconstructed without loss.",
    action:
      "Regenerate from the source-backed AIWG index with "
      + "--schema-version 2.0.0 --profile full-v1; retain the legacy shard for rollback.",
  };
}
