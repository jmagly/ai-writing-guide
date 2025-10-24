#!/usr/bin/env node

/**
 * Content Diversification CLI Tool
 *
 * Command-line interface for generating diverse content variations
 * using different voices, perspectives, and structural approaches.
 */

import { readFile, writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { Command } from 'commander';

const program = new Command();

program
  .name('aiwg-diversify')
  .description('Generate diverse content variations demonstrating AI Writing Guide principles')
  .version('1.0.0');

program
  .argument('[input]', 'Input file path or text content')
  .option('--voices <list>', 'Comma-separated voices: academic,technical,executive,casual')
  .option('--perspectives <list>', 'Perspectives: first-person,third-person,neutral')
  .option('--structures <list>', 'Structures: bullets,narrative,qa,tutorial,comparison')
  .option('--tones <list>', 'Tones: formal,conversational,enthusiastic,matter-of-fact')
  .option('--lengths <list>', 'Lengths: concise,standard,comprehensive')
  .option('--count <num>', 'Number of variations to generate', '3')
  .option('--output <dir>', 'Output directory for variations')
  .option('--format <type>', 'Output format: markdown|json|html', 'markdown')
  .option('--before-after', 'Generate before/after example pair')
  .option('--scenarios <num>', 'Generate N diverse scenarios')
  .option('--analyze', 'Analyze voice and provide profile')
  .option('--compare', 'Compare variations and show differences')
  .action(async (input, options) => {
    try {
      // Dynamic import of TypeScript modules
      const { ContentDiversifier } = await import('../../dist/writing/content-diversifier.js');
      const { ExampleGenerator } = await import('../../dist/writing/example-generator.js');
      const { VoiceAnalyzer } = await import('../../dist/writing/voice-analyzer.js');

      const diversifier = new ContentDiversifier();
      const generator = new ExampleGenerator();
      const analyzer = new VoiceAnalyzer();

      let content = input;

      // Read from file if input is a path
      if (input && existsSync(input)) {
        content = await readFile(input, 'utf-8');
      }

      if (!content) {
        console.error('Error: No input provided. Specify text or file path.');
        process.exit(1);
      }

      // Handle different modes
      if (options.beforeAfter) {
        await handleBeforeAfter(content, generator, options);
      } else if (options.scenarios) {
        await handleScenarios(content, generator, parseInt(options.scenarios), options);
      } else if (options.analyze) {
        await handleAnalyze(content, analyzer, options);
      } else {
        await handleDiversify(content, diversifier, analyzer, options);
      }

    } catch (error) {
      console.error('Error:', error.message);
      if (error.stack) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  });

/**
 * Handle standard diversification
 */
async function handleDiversify(content, diversifier, analyzer, options) {
  console.log('Analyzing content...');
  const profile = analyzer.analyzeVoice(content);

  console.log(`\nOriginal Voice: ${profile.primaryVoice} (${profile.confidence}% confidence)`);
  console.log(`Word Count: ${profile.metadata.wordCount}`);
  console.log(`Sentence Count: ${profile.metadata.sentenceCount}`);
  console.log(`Average Sentence Length: ${profile.metadata.averageSentenceLength} words\n`);

  // Build options list
  const optionsList = buildOptionsList(options);

  console.log(`Generating ${optionsList.length} variations...\n`);

  const result = await diversifier.diversify(content, optionsList);

  // Output variations
  for (let i = 0; i < result.variations.length; i++) {
    const variation = result.variations[i];

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Variation ${i + 1}:`);
    console.log(`Voice: ${variation.options.voice || 'original'}`);
    console.log(`Perspective: ${variation.options.perspective || 'original'}`);
    console.log(`Structure: ${variation.options.structure || 'original'}`);
    console.log(`Tone: ${variation.options.tone || 'original'}`);
    console.log(`Length: ${variation.options.length || 'original'}`);
    console.log(`Authenticity Score: ${variation.score.authenticity}`);
    console.log(`Diversity Score: ${variation.score.diversity}`);
    console.log(`\nChanges:`);
    variation.changes.forEach(change => console.log(`  - ${change}`));
    console.log(`\nContent:\n${variation.content}`);
    console.log('='.repeat(60));

    // Save to file if output directory specified
    if (options.output) {
      await saveVariation(variation, i + 1, options.output, options.format);
    }
  }

  // Compare variations if requested
  if (options.compare && result.variations.length > 1) {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Diversity Analysis:');
    const diversityScore = analyzer.scoreDiversity(
      result.variations.map(v => v.content)
    );
    console.log(`Overall Diversity Score: ${diversityScore}/100`);

    // Compare first two variations
    const comparison = analyzer.compareVariations(
      result.variations[0].content,
      result.variations[1].content
    );
    console.log(`\nVariation 1 vs Variation 2:`);
    console.log(`Similarity: ${comparison.similarity}%`);
    console.log(`Voice Shift: ${comparison.voiceShift.from} → ${comparison.voiceShift.to} (magnitude: ${comparison.voiceShift.magnitude})`);
    console.log(`\nKey Differences:`);
    comparison.differences.forEach(diff => {
      console.log(`  [${diff.impact.toUpperCase()}] ${diff.description}`);
    });
    if (comparison.structuralChanges.length > 0) {
      console.log(`\nStructural Changes:`);
      comparison.structuralChanges.forEach(change => console.log(`  - ${change}`));
    }
    console.log('='.repeat(60));
  }

  console.log(`\n✓ Generated ${result.variations.length} variations`);
  if (options.output) {
    console.log(`✓ Saved to: ${options.output}`);
  }
}

/**
 * Handle before/after example generation
 */
async function handleBeforeAfter(topic, generator, options) {
  console.log(`Generating before/after example for: "${topic}"\n`);

  const voice = options.voices ? options.voices.split(',')[0] : 'technical';
  const example = await generator.generateBeforeAfter(topic, voice);

  console.log('='.repeat(60));
  console.log('BEFORE (AI-heavy):');
  console.log('='.repeat(60));
  console.log(example.before);

  console.log(`\n${'='.repeat(60)}`);
  console.log('AFTER (Authentic):');
  console.log('='.repeat(60));
  console.log(example.after);

  console.log(`\n${'='.repeat(60)}`);
  console.log('Improvements:');
  console.log('='.repeat(60));
  example.improvements.forEach((improvement, idx) => {
    console.log(`${idx + 1}. ${improvement}`);
  });

  if (options.output) {
    const outputPath = join(options.output, 'before-after.md');
    await ensureDirectory(dirname(outputPath));

    const markdown = `# Before/After Example: ${topic}

## Before (AI-heavy)

${example.before}

## After (Authentic)

${example.after}

## Improvements

${example.improvements.map((imp, idx) => `${idx + 1}. ${imp}`).join('\n')}
`;

    await writeFile(outputPath, markdown, 'utf-8');
    console.log(`\n✓ Saved to: ${outputPath}`);
  }
}

/**
 * Handle scenario generation
 */
async function handleScenarios(concept, generator, count, options) {
  console.log(`Generating ${count} diverse scenarios for: "${concept}"\n`);

  const scenarios = await generator.generateDiverseScenarios(concept, count);

  scenarios.forEach((scenario, idx) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Scenario ${idx + 1}:`);
    console.log('='.repeat(60));
    console.log(scenario);
  });

  if (options.output) {
    const outputPath = join(options.output, 'scenarios.md');
    await ensureDirectory(dirname(outputPath));

    const markdown = `# Diverse Scenarios: ${concept}

${scenarios.map((scenario, idx) => `## Scenario ${idx + 1}\n\n${scenario}`).join('\n\n')}
`;

    await writeFile(outputPath, markdown, 'utf-8');
    console.log(`\n✓ Saved to: ${outputPath}`);
  }

  console.log(`\n✓ Generated ${scenarios.length} scenarios`);
}

/**
 * Handle voice analysis
 */
async function handleAnalyze(content, analyzer, options) {
  console.log('Analyzing voice characteristics...\n');

  const profile = analyzer.analyzeVoice(content);

  console.log('='.repeat(60));
  console.log('VOICE PROFILE');
  console.log('='.repeat(60));
  console.log(`Primary Voice: ${profile.primaryVoice}`);
  console.log(`Confidence: ${profile.confidence}%`);
  console.log(`Perspective: ${profile.perspective}`);
  console.log(`Tone: ${profile.tone}`);
  console.log(`\nVoice Characteristics:`);
  console.log(`  Academic:  ${profile.characteristics.academic}`);
  console.log(`  Technical: ${profile.characteristics.technical}`);
  console.log(`  Executive: ${profile.characteristics.executive}`);
  console.log(`  Casual:    ${profile.characteristics.casual}`);
  console.log(`\nMetadata:`);
  console.log(`  Word Count: ${profile.metadata.wordCount}`);
  console.log(`  Sentence Count: ${profile.metadata.sentenceCount}`);
  console.log(`  Avg Sentence Length: ${profile.metadata.averageSentenceLength} words`);

  if (profile.markers.length > 0) {
    console.log(`\nVoice Markers (showing first 10):`);
    profile.markers.slice(0, 10).forEach(marker => {
      console.log(`  [${marker.strength.toUpperCase()}] ${marker.type}: "${marker.text}"`);
    });
  }

  // Analyze consistency if content is long enough
  if (profile.metadata.wordCount > 200) {
    const consistency = analyzer.analyzeConsistency(content);
    console.log(`\nConsistency Analysis:`);
    console.log(`  Overall Consistency: ${consistency.overallConsistency}%`);
    if (consistency.inconsistencies.length > 0) {
      console.log(`  Inconsistencies:`);
      consistency.inconsistencies.forEach(inc => console.log(`    - ${inc}`));
    }
  }

  console.log('='.repeat(60));

  if (options.output) {
    const outputPath = join(options.output, 'voice-analysis.json');
    await ensureDirectory(dirname(outputPath));
    await writeFile(outputPath, JSON.stringify(profile, null, 2), 'utf-8');
    console.log(`\n✓ Saved analysis to: ${outputPath}`);
  }
}

/**
 * Build options list from CLI arguments
 */
function buildOptionsList(options) {
  const optionsList = [];
  const count = parseInt(options.count) || 3;

  if (options.voices) {
    const voices = options.voices.split(',');
    voices.forEach(voice => {
      optionsList.push({ voice: voice.trim() });
    });
  }

  if (options.perspectives && optionsList.length === 0) {
    const perspectives = options.perspectives.split(',');
    perspectives.forEach(perspective => {
      optionsList.push({ perspective: perspective.trim() });
    });
  }

  if (options.structures && optionsList.length === 0) {
    const structures = options.structures.split(',');
    structures.forEach(structure => {
      optionsList.push({ structure: structure.trim() });
    });
  }

  if (options.tones && optionsList.length === 0) {
    const tones = options.tones.split(',');
    tones.forEach(tone => {
      optionsList.push({ tone: tone.trim() });
    });
  }

  if (options.lengths && optionsList.length === 0) {
    const lengths = options.lengths.split(',');
    lengths.forEach(length => {
      optionsList.push({ length: length.trim() });
    });
  }

  // Default: generate variations with different voices
  if (optionsList.length === 0) {
    const defaultVoices = ['academic', 'technical', 'executive', 'casual'];
    for (let i = 0; i < count; i++) {
      optionsList.push({
        voice: defaultVoices[i % defaultVoices.length],
      });
    }
  }

  return optionsList.slice(0, count);
}

/**
 * Save variation to file
 */
async function saveVariation(variation, index, outputDir, format) {
  await ensureDirectory(outputDir);

  const filename = `variation-${index}.${format === 'json' ? 'json' : 'md'}`;
  const filepath = join(outputDir, filename);

  let content;

  if (format === 'json') {
    content = JSON.stringify({
      options: variation.options,
      score: variation.score,
      changes: variation.changes,
      content: variation.content,
    }, null, 2);
  } else if (format === 'html') {
    content = `<!DOCTYPE html>
<html>
<head>
  <title>Variation ${index}</title>
  <style>
    body { font-family: sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    .metadata { background: #f5f5f5; padding: 15px; border-radius: 5px; margin-bottom: 20px; }
    .content { line-height: 1.6; }
  </style>
</head>
<body>
  <h1>Variation ${index}</h1>
  <div class="metadata">
    <p><strong>Voice:</strong> ${variation.options.voice || 'original'}</p>
    <p><strong>Perspective:</strong> ${variation.options.perspective || 'original'}</p>
    <p><strong>Structure:</strong> ${variation.options.structure || 'original'}</p>
    <p><strong>Authenticity Score:</strong> ${variation.score.authenticity}/100</p>
    <p><strong>Diversity Score:</strong> ${variation.score.diversity}/100</p>
    <p><strong>Changes:</strong></p>
    <ul>
      ${variation.changes.map(c => `<li>${c}</li>`).join('\n      ')}
    </ul>
  </div>
  <div class="content">
    ${variation.content.split('\n').map(p => `<p>${p}</p>`).join('\n    ')}
  </div>
</body>
</html>`;
  } else {
    // Markdown format
    content = `# Variation ${index}

## Metadata

- **Voice:** ${variation.options.voice || 'original'}
- **Perspective:** ${variation.options.perspective || 'original'}
- **Structure:** ${variation.options.structure || 'original'}
- **Tone:** ${variation.options.tone || 'original'}
- **Length:** ${variation.options.length || 'original'}
- **Authenticity Score:** ${variation.score.authenticity}/100
- **Diversity Score:** ${variation.score.diversity}/100

## Changes

${variation.changes.map(c => `- ${c}`).join('\n')}

## Content

${variation.content}
`;
  }

  await writeFile(filepath, content, 'utf-8');
}

/**
 * Ensure directory exists
 */
async function ensureDirectory(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

program.parse();
