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
}

export type AiwgFortemiShardConverter = NonNullable<
  FortemiShardCoreModule["aiwgFortemiIndexToKnowledgeShard"]
>;

export interface AiwgFortemiShardExportOptions {
  graph?: GraphType;
  repo?: string;
  privacy?: "private" | "sanitized" | "public";
  generatedAt?: string;
}

async function loadFortemiShardConverter(): Promise<
  AiwgFortemiShardConverter
> {
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
  if (!core.aiwgFortemiIndexToKnowledgeShard) {
    throw new Error(
      "Installed @fortemi/core does not support portable AIWG shards; upgrade to the release containing aiwgFortemiIndexToKnowledgeShard.",
    );
  }
  return core.aiwgFortemiIndexToKnowledgeShard;
}

export async function buildAiwgFortemiKnowledgeShard(
  cwd: string,
  options: AiwgFortemiShardExportOptions = {},
  converter?: AiwgFortemiShardConverter,
): Promise<Uint8Array> {
  const exported = buildAiwgFortemiIndexExport(cwd, {
    ...options,
    schemaVersion: "v2",
  });
  const convert = converter ?? (await loadFortemiShardConverter());
  return convert(exported, {
    createdAt: options.generatedAt,
    matricVersion: "aiwg",
  });
}

export async function writeAiwgFortemiKnowledgeShard(
  cwd: string,
  outPath: string,
  options: AiwgFortemiShardExportOptions = {},
  converter?: AiwgFortemiShardConverter,
): Promise<{ bytes: number; items: number; outPath: string }> {
  const exported = buildAiwgFortemiIndexExport(cwd, {
    ...options,
    schemaVersion: "v2",
  });
  const convert = converter ?? (await loadFortemiShardConverter());
  const shard = await convert(exported, {
    createdAt: options.generatedAt,
    matricVersion: "aiwg",
  });
  const resolved = path.resolve(cwd, outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, shard);
  return { bytes: shard.byteLength, items: exported.items.length, outPath: resolved };
}
