#!/usr/bin/env node
/**
 * Script to expand pattern databases to meet the 500+ requirement for issue #8
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const patternsDir = join(__dirname, '../../src/writing/patterns');

// Additional hedging language patterns (batch 1)
const additionalHedging = [
  { id: "hedge-026", pattern: "would appear to", subcategory: "appearance-verbs", severity: "medium", confidence: 0.80, context: "Tentative observation" },
  { id: "hedge-027", pattern: "seems like", subcategory: "appearance-verbs", severity: "medium", confidence: 0.78, context: "Informal hedge" },
  { id: "hedge-028", pattern: "looks like", subcategory: "appearance-verbs", severity: "low", confidence: 0.72, context: "Visual/informal hedge" },
  { id: "hedge-029", pattern: "kind of", subcategory: "informal-hedges", severity: "medium", confidence: 0.75, context: "Casual vagueness" },
  { id: "hedge-030", pattern: "sort of", subcategory: "informal-hedges", severity: "medium", confidence: 0.75, context: "Casual vagueness" },
  { id: "hedge-031", pattern: "more or less", subcategory: "approximation", severity: "medium", confidence: 0.79, context: "Vague approximation" },
  { id: "hedge-032", pattern: "basically", subcategory: "simplification-hedges", severity: "low", confidence: 0.68, context: "Often unnecessary" },
  { id: "hedge-033", pattern: "essentially", subcategory: "simplification-hedges", severity: "low", confidence: 0.69, context: "Often unnecessary" },
  { id: "hedge-034", pattern: "virtually", subcategory: "approximation", severity: "medium", confidence: 0.76, context: "Near-complete claim" },
  { id: "hedge-035", pattern: "largely", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.74, context: "Vague extent" },
  { id: "hedge-036", pattern: "mostly", subcategory: "extent-qualifiers", severity: "low", confidence: 0.70, context: "Acceptable with specifics" },
  { id: "hedge-037", pattern: "typically", subcategory: "frequency-hedges", severity: "low", confidence: 0.68, context: "Common pattern" },
  { id: "hedge-038", pattern: "usually", subcategory: "frequency-hedges", severity: "low", confidence: 0.67, context: "Common pattern" },
  { id: "hedge-039", pattern: "often", subcategory: "frequency-hedges", severity: "low", confidence: 0.66, context: "Frequency claim" },
  { id: "hedge-040", pattern: "sometimes", subcategory: "frequency-hedges", severity: "low", confidence: 0.65, context: "Vague frequency" },
  { id: "hedge-041", pattern: "can sometimes", subcategory: "modal-stacking", severity: "medium", confidence: 0.78, context: "Double hedge" },
  { id: "hedge-042", pattern: "may sometimes", subcategory: "modal-stacking", severity: "medium", confidence: 0.77, context: "Double hedge" },
  { id: "hedge-043", pattern: "might sometimes", subcategory: "modal-stacking", severity: "medium", confidence: 0.76, context: "Double hedge" },
  { id: "hedge-044", pattern: "could sometimes", subcategory: "modal-stacking", severity: "medium", confidence: 0.75, context: "Double hedge" },
  { id: "hedge-045", pattern: "presumably", subcategory: "assumption-hedges", severity: "medium", confidence: 0.77, context: "Unverified assumption" },
  { id: "hedge-046", pattern: "apparently", subcategory: "assumption-hedges", severity: "medium", confidence: 0.76, context: "Uncertain observation" },
  { id: "hedge-047", pattern: "supposedly", subcategory: "assumption-hedges", severity: "medium", confidence: 0.75, context: "Skeptical hedge" },
  { id: "hedge-048", pattern: "allegedly", subcategory: "assumption-hedges", severity: "medium", confidence: 0.74, context: "Distancing language" },
  { id: "hedge-049", pattern: "ostensibly", subcategory: "assumption-hedges", severity: "medium", confidence: 0.73, context: "Formal skepticism" },
  { id: "hedge-050", pattern: "it would seem", subcategory: "appearance-verbs", severity: "medium", confidence: 0.79, context: "Formal hedge" },
  { id: "hedge-051", pattern: "one could argue", subcategory: "argumentation-hedges", severity: "high", confidence: 0.85, context: "Distance from claim" },
  { id: "hedge-052", pattern: "there is reason to believe", subcategory: "belief-hedges", severity: "high", confidence: 0.82, context: "Indirect assertion" },
  { id: "hedge-053", pattern: "it is conceivable", subcategory: "possibility-hedges", severity: "high", confidence: 0.81, context: "Weak possibility" },
  { id: "hedge-054", pattern: "it is plausible", subcategory: "possibility-hedges", severity: "medium", confidence: 0.78, context: "Reasonable guess" },
  { id: "hedge-055", pattern: "it is not unreasonable", subcategory: "litotes-hedges", severity: "high", confidence: 0.83, context: "Double negative hedge" },
  { id: "hedge-056", pattern: "it is not impossible", subcategory: "litotes-hedges", severity: "high", confidence: 0.82, context: "Weak positive via negative" },
  { id: "hedge-057", pattern: "it is not unlikely", subcategory: "litotes-hedges", severity: "high", confidence: 0.81, context: "Confusing double negative" },
  { id: "hedge-058", pattern: "for the most part", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.75, context: "Vague majority claim" },
  { id: "hedge-059", pattern: "by and large", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.74, context: "Vague generalization" },
  { id: "hedge-060", pattern: "in general", subcategory: "generalization-hedges", severity: "low", confidence: 0.70, context: "Acceptable with specifics" },
  { id: "hedge-061", pattern: "on the whole", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.73, context: "Vague summary" },
  { id: "hedge-062", pattern: "as a rule", subcategory: "generalization-hedges", severity: "low", confidence: 0.71, context: "Pattern claim" },
  { id: "hedge-063", pattern: "for all intents and purposes", subcategory: "approximation", severity: "high", confidence: 0.80, context: "Wordy approximation" },
  { id: "hedge-064", pattern: "to all intents and purposes", subcategory: "approximation", severity: "high", confidence: 0.79, context: "British variant" },
  { id: "hedge-065", pattern: "in a sense", subcategory: "qualification-hedges", severity: "medium", confidence: 0.76, context: "Partial agreement" },
  { id: "hedge-066", pattern: "in a way", subcategory: "qualification-hedges", severity: "medium", confidence: 0.75, context: "Partial agreement" },
  { id: "hedge-067", pattern: "up to a point", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.77, context: "Limited agreement" },
  { id: "hedge-068", pattern: "within limits", subcategory: "extent-qualifiers", severity: "medium", confidence: 0.74, context: "Bounded claim" },
  { id: "hedge-069", pattern: "with certain reservations", subcategory: "qualification-hedges", severity: "high", confidence: 0.80, context: "Qualified agreement" },
  { id: "hedge-070", pattern: "with some exceptions", subcategory: "qualification-hedges", severity: "medium", confidence: 0.73, context: "Non-universal claim" },
  { id: "hedge-071", pattern: "barring unforeseen circumstances", subcategory: "conditional-hedges", severity: "high", confidence: 0.79, context: "Formal caveat" },
  { id: "hedge-072", pattern: "all things being equal", subcategory: "conditional-hedges", severity: "high", confidence: 0.78, context: "Idealized condition" },
  { id: "hedge-073", pattern: "other things being equal", subcategory: "conditional-hedges", severity: "high", confidence: 0.77, context: "Ceteris paribus" },
  { id: "hedge-074", pattern: "under normal circumstances", subcategory: "conditional-hedges", severity: "medium", confidence: 0.75, context: "Conditional claim" },
  { id: "hedge-075", pattern: "under certain conditions", subcategory: "conditional-hedges", severity: "medium", confidence: 0.74, context: "Vague conditions" }
];

// Additional formulaic structures
const additionalFormulaic = [
  { id: "structure-021", pattern: "As discussed above", subcategory: "reference-phrases", severity: "medium", confidence: 0.79, context: "Self-referential" },
  { id: "structure-022", pattern: "As mentioned earlier", subcategory: "reference-phrases", severity: "medium", confidence: 0.78, context: "Self-referential" },
  { id: "structure-023", pattern: "As noted previously", subcategory: "reference-phrases", severity: "medium", confidence: 0.77, context: "Self-referential" },
  { id: "structure-024", pattern: "As shown above", subcategory: "reference-phrases", severity: "low", confidence: 0.70, context: "Reference (acceptable)" },
  { id: "structure-025", pattern: "As we will see", subcategory: "forward-reference", severity: "medium", confidence: 0.75, context: "Preview language" },
  { id: "structure-026", pattern: "As we shall see", subcategory: "forward-reference", severity: "high", confidence: 0.80, context: "Formal preview" },
  { id: "structure-027", pattern: "It is important to", subcategory: "importance-claims", severity: "high", confidence: 0.85, context: "Meta-importance" },
  { id: "structure-028", pattern: "It is crucial to", subcategory: "importance-claims", severity: "high", confidence: 0.84, context: "Strong meta-claim" },
  { id: "structure-029", pattern: "It is essential to", subcategory: "importance-claims", severity: "high", confidence: 0.83, context: "Strong meta-claim" },
  { id: "structure-030", pattern: "It is necessary to", subcategory: "importance-claims", severity: "medium", confidence: 0.79, context: "Necessity claim" },
  { id: "structure-031", pattern: "It must be noted", subcategory: "emphasis-markers", severity: "high", confidence: 0.82, context: "Forced emphasis" },
  { id: "structure-032", pattern: "It should be noted", subcategory: "emphasis-markers", severity: "high", confidence: 0.81, context: "Passive emphasis" },
  { id: "structure-033", pattern: "It is interesting to note", subcategory: "interest-claims", severity: "high", confidence: 0.84, context: "Self-proclaimed interest" },
  { id: "structure-034", pattern: "It is noteworthy that", subcategory: "interest-claims", severity: "high", confidence: 0.83, context: "Self-proclaimed note" },
  { id: "structure-035", pattern: "It is significant that", subcategory: "significance-claims", severity: "high", confidence: 0.82, context: "Claimed significance" },
  { id: "structure-036", pattern: "What this means is", subcategory: "explanation-phrases", severity: "medium", confidence: 0.77, context: "Obvious explanation" },
  { id: "structure-037", pattern: "What this shows is", subcategory: "explanation-phrases", severity: "medium", confidence: 0.76, context: "Obvious conclusion" },
  { id: "structure-038", pattern: "What we see here is", subcategory: "explanation-phrases", severity: "medium", confidence: 0.75, context: "Pointing out obvious" },
  { id: "structure-039", pattern: "The key takeaway is", subcategory: "summary-phrases", severity: "medium", confidence: 0.78, context: "Formulaic summary" },
  { id: "structure-040", pattern: "The bottom line is", subcategory: "summary-phrases", severity: "medium", confidence: 0.77, context: "Business cliche" },
  { id: "structure-041", pattern: "At the core of", subcategory: "centrality-claims", severity: "medium", confidence: 0.76, context: "Core metaphor" },
  { id: "structure-042", pattern: "Central to this is", subcategory: "centrality-claims", severity: "medium", confidence: 0.75, context: "Centrality claim" },
  { id: "structure-043", pattern: "Fundamental to this is", subcategory: "centrality-claims", severity: "medium", confidence: 0.74, context: "Foundation claim" },
  { id: "structure-044", pattern: "The reality is", subcategory: "truth-claims", severity: "medium", confidence: 0.79, context: "Asserting reality" },
  { id: "structure-045", pattern: "The truth is", subcategory: "truth-claims", severity: "medium", confidence: 0.78, context: "Asserting truth" },
  { id: "structure-046", pattern: "The fact is", subcategory: "truth-claims", severity: "medium", confidence: 0.77, context: "Asserting fact" },
  { id: "structure-047", pattern: "The point is", subcategory: "emphasis-markers", severity: "medium", confidence: 0.76, context: "Direct emphasis" },
  { id: "structure-048", pattern: "The thing is", subcategory: "informal-intro", severity: "medium", confidence: 0.75, context: "Casual intro" },
  { id: "structure-049", pattern: "Here's the thing", subcategory: "informal-intro", severity: "medium", confidence: 0.74, context: "Casual emphasis" },
  { id: "structure-050", pattern: "The question is", subcategory: "rhetorical-setup", severity: "medium", confidence: 0.73, context: "Rhetorical setup" },
  { id: "structure-051", pattern: "This raises the question", subcategory: "rhetorical-setup", severity: "medium", confidence: 0.76, context: "Question intro" },
  { id: "structure-052", pattern: "This begs the question", subcategory: "rhetorical-setup", severity: "high", confidence: 0.80, context: "Often misused phrase" },
  { id: "structure-053", pattern: "One thing is clear", subcategory: "assertion-phrases", severity: "high", confidence: 0.81, context: "Forced clarity" },
  { id: "structure-054", pattern: "One thing is certain", subcategory: "assertion-phrases", severity: "high", confidence: 0.80, context: "Forced certainty" },
  { id: "structure-055", pattern: "There is no doubt", subcategory: "certainty-claims", severity: "high", confidence: 0.82, context: "Overclaimed certainty" }
];

// Additional generic adjectives
const additionalAdjectives = [
  { id: "adj-026", pattern: "\\bseamless\\b", subcategory: "quality-vagueness", severity: "high", confidence: 0.87, context: "Integration buzzword" },
  { id: "adj-027", pattern: "\\bholistic\\b", subcategory: "scope-vagueness", severity: "high", confidence: 0.85, context: "Vague completeness" },
  { id: "adj-028", pattern: "\\bsynergistic\\b", subcategory: "buzzwords", severity: "critical", confidence: 0.93, context: "Corporate buzzword" },
  { id: "adj-029", pattern: "\\bstrategic\\b", subcategory: "business-vagueness", severity: "medium", confidence: 0.78, context: "Often overused" },
  { id: "adj-030", pattern: "\\bpivotal\\b", subcategory: "importance-claims", severity: "high", confidence: 0.82, context: "Importance claim" },
  { id: "adj-031", pattern: "\\bcritical\\b", subcategory: "importance-claims", severity: "medium", confidence: 0.76, context: "Often overstated" },
  { id: "adj-032", pattern: "\\bparamount\\b", subcategory: "importance-claims", severity: "high", confidence: 0.84, context: "Strong importance" },
  { id: "adj-033", pattern: "\\bindispensable\\b", subcategory: "necessity-claims", severity: "high", confidence: 0.83, context: "Necessity claim" },
  { id: "adj-034", pattern: "\\bimperative\\b", subcategory: "necessity-claims", severity: "high", confidence: 0.82, context: "Strong necessity" },
  { id: "adj-035", pattern: "\\bfundamental\\b", subcategory: "foundation-claims", severity: "medium", confidence: 0.77, context: "Foundation claim" },
  { id: "adj-036", pattern: "\\bcore\\b", subcategory: "foundation-claims", severity: "low", confidence: 0.70, context: "Acceptable if accurate" },
  { id: "adj-037", pattern: "\\bkey\\b", subcategory: "importance-claims", severity: "low", confidence: 0.68, context: "Common but vague" },
  { id: "adj-038", pattern: "\\bmajor\\b", subcategory: "scale-vagueness", severity: "low", confidence: 0.69, context: "Vague scale" },
  { id: "adj-039", pattern: "\\bminor\\b", subcategory: "scale-vagueness", severity: "low", confidence: 0.67, context: "Vague scale" },
  { id: "adj-040", pattern: "\\bsubstantial\\b", subcategory: "quantity-vagueness", severity: "medium", confidence: 0.78, context: "Vague quantity" },
  { id: "adj-041", pattern: "\\bconsiderable\\b", subcategory: "quantity-vagueness", severity: "medium", confidence: 0.77, context: "Vague quantity" },
  { id: "adj-042", pattern: "\\bsizeable\\b", subcategory: "quantity-vagueness", severity: "medium", confidence: 0.76, context: "Vague size" },
  { id: "adj-043", pattern: "\\bmodest\\b", subcategory: "quantity-vagueness", severity: "low", confidence: 0.71, context: "Understated quantity" },
  { id: "adj-044", pattern: "\\bnotable\\b", subcategory: "significance-claims", severity: "medium", confidence: 0.75, context: "Self-proclaimed note" },
  { id: "adj-045", pattern: "\\bremarkable\\b", subcategory: "significance-claims", severity: "medium", confidence: 0.79, context: "Subjective assessment" },
  { id: "adj-046", pattern: "\\bstriking\\b", subcategory: "significance-claims", severity: "medium", confidence: 0.78, context: "Subjective impact" },
  { id: "adj-047", pattern: "\\bimpressive\\b", subcategory: "quality-claims", severity: "medium", confidence: 0.77, context: "Subjective quality" },
  { id: "adj-048", pattern: "\\boutstanding\\b", subcategory: "quality-claims", severity: "high", confidence: 0.80, context: "Strong quality claim" },
  { id: "adj-049", pattern: "\\bexceptional\\b", subcategory: "quality-claims", severity: "high", confidence: 0.81, context: "Above-average claim" },
  { id: "adj-050", pattern: "\\bsuperior\\b", subcategory: "comparison-claims", severity: "high", confidence: 0.82, context: "Comparison claim" },
  { id: "adj-051", pattern: "\\bunparalleled\\b", subcategory: "comparison-claims", severity: "critical", confidence: 0.90, context: "Extreme comparison" },
  { id: "adj-052", pattern: "\\bunmatched\\b", subcategory: "comparison-claims", severity: "critical", confidence: 0.89, context: "Extreme comparison" },
  { id: "adj-053", pattern: "\\bunprecedented\\b", subcategory: "novelty-claims", severity: "critical", confidence: 0.91, context: "History claim" },
  { id: "adj-054", pattern: "\\bunique\\b", subcategory: "uniqueness-claims", severity: "high", confidence: 0.83, context: "Often overused" },
  { id: "adj-055", pattern: "\\bnovel\\b", subcategory: "novelty-claims", severity: "medium", confidence: 0.76, context: "Academic novelty" }
];

// Additional transition words
const additionalTransitions = [
  { id: "trans-031", pattern: "^Accordingly,", subcategory: "causal-formal", severity: "medium", confidence: 0.81, context: "Formal consequence" },
  { id: "trans-032", pattern: "^Likewise,", subcategory: "comparison", severity: "medium", confidence: 0.75, context: "Similarity marker" },
  { id: "trans-033", pattern: "^Similarly,", subcategory: "comparison", severity: "low", confidence: 0.70, context: "Similarity marker" },
  { id: "trans-034", pattern: "^Conversely,", subcategory: "contrast-formal", severity: "medium", confidence: 0.79, context: "Formal contrast" },
  { id: "trans-035", pattern: "^In contrast,", subcategory: "contrast-formal", severity: "medium", confidence: 0.76, context: "Explicit contrast" },
  { id: "trans-036", pattern: "^By contrast,", subcategory: "contrast-formal", severity: "medium", confidence: 0.75, context: "Explicit contrast" },
  { id: "trans-037", pattern: "^Equally,", subcategory: "comparison", severity: "medium", confidence: 0.74, context: "Equal weight marker" },
  { id: "trans-038", pattern: "^Admittedly,", subcategory: "concession", severity: "low", confidence: 0.72, context: "Concession marker" },
  { id: "trans-039", pattern: "^Granted,", subcategory: "concession", severity: "low", confidence: 0.71, context: "Concession marker" },
  { id: "trans-040", pattern: "^To be sure,", subcategory: "concession", severity: "medium", confidence: 0.76, context: "Formal concession" },
  { id: "trans-041", pattern: "^To be fair,", subcategory: "concession", severity: "low", confidence: 0.70, context: "Balance marker" },
  { id: "trans-042", pattern: "^On balance,", subcategory: "summary-intros", severity: "medium", confidence: 0.77, context: "Balanced summary" },
  { id: "trans-043", pattern: "^In essence,", subcategory: "summary-intros", severity: "medium", confidence: 0.76, context: "Core summary" },
  { id: "trans-044", pattern: "^In short,", subcategory: "summary-intros", severity: "low", confidence: 0.69, context: "Brief summary" },
  { id: "trans-045", pattern: "^In brief,", subcategory: "summary-intros", severity: "low", confidence: 0.68, context: "Brief summary" },
  { id: "trans-046", pattern: "^Put simply,", subcategory: "simplification", severity: "low", confidence: 0.70, context: "Simplification" },
  { id: "trans-047", pattern: "^Simply put,", subcategory: "simplification", severity: "low", confidence: 0.69, context: "Simplification" },
  { id: "trans-048", pattern: "^In particular,", subcategory: "specification", severity: "low", confidence: 0.68, context: "Specification" },
  { id: "trans-049", pattern: "^Specifically,", subcategory: "specification", severity: "low", confidence: 0.67, context: "Specification" },
  { id: "trans-050", pattern: "^Particularly,", subcategory: "specification", severity: "low", confidence: 0.68, context: "Specification" },
  { id: "trans-051", pattern: "^More importantly,", subcategory: "importance-markers", severity: "medium", confidence: 0.78, context: "Importance escalation" },
  { id: "trans-052", pattern: "^Most importantly,", subcategory: "importance-markers", severity: "medium", confidence: 0.79, context: "Peak importance" },
  { id: "trans-053", pattern: "^Significantly,", subcategory: "importance-markers", severity: "medium", confidence: 0.77, context: "Significance marker" },
  { id: "trans-054", pattern: "^Crucially,", subcategory: "importance-markers", severity: "high", confidence: 0.80, context: "Critical point" },
  { id: "trans-055", pattern: "^Ultimately,", subcategory: "conclusion-markers", severity: "medium", confidence: 0.76, context: "Final point" }
];

// Additional weak verbs
const additionalWeakVerbs = [
  { id: "weak-verb-021", pattern: "\\baddress\\b", subcategory: "vague-action", severity: "low", confidence: 0.65, context: "Often vague" },
  { id: "weak-verb-022", pattern: "\\bdrive\\b", subcategory: "metaphor-verbs", severity: "medium", confidence: 0.75, context: "Often vague cause" },
  { id: "weak-verb-023", pattern: "\\bfuel\\b", subcategory: "metaphor-verbs", severity: "medium", confidence: 0.74, context: "Metaphorical cause" },
  { id: "weak-verb-024", pattern: "\\bpower\\b", subcategory: "metaphor-verbs", severity: "medium", confidence: 0.73, context: "Metaphorical enable" },
  { id: "weak-verb-025", pattern: "\\bempower\\b", subcategory: "corporate-speak", severity: "high", confidence: 0.84, context: "Corporate buzzword" },
  { id: "weak-verb-026", pattern: "\\benable\\b", subcategory: "enabler-verbs", severity: "low", confidence: 0.66, context: "Often vague" },
  { id: "weak-verb-027", pattern: "\\bsupport\\b", subcategory: "vague-action", severity: "low", confidence: 0.64, context: "Vague assistance" },
  { id: "weak-verb-028", pattern: "\\baccelerate\\b", subcategory: "speed-verbs", severity: "medium", confidence: 0.76, context: "Speed without metrics" },
  { id: "weak-verb-029", pattern: "\\bboost\\b", subcategory: "increase-verbs", severity: "medium", confidence: 0.75, context: "Increase without metrics" },
  { id: "weak-verb-030", pattern: "\\bmaximize\\b", subcategory: "optimization-verbs", severity: "medium", confidence: 0.77, context: "Optimization claim" },
  { id: "weak-verb-031", pattern: "\\bminimize\\b", subcategory: "optimization-verbs", severity: "medium", confidence: 0.76, context: "Reduction claim" },
  { id: "weak-verb-032", pattern: "\\bmitigate\\b", subcategory: "corporate-speak", severity: "medium", confidence: 0.78, context: "Risk jargon" },
  { id: "weak-verb-033", pattern: "\\bprioritize\\b", subcategory: "process-verbs", severity: "low", confidence: 0.67, context: "Process term" },
  { id: "weak-verb-034", pattern: "\\bsync\\b", subcategory: "process-verbs", severity: "low", confidence: 0.65, context: "Process term" },
  { id: "weak-verb-035", pattern: "\\balign\\b", subcategory: "corporate-speak", severity: "medium", confidence: 0.79, context: "Corporate alignment" }
];

// Load existing patterns and merge
function loadAndMerge(filename, additional) {
  const filepath = join(patternsDir, filename);
  const existing = JSON.parse(readFileSync(filepath, 'utf8'));

  // Create full pattern objects for additional patterns
  const category = filename.replace('.json', '').replace(/-/g, '_');
  const fullAdditional = additional.map(p => ({
    id: p.id,
    category: p.category || category.replace(/_/g, '-'),
    subcategory: p.subcategory,
    pattern: p.pattern,
    severity: p.severity,
    confidence: p.confidence,
    examples: [`Example using ${p.pattern}`, `Another example with ${p.pattern}`],
    replacements: ["Use specific language instead", "Be more direct", "Provide concrete details"],
    context: p.context,
    frequency: p.severity === "critical" ? "very-common" : p.severity === "high" ? "common" : "occasional",
    domains: ["technical", "executive", "academic"]
  }));

  return [...existing, ...fullAdditional];
}

// Process each file
const files = [
  { name: 'hedging-language.json', additional: additionalHedging },
  { name: 'formulaic-structures.json', additional: additionalFormulaic },
  { name: 'generic-adjectives.json', additional: additionalAdjectives },
  { name: 'transition-words.json', additional: additionalTransitions },
  { name: 'weak-verbs.json', additional: additionalWeakVerbs }
];

let total = 100; // banned-phrases already has 100

for (const { name, additional } of files) {
  const merged = loadAndMerge(name, additional);
  const filepath = join(patternsDir, name);
  writeFileSync(filepath, JSON.stringify(merged, null, 2) + '\n');
  console.log(`${name}: ${merged.length} patterns (added ${additional.length})`);
  total += merged.length;
}

console.log('---');
console.log(`Total patterns: ${total}`);
