#!/usr/bin/env node

/**
 * CLI tool to add a template to a framework or extension
 * Usage: aiwg add-template <name> --to <target> [options]
 */

import {
  parseArgs,
  formatName,
  ensureDir,
  writeFileIfNotExists,
  updateManifest,
  resolveTargetPath,
  printSuccess,
  printError,
  printInfo,
  printHeader,
  listFrameworks,
} from './utils.mjs';
import { existsSync } from 'fs';
import { join } from 'path';

const { positional, flags } = parseArgs(process.argv);

const name = positional[0];
const target = flags.to || flags.t;
const templateType = flags.type || 'document';
const templateDescription = flags.description || flags.d || `${formatName(name || 'template').title} template`;
const category = flags.category || flags.c || '';
const dryRun = flags['dry-run'] || flags.n;
const help = flags.help || flags.h;

const VALID_TYPES = ['document', 'checklist', 'matrix', 'form'];

function printHelp() {
  const frameworks = listFrameworks();

  console.log(`
Usage: aiwg add-template <name> --to <target> [options]

Add a new template to a framework or extension.

Arguments:
  name                  Template name (kebab-case recommended)

Required:
  --to, -t              Target framework or extension path

Options:
  --type                Template type: document (default), checklist, matrix, form
  --category, -c        Template category/subdirectory (e.g., "security", "compliance")
  --description, -d     Template description
  --dry-run, -n         Preview what would be created
  --help, -h            Show this help

Template Types:
  document    General document template (default)
  checklist   Verification checklist with checkboxes
  matrix      Comparison/mapping matrix with tables
  form        Intake/collection form with fields

Available Targets:
  Frameworks:  ${frameworks.length > 0 ? frameworks.join(', ') : '(none)'}
  Extensions:  <framework>/extensions/<name>

Examples:
  aiwg add-template security-review --to sdlc-complete --type checklist
  aiwg add-template hipaa-requirements --to sdlc-complete/extensions/hipaa
  aiwg add-template control-matrix --to sdlc-complete/extensions/sox --type matrix
`);
}

function generateTemplateDocument(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title}

${options.description}

## Overview

[Provide context and purpose of this document]

## Scope

[Define what is covered and what is not]

## Content

### Section 1: [Topic]

[Content for section 1]

### Section 2: [Topic]

[Content for section 2]

### Section 3: [Topic]

[Content for section 3]

## References

- [Reference 1]
- [Reference 2]

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [Author] | Initial draft |

---
*Template: ${kebab}*
`;
}

function generateTemplateChecklist(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title} Checklist

${options.description}

## Instructions

Review each item and check when complete. All items must be verified before proceeding.

## Pre-Conditions

- [ ] [Pre-condition 1]
- [ ] [Pre-condition 2]

## Checklist

### Category 1: [Topic]

- [ ] **Item 1.1**: [Description]
  - Verification: [How to verify]
  - Evidence: [What evidence to collect]

- [ ] **Item 1.2**: [Description]
  - Verification: [How to verify]
  - Evidence: [What evidence to collect]

### Category 2: [Topic]

- [ ] **Item 2.1**: [Description]
  - Verification: [How to verify]
  - Evidence: [What evidence to collect]

- [ ] **Item 2.2**: [Description]
  - Verification: [How to verify]
  - Evidence: [What evidence to collect]

### Category 3: [Topic]

- [ ] **Item 3.1**: [Description]
  - Verification: [How to verify]
  - Evidence: [What evidence to collect]

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Preparer | | | |
| Reviewer | | | |
| Approver | | | |

## Notes

[Additional notes and observations]

---
*Template: ${kebab}*
`;
}

function generateTemplateMatrix(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title} Matrix

${options.description}

## Purpose

[Explain what this matrix tracks/maps]

## Matrix

| ID | [Column 1] | [Column 2] | [Column 3] | [Column 4] | Status |
|----|------------|------------|------------|------------|--------|
| 1 | [Value] | [Value] | [Value] | [Value] | ⬜ |
| 2 | [Value] | [Value] | [Value] | [Value] | ⬜ |
| 3 | [Value] | [Value] | [Value] | [Value] | ⬜ |
| 4 | [Value] | [Value] | [Value] | [Value] | ⬜ |
| 5 | [Value] | [Value] | [Value] | [Value] | ⬜ |

## Status Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Complete/Compliant |
| ⬜ | Not Started |
| 🟡 | In Progress |
| ❌ | Failed/Non-Compliant |
| N/A | Not Applicable |

## Analysis

### Summary

- Total items: [X]
- Complete: [X]
- In Progress: [X]
- Not Started: [X]

### Findings

[Key findings from the matrix analysis]

### Recommendations

