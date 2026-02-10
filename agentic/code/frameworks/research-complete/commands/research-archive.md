---
description: Package research artifacts for long-term archival
category: research-archival
argument-hint: "[REF-XXX or --all] [--format bagit|zip|tar] [--verify]"
---

# Research Archive Command

Package research artifacts for long-term preservation following archival best practices.

## Instructions

When invoked, create archival packages:

1. **Identify Artifacts**
   - If REF-XXX specified, collect all artifacts for that paper
   - If --all, collect entire research corpus
   - Gather: PDF, finding document, metadata, provenance records, quality assessments

2. **Validate Integrity**
   - Verify all checksums against fixity manifest
   - Confirm no file corruption
   - Check metadata completeness
   - Ensure provenance chains are complete

3. **Create Archive Package**
   - Package format options:
     - **BagIt** (default) - Library of Congress standard for digital preservation
     - **ZIP** - Universal compressed format
     - **TAR.GZ** - POSIX archival format
   - Include manifest with checksums
   - Add archive metadata (creation date, creator, package contents)

4. **Generate Archival Metadata**
   - Dublin Core metadata record
   - PREMIS preservation metadata
   - Research corpus inventory
   - Provenance summary

5. **Verify Package**
   - Validate package structure
   - Verify all files present
   - Check checksums
   - Test package extraction

6. **Store and Register**
   - Save to `.aiwg/research/archives/`
   - Register in archival index
   - Generate archival report
   - Create retrieval instructions

## Arguments

- `[ref-id or --all]` - Specific paper or entire corpus (required)
- `--format [bagit|zip|tar]` - Archive format (default: bagit)
- `--output [path]` - Custom output location (default: .aiwg/research/archives/)
- `--verify` - Perform integrity verification after creation
- `--compression [none|gzip|bzip2]` - Compression level (default: gzip)
- `--include-notes` - Include literature notes in package
- `--metadata-only` - Create metadata package without PDFs

## BagIt Format (Default)

BagIt is the Library of Congress standard for digital preservation:

```
REF-022-archive/
├── bagit.txt                    # BagIt declaration
├── bag-info.txt                 # Package metadata
├── manifest-sha256.txt          # Checksums for data files
├── tagmanifest-sha256.txt       # Checksums for tag files
└── data/
    ├── REF-022.pdf              # Source paper
    ├── REF-022-autogen.md       # Finding document
    ├── metadata.yaml            # Extracted metadata
    ├── provenance.yaml          # Provenance records
    └── quality-assessment.yaml  # GRADE assessment
```

## Examples

```bash
# Archive single paper in BagIt format
/research-archive REF-022

# Archive with verification
/research-archive REF-022 --verify

# Archive entire corpus
/research-archive --all --format bagit

# Archive with custom output
/research-archive REF-022 --output /backup/research-archives/

# Create metadata-only archive for sharing
/research-archive REF-022 --metadata-only --format zip

# Archive multiple papers
/research-archive REF-001 REF-013 REF-022 --format tar
```

## Expected Output

```
Creating Archive: REF-022
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Collecting artifacts
  ✓ Source PDF: .aiwg/research/sources/REF-022.pdf (2.4 MB)
  ✓ Finding: .aiwg/research/findings/REF-022-autogen.md (12 KB)
  ✓ Metadata: Extracted from frontmatter
  ✓ Provenance: .aiwg/research/provenance/records/REF-022-acquisition.yaml
  ✓ Quality: .aiwg/research/quality-assessments/REF-022-assessment.yaml
  ✓ Literature notes: .aiwg/research/literature-notes/REF-022-notes.md

Step 2: Validating integrity
  ✓ PDF checksum verified: a1b2c3d4e5f6...
  ✓ All files present and intact
  ✓ Metadata complete
  ✓ Provenance chain validated

Step 3: Creating BagIt package
  ✓ BagIt structure created
  ✓ Files copied to data/ directory
  ✓ SHA-256 checksums generated
  ✓ bag-info.txt created with metadata
  ✓ Package size: 2.5 MB

Step 4: Generating archival metadata
  ✓ Dublin Core record created
  ✓ PREMIS preservation metadata added
  ✓ Inventory generated: 6 files

Step 5: Verifying package
  ✓ BagIt validation passed
  ✓ All checksums verified
  ✓ Package structure correct
  ✓ Test extraction successful

Step 6: Registering archive
  ✓ Saved to: .aiwg/research/archives/REF-022-archive-20260203.bag
  ✓ Registered in archival index
  ✓ Archival report generated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Archive created successfully!

Package: .aiwg/research/archives/REF-022-archive-20260203.bag
Format: BagIt (Library of Congress standard)
Size: 2.5 MB
Files: 6

Contents:
  - REF-022.pdf (source paper)
  - REF-022-autogen.md (finding document)
  - metadata.yaml (frontmatter + enrichment)
  - provenance.yaml (acquisition + documentation history)
  - quality-assessment.yaml (GRADE assessment)
  - literature-notes.md (synthesis notes)

Verification: PASSED

Retrieval Instructions:
  1. Extract: bagit.py --validate REF-022-archive-20260203.bag
  2. Restore to corpus: /research-restore REF-022-archive-20260203.bag

Archive Report: .aiwg/research/archives/REF-022-archive-20260203-report.md
```

