/**
 * Ground Truth Corpus Module
 *
 * Multi-corpus management system for NFR validation.
 *
 * @module testing/corpus
 */

export {
  GroundTruthCorpusManager,
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
  CorpusBuilder,
  CorpusBuilderOptions,
  ExportOptions,
  CorpusBuilders
} from './corpus-builder.js';
