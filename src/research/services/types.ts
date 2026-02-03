/**
 * Type definitions for Research Framework services
 *
 * @module research/services/types
 */

import { ResearchPaper } from '../types.js';

/**
 * Search options for discovery service
 */
export interface SearchOptionsExtended {
  /** Maximum results to return */
  limit?: number;
  /** Offset for pagination */
  offset?: number;
  /** Fields to include in response */
  fields?: string[];
  /** Whether to use cache */
  useCache?: boolean;
  /** Minimum year for results */
  minYear?: number;
  /** Maximum year for results */
  maxYear?: number;
  /** Relevance threshold (0-1) */
  relevanceThreshold?: number;
  /** Whether to deduplicate results */
  deduplicate?: boolean;
}

/**
 * Gap report from corpus analysis
 */
export interface GapReport {
  /** Topics underrepresented in corpus */
  underrepresentedTopics: Array<{
    topic: string;
    currentCount: number;
    recommendedCount: number;
    priority: 'high' | 'medium' | 'low';
  }>;
  /** Year gaps */
  yearGaps: Array<{
    year: number;
    paperCount: number;
    significance: 'critical' | 'notable' | 'minor';
  }>;
  /** Source type distribution */
  sourceTypeDistribution: Record<string, number>;
  /** Recommendations */
  recommendations: string[];
}

/**
 * Acquired research source
 */
export interface AcquiredSource {
  /** Original paper metadata */
  paper: ResearchPaper;
  /** Local file path to PDF */
  filePath: string;
  /** SHA-256 checksum */
  checksum: string;
  /** REF-XXX identifier */
  refId: string;
  /** Acquisition timestamp */
  acquiredAt: string;
  /** File size in bytes */
  sizeBytes: number;
  /** FAIR compliance score */
  fairScore?: FAIRScore;
}

/**
 * FAIR compliance score
 */
export interface FAIRScore {
  /** Overall score (0-1) */
  overall: number;
  /** Findable dimensions */
  findable: FAIRDimension;
  /** Accessible dimensions */
  accessible: FAIRDimension;
  /** Interoperable dimensions */
  interoperable: FAIRDimension;
  /** Reusable dimensions */
  reusable: FAIRDimension;
  /** Compliance notes */
  notes: string[];
}

/**
 * FAIR dimension scores
 */
export interface FAIRDimension {
  /** Score (0-1) */
  score: number;
  /** Passing criteria */
  criteria: Array<{
    id: string;
    description: string;
    met: boolean;
  }>;
}

/**
 * Structured paper summary
 */
export interface PaperSummary {
  /** Paper reference */
  refId: string;
  /** One-sentence summary */
  oneSentence: string;
  /** Key contributions (3-5 bullets) */
  contributions: string[];
  /** Methodology overview */
  methodology: string;
  /** Main findings */
  findings: string[];
  /** Limitations */
  limitations: string[];
  /** AIWG relevance */
  aiwgRelevance: {
    applicability: 'direct' | 'indirect' | 'background';
    componentsAffected: string[];
    implementationPriority: 'immediate' | 'round-2' | 'future';
  };
}

/**
 * Extracted claim with evidence
 */
export interface Claim {
  /** Claim ID */
  id: string;
  /** Claim statement */
  statement: string;
  /** Claim type */
  type: 'empirical' | 'theoretical' | 'methodological' | 'practical';
  /** Supporting evidence */
  evidence: Array<{
    sourceRefId: string;
    pageNumbers?: string;
    quote?: string;
    context: string;
  }>;
  /** Confidence level */
  confidence: 'high' | 'medium' | 'low';
  /** Tags for categorization */
  tags: string[];
}

/**
 * GRADE quality assessment
 */
export interface GRADEAssessment {
  /** Quality level */
  level: GRADELevel;
  /** Starting quality (based on study design) */
  startingQuality: GRADELevel;
  /** Factors that increased quality */
  ratingUp: Array<{
    factor: string;
    description: string;
  }>;
  /** Factors that decreased quality */
  ratingDown: Array<{
    factor: string;
    description: string;
  }>;
  /** Overall justification */
  justification: string;
}

/**
 * GRADE quality levels
 */
export type GRADELevel = 'HIGH' | 'MODERATE' | 'LOW' | 'VERY_LOW';

