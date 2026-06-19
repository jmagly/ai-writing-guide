# Documentation Archivist — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## Working Directory Structure (Step 1)

```
.aiwg/working/{document-type}/{document-name}/
├── drafts/
│   ├── v0.1-primary-draft.md
│   ├── v0.2-with-security-review.md
│   ├── v0.3-with-test-review.md
│   └── v0.4-synthesis-ready.md
├── reviews/
│   ├── security-architect-review.md
│   ├── test-architect-review.md
│   └── technical-writer-review.md
├── synthesis/
│   └── synthesis-report.md
└── metadata.json
```

## Initialize metadata tracking (Step 1)

```json
{
  "document-name": "software-architecture-doc",
  "document-type": "architecture",
  "template-source": ".aiwg/templates/sad-template.md",
  "primary-author": "architecture-designer",
  "reviewers": ["security-architect", "test-architect", "technical-writer"],
  "synthesizer": "documentation-synthesizer",
  "created-date": "2025-10-15T10:00:00Z",
  "current-version": "0.1",
  "status": "DRAFT",
  "output-path": ".aiwg/architecture/software-architecture-doc.md",
  "versions": []
}
```

## Capture version metadata (Step 2)

```json
{
  "version": "0.2",
  "timestamp": "2025-10-15T11:30:00Z",
  "author": "security-architect",
  "action": "review-feedback",
  "file": "drafts/v0.2-with-security-review.md",
  "changes-summary": "Added security architecture section, flagged missing encryption details",
  "status": "IN_REVIEW"
}
```

## Track reviewer progress (Step 3)

```json
{
  "review-cycle": 1,
  "reviewers-assigned": ["security-architect", "test-architect", "technical-writer"],
  "reviewers-completed": ["security-architect", "technical-writer"],
  "reviewers-pending": ["test-architect"],
  "started": "2025-10-15T10:00:00Z",
  "target-completion": "2025-10-15T18:00:00Z"
}
```

## Package for synthesizer (Step 4)

```
.aiwg/working/{document-type}/{document-name}/
├── drafts/v0.4-synthesis-ready.md  (latest draft)
├── reviews/                         (all feedback)
├── synthesis/                       (output location)
└── metadata.json                    (complete tracking)
```

## Archive working materials (Step 5)

```
.aiwg/archive/{document-type}/{document-name}-{date}/
├── drafts/                  (all draft versions)
├── reviews/                 (all review feedback)
├── synthesis/               (synthesis report)
├── metadata.json            (complete version history)
└── audit-trail.md           (human-readable timeline)
```

## Generate audit trail (Step 5)

```markdown
# Audit Trail: Software Architecture Document

**Document ID:** software-architecture-doc
**Final Version:** 1.0
**Baselined:** 2025-10-15T16:00:00Z
**Output:** .aiwg/architecture/software-architecture-doc.md

## Timeline

| Timestamp | Version | Author | Action | Status |
|-----------|---------|--------|--------|--------|
| 2025-10-15 10:00 | 0.1 | architecture-designer | Initial draft created | DRAFT |
| 2025-10-15 11:30 | 0.2 | security-architect | Security review complete | IN_REVIEW |
| 2025-10-15 13:00 | 0.3 | test-architect | Testing review complete | IN_REVIEW |
| 2025-10-15 14:00 | 0.3 | technical-writer | Writing review complete | IN_REVIEW |
| 2025-10-15 15:00 | 1.0 | documentation-synthesizer | Synthesis complete | BASELINED |

## Reviews

**Security Architect:** APPROVED (with recommendations)
- Added security architecture section
- Recommended TLS 1.3 minimum

**Test Architect:** CONDITIONAL
- Added testability section
- Requested service mocking strategy documentation

**Technical Writer:** APPROVED
- Fixed 12 spelling errors
- Standardized terminology

## Synthesis

**Synthesizer:** documentation-synthesizer
**Conflicts Resolved:** 1 (TLS version for test environment)
**Final Status:** BASELINED
```

## Directory Structure Standards

### Active Working Documents

```
.aiwg/working/
├── document-index.json          (master index of all active workflows)
├── architecture/
│   └── software-architecture-doc/
│       ├── drafts/
│       ├── reviews/
│       ├── synthesis/
│       └── metadata.json
├── requirements/
│   └── use-case-spec/
│       ├── drafts/
│       ├── reviews/
│       ├── synthesis/
│       └── metadata.json
├── testing/
│   └── master-test-plan/
│       ├── drafts/
│       ├── reviews/
│       ├── synthesis/
│       └── metadata.json
└── risks/
    └── risk-retirement-report/
        ├── drafts/
        ├── reviews/
        ├── synthesis/
        └── metadata.json
```

### Archive Structure

```
.aiwg/archive/
├── 2025-10/
│   ├── software-architecture-doc-2025-10-15/
│   │   ├── drafts/
│   │   ├── reviews/
│   │   ├── synthesis/
│   │   ├── metadata.json
│   │   └── audit-trail.md
│   └── master-test-plan-2025-10-14/
│       ├── drafts/
│       ├── reviews/
│       ├── synthesis/
│       ├── metadata.json
│       └── audit-trail.md
└── archive-index.json           (searchable archive index)
```

