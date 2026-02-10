#!/usr/bin/env node

/**
 * CLI tool for prompt optimization
 *
 * Usage: node optimize-prompt.mjs [options] <prompt|file>
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m'
};

function color(text, colorCode) {
  return `${colorCode}${text}${colors.reset}`;
}

function parseArgs(args) {
  const options = {
    context: null,
    format: 'text',
    template: null,
    showReasoning: false,
    interactive: false,
    help: false,
    prompt: null
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--context' && i + 1 < args.length) {
      options.context = args[++i];
    } else if (arg === '--format' && i + 1 < args.length) {
      options.format = args[++i];
    } else if (arg === '--template' && i + 1 < args.length) {
      options.template = args[++i];
    } else if (arg === '--show-reasoning') {
      options.showReasoning = true;
    } else if (arg === '--interactive') {
      options.interactive = true;
    } else if (arg === '-h' || arg === '--help') {
      options.help = true;
    } else if (!arg.startsWith('--') && !arg.startsWith('-')) {
      options.prompt = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
${color('AIWG - Prompt Optimizer', colors.bright + colors.cyan)}

${color('Usage:', colors.bright)} aiwg-optimize-prompt [options] <prompt|file>

${color('Options:', colors.bright)}
  --context <type>     Context: technical|academic|executive|creative
  --format <type>      Output format: text|json|diff (default: text)
  --template <id>      Use template instead of freeform optimization
  --show-reasoning     Show detailed reasoning for changes
  --interactive        Interactive mode with step-by-step improvements
  -h, --help           Show this help message

${color('Examples:', colors.bright)}
  ${color('# Optimize inline prompt', colors.gray)}
  aiwg-optimize-prompt "Write about microservices"

  ${color('# Optimize from file', colors.gray)}
  aiwg-optimize-prompt prompts/article.txt --context technical

  ${color('# Use template', colors.gray)}
  aiwg-optimize-prompt --template technical-deep-dive --context technical

  ${color('# Interactive mode', colors.gray)}
  aiwg-optimize-prompt "Explain JWT" --interactive

  ${color('# JSON output', colors.gray)}
  aiwg-optimize-prompt "Write about APIs" --format json

${color('Output Formats:', colors.bright)}
  ${color('text', colors.cyan)}  - Human-readable side-by-side comparison (default)
  ${color('json', colors.cyan)}  - Machine-readable JSON with full details
  ${color('diff', colors.cyan)}  - Git-style diff view with colors
`);
}

function loadPrompt(input) {
  // Check if input is a file path
  try {
    const filePath = resolve(input);
    const content = readFileSync(filePath, 'utf-8');
    return content;
  } catch {
    // Not a file, treat as direct prompt
    return input;
  }
}

function formatTextOutput(result) {
  console.log(color('═'.repeat(80), colors.gray));
  console.log(color('PROMPT OPTIMIZATION RESULTS', colors.bright + colors.cyan));
  console.log(color('═'.repeat(80), colors.gray));
  console.log();

  // Score comparison
  console.log(color('Score:', colors.bright));
  console.log(`  Before: ${colorScore(result.score.before)}/100`);
  console.log(`  After:  ${colorScore(result.score.after)}/100`);
  console.log(`  Delta:  ${colorDelta(result.score.delta)}`);
  console.log();

  // Improvements
  if (result.improvements.length > 0) {
    console.log(color('Improvements Applied:', colors.bright));
    result.improvements.forEach((imp, idx) => {
      const impactColor = imp.impact === 'high' ? colors.green :
                          imp.impact === 'medium' ? colors.yellow :
                          colors.gray;
      console.log(`  ${idx + 1}. [${color(imp.impact.toUpperCase(), impactColor)}] ${imp.description}`);
    });
    console.log();
  }

  // Side-by-side comparison
  console.log(color('─'.repeat(80), colors.gray));
  console.log(color('BEFORE', colors.red) + ' '.repeat(36) + '│ ' + color('AFTER', colors.green));
  console.log(color('─'.repeat(80), colors.gray));

  const beforeLines = result.originalPrompt.split('\n');
  const afterLines = result.optimizedPrompt.split('\n');
  const maxLines = Math.max(beforeLines.length, afterLines.length);

  for (let i = 0; i < maxLines; i++) {
    const before = (beforeLines[i] || '').substring(0, 38).padEnd(38);
    const after = (afterLines[i] || '').substring(0, 38);

    const beforeColor = i < beforeLines.length ? colors.red : colors.gray;
    const afterColor = i < afterLines.length ? colors.green : colors.gray;

    console.log(
      color(before, beforeColor) +
      ' │ ' +
      color(after, afterColor)
    );
  }

  console.log(color('─'.repeat(80), colors.gray));
  console.log();

  // Full optimized prompt
  console.log(color('Optimized Prompt:', colors.bright + colors.green));
  console.log(color('─'.repeat(80), colors.gray));
  console.log(result.optimizedPrompt);
  console.log(color('─'.repeat(80), colors.gray));
}

function formatDiffOutput(result) {
  console.log(color('--- Original Prompt', colors.red));
  console.log(color('+++ Optimized Prompt', colors.green));
  console.log(color('@@ Prompt Optimization @@', colors.cyan));
  console.log();

  const beforeLines = result.originalPrompt.split('\n');
  const afterLines = result.optimizedPrompt.split('\n');

  // Simple line-by-line diff
  const maxLines = Math.max(beforeLines.length, afterLines.length);
  for (let i = 0; i < maxLines; i++) {
    const before = beforeLines[i];
    const after = afterLines[i];

    if (before !== after) {
      if (before !== undefined) {
        console.log(color(`- ${before}`, colors.red));
      }
      if (after !== undefined) {
        console.log(color(`+ ${after}`, colors.green));
      }
    } else if (before !== undefined) {
      console.log(color(`  ${before}`, colors.gray));
    }
  }

  console.log();
  console.log(color(`Score: ${result.score.before} → ${result.score.after} (${colorDelta(result.score.delta)})`, colors.bright));
}

function formatJsonOutput(result) {
  console.log(JSON.stringify(result, null, 2));
}

function colorScore(score) {
  if (score >= 80) return color(score, colors.green);
  if (score >= 60) return color(score, colors.yellow);
  return color(score, colors.red);
}

function colorDelta(delta) {
  const sign = delta > 0 ? '+' : '';
  const deltaColor = delta > 0 ? colors.green : delta < 0 ? colors.red : colors.gray;
  return color(`${sign}${delta}`, deltaColor);
}

async function interactiveMode(optimizer, prompt, context) {
  console.log(color('Interactive Prompt Optimization', colors.bright + colors.cyan));
  console.log(color('═'.repeat(80), colors.gray));
  console.log();

  console.log(color('Step 1: Analysis', colors.bright));
  const analysis = optimizer.analyzePrompt(prompt);

  console.log(`Current score: ${colorScore(analysis.score)}/100`);
  console.log();

  if (analysis.issues.length > 0) {
    console.log(color('Issues Found:', colors.yellow));
    analysis.issues.forEach((issue, idx) => {
      const severityColor = issue.severity === 'critical' ? colors.red :
                            issue.severity === 'warning' ? colors.yellow :
                            colors.blue;
      console.log(`  ${idx + 1}. [${color(issue.severity.toUpperCase(), severityColor)}] ${issue.message}`);
    });
    console.log();
  }

  if (analysis.suggestions.length > 0) {
    console.log(color('Suggestions:', colors.cyan));
    analysis.suggestions.forEach((suggestion, idx) => {
      console.log(`  ${idx + 1}. ${suggestion}`);
    });
    console.log();
  }

  console.log(color('Step 2: Optimization', colors.bright));
  console.log('Applying improvements...');
  console.log();

  const result = await optimizer.optimize(prompt, context);

  console.log(color('Step 3: Results', colors.bright));
  formatTextOutput(result);

  if (result.improvements.length > 0) {
    console.log(color('Reasoning:', colors.bright));
    console.log(result.reasoning);
    console.log();
  }
}

async function loadTemplateMode(library, templateId, context) {
  console.log(color(`Loading template: ${templateId}`, colors.cyan));

  const template = library.getTemplate(templateId);
  if (!template) {
    console.error(color(`Error: Template '${templateId}' not found`, colors.red));
    console.log();
    console.log(color('Available templates:', colors.bright));

    const categories = ['technical', 'academic', 'executive', 'creative'];
    categories.forEach(cat => {
      const templates = library.listByCategory(cat);
      if (templates.length > 0) {
        console.log(color(`\n${cat.toUpperCase()}:`, colors.yellow));
        templates.forEach(t => {
          console.log(`  - ${t.id} (${t.name})`);
        });
      }
    });

    process.exit(1);
  }

  console.log(color('Template:', colors.bright), template.name);
  console.log(color('Category:', colors.bright), template.category);
  console.log(color('Variables:', colors.bright), template.variables.join(', '));
  console.log();
  console.log(color('Template Content:', colors.bright));
  console.log(color('─'.repeat(80), colors.gray));
  console.log(template.template);
  console.log(color('─'.repeat(80), colors.gray));
  console.log();
  console.log(color('Example:', colors.bright), template.example);
  console.log();
  console.log(color('Principles:', colors.bright));
  template.principles.forEach((p, idx) => {
    console.log(`  ${idx + 1}. ${p}`);
  });
}

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  if (options.help || args.length === 0) {
    showHelp();
    process.exit(0);
  }

  try {
    // Dynamic import of the optimizer (ESM compatibility)
    const optimizerModule = await import('../../dist/writing/prompt-optimizer.js');
    const templatesModule = await import('../../dist/writing/prompt-templates.js');

    const { PromptOptimizer } = optimizerModule;
    const { PromptTemplateLibrary } = templatesModule;

    const optimizer = new PromptOptimizer();
    const library = new PromptTemplateLibrary();

    // Template mode
    if (options.template) {
      await loadTemplateMode(library, options.template, options);
      process.exit(0);
    }

    // Need a prompt
    if (!options.prompt) {
      console.error(color('Error: No prompt provided', colors.red));
      console.log('Use --help for usage information');
      process.exit(1);
    }

    const prompt = loadPrompt(options.prompt);

    // Build context
    const context = options.context ? {
      domain: options.context,
      voice: options.context === 'technical' ? 'technical' :
             options.context === 'academic' ? 'academic' :
             options.context === 'executive' ? 'executive' : undefined
    } : undefined;

    // Interactive mode
    if (options.interactive) {
      await interactiveMode(optimizer, prompt, context);
      process.exit(0);
    }

    // Standard optimization
    const result = await optimizer.optimize(prompt, context);

    // Format output
    switch (options.format) {
      case 'json':
        formatJsonOutput(result);
        break;
      case 'diff':
        formatDiffOutput(result);
        break;
      case 'text':
      default:
        formatTextOutput(result);
        if (options.showReasoning) {
          console.log();
          console.log(color('Detailed Reasoning:', colors.bright));
          console.log(result.reasoning);
        }
        break;
    }

  } catch (error) {
    console.error(color('Error:', colors.red), error.message);
    if (error.stack) {
      console.error(color('Stack trace:', colors.gray));
      console.error(color(error.stack, colors.gray));
    }
    process.exit(1);
  }
}

main();
