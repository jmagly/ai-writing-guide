---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.git-native-marketplace
---

# Git-Native Package Exchange

AIWG can exchange frameworks, addons, extensions, and standalone plugin
wrappers directly through Git. A catalog improves discovery but is not a
central authority: package identity and integrity remain bound to the
publisher's canonical Git remote, immutable commit, Git tree, artifact
inventory, signature, and local trust policy.

The exchange stores W3C PROV evidence in a lossless Fortemi Knowledge Shard
`2.0.0/full-v1`. It also records operation receipts for publish, install,
verify, export, and import.

## Consumer quickstart

Pin a tag or commit before deploying. Project-local state is recommended for
team repositories because the lock, receipts, Fortemi shard, package registry,
and marketplace index stay under the project's `.aiwg/` directory.

```bash
aiwg install https://git.example.org/team/agent-pack.git \
  --ref v1.2.3 \
  --package agent-pack \
  --project-local \
  --deploy \
  --provider claude

aiwg marketplace verify team/agent-pack --project-local
```

Use `--global` instead of `--project-local` to make the package available from
the user AIWG configuration. Global is the default when neither flag is
present. `--target <directory>` selects the project for local state and
deployment. The two scope flags are mutually exclusive.

A repository may contain a root bundle or a standalone
`.aiwg/plugins/<id>/manifest.json` wrapper. Use `--package <id>` when more than
one standalone wrapper is present. Repositories with no deployable artifact,
ambiguous wrappers, unsafe paths, or wrapper/payload type mismatches fail
before registration or deployment.

Without a trusted publisher signature, a valid direct package is recorded as
`integrity-only`. Add `--verify` when installation must require a valid Ed25519
signature chained to a local trust root. Verification fails closed on unknown
required fields, signature or digest mismatch, dependency substitution,
rollback, disallowed deprecation/yanking, or a mutable ref moving against an
existing lock.

## State and trust

Marketplace state lives in one of these locations:

- project: `<project>/.aiwg/marketplace/`
- global: `~/.aiwg/marketplace/` (or the active global AIWG config directory)

Each scope has its own `index.json`, `catalogs.json`, `trust.json`, immutable
package records, receipts, Fortemi shards, and imported artifact cache. Normal
install, import, verify, catalog-add, and catalog-remove operations update the
selected index atomically.

`trust.json` uses
`schemas/marketplace/aiwg-marketplace-trust.v1.schema.json`. A trust root has
`trustRoot: true`; a rotated or delegated key names `delegatedBy` and includes
the delegation signature. `validFrom`, `validUntil`, `revokedAt`, and
`revocationReason` constrain acceptance. Named policies can be stored under
`policies` and selected with `--policy <name>`. A JSON policy path is also
accepted.

Trust is local policy, not a catalog claim. AIWG distinguishes:

- publisher claims in the signed provenance envelope;
- catalog observations in a separately signed catalog;
- local trust roots and policy decisions;
- local verification and operation receipts.

Catalog inclusion is never presented as an AIWG endorsement.

## Author and publisher workflow

1. Put a valid root bundle or standalone plugin wrapper in a Git repository.
2. Include an explicit package version, provider matrix, dependency contract,
   and license. An SBOM may be included and bound by path and digest.
3. Commit the exact bytes and create the intended release tag.
4. Keep the Ed25519 private key outside the repository.
5. Publish the signed envelope and Fortemi evidence.

```bash
openssl genpkey -algorithm ED25519 -out publisher-private.pem
openssl pkey -in publisher-private.pem -pubout -out publisher-public.pem

aiwg marketplace publish . \
  --package agent-pack \
  --ref v1.2.3 \
  --publisher team.example \
  --key /secure/publisher-private.pem \
  --public-key publisher-public.pem \
  --sequence 1
```

Publication writes an envelope, immutable lock, publish receipt, and
`provenance.full-v1.shard`. Do not commit a private key, credential, private
artifact, or sensitive environment detail into a package, envelope, catalog,
receipt, or portable archive.

The versioned schemas under `schemas/marketplace/` are closed contracts. New
required fields need a new schema version and explicit consumer support;
unknown fields are not silently discarded.

## Catalog operator workflow

A catalog repository contains `aiwg-marketplace-catalog.json` or
`.aiwg/marketplace/catalog.json`. Its signed entries point to publisher
envelopes and immutable locks. Catalog sequence numbers support rollback
detection.

```bash
aiwg marketplace add https://git.example.org/catalogs/community.git \
  --ref 9f8e7d6c5b4a32100123456789abcdef01234567 \
  --project-local

aiwg marketplace search observability --project-local
aiwg marketplace info team/agent-pack --project-local
aiwg marketplace install team/agent-pack@1.2.3 --project-local --verify
```

Multiple catalogs can coexist. Package coordinates are resolved only when
unambiguous. Direct Git and catalog installs produce the same lock when they
identify the same immutable package. Removing a catalog removes discovery
state only; existing package locks, cached bytes, and receipts remain valid:

```bash
aiwg marketplace remove community --project-local
```

## Offline export, mirror, and recovery

Export produces a deterministic JSON package containing the exact envelope,
lock, receipts, Fortemi full-v1 shard, artifact paths, modes, hashes, and
base64-encoded bytes:

```bash
aiwg marketplace export team/agent-pack \
  --project-local \
  --output agent-pack.aiwg.json
```

Move the archive through the approved offline channel, then import and verify
without contacting the publisher or a catalog:

```bash
aiwg marketplace import agent-pack.aiwg.json --project-local
aiwg marketplace verify team/agent-pack --project-local
```

Import validates the complete archive and stages bytes before changing the
local index. Archive/Git divergence, altered files, unsafe paths, malformed
Fortemi evidence, or a lock/envelope mismatch aborts the operation. A mirror
may retain Git objects, signed catalogs, and portable archives, but must not
rewrite them; consumers still verify publisher identity and local trust.

For recovery, restore the portable archive and scoped `trust.json`, import the
archive, and run offline verification. Catalog availability is not required
when the immutable lock and evidence are present.

## Key rotation and revocation

Rotate keys by delegating a new public key from a currently trusted key,
setting a non-overlapping validity policy where practical, and publishing the
updated trust material through the organization's controlled channel. Test the
new chain before retiring the old key.

When a key is compromised, set `revokedAt` and a reason in every applicable
trust scope. Current verification rejects a revoked signing key even when the
package signature predates discovery of the compromise. Existing locks still
identify bytes, but their trust result changes according to current policy.

## Command summary

```text
aiwg install <git-url> --ref <tag-or-sha> [--package <id>] [--project-local|--global]
aiwg marketplace add <catalog-git-url> [--ref <tag-or-sha>]
aiwg marketplace search <query>
aiwg marketplace info <identity[@version]|lock-id>
aiwg marketplace install <git-url|identity[@version]>
aiwg marketplace verify <identity[@version]|lock-id>
aiwg marketplace export <identity[@version]|lock-id> --output <archive.json>
aiwg marketplace import <archive.json>
aiwg marketplace publish <source> --key <pem> --publisher <id>
aiwg marketplace remove <catalog-id>
aiwg marketplace list
```

All commands that read or write package state accept `--project-local` or
`--global`; project-local commands also accept `--target <directory>`.