## Archival Metadata

Each archive includes comprehensive metadata:

```yaml
# bag-info.txt (BagIt metadata)
Source-Organization: AIWG Research Corpus
Organization-Address: https://github.com/jmagly/aiwg
Contact-Name: AIWG Archival Agent
Contact-Email: research@aiwg.io
External-Description: Research paper archive for REF-022 (AutoGen)
Bagging-Date: 2026-02-03
Bag-Size: 2.5 MB
Payload-Oxum: 2621440.6
External-Identifier: REF-022
Internal-Sender-Identifier: ai-writing-guide/research-corpus
Internal-Sender-Description: AIWG Research Framework

# Dublin Core metadata
dc:title: AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation
dc:creator: Wu, Qingyun; Bansal, Gagan; Zhang, Jieyu; et al.
dc:date: 2023
dc:identifier: 10.48550/arXiv.2308.08155
dc:type: Conference Paper
dc:format: application/pdf
dc:language: en

# PREMIS preservation metadata
premis:objectIdentifier: REF-022
premis:originalName: REF-022.pdf
premis:fixity: sha256:a1b2c3d4e5f6...
premis:dateCreatedByApplication: 2026-02-03T12:00:00Z
premis:preservationLevel: bit-level
```

## Archival Index

All archives are tracked in `.aiwg/research/archives/archive-index.yaml`:

```yaml
archives:
  - archive_id: REF-022-archive-20260203
    ref_id: REF-022
    created_at: "2026-02-03T14:30:00Z"
    format: bagit
    size_bytes: 2621440
    file_count: 6
    checksum: "sha256:xyz789..."
    location: ".aiwg/research/archives/REF-022-archive-20260203.bag"
    verified: true
    last_verified: "2026-02-03T14:30:15Z"
```

## Bulk Archival

Archive entire corpus:

```bash
/research-archive --all

Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Archiving Entire Research Corpus
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Found 47 papers in corpus

Progress: [████████████████████] 47/47 (100%)

Summary:
  ✓ 47 papers archived
  ✓ Total size: 142.8 MB
  ✓ All packages verified
  ✓ Archival index updated

Archive Bundle: .aiwg/research/archives/corpus-archive-20260203.tar.gz
Manifest: .aiwg/research/archives/corpus-manifest-20260203.yaml

Individual Archives:
  REF-001-archive-20260203.bag
  REF-002-archive-20260203.bag
  ...
  REF-047-archive-20260203.bag
```

## Restoration

Archived packages can be restored using `/research-restore`:

```bash
/research-restore REF-022-archive-20260203.bag
```

## Long-Term Preservation Compliance

Archives follow best practices from:

- Library of Congress BagIt specification
- OAIS (Open Archival Information System) reference model
- Dublin Core metadata standard
- PREMIS preservation metadata standard

## Validation

All archives undergo validation:

- [ ] BagIt specification compliance
- [ ] All files listed in manifest present
- [ ] All checksums match manifest
- [ ] Metadata is complete and valid
- [ ] Package can be extracted successfully
- [ ] Contents can be restored to working corpus

## References

- @agentic/code/frameworks/research-complete/agents/archival-agent.md - Archival Agent
- @src/research/services/archival-service.ts - Archival implementation
- @.aiwg/research/fixity-manifest.json - Checksum tracking
- @.aiwg/research/archives/README.md - Archival procedures
- https://tools.ietf.org/html/rfc8493 - BagIt specification
