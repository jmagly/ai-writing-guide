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
  packTarGz?: (files: Map<string, Uint8Array>) => Uint8Array;
  sha256Hex?: (data: Uint8Array) => Promise<string>;
  unpackTarGz?: (data: Uint8Array) => Map<string, Uint8Array>;
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
      /* @vite-ignore */ "@fortemi/core/aiwg-index"
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

async function loadFortemiShardArchiveTools(): Promise<
  Required<Pick<FortemiShardCoreModule, "packTarGz" | "sha256Hex" | "unpackTarGz">>
> {
  const core = (await import(
    /* @vite-ignore */ "@fortemi/core"
  )) as FortemiShardCoreModule;
  if (!core.packTarGz || !core.sha256Hex || !core.unpackTarGz) {
    throw new Error(
      "Installed @fortemi/core does not expose Knowledge Shard archive tools.",
    );
  }
  return {
    packTarGz: core.packTarGz,
    sha256Hex: core.sha256Hex,
    unpackTarGz: core.unpackTarGz,
  };
}

async function normalizeShardForServerImport(shard: Uint8Array): Promise<Uint8Array> {
  const { packTarGz, sha256Hex, unpackTarGz } = await loadFortemiShardArchiveTools();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  const files = unpackTarGz(shard);
  const notesBytes = files.get("notes.jsonl");
  const manifestBytes = files.get("manifest.json");
  if (!notesBytes || !manifestBytes) return shard;

  let changed = false;
  const normalizedLines = await Promise.all(
    decoder
      .decode(notesBytes)
      .split(/\n/)
      .filter((line) => line.trim().length > 0)
      .map(async (line) => {
        const note = JSON.parse(line) as {
          id?: string;
          attachments?: Array<Record<string, unknown>>;
          metadata?: { aiwg_fortemi_index?: unknown };
        };
        const sourceRecord = note.metadata?.aiwg_fortemi_index;
        if (!sourceRecord || !note.id) return line;

        const payload = JSON.stringify(sourceRecord);
        const payloadBytes = encoder.encode(payload);
        note.attachments = [
          ...(Array.isArray(note.attachments) ? note.attachments : []),
          {
            extracted_text: payload,
            attachment: {
              id: `${note.id}:aiwg-source-record`,
              path: `aiwg-source-records/${encodeURIComponent(note.id)}.json`,
              mime: "application/json",
              checksum: await sha256Hex(payloadBytes),
              bytes: payloadBytes.byteLength,
            },
          },
        ];
        delete note.metadata;
        changed = true;
        return JSON.stringify(note);
      }),
  );
  const normalizedNotes = normalizedLines.join("\n");

  if (!changed) return shard;

  const updatedNotes = encoder.encode(`${normalizedNotes}\n`);
  files.set("notes.jsonl", updatedNotes);
  const manifest = JSON.parse(decoder.decode(manifestBytes)) as {
    checksums?: Record<string, string>;
  };
  manifest.checksums = {
    ...(manifest.checksums ?? {}),
    "notes.jsonl": await sha256Hex(updatedNotes),
  };
  files.set("manifest.json", encoder.encode(`${JSON.stringify(manifest, null, 2)}\n`));
  return packTarGz(files);
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
  const shard = await convert(exported, {
    createdAt: options.generatedAt,
    matricVersion: "aiwg",
  });
  return converter ? shard : normalizeShardForServerImport(shard);
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
  const normalizedShard = converter
    ? shard
    : await normalizeShardForServerImport(shard);
  const resolved = path.resolve(cwd, outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, normalizedShard);
  return { bytes: normalizedShard.byteLength, items: exported.items.length, outPath: resolved };
}