/**
 * Citation style options
 */
export type CitationStyle = 'apa' | 'bibtex' | 'chicago' | 'mla' | 'ieee';

/**
 * Citation network
 */
export interface CitationNetwork {
  /** Network nodes (papers) */
  nodes: Array<{
    refId: string;
    title: string;
    year: number;
    citationCount: number;
  }>;
  /** Network edges (citations) */
  edges: Array<{
    source: string; // citing paper refId
    target: string; // cited paper refId
    type: 'direct' | 'co-citation';
  }>;
  /** Centrality metrics */
  metrics: {
    mostCitedPapers: string[];
    mostInfluentialPapers: string[];
    clusterCenters: string[];
  };
}

/**
 * Multi-dimensional quality score
 */
export interface QualityScore {
  /** Overall quality (0-1) */
  overall: number;
  /** Dimension scores */
  dimensions: {
    methodological: number;
    evidential: number;
    transparency: number;
    reproducibility: number;
    fairCompliance: number;
  };
  /** GRADE level */
  gradeLevel: GRADELevel;
  /** Source type */
  sourceType: string;
  /** Quality notes */
  notes: string[];
}

/**
 * Aggregate quality report
 */
export interface QualityReport {
  /** Report timestamp */
  generatedAt: string;
  /** Total sources analyzed */
  totalSources: number;
  /** Distribution by GRADE level */
  gradeDistribution: Record<GRADELevel, number>;
  /** Distribution by source type */
  sourceTypeDistribution: Record<string, number>;
  /** Average quality scores */
  averageScores: {
    overall: number;
    methodological: number;
    evidential: number;
    transparency: number;
    reproducibility: number;
    fairCompliance: number;
  };
  /** Quality summary */
  summary: string;
  /** Recommendations */
  recommendations: string[];
}

/**
 * OAIS archive package
 */
export interface ArchivePackage {
  /** Package type */
  type: 'SIP' | 'AIP' | 'DIP';
  /** Package ID */
  id: string;
  /** Package path */
  path: string;
  /** Creation timestamp */
  createdAt: string;
  /** Included sources */
  sources: string[]; // refIds
  /** Manifest file path */
  manifestPath: string;
  /** Total size in bytes */
  sizeBytes: number;
  /** Checksum of entire package */
  packageChecksum: string;
}

/**
 * Integrity verification result
 */
export interface IntegrityResult {
  /** Overall integrity status */
  valid: boolean;
  /** Verification timestamp */
  verifiedAt: string;
  /** Individual file results */
  files: Array<{
    path: string;
    expectedChecksum: string;
    actualChecksum: string;
    valid: boolean;
  }>;
  /** Missing files */
  missingFiles: string[];
  /** Extra files */
  extraFiles: string[];
  /** Summary */
  summary: string;
}

/**
 * W3C PROV provenance record
 */
export interface ProvenanceRecord {
  /** Record ID */
  id: string;
  /** Timestamp */
  timestamp: string;
  /** Entity (artifact) */
  entity: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  /** Activity (operation) */
  activity: {
    id: string;
    type: string;
    startedAt: string;
    endedAt: string;
    attributes: Record<string, unknown>;
  };
  /** Agent (who/what) */
  agent: {
    id: string;
    type: string;
    attributes: Record<string, unknown>;
  };
  /** Relationships */
  relationships: {
    wasGeneratedBy?: string; // activity ID
    wasDerivedFrom?: string[]; // entity IDs
    wasAttributedTo?: string; // agent ID
    wasAssociatedWith?: string; // agent ID
  };
}

/**
 * Provenance activity
 */
export interface ProvenanceActivity {
  /** Activity type */
  type: 'acquisition' | 'transformation' | 'analysis' | 'validation';
  /** Description */
  description: string;
  /** Agent performing activity */
  agentId: string;
  /** Input entities */
  inputs: string[];
  /** Output entities */
  outputs: string[];
  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Provenance chain (lineage)
 */
export interface ProvenanceChain {
  /** Entity being traced */
  entityId: string;
  /** Chain of activities */
  activities: Array<{
    activity: ProvenanceActivity;
    timestamp: string;
    agent: string;
  }>;
  /** Source entities (leaf nodes) */
  sources: string[];
  /** Derived entities (dependent artifacts) */
  derived: string[];
}
