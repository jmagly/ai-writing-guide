#!/usr/bin/env node

/**
 * Update Flow Commands with Standard Parameters
 *
 * Applies flow-command-parameters-template.md patterns to all flow-*.md commands:
 * 1. Update frontmatter argument-hint with [--guidance "text"] [--interactive]
 * 2. Add Step 0: Parameter Parsing and Guidance Setup
 * 3. Replace hardcoded ~/.local/share/ai-writing-guide with $(resolve_aiwg_root)
 *
 * Usage:
 *   node tools/commands/update-flow-parameters.mjs [--write] [--target path]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse CLI arguments
const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const targetIdx = args.indexOf('--target');
const targetDir = targetIdx !== -1 ? args[targetIdx + 1] : path.resolve(__dirname, '../../agentic/code/frameworks/sdlc-complete/commands');

console.log('======================================================================');
console.log('Update Flow Commands with Standard Parameters');
console.log('======================================================================');
console.log(`Target: ${targetDir}`);
console.log(`Mode: ${writeMode ? 'WRITE' : 'DRY-RUN'}`);
console.log('');

// Flow-specific interactive questions (mapping from flow-command-parameters-template.md)
const FLOW_QUESTIONS = {
  'flow-inception-to-elaboration': [
    'What are your top priorities for Elaboration? (Rank: Requirements detail, Architecture refinement, Risk retirement, Prototype)',
    'What percentage of requirements do you estimate are understood? (0-25%, 25-50%, 50-75%, 75-100%)',
    'What are your biggest architectural unknowns? (Tech stack feasibility, integration complexity, performance, scalability)',
    'What\'s your team\'s size and composition? (Solo, 2-5 people, 5-10, 10+ with roles)',
    'How tight is your timeline for Elaboration? (Flexible, Target date, Hard deadline, Crisis mode)',
    'What domain expertise does your team have? (Strong, Moderate, Learning, New to domain)',
    'Are there regulatory or compliance requirements? (None, GDPR, HIPAA, SOC2, PCI-DSS, Other)',
    'What\'s your testing maturity? (Comprehensive automated, Some tests, Manual only, No tests yet)'
  ],
  'flow-architecture-evolution': [
    'What\'s driving this architecture change? (New requirements, Performance issues, Tech debt, Scaling needs, Security)',
    'What are your top priorities? (Rank: Security, Performance, Maintainability, Cost, Speed)',
    'What are your biggest constraints? (Timeline, Team skills, Budget, Compliance, Backward compatibility)',
    'What architectural risks concern you most? (Data migration, Breaking changes, Integration complexity, Performance regression)',
    'How mature is your current architecture documentation? (Comprehensive, Outdated, Minimal, None)',
    'What\'s your team\'s architecture review experience? (Expert, Intermediate, Learning, New)',
    'What\'s your target timeline for this evolution? (Weeks, Months, Ongoing)'
  ],
  'flow-test-strategy-execution': [
    'What test levels are you targeting? (Unit, Integration, E2E, Performance, Security - select all)',
    'What\'s your current test coverage? (High >80%, Medium 50-80%, Low <50%, None)',
    'What are your top quality concerns? (Correctness, Performance, Security, Reliability, Usability)',
    'What\'s your test automation maturity? (Comprehensive CI/CD, Some automation, Manual testing, No tests)',
    'What\'s your acceptable test execution time? (<5 min, 5-15 min, 15-30 min, >30 min acceptable)',
    'What\'s your team\'s testing expertise? (QA specialists, Developers test, Learning TDD, New to testing)'
  ],
  'flow-security-review-cycle': [
    'What\'s triggering this security review? (New feature, Audit prep, Incident, Scheduled, Compliance)',
    'What are your top security concerns? (Rank: Authentication, Data protection, API security, Infrastructure, Code vulnerabilities)',
    'What compliance frameworks apply? (None, GDPR, HIPAA, SOC2, PCI-DSS, ISO 27001, Other)',
    'How sensitive is your data? (Public, Internal, Confidential, Restricted/PII)',
    'What\'s your security tooling maturity? (Comprehensive SAST/DAST/SCA, Some tools, Manual review, None)',
    'What\'s your team\'s security expertise? (Dedicated security team, Security-aware developers, Learning, New)',
    'What\'s your incident response readiness? (Documented playbooks, Ad-hoc process, No process)',
    'What\'s your target timeline for this review? (Urgent <1 week, Normal 2-4 weeks, Comprehensive 1-2 months)'
  ],
  'flow-performance-optimization': [
    'What performance issue are you addressing? (Latency, Throughput, Resource usage, Scalability, Cost)',
    'What\'s your current performance baseline? (Measured SLOs, Rough estimates, Unknown)',
    'What\'s your target performance improvement? (10-30%, 2-5x, 10x+, Just fix critical issues)',
    'Where do you suspect bottlenecks? (Database, API, Frontend, Network, Algorithm complexity)',
    'What\'s your monitoring maturity? (Comprehensive APM, Basic metrics, Logs only, None)',
    'What\'s your acceptable optimization investment? (Quick wins only, Moderate refactor, Major redesign)',
    'What\'s your timeline pressure? (Urgent production issue, Scheduled optimization, Ongoing improvement)'
  ],
  'flow-change-control': [
    'What type of change is this? (Feature, Bug fix, Refactor, Infrastructure, Security patch, Emergency)',
    'What\'s the change urgency? (Emergency, High, Medium, Low)',
    'What\'s the change scope? (Single component, Multiple services, Architecture, Infrastructure)',
    'What are the biggest risks? (Breaking changes, Data migration, Downtime, Backward compatibility)',
    'What\'s your rollback confidence? (Automated rollback, Manual revert tested, Difficult to rollback, Irreversible)',
    'What\'s your change control maturity? (Formal CCB, Lightweight approval, Ad-hoc, No process)'
  ],
  // Add generic questions for flows without specific questions defined
  '_default': [
    'What are your top priorities for this activity? (Rank: Speed, Quality, Cost, Risk mitigation)',
    'What are your biggest constraints? (Timeline, Budget, Team skills, Technical limitations)',
    'What risks concern you most for this workflow?',
    'What\'s your team\'s experience level with this type of activity? (Expert, Intermediate, Learning, New)',
    'What\'s your target timeline? (Days, Weeks, Months)',
    'Are there compliance or regulatory requirements?'
  ]
};

// Path resolution function template
const PATH_RESOLUTION_FUNCTION = `
# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}
`.trim();

// Parameter parsing logic template
function generateParameterParsing(flowName, questions) {
  const questionsList = questions.map((q, i) => `  echo "Q${i + 1}: ${q}"`).join('\n');
  const readPrompts = questions.map((q, i) => `  read -p "Q${i + 1}: ${q.split('?')[0]}? " answer${i + 1}`).join('\n');

  return `
### Step 0: Parameter Parsing and Guidance Setup

**Parse Command Line**:

Extract optional \`--guidance\` and \`--interactive\` parameters.

\`\`\`bash
# Parse arguments (flow-specific primary param varies)
PROJECT_DIR="."
GUIDANCE=""
INTERACTIVE=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --guidance)
      GUIDANCE="$2"
      shift 2
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      # If looks like a path (contains / or is .), treat as project-directory
      if [[ "$1" == *"/"* ]] || [[ "$1" == "." ]]; then
        PROJECT_DIR="$1"
      fi
      shift
      ;;
  esac
done
\`\`\`

**Path Resolution**:

${PATH_RESOLUTION_FUNCTION}

**Resolve AIWG installation**:

\`\`\`bash
AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG or set AIWG_ROOT environment variable"
  exit 1
fi
\`\`\`

**Interactive Mode**:

If \`--interactive\` flag set, prompt user with strategic questions:

\`\`\`bash
if [ "$INTERACTIVE" = true ]; then
  echo "# ${flowName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} - Interactive Setup"
  echo ""
  echo "I'll ask ${questions.length} strategic questions to tailor this flow to your project's needs."
  echo ""

${readPrompts}

  echo ""
  echo "Based on your answers, I'll adjust priorities, agent assignments, and activity focus."
  echo ""
  read -p "Proceed with these adjustments? (yes/no) " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Aborting flow."
    exit 0
  fi

  # Synthesize guidance from answers
  GUIDANCE="Priorities: $answer1. Constraints: $answer2. Risks: $answer3. Team: $answer4. Timeline: $answer5."
fi
\`\`\`

**Apply Guidance**:

Parse guidance for keywords and adjust execution:

\`\`\`bash
if [ -n "$GUIDANCE" ]; then
  # Keyword detection
  FOCUS_SECURITY=false
  FOCUS_PERFORMANCE=false
  FOCUS_COMPLIANCE=false
  TIGHT_TIMELINE=false

  if echo "$GUIDANCE" | grep -qiE "security|secure|audit"; then
    FOCUS_SECURITY=true
  fi

  if echo "$GUIDANCE" | grep -qiE "performance|latency|speed|throughput"; then
    FOCUS_PERFORMANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "compliance|regulatory|gdpr|hipaa|sox|pci"; then
    FOCUS_COMPLIANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "tight|urgent|deadline|crisis"; then
    TIGHT_TIMELINE=true
  fi

  # Adjust agent assignments based on guidance
  ADDITIONAL_REVIEWERS=""

  if [ "$FOCUS_SECURITY" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS security-architect privacy-officer"
  fi

  if [ "$FOCUS_COMPLIANCE" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS legal-liaison privacy-officer"
  fi

  echo "✓ Guidance applied: Adjusted priorities and agent assignments"
fi
\`\`\`
`.trim();
}

// Process a single flow command file
function processFlowCommand(filePath) {
  const fileName = path.basename(filePath, '.md');
  console.log(`Processing: ${fileName}`);

  const content = fs.readFileSync(filePath, 'utf-8');
  let updated = content;
  let changes = [];

  // 1. Update frontmatter argument-hint
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const frontmatter = frontmatterMatch[1];

    // Check if argument-hint already has --guidance and --interactive
    if (frontmatter.includes('argument-hint:') &&
        !frontmatter.includes('--guidance') &&
        !frontmatter.includes('--interactive')) {

      const updatedFrontmatter = frontmatter.replace(
        /argument-hint: (.+)/,
        'argument-hint: $1 [--guidance "text"] [--interactive]'
      );

      updated = updated.replace(frontmatter, updatedFrontmatter);
      changes.push('Updated frontmatter with --guidance and --interactive');
    }
  }

  // 2. Replace hardcoded paths
  const hardcodedPathPattern = /~\/\.local\/share\/ai-writing-guide/g;
  const pathMatches = content.match(hardcodedPathPattern);

  if (pathMatches && pathMatches.length > 0) {
    // Replace with $AIWG_ROOT variable reference
    updated = updated.replace(
      hardcodedPathPattern,
      '$AIWG_ROOT'
    );

    // Also update patterns where it's used directly in bash variables
    updated = updated.replace(
      /TEMPLATE=~\/\.local\/share\/ai-writing-guide/g,
      'TEMPLATE=$AIWG_ROOT'
    );

    updated = updated.replace(
      /TEMPLATE_(\w+)=~\/\.local\/share\/ai-writing-guide/g,
      'TEMPLATE_$1=$AIWG_ROOT'
    );

    changes.push(`Replaced ${pathMatches.length} hardcoded path(s) with $AIWG_ROOT`);
  }

  // 3. Add Step 0 if not already present
  if (!content.includes('### Step 0:') && !content.includes('## Parameter Parsing')) {
    // Get flow-specific questions or use default
    const questions = FLOW_QUESTIONS[fileName] || FLOW_QUESTIONS['_default'];
    const step0 = generateParameterParsing(fileName, questions);

    // Find where to insert (after "## Your Task" section or before first "### Step 1:")
    const insertPoint = content.indexOf('### Step 1:') !== -1
      ? content.indexOf('### Step 1:')
      : content.indexOf('## Workflow Steps');

    if (insertPoint !== -1) {
      // Insert Step 0 before the first step or workflow section
      const before = updated.substring(0, insertPoint);
      const after = updated.substring(insertPoint);

      updated = before + '\n\n' + step0 + '\n\n' + after;
      changes.push(`Added Step 0: Parameter Parsing with ${questions.length} interactive questions`);
    }
  }

  // 4. Add path resolution function if using templates but not already present
  if (content.includes('TEMPLATE') && !content.includes('resolve_aiwg_root')) {
    // Path resolution is already included in Step 0, just note it
    if (changes.some(c => c.includes('Added Step 0'))) {
      // Already added via Step 0
    } else {
      changes.push('Note: Path resolution needed (will be added with Step 0)');
    }
  }

  // Report changes
  if (changes.length > 0) {
    console.log(`  Changes (${changes.length}):`);
    changes.forEach(change => console.log(`    - ${change}`));

    if (writeMode) {
      fs.writeFileSync(filePath, updated, 'utf-8');
      console.log(`  ✓ Written`);
    } else {
      console.log(`  ⚠ DRY-RUN (use --write to apply)`);
    }
  } else {
    console.log(`  ✓ No changes needed`);
  }

  console.log('');

  return { fileName, changes: changes.length, applied: writeMode };
}

// Main execution
try {
  // Find all flow-*.md files
  const files = fs.readdirSync(targetDir)
    .filter(f => f.startsWith('flow-') && f.endsWith('.md'))
    .map(f => path.join(targetDir, f));

  console.log(`Found ${files.length} flow command files\n`);

  const results = files.map(processFlowCommand);

  // Summary
  console.log('======================================================================');
  console.log('Summary');
  console.log('======================================================================');
  console.log(`Total files processed: ${results.length}`);
  console.log(`Files with changes: ${results.filter(r => r.changes > 0).length}`);
  console.log(`Total changes: ${results.reduce((sum, r) => sum + r.changes, 0)}`);

  if (!writeMode) {
    console.log('');
    console.log('⚠️  DRY-RUN MODE: No files modified');
    console.log('Run with --write flag to apply changes');
  } else {
    console.log('');
    console.log('✓ All changes applied');
  }

} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