1. [Recommendation 1]
2. [Recommendation 2]

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | YYYY-MM-DD | [Author] | Initial draft |

---
*Template: ${kebab}*
`;
}

function generateTemplateForm(name, options) {
  const { kebab, title } = formatName(name);

  return `# ${title} Form

${options.description}

## Instructions

Complete all required fields (*). Submit to [recipient/process] when complete.

---

## Section 1: Basic Information

**Field 1*** _(required)_:


**Field 2*** _(required)_:


**Field 3** _(optional)_:


---

## Section 2: Details

**Description*** _(required)_:

> [Provide detailed description]

**Category*** _(required)_:

- [ ] Option A
- [ ] Option B
- [ ] Option C
- [ ] Other: _____________

**Priority*** _(required)_:

- [ ] Critical
- [ ] High
- [ ] Medium
- [ ] Low

---

## Section 3: Additional Information

**Supporting Documentation**:

| Document | Attached | Notes |
|----------|----------|-------|
| [Doc 1] | ☐ Yes ☐ No | |
| [Doc 2] | ☐ Yes ☐ No | |

**Comments**:

> [Additional comments or context]

---

## Submission

**Submitted By**: _____________

**Date**: _____________

**Reviewed By**: _____________

**Approval Status**: ☐ Approved ☐ Rejected ☐ Pending

---
*Template: ${kebab}*
`;
}

function generateTemplate(name, type, options) {
  switch (type) {
    case 'checklist':
      return generateTemplateChecklist(name, options);
    case 'matrix':
      return generateTemplateMatrix(name, options);
    case 'form':
      return generateTemplateForm(name, options);
    case 'document':
    default:
      return generateTemplateDocument(name, options);
  }
}

async function main() {
  if (help) {
    printHelp();
    process.exit(0);
  }

  if (!name) {
    printError('Template name is required.');
    printHelp();
    process.exit(1);
  }

  if (!target) {
    printError('Target is required. Use --to <framework|extension>');
    process.exit(1);
  }

  if (!VALID_TYPES.includes(templateType)) {
    printError(`Invalid type: ${templateType}. Valid options: ${VALID_TYPES.join(', ')}`);
    process.exit(1);
  }

  const { kebab, title } = formatName(name);
  const resolved = resolveTargetPath(target);

  if (!resolved) {
    printError(`Target not found: ${target}`);
    printInfo('Check that the framework or extension exists.');
    process.exit(1);
  }

  // Templates typically not added to addons
  if (resolved.type === 'addon') {
    printError('Templates are typically added to frameworks or extensions, not addons.');
    printInfo('Addons usually contain agents, commands, and skills.');
    process.exit(1);
  }

  // Determine templates directory and path
  let templatesDir = join(resolved.path, 'templates');
  if (category) {
    templatesDir = join(templatesDir, category);
  }
  const templatePath = join(templatesDir, `${kebab}.md`);
  const manifestPath = join(resolved.path, 'manifest.json');

  // Check if template already exists
  if (existsSync(templatePath)) {
    printError(`Template already exists: ${templatePath}`);
    process.exit(1);
  }

  printHeader(`Adding Template: ${title}`);
  printInfo(`Target: ${resolved.type} (${target})`);
  printInfo(`Type: ${templateType}`);
  if (category) {
    printInfo(`Category: ${category}`);
  }

  // Generate template content
  const templateContent = generateTemplate(name, templateType, {
    description: templateDescription,
  });

  if (dryRun) {
    console.log('\n[DRY RUN] Would create:\n');
    console.log(`  📄 ${templatePath}`);
    console.log(`  📝 Update ${manifestPath}`);
    console.log('\nTemplate content preview:');
    console.log('─'.repeat(40));
    console.log(templateContent.slice(0, 500) + '...');
    console.log('\nRun without --dry-run to create.');
    process.exit(0);
  }

  // Create templates directory if needed
  ensureDir(templatesDir);

  // Write template file
  writeFileIfNotExists(templatePath, templateContent, { force: true });
  printSuccess(`Created ${templatePath}`);

  // Update manifest
  try {
    updateManifest(manifestPath, 'templates', category ? `${category}/${kebab}` : kebab);
    printSuccess(`Updated ${manifestPath}`);
  } catch (err) {
    printError(`Could not update manifest: ${err.message}`);
  }

  // Summary
  printHeader('Template Added Successfully');
  printInfo(`Template: ${kebab}`);
  printInfo(`Location: ${templatePath}`);
  printInfo(`Type: ${templateType}`);
  printInfo('');
  printInfo('Next steps:');
  printInfo('  1. Edit the template to customize content');
  printInfo('  2. Reference in workflows and documentation');
  console.log('');
}

main().catch(err => {
  printError(err.message);
  process.exit(1);
});