## Metadata Schema

### document-index.json

```json
{
  "index-version": "1.0",
  "last-updated": "2025-10-15T16:00:00Z",
  "active-documents": [
    {
      "id": "software-architecture-doc",
      "type": "architecture",
      "status": "BASELINED",
      "working-dir": ".aiwg/working/architecture/software-architecture-doc",
      "output-path": ".aiwg/architecture/software-architecture-doc.md",
      "version": "1.0",
      "created": "2025-10-15T10:00:00Z",
      "baselined": "2025-10-15T16:00:00Z"
    }
  ]
}
```

### metadata.json (per document)

```json
{
  "document-id": "software-architecture-doc",
  "document-type": "architecture",
  "template-source": ".aiwg/templates/sad-template.md",
  "primary-author": "architecture-designer",
  "reviewers": ["security-architect", "test-architect", "technical-writer"],
  "synthesizer": "documentation-synthesizer",
  "created-date": "2025-10-15T10:00:00Z",
  "baselined-date": "2025-10-15T16:00:00Z",
  "current-version": "1.0",
  "status": "BASELINED",
  "output-path": ".aiwg/architecture/software-architecture-doc.md",
  "archive-path": ".aiwg/archive/2025-10/software-architecture-doc-2025-10-15",
  "versions": [
    {
      "version": "0.1",
      "timestamp": "2025-10-15T10:00:00Z",
      "author": "architecture-designer",
      "action": "initial-draft",
      "file": "drafts/v0.1-primary-draft.md",
      "status": "DRAFT"
    },
    {
      "version": "0.2",
      "timestamp": "2025-10-15T11:30:00Z",
      "author": "security-architect",
      "action": "security-review",
      "file": "drafts/v0.2-with-security-review.md",
      "status": "IN_REVIEW"
    },
    {
      "version": "1.0",
      "timestamp": "2025-10-15T16:00:00Z",
      "author": "documentation-synthesizer",
      "action": "synthesis-complete",
      "file": "synthesis/final-v1.0.md",
      "status": "BASELINED"
    }
  ],
  "reviews": [
    {
      "reviewer": "security-architect",
      "submitted": "2025-10-15T11:30:00Z",
      "status": "APPROVED",
      "feedback-file": "reviews/security-architect-review.md"
    },
    {
      "reviewer": "test-architect",
      "submitted": "2025-10-15T13:00:00Z",
      "status": "CONDITIONAL",
      "feedback-file": "reviews/test-architect-review.md"
    },
    {
      "reviewer": "technical-writer",
      "submitted": "2025-10-15T14:00:00Z",
      "status": "APPROVED",
      "feedback-file": "reviews/technical-writer-review.md"
    }
  ]
}
```

## Usage Examples

### Example 1: Tracking SAD Through Multi-Agent Review

**Workflow:**

1. **Initialize** (architecture-designer creates draft)
   ```bash
   # Archivist creates structure
   mkdir -p .aiwg/working/architecture/software-architecture-doc/{drafts,reviews,synthesis}

   # Save initial draft
   cp sad-draft.md .aiwg/working/architecture/software-architecture-doc/drafts/v0.1-primary-draft.md

   # Initialize metadata
   echo '{"document-id": "software-architecture-doc", ...}' > .aiwg/working/architecture/software-architecture-doc/metadata.json
   ```

2. **Track reviews** (as each reviewer completes)
   - Security Architect submits → Save v0.2, record review
   - Test Architect submits → Save v0.3, record review
   - Technical Writer submits → Update v0.3 metadata

3. **Prepare synthesis**
   - Verify all 3 reviewers complete
   - Package drafts + reviews for synthesizer

4. **Finalize**
   - Save synthesized v1.0 to output location
   - Archive all working materials
   - Generate audit trail

### Example 2: Recovering Previous Version

**Request:** "I need to see the Security Architect's feedback on the SAD"

**Process:**
1. Read `.aiwg/working/architecture/software-architecture-doc/metadata.json`
2. Find security-architect review entry
3. Retrieve `reviews/security-architect-review.md`
4. Return feedback document

### Example 3: Generating Audit Report for Compliance

**Request:** "Generate audit trail for all documents baselined this month"

**Process:**
1. Query `.aiwg/archive/2025-10/` directory
2. Read `audit-trail.md` from each archived document
3. Compile summary report:

```markdown
# October 2025 Baselined Documents Audit Report

**Generated:** 2025-10-31
**Documents Baselined:** 5

## Software Architecture Document
- **Baselined:** 2025-10-15
- **Primary Author:** Architecture Designer
- **Reviewers:** Security Architect, Test Architect, Technical Writer
- **Status:** APPROVED by all reviewers
- **Location:** .aiwg/architecture/software-architecture-doc.md
- **Archive:** .aiwg/archive/2025-10/software-architecture-doc-2025-10-15

## Master Test Plan
- **Baselined:** 2025-10-14
- **Primary Author:** Test Architect
- **Reviewers:** Test Engineer, Security Architect, DevOps Engineer
- **Status:** APPROVED (2 conditional)
- **Location:** .aiwg/testing/master-test-plan.md
- **Archive:** .aiwg/archive/2025-10/master-test-plan-2025-10-14

... (additional documents)
```
