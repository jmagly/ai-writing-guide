# Writer profile sidecars

Writer profiles are opt-in, versioned author preferences. They preserve legacy voice data in an attachment and compile approved preferences into the existing advisory output-mode format. Importing a sidecar does not migrate legacy files, change mode selection, or install a provider hook.

## Manage a sidecar

```
aiwg writer-profile import writer.json --revision 0
aiwg writer-profile inspect my-writer
aiwg writer-profile version my-writer
aiwg writer-profile export my-writer --output shared.json
aiwg writer-profile export my-writer --mode private --output backup.json
aiwg writer-profile compile my-writer --output writer-mode.json
aiwg writer-profile revoke my-writer sample-1 --revision 1
aiwg writer-profile delete my-writer --revision 2
```

Every command accepts `--scope project|user`; project is the default. Project profiles live in `.aiwg/writer-profiles`. User profiles use the existing user configuration resolver (`AIWG_CONFIG`, then an existing `~/.aiwg` or `~/.config/aiwg`, then `~/.aiwg`). A project lookup never falls through to the user scope. These are definition scopes; output-mode selection still uses its existing invocation, session, and project scopes.

To update a profile, export a private copy, edit it, and import it with `--revision <current>`. Revision zero only creates a new profile. Concurrent or stale updates fail rather than overwrite an intervening edit. The schema version describes the data contract; the revision describes a stored update. The legacy attachment retains its own version independently.

Export and compile require a new destination file. They never print sample text. Inspect reports metadata only, and CLI failures omit input content. Private exports contain private sample content and are intended for author-controlled backups. Shared exports apply sharing approvals and redaction. An export does not grant rights to a sample.

## Evidence and author control

An inferred preference needs approved, usable sample spans. Weak or conflicting evidence produces an explicit generic fallback. Evidence confidence describes support for a preference; it does not describe the truth of claims or require assertive language. Explicit author preferences and overrides take precedence. Rejection and reset are distinct operations: rejection suppresses a preference, while reset removes an override.

No demographic identity, personality, or signature phrase is inferred by these APIs. Legacy analyzer scores remain observations in their original scale; importing an observation does not convert it into an approved preference.

The compiler emits an advisory voice mode that protects code, commands, citations, quotations, identifiers, and machine-readable blocks. It does not validate factual fidelity or promise that a provider applies the mode. Existing voice loading and unaltered mode behavior remain available.

## Revocation and storage

Revoking a sample removes its retained text and invalidates inferred preferences that depend on it. Independently explicit choices remain, with revoked evidence references removed. Saving any update or deleting a profile invalidates its managed cache and history directories. The store retains no historical sample bodies. Store files are created with owner-only permissions, and writes use a per-profile lock and atomic rename. A crashed process may leave a `.lock` directory; verify no operation is active before removing that lock.

Previously exported files and external provider caches are outside this store's control. Deletion cannot erase those copies. Keep private exports under the author's control and remove them separately when consent is revoked.

## API

```ts
import {
  parseWriterProfile, importLegacyWriterProfile, exportLegacyWriterProfile,
  compileWriterProfile, WriterProfileStore,
} from 'aiwg';

const legacy = importLegacyWriterProfile(originalYaml, 'yaml');
const writer = parseWriterProfile({
  schemaVersion: 1,
  id: 'my-writer', version: '1.0.0', name: 'My writer',
  provenance: { source: 'author', license: 'author-approved' },
  samples: [], preferences: [], legacy,
});
const store = new WriterProfileStore({ cwd: process.cwd(), scope: 'project' });
await store.save(writer, 0);
const { profile: mode, fallback } = compileWriterProfile(writer);
const original = exportLegacyWriterProfile(legacy); // Original source text, unchanged
```

`writerProfileSchema` and `parseWriterProfile` define the strict version-one contract. `writerPreferenceValues` enumerates supported expression controls. A sample has an ID, text and SHA-256 digest, approval/status, source/license, separate voice-use and text-sharing rights, and public/private/secret classification. Inferred preferences reference UTF-16 `[start, end)` spans; boundaries may not split surrogate pairs. Explicit preferences record author choices. Preferences may target a task, passed to `compileWriterProfile(writer, { task })`.

`overrides` records `set`, `reject`, or `reset` for a preference key and optional task. The latest applicable override wins. `counterexamples` contains approved sample spans for downstream review; the compiler does not invent a contrary rule from them. Use `revokeWriterSample` before saving a revocation through the store.

Legacy adapters accept YAML templates and Python generator/analyzer/blender output, plus TypeScript analyzer and calibration JSON. Raw source, parsed payload, format, kind, and integrity digest are retained. Unknown source fields are preserved, without turning them into instructions. The legacy export validates its attachment before returning the original text. The old loaders continue to accept their existing files.
