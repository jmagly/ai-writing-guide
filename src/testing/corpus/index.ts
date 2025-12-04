/**
 * Ground Truth Corpus Module
 *
 * Multi-corpus management system for NFR validation.
 *
 * @module testing/corpus
 */

export {
  GroundTruthCorpusManager
} from './ground-truth-manager.js';

export type {
  CorpusType,
  VersionConstraint,
  GroundTruthItem,
  CorpusManifest,
  CorpusSchema,
  CorpusStatistics,
  ValidationResult,
  ComparisonResult
} from './ground-truth-manager.js';

export {
  CorpusBuilder
} from './corpus-builder.js';

export type {
  CorpusBuilderOptions,
  ExportOptions,
  CorpusBuilders
} from './corpus-builder.js';
