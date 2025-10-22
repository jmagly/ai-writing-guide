# NFR Measurement Protocols - AI Writing Guide (AIWG) Project

---
**Document Type**: Test Measurement Specification
**Project**: AI Writing Guide - SDLC Framework
**Version**: 1.0
**Status**: BASELINED
**Created**: 2025-10-19
**Phase**: Elaboration (Week 5)
**Owner**: Test Architect
**Blockers Resolved**: BLOCKER-002 (NFR Measurement Methodology Undefined)
---

## Document History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2025-10-19 | Initial baseline with measurement protocols for all 48 NFRs | Test Architect |

## Table of Contents

1. [Introduction](#1-introduction)
2. [Measurement Principles](#2-measurement-principles)
3. [NFR Category Protocols](#3-nfr-category-protocols)
   - [Performance NFRs (10 total)](#31-performance-nfrs-10-total)
   - [Throughput NFRs (3 total)](#32-throughput-nfrs-3-total)
   - [Accuracy NFRs (6 total)](#33-accuracy-nfrs-6-total)
   - [Quality NFRs (4 total)](#34-quality-nfrs-4-total)
   - [Completeness NFRs (5 total)](#35-completeness-nfrs-5-total)
   - [Security NFRs (4 total)](#36-security-nfrs-4-total)
   - [Reliability NFRs (3 total)](#37-reliability-nfrs-3-total)
   - [Usability NFRs (6 total)](#38-usability-nfrs-6-total)
   - [Data Retention NFRs (3 total)](#39-data-retention-nfrs-3-total)
   - [Freshness NFRs (1 total)](#310-freshness-nfrs-1-total)
   - [Scalability NFRs (4 total)](#311-scalability-nfrs-4-total)
4. [P0 NFR Measurement Priorities (12 NFRs)](#4-p0-nfr-measurement-priorities-12-nfrs)
5. [Data Collection and Reporting](#5-data-collection-and-reporting)
6. [Continuous Monitoring (CI/CD Integration)](#6-continuous-monitoring-cicd-integration)

---

## 1. Introduction

### 1.1 Purpose

This document defines **measurement protocols** for all 48 Non-Functional Requirements (NFRs) identified in the Supplemental Specification v1.1. These protocols resolve **BLOCKER-002** (NFR Measurement Methodology Undefined), enabling test engineers to implement automated NFR validation during Construction phase.

### 1.2 Scope

This document covers measurement methodology for:

- **Performance NFRs (10)**: Response time, workflow completion time, overhead
- **Throughput NFRs (3)**: Batch processing, parallel execution, iteration velocity
- **Accuracy NFRs (6)**: False positive rates, field accuracy, attack detection
- **Quality NFRs (4)**: Review sign-offs, traceability coverage, test coverage, template completeness
- **Completeness NFRs (5)**: Pattern database size, critical field coverage, artifact completeness, orphan detection
- **Security NFRs (4)**: Content privacy, data integrity, file permissions, backup integrity
- **Reliability NFRs (3)**: Deployment success, data preservation, rollback integrity
- **Usability NFRs (6)**: Learning curve, feedback clarity, progress visibility, setup friction, error clarity, onboarding efficiency
- **Data Retention NFRs (3)**: Validation history, audit trails, metrics retention
- **Freshness NFRs (1)**: Metrics data freshness
- **Scalability NFRs (4)**: Content size limits, concurrent agents, artifact size limits

### 1.3 Intended Audience

- **Test Engineer**: NFR test case implementation, benchmark development
- **Test Architect**: Test strategy validation, measurement methodology review
- **Developers**: Performance optimization, quality gate validation
- **CI/CD Pipeline**: Automated NFR validation, regression detection

### 1.4 Document Organization

Section 2 defines statistical standards and measurement principles applicable to all NFRs. Section 3 defines category-specific protocols for all 48 NFRs, organized by category. Section 4 prioritizes P0 NFRs for immediate implementation. Sections 5-6 define data collection, reporting, and CI/CD integration patterns.

---

## 2. Measurement Principles

### 2.1 Statistical Standards

All performance and accuracy NFRs use the following statistical methodology:

#### Response Time NFRs (Performance, Throughput)

- **Metric**: 95th percentile response time (not mean or median)
- **Rationale**: Mean is sensitive to outliers; median hides tail latency; 95th percentile captures worst-case user experience while allowing 5% variance
- **Sample Size**: Minimum 100 measurements per NFR (1000 for P0 NFRs)
- **Outlier Handling**: Remove top/bottom 2.5% before percentile calculation (excludes extreme outliers)
- **Statistical Significance**: p < 0.05 (two-tailed t-test for baseline comparisons)

**Example**:
```
NFR-PERF-001: Content Validation Time <60 seconds (95th percentile)
- Run 100 validations with 2000-word documents
- Sort measurements: [23s, 25s, ..., 58s, 62s, 180s]
- Remove top/bottom 2.5%: Exclude 5 slowest + 5 fastest
- Calculate 95th percentile: 90 measurements sorted, take 86th value
- Pass criteria: 95th percentile ≤ 60 seconds
```

#### Rate-Based NFRs (Accuracy, Security)

- **Metric**: Error rate with 95% confidence interval
- **Sample Size**: Minimum 100 measurements per NFR (1000 for P0 NFRs)
- **Pass Criteria**: Error rate < target value AND upper bound of 95% CI < target + 1%
- **Statistical Significance**: Binomial confidence interval (Wilson score method)

**Example**:
```
NFR-ACC-001: AI Pattern False Positive Rate <5%
- Validate 1000 human-written documents (ground truth: should NOT flag)
- Count false positives: 35 documents incorrectly flagged
- Error rate: 35/1000 = 3.5%
- 95% CI: [0.025, 0.048] (Wilson score interval)
- Pass criteria: Error rate <5% AND upper CI bound <6%
- Result: PASS (3.5% < 5% AND 4.8% < 6%)
```

#### Binary Validation NFRs (Security, Reliability)

- **Metric**: Binary pass/fail (100% success rate required)
- **Sample Size**: 50 test cases (malicious inputs, attack vectors, edge cases)
- **Pass Criteria**: 100% detection/success rate (zero failures allowed)

**Example**:
```
NFR-SEC-001: Content Privacy (Zero External API Calls)
- Run 100 validations with network monitoring
- Detect external API calls: 0 calls detected
- Pass criteria: 0 external API calls (100% local processing)
- Result: PASS (0/100 = 0% external calls)
```

### 2.2 Measurement Environment

All performance benchmarks use standardized environment to ensure reproducibility:

**Hardware**:
- CPU: 4 cores @ 2.5 GHz (reference: Intel Core i5-8250U or AMD Ryzen 5 3500U)
- RAM: 8GB minimum
- Disk: SSD (not HDD - HDD 10x slower, skews results)
- Network: Disconnected (local-only measurements, no network latency)

**Software**:
- OS: Ubuntu 22.04 LTS (or macOS 12+, Windows 11 with WSL2)
- Runtime: Node.js 20.x (LTS), Python 3.11+
- No background processes (close browsers, IDEs, Docker containers)

**Environment Validation**:
```bash
# Verify environment before benchmarking
node --version  # v20.x
python3 --version  # 3.11+
free -h  # 8GB+ RAM available
df -h  # SSD filesystem (not HDD)
ping -c 1 google.com && echo "FAIL: Network connected" || echo "PASS: Network disconnected"
```

### 2.3 Measurement Protocol

#### Warm-up Phase

All performance benchmarks require warm-up to eliminate cold-start bias:

- **Warm-up iterations**: 10 iterations before measurement (cache priming)
- **Purpose**: Prime filesystem cache, JIT compilation, pattern database loading
- **Discard warm-up measurements**: Do NOT include warm-up runs in percentile calculation

**Example**:
```javascript
// Performance benchmark pattern
async function benchmarkContentValidation() {
  // Warm-up phase (10 iterations)
  for (let i = 0; i < 10; i++) {
    await validateContent('fixture-2000-words.md');
  }

  // Measurement phase (100 iterations)
  const measurements = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    await validateContent('fixture-2000-words.md');
    const end = performance.now();
    measurements.push(end - start);
  }

  // Calculate 95th percentile
  const sorted = measurements.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  return { p95, measurements };
}
```

#### Repetitions

- **Standard NFRs (P1/P2)**: 100 iterations per test case
- **Critical NFRs (P0)**: 1000 iterations per test case
- **Rationale**: P0 NFRs are "make-or-break" for MVP, require higher confidence (10x sample size)

#### Timing Precision

- **Node.js**: `performance.now()` (microsecond precision)
- **Python**: `time.perf_counter()` (nanosecond precision)
- **Shell**: `date +%s%N` (nanosecond precision)
- **Resolution**: Millisecond resolution sufficient for performance NFRs (>1 second targets)

#### Data Collection

- **Raw measurements**: Store all raw measurements in `.aiwg/testing/nfr-measurements/`
- **Format**: CSV files with columns: `Test Run, Timestamp, Input Size, Measurement Value, Pass/Fail, Notes`
- **Retention**: Keep raw measurements for 12 months (support regression analysis)

---

## 3. NFR Category Protocols

### 3.1 Performance NFRs (10 total)

#### NFR-PERF-001: Content Validation Time [P0]

**Target**: <60 seconds for 2000-word documents (95th percentile)

**Measurement Protocol**:
- **Test Method**: Benchmark test with 2000-word fixture document
- **Sample Size**: 1000 iterations (P0 NFR)
- **Warm-up**: 10 iterations (cache priming)
- **Pass Criteria**: 95th percentile ≤ 60 seconds
- **Fail Criteria**: >5% of measurements >60 seconds

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-content-validation.mjs
import { validateContent } from '../../tools/writing-validator/validate.mjs';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';

async function benchmarkContentValidation() {
  const fixture = fs.readFileSync('tests/fixtures/content-2000-words.md', 'utf-8');

  // Warm-up
  for (let i = 0; i < 10; i++) {
    await validateContent(fixture);
  }

  // Measurement
  const measurements = [];
  for (let i = 0; i < 1000; i++) {
    const start = performance.now();
    await validateContent(fixture);
    const end = performance.now();
    measurements.push((end - start) / 1000); // Convert to seconds
  }

  // Calculate p95
  const sorted = measurements.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  // Store measurements
  const csv = measurements.map((m, i) =>
    `${i+1},${new Date().toISOString()},2000 words,${m.toFixed(3)} seconds,${m <= 60 ? 'PASS' : 'FAIL'},`
  ).join('\n');
  fs.writeFileSync('.aiwg/testing/nfr-measurements/perf-001-validation-time.csv',
    'Test Run,Timestamp,Input Size,Measurement Value,Pass/Fail,Notes\n' + csv);

  // Assert p95
  console.log(`NFR-PERF-001: p95 = ${p95.toFixed(2)}s (target: <60s)`);
  if (p95 > 60) throw new Error(`FAIL: p95 ${p95.toFixed(2)}s exceeds 60s target`);

  return { p95, measurements };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-001-validation-time.csv`

---

#### NFR-PERF-002: SDLC Deployment Time [P0]

**Target**: <10 seconds for 58 agents + 45 commands deployment (95th percentile)

**Measurement Protocol**:
- **Test Method**: Timed deployment execution from `aiwg -deploy-agents --mode sdlc` invocation to completion
- **Sample Size**: 1000 iterations (P0 NFR)
- **Warm-up**: 10 iterations (filesystem cache priming)
- **Pass Criteria**: 95th percentile ≤ 10 seconds
- **Fail Criteria**: >5% of measurements >10 seconds

**Test Implementation**:
```bash
#!/bin/bash
# tests/benchmarks/benchmark-deployment-time.sh

# Warm-up
for i in {1..10}; do
  rm -rf /tmp/test-project-$i
  mkdir -p /tmp/test-project-$i
  cd /tmp/test-project-$i
  aiwg -deploy-agents --mode sdlc > /dev/null 2>&1
done

# Measurement
echo "Test Run,Timestamp,Input Size,Measurement Value,Pass/Fail,Notes" > perf-002-deployment-time.csv
for i in {1..100}; do  # Use 100 for faster testing, 1000 for final validation
  rm -rf /tmp/test-project-$i
  mkdir -p /tmp/test-project-$i
  cd /tmp/test-project-$i

  start=$(date +%s%N)
  aiwg -deploy-agents --mode sdlc > /dev/null 2>&1
  end=$(date +%s%N)

  duration=$(( (end - start) / 1000000000 ))  # Convert nanoseconds to seconds
  pass=$([ $duration -le 10 ] && echo "PASS" || echo "FAIL")

  echo "$i,$(date -Iseconds),58 agents + 45 commands,$duration seconds,$pass," >> perf-002-deployment-time.csv
done

# Calculate p95
p95=$(sort -t',' -k4 -n perf-002-deployment-time.csv | tail -n +2 | tail -n 5 | head -n 1 | cut -d',' -f4)
echo "NFR-PERF-002: p95 = $p95 (target: <10s)"
```

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-002-deployment-time.csv`

---

#### NFR-PERF-003: Codebase Analysis Time [P0]

**Target**: <5 minutes for 1000-file repositories (95th percentile)

**Measurement Protocol**:
- **Test Method**: Benchmark test with 1000-file fixture repository
- **Sample Size**: 100 iterations (P0 NFR, reduced from 1000 due to long runtime)
- **Warm-up**: 5 iterations (filesystem cache priming)
- **Pass Criteria**: 95th percentile ≤ 300 seconds (5 minutes)
- **Fail Criteria**: >5% of measurements >300 seconds

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-codebase-analysis.mjs
import { execSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import fs from 'node:fs';

async function benchmarkCodebaseAnalysis() {
  const fixtureRepo = 'tests/fixtures/repos/1000-file-repo';

  // Warm-up
  for (let i = 0; i < 5; i++) {
    execSync(`node tools/agents/intake-from-codebase.mjs ${fixtureRepo}`, { stdio: 'ignore' });
  }

  // Measurement
  const measurements = [];
  for (let i = 0; i < 100; i++) {
    const start = performance.now();
    execSync(`node tools/agents/intake-from-codebase.mjs ${fixtureRepo}`, { stdio: 'ignore' });
    const end = performance.now();
    measurements.push((end - start) / 1000); // Convert to seconds
  }

  // Calculate p95
  const sorted = measurements.sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * 0.95)];

  // Store measurements
  const csv = measurements.map((m, i) =>
    `${i+1},${new Date().toISOString()},1000 files,${m.toFixed(3)} seconds,${m <= 300 ? 'PASS' : 'FAIL'},`
  ).join('\n');
  fs.writeFileSync('.aiwg/testing/nfr-measurements/perf-003-analysis-time.csv',
    'Test Run,Timestamp,Input Size,Measurement Value,Pass/Fail,Notes\n' + csv);

  // Assert p95
  console.log(`NFR-PERF-003: p95 = ${p95.toFixed(2)}s (target: <300s)`);
  if (p95 > 300) throw new Error(`FAIL: p95 ${p95.toFixed(2)}s exceeds 300s target`);

  return { p95, measurements };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-003-analysis-time.csv`

---

#### NFR-PERF-004: Multi-Agent Workflow Completion [P1]

**Target**: 15-20 minutes for SAD + reviews (wall-clock time)

**Measurement Protocol**:
- **Test Method**: End-to-end multi-agent workflow timer (orchestrator logs with timestamp deltas)
- **Sample Size**: 50 iterations (P1 NFR, reduced due to long runtime)
- **Warm-up**: 3 iterations (agent cache priming)
- **Pass Criteria**: 95th percentile ≤ 1200 seconds (20 minutes)
- **Fail Criteria**: >5% of measurements >1200 seconds OR <900 seconds (too fast suggests incomplete workflow)

**Test Implementation**: Uses mock agents to avoid Claude API costs

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-004-workflow-time.csv`

---

#### NFR-PERF-005: Traceability Validation Time [P1]

**Target**: <90 seconds for 10,000+ node graphs (95th percentile)

**Measurement Protocol**:
- **Test Method**: Graph algorithm profiler with 10,000-node fixture
- **Sample Size**: 100 iterations (P1 NFR)
- **Warm-up**: 10 iterations (graph cache priming)
- **Pass Criteria**: 95th percentile ≤ 90 seconds
- **Fail Criteria**: >5% of measurements >90 seconds

**Test Implementation**: Deferred to FID-001 (Traceability Automation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-005-traceability-time.csv`

---

#### NFR-PERF-006: Metrics Collection Overhead [P1]

**Target**: <5% performance impact (comparison: metrics enabled vs disabled)

**Measurement Protocol**:
- **Test Method**: A/B comparison (baseline run without metrics, comparison run with metrics)
- **Sample Size**: 100 iterations per condition (200 total)
- **Warm-up**: 10 iterations per condition
- **Pass Criteria**: Performance delta <5% (e.g., 100s baseline vs 105s with metrics = 5% overhead)
- **Fail Criteria**: Performance delta ≥5%

**Calculation**:
```
Overhead % = ((p95_with_metrics - p95_baseline) / p95_baseline) * 100
Pass: Overhead < 5%
```

**Test Implementation**: Deferred to FID-002 (Metrics Collection) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-006-metrics-overhead.csv`

---

#### NFR-PERF-007: Template Selection Time [P1]

**Target**: <2 minutes to recommend template pack (95th percentile)

**Measurement Protocol**:
- **Test Method**: `intake-wizard` command with timer (from invocation to recommendation display)
- **Sample Size**: 100 iterations (P1 NFR)
- **Warm-up**: 10 iterations (template cache priming)
- **Pass Criteria**: 95th percentile ≤ 120 seconds (2 minutes)
- **Fail Criteria**: >5% of measurements >120 seconds

**Test Implementation**: Deferred to FID-003 (Template Selection Guides) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-007-template-selection-time.csv`

---

#### NFR-PERF-008: Test Suite Generation Time [P2]

**Target**: <10 minutes for full test suite generation (unit + integration + E2E)

**Measurement Protocol**:
- **Test Method**: Test Engineer agent execution timer (from invocation to completion)
- **Sample Size**: 50 iterations (P2 NFR, reduced due to long runtime)
- **Warm-up**: 3 iterations (agent cache priming)
- **Pass Criteria**: 95th percentile ≤ 600 seconds (10 minutes)
- **Fail Criteria**: >5% of measurements >600 seconds

**Test Implementation**: Deferred to FID-004 (Test Template Generation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-008-test-generation-time.csv`

---

#### NFR-PERF-009: Plugin Rollback Time [P2]

**Target**: <5 seconds (95th percentile)

**Measurement Protocol**:
- **Test Method**: `performance.now()` timer with millisecond precision
- **Sample Size**: 100 iterations (P2 NFR)
- **Warm-up**: 10 iterations (filesystem cache priming)
- **Pass Criteria**: 95th percentile ≤ 5 seconds
- **Fail Criteria**: >5% of measurements >5 seconds

**Test Implementation**: Deferred to FID-005 (Plugin Rollback) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-009-rollback-time.csv`

---

#### NFR-PERF-010: Security Validation Time [P2]

**Target**: <10 seconds per plugin (95th percentile)

**Measurement Protocol**:
- **Test Method**: Security scanner profiler (from scan invocation to completion)
- **Sample Size**: 100 iterations (P2 NFR)
- **Warm-up**: 10 iterations (scanner cache priming)
- **Pass Criteria**: 95th percentile ≤ 10 seconds
- **Fail Criteria**: >5% of measurements >10 seconds

**Test Implementation**: Deferred to FID-006 Phase 3 (Plugin Security Validation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/perf-010-security-scan-time.csv`

---

### 3.2 Throughput NFRs (3 total)

#### NFR-THRU-001: Batch Validation Throughput [P2]

**Target**: 10+ files per minute (batch validation)

**Measurement Protocol**:
- **Test Method**: Batch validation timer with 10-file test set
- **Sample Size**: 100 iterations (P2 NFR)
- **Warm-up**: 10 iterations (pattern database cache priming)
- **Pass Criteria**: Throughput ≥ 10 files/minute (≤6 seconds per file average)
- **Fail Criteria**: Throughput <10 files/minute (>6 seconds per file average)

**Calculation**:
```
Throughput = (File Count * 60) / Total Time (seconds)
Example: 10 files in 55 seconds = (10 * 60) / 55 = 10.9 files/minute PASS
```

**Test Implementation**: Deferred to batch operations feature implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/thru-001-batch-throughput.csv`

---

#### NFR-THRU-002: Parallel File Validation [P2]

**Target**: 3-5 concurrent validation processes

**Measurement Protocol**:
- **Test Method**: Concurrency test with resource monitoring (CPU, memory)
- **Sample Size**: 50 iterations (P2 NFR)
- **Warm-up**: 5 iterations (process pool initialization)
- **Pass Criteria**: System supports 3+ concurrent processes without degradation (throughput ≥ 80% of sequential)
- **Fail Criteria**: System supports <3 concurrent processes OR throughput <80% of sequential

**Resource Monitoring**:
```bash
# Monitor CPU and memory during concurrent validation
top -b -n 1 | grep 'node.*validate' | wc -l  # Count concurrent Node processes
```

**Test Implementation**: Deferred to batch operations feature implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/thru-002-parallel-concurrency.csv`

---

#### NFR-THRU-003: Iteration Velocity [P2]

**Target**: 1-2 week iteration cycle time (10 business days maximum)

**Measurement Protocol**:
- **Test Method**: Iteration planning to retrospective duration tracking
- **Sample Size**: Manual tracking over 10 iterations
- **Pass Criteria**: Average iteration duration ≤14 days (2 weeks)
- **Fail Criteria**: Average iteration duration >14 days

**Measurement**:
```csv
Iteration,Start Date,End Date,Duration (days),Pass/Fail
1,2025-10-20,2025-10-30,10,PASS
2,2025-10-31,2025-11-12,12,PASS
3,2025-11-13,2025-11-28,15,FAIL (exceeded 14 days)
```

**Test Implementation**: Manual process observation (not automated)

**Data Storage**: `.aiwg/testing/nfr-measurements/thru-003-iteration-velocity.csv`

---

### 3.3 Accuracy NFRs (6 total)

#### NFR-ACC-001: AI Pattern False Positive Rate [P0]

**Target**: <5% false positive rate

**Measurement Protocol**:
- **Test Method**: Statistical validation with 1000-document corpus (500 AI-generated, 500 human-written)
- **Sample Size**: 1000 documents (P0 NFR requires large ground truth corpus)
- **Pass Criteria**: False positive rate <5% AND upper bound of 95% CI <6%
- **Fail Criteria**: False positive rate ≥5% OR upper CI bound ≥6%

**Ground Truth Corpus**:
- **Phase 1 (Elaboration)**: Small corpus (100 documents, 50 AI + 50 human)
- **Phase 2 (Construction)**: Expand corpus (500 documents, 250 AI + 250 human)
- **Phase 3 (Transition)**: Full corpus (1000 documents, 500 AI + 500 human)

**Confusion Matrix**:
```
                  Predicted Positive   Predicted Negative
Actual Positive   True Positive (TP)   False Negative (FN)
Actual Negative   False Positive (FP)  True Negative (TN)

False Positive Rate = FP / (FP + TN)
Target: FP / 500 < 0.05 (max 25 false positives)
```

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-pattern-accuracy.mjs
async function benchmarkPatternAccuracy() {
  const humanDocs = loadGroundTruthCorpus('human-written', 500);
  const aiDocs = loadGroundTruthCorpus('ai-generated', 500);

  let falsePositives = 0;
  let falseNegatives = 0;

  // Test human-written documents (should NOT flag)
  for (const doc of humanDocs) {
    const result = await validateContent(doc);
    if (result.patterns.length > 0) falsePositives++;
  }

  // Test AI-generated documents (SHOULD flag)
  for (const doc of aiDocs) {
    const result = await validateContent(doc);
    if (result.patterns.length === 0) falseNegatives++;
  }

  const falsePositiveRate = falsePositives / 500;
  const falseNegativeRate = falseNegatives / 500;

  // Calculate 95% confidence interval (Wilson score)
  const ci = wilsonConfidenceInterval(falsePositives, 500, 0.95);

  console.log(`False Positive Rate: ${(falsePositiveRate * 100).toFixed(2)}% (95% CI: [${(ci.lower * 100).toFixed(2)}%, ${(ci.upper * 100).toFixed(2)}%])`);
  console.log(`False Negative Rate: ${(falseNegativeRate * 100).toFixed(2)}%`);

  // Assert pass criteria
  if (falsePositiveRate >= 0.05) throw new Error(`FAIL: False positive rate ${(falsePositiveRate * 100).toFixed(2)}% exceeds 5% target`);
  if (ci.upper >= 0.06) throw new Error(`FAIL: Upper CI bound ${(ci.upper * 100).toFixed(2)}% exceeds 6% threshold`);

  return { falsePositiveRate, falseNegativeRate, ci };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-001-false-positives.csv`

---

#### NFR-ACC-002: Intake Field Accuracy [P0]

**Target**: 80-90% field accuracy (user edits <20%)

**Measurement Protocol**:
- **Test Method**: User study with 100 codebases, track field edit rate (fields changed / total fields)
- **Sample Size**: 100 codebases (P0 NFR)
- **Pass Criteria**: Field accuracy ≥80% (user edits ≤20%)
- **Fail Criteria**: Field accuracy <80% (user edits >20%)

**Proxy Metric for Automated Testing**:
- **Measure**: Field completeness (% fields populated) as proxy for accuracy
- **Target**: 95% field completeness (critical fields: name, tech stack, language)

**Calculation**:
```
Field Accuracy = 1 - (Fields Edited / Total Fields)
Example: 5 fields edited out of 25 total = 1 - (5/25) = 80% accuracy PASS
```

**Test Implementation**: Manual user acceptance testing (UAT) deferred to Transition phase

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-002-intake-accuracy.csv`

---

#### NFR-ACC-003: Automated Traceability Accuracy [P2]

**Target**: 99% accuracy (comparison with manual traceability matrix)

**Measurement Protocol**:
- **Test Method**: Ground truth comparison (automated CSV vs manual CSV), diff tool
- **Sample Size**: 50 sample projects (P2 NFR)
- **Pass Criteria**: Accuracy ≥99% (max 1% errors)
- **Fail Criteria**: Accuracy <99%

**Ground Truth Strategy**:
- Create manual traceability matrices for 5 sample projects (Elaboration)
- Expand to 20 sample projects (Construction)
- Validate against 50 sample projects (Transition)

**Calculation**:
```
Accuracy = (Matching Links / Total Links) * 100
Example: 495 matching links out of 500 total = 99% accuracy PASS
```

**Test Implementation**: Deferred to FID-001 (Traceability Automation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-003-traceability-accuracy.csv`

---

#### NFR-ACC-004: Template Recommendation Acceptance [P2]

**Target**: 85% user acceptance rate (users accept recommended template vs choosing different template)

**Measurement Protocol**:
- **Test Method**: A/B testing, track user choices (accept recommendation = 1, reject = 0)
- **Sample Size**: 100 users (P2 NFR)
- **Pass Criteria**: Acceptance rate ≥85%
- **Fail Criteria**: Acceptance rate <85%

**Proxy Metric for Automated Testing**:
- **Measure**: Template diversity (% templates recommended vs always same template)
- **Target**: Recommend 3+ different templates across 10 test cases (avoid single-template bias)

**Calculation**:
```
Acceptance Rate = (Accepted Recommendations / Total Recommendations) * 100
Example: 87 users accept recommendation out of 100 total = 87% acceptance PASS
```

**Test Implementation**: Manual user acceptance testing (UAT) deferred to Transition phase

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-004-recommendation-acceptance.csv`

---

#### NFR-ACC-005: Security Attack Detection [P0]

**Target**: 100% detection rate for known attack vectors

**Measurement Protocol**:
- **Test Method**: Security test suite with 50 known attack patterns (code injection, path traversal, XSS, etc.)
- **Sample Size**: 50 attack patterns (P0 NFR)
- **Pass Criteria**: 100% detection rate (all 50 attacks detected)
- **Fail Criteria**: <100% detection rate (any attack missed)

**Attack Vector Database**:
- Code injection: `eval()`, `Function()` constructor
- Path traversal: `../../../etc/passwd`
- XSS: `document.write()` with unsanitized input
- Arbitrary file access: `fs.readFile()` with user input
- Network exfiltration: `http.get()` to external domain

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-attack-detection.mjs
async function benchmarkAttackDetection() {
  const attackVectors = loadAttackDatabase(50);

  let detected = 0;
  let missed = 0;

  for (const attack of attackVectors) {
    const result = await scanPluginSecurity(attack.code);
    if (result.threats.length > 0) {
      detected++;
    } else {
      missed++;
      console.error(`MISSED ATTACK: ${attack.name} - ${attack.description}`);
    }
  }

  const detectionRate = detected / 50;

  console.log(`Detection Rate: ${(detectionRate * 100).toFixed(2)}% (${detected}/50 attacks detected)`);

  // Assert 100% detection
  if (detectionRate < 1.0) throw new Error(`FAIL: Detection rate ${(detectionRate * 100).toFixed(2)}% below 100% target (${missed} attacks missed)`);

  return { detectionRate, detected, missed };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-005-attack-detection.csv`

---

#### NFR-ACC-006: Security Validation False Positives [P2]

**Target**: <5% false positive rate

**Measurement Protocol**:
- **Test Method**: Statistical validation with 1000 legitimate plugins
- **Sample Size**: 1000 legitimate plugins (P2 NFR)
- **Pass Criteria**: False positive rate <5% AND upper bound of 95% CI <6%
- **Fail Criteria**: False positive rate ≥5% OR upper CI bound ≥6%

**Ground Truth Strategy**:
- Curate corpus of 100 legitimate plugins (Elaboration)
- Expand to 500 legitimate plugins (Construction)
- Validate against 1000 legitimate plugins (Transition)

**Calculation**: Same as NFR-ACC-001 (confusion matrix, Wilson confidence interval)

**Test Implementation**: Deferred to FID-006 Phase 3 (Plugin Security Validation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/acc-006-security-false-positives.csv`

---

### 3.4 Quality NFRs (4 total)

#### NFR-QUAL-001: Multi-Agent Reviewer Sign-offs [P1]

**Target**: 3+ specialized reviewers per artifact

**Measurement Protocol**:
- **Test Method**: Review history inspection (count reviewers per artifact)
- **Sample Size**: 50 artifacts (P1 NFR)
- **Pass Criteria**: 100% of artifacts have 3+ reviewers
- **Fail Criteria**: Any artifact with <3 reviewers

**Review Roles**:
- Security Architect (security validation)
- Test Architect (testability review)
- Requirements Analyst (requirements traceability)
- Technical Writer (clarity and consistency)

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-review-sign-offs.mjs
async function benchmarkReviewSignOffs() {
  const artifacts = loadArtifacts('.aiwg/working/*/drafts/*.md');

  let passCount = 0;
  let failCount = 0;

  for (const artifact of artifacts) {
    const reviews = loadReviews(artifact);
    const reviewerCount = reviews.length;

    if (reviewerCount >= 3) {
      passCount++;
    } else {
      failCount++;
      console.error(`FAIL: ${artifact} has only ${reviewerCount} reviewers (need 3+)`);
    }
  }

  const coverage = passCount / artifacts.length;

  console.log(`Review Coverage: ${(coverage * 100).toFixed(2)}% (${passCount}/${artifacts.length} artifacts with 3+ reviewers)`);

  // Assert 100% coverage
  if (coverage < 1.0) throw new Error(`FAIL: ${failCount} artifacts lack 3+ reviewers`);

  return { coverage, passCount, failCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/qual-001-reviewer-sign-offs.csv`

---

#### NFR-QUAL-002: Requirements Traceability Coverage [P1]

**Target**: 100% requirements coverage (all requirements trace to code + tests)

**Measurement Protocol**:
- **Test Method**: Traceability matrix validation (requirements → code → tests)
- **Sample Size**: All requirements in project (100-200 requirements typical)
- **Pass Criteria**: 100% coverage (no orphaned requirements)
- **Fail Criteria**: Any orphaned requirements (no code or test coverage)

**Orphan Detection**:
```javascript
// Detect orphaned requirements
const orphanedRequirements = requirements.filter(req =>
  !hasCodeImplementation(req) || !hasTestCoverage(req)
);
```

**Test Implementation**: Deferred to FID-001 (Traceability Automation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/qual-002-traceability-coverage.csv`

---

#### NFR-QUAL-003: Test Coverage Targets [P1]

**Target**: 80% unit coverage, 70% integration coverage, 50% E2E coverage

**Measurement Protocol**:
- **Test Method**: Code coverage tools (Istanbul/NYC for Node.js, pytest-cov for Python)
- **Sample Size**: Full codebase scan
- **Pass Criteria**: Unit ≥80%, Integration ≥70%, E2E ≥50%
- **Fail Criteria**: Any coverage type below target

**Measurement**:
```bash
# Node.js code coverage
npx c8 --reporter=text --reporter=json npm test

# Python code coverage
pytest --cov=. --cov-report=term --cov-report=json

# Parse coverage report
cat coverage/coverage-summary.json | jq '.total.lines.pct'
```

**Test Implementation**: CI/CD integration with coverage enforcement

**Data Storage**: `.aiwg/testing/nfr-measurements/qual-003-test-coverage.csv`

---

#### NFR-QUAL-004: Test Template Completeness [P1]

**Target**: All test types covered (unit, integration, E2E, performance, security)

**Measurement Protocol**:
- **Test Method**: Template catalog inspection (verify all test types present)
- **Sample Size**: 5 test types
- **Pass Criteria**: All 5 test types have templates
- **Fail Criteria**: Any test type missing template

**Template Checklist**:
- [ ] Unit test template
- [ ] Integration test template
- [ ] E2E test template
- [ ] Performance test template
- [ ] Security test template

**Test Implementation**:
```bash
# Verify template existence
test -f templates/test/unit-test-template.md && echo "Unit: PASS" || echo "Unit: FAIL"
test -f templates/test/integration-test-template.md && echo "Integration: PASS" || echo "Integration: FAIL"
test -f templates/test/e2e-test-template.md && echo "E2E: PASS" || echo "E2E: FAIL"
test -f templates/test/performance-test-template.md && echo "Performance: PASS" || echo "Performance: FAIL"
test -f templates/test/security-test-template.md && echo "Security: PASS" || echo "Security: FAIL"
```

**Data Storage**: `.aiwg/testing/nfr-measurements/qual-004-template-completeness.csv`

---

### 3.5 Completeness NFRs (5 total)

#### NFR-COMP-001: AI Pattern Database Size [P1]

**Target**: 1000+ patterns

**Measurement Protocol**:
- **Test Method**: Pattern database file count (YAML files in validation/banned-patterns.md)
- **Sample Size**: Single measurement (pattern count)
- **Pass Criteria**: Pattern count ≥1000
- **Fail Criteria**: Pattern count <1000

**Measurement**:
```bash
# Count patterns in banned-patterns.md
grep -c '^- Pattern:' validation/banned-patterns.md
```

**Test Implementation**: Automated pattern count validation

**Data Storage**: `.aiwg/testing/nfr-measurements/comp-001-pattern-count.csv`

---

#### NFR-COMP-002: Intake Critical Field Coverage [P1]

**Target**: 100% critical field coverage (name, tech stack, language, team size, domain)

**Measurement Protocol**:
- **Test Method**: Intake form validation (verify all critical fields populated)
- **Sample Size**: 100 intake forms (P1 NFR)
- **Pass Criteria**: 100% of intake forms have all 5 critical fields populated
- **Fail Criteria**: Any intake form missing critical fields

**Critical Fields**:
1. Project name
2. Tech stack
3. Primary language
4. Team size
5. Domain

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-intake-completeness.mjs
async function benchmarkIntakeCompleteness() {
  const intakeForms = loadIntakeForms('.aiwg/intake/*.md');

  let completeCount = 0;
  let incompleteCount = 0;

  for (const form of intakeForms) {
    const criticalFields = ['name', 'tech_stack', 'language', 'team_size', 'domain'];
    const missingFields = criticalFields.filter(field => !form[field]);

    if (missingFields.length === 0) {
      completeCount++;
    } else {
      incompleteCount++;
      console.error(`FAIL: ${form.path} missing fields: ${missingFields.join(', ')}`);
    }
  }

  const completeness = completeCount / intakeForms.length;

  console.log(`Critical Field Coverage: ${(completeness * 100).toFixed(2)}% (${completeCount}/${intakeForms.length} forms complete)`);

  // Assert 100% completeness
  if (completeness < 1.0) throw new Error(`FAIL: ${incompleteCount} forms missing critical fields`);

  return { completeness, completeCount, incompleteCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/comp-002-critical-field-coverage.csv`

---

#### NFR-COMP-003: SDLC Artifact Completeness [P1]

**Target**: 100% artifact completeness for all features

**Measurement Protocol**:
- **Test Method**: Artifact section validation (verify all required sections present)
- **Sample Size**: All SDLC artifacts in `.aiwg/` directories
- **Pass Criteria**: 100% of artifacts have all required sections
- **Fail Criteria**: Any artifact missing required sections

**Required Sections** (example for iteration plan):
- Overview
- Discovery Track
- Delivery Track
- Retrospective
- Metrics

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-artifact-completeness.mjs
async function benchmarkArtifactCompleteness() {
  const artifacts = loadArtifacts('.aiwg/**/*.md');

  let completeCount = 0;
  let incompleteCount = 0;

  for (const artifact of artifacts) {
    const template = loadTemplate(artifact.type);
    const missingSections = template.sections.filter(section => !artifact.hasSect(section));

    if (missingSections.length === 0) {
      completeCount++;
    } else {
      incompleteCount++;
      console.error(`FAIL: ${artifact.path} missing sections: ${missingSections.join(', ')}`);
    }
  }

  const completeness = completeCount / artifacts.length;

  console.log(`Artifact Completeness: ${(completeness * 100).toFixed(2)}% (${completeCount}/${artifacts.length} artifacts complete)`);

  // Assert 100% completeness
  if (completeness < 1.0) throw new Error(`FAIL: ${incompleteCount} artifacts missing sections`);

  return { completeness, completeCount, incompleteCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/comp-003-artifact-completeness.csv`

---

#### NFR-COMP-004: Orphan Artifact Detection [P1]

**Target**: 100% orphan detection (all orphaned nodes flagged)

**Measurement Protocol**:
- **Test Method**: Graph traversal (detect nodes with no incoming/outgoing edges)
- **Sample Size**: All traceability graph nodes
- **Pass Criteria**: 100% orphan detection (no orphaned nodes missed)
- **Fail Criteria**: Any orphaned nodes undetected

**Orphan Types**:
- Orphaned requirements (no code implementation)
- Orphaned code (no requirement justification)
- Orphaned tests (no code coverage)

**Test Implementation**: Deferred to FID-001 (Traceability Automation) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/comp-004-orphan-detection.csv`

---

#### NFR-COMP-005: Orphan Files After Rollback [P2]

**Target**: Zero orphan files after rollback

**Measurement Protocol**:
- **Test Method**: Filesystem scan (compare before rollback vs after rollback)
- **Sample Size**: 100 rollback operations (P2 NFR)
- **Pass Criteria**: Zero orphan files (100% clean recovery)
- **Fail Criteria**: Any orphan files remaining

**Measurement**:
```bash
# Count files before installation
before_count=$(find .claude/ -type f | wc -l)

# Install plugin
aiwg -deploy-agents --mode plugin

# Count files after installation
after_count=$(find .claude/ -type f | wc -l)

# Rollback
aiwg -rollback

# Count files after rollback
final_count=$(find .claude/ -type f | wc -l)

# Assert no orphans
if [ $final_count -ne $before_count ]; then
  echo "FAIL: Orphan files detected (before: $before_count, after: $final_count)"
else
  echo "PASS: Clean rollback (no orphan files)"
fi
```

**Test Implementation**: Deferred to FID-005 (Plugin Rollback) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/comp-005-orphan-files.csv`

---

### 3.6 Security NFRs (4 total)

#### NFR-SEC-001: Content Privacy (No External API Calls) [P0]

**Target**: Zero external API calls during validation workflow

**Measurement Protocol**:
- **Test Method**: Network traffic monitoring (verify no outbound HTTP/HTTPS calls)
- **Sample Size**: 1000 validations (P0 NFR)
- **Pass Criteria**: Zero external API calls detected (100% local processing)
- **Fail Criteria**: Any external API call detected

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-content-privacy.mjs
import nock from 'nock';

async function benchmarkContentPrivacy() {
  // Disallow all external HTTP calls
  nock.disableNetConnect();

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < 1000; i++) {
    try {
      await validateContent('tests/fixtures/content-2000-words.md');
      passCount++;
    } catch (error) {
      if (error.message.includes('Nock: Disallowed net connect')) {
        failCount++;
        console.error(`FAIL: External API call detected during validation #${i+1}`);
      } else {
        throw error;
      }
    }
  }

  const privacyRate = passCount / 1000;

  console.log(`Content Privacy: ${(privacyRate * 100).toFixed(2)}% (${passCount}/1000 validations local-only)`);

  // Assert 100% local processing
  if (privacyRate < 1.0) throw new Error(`FAIL: ${failCount} validations made external API calls`);

  // Re-enable network for other tests
  nock.enableNetConnect();

  return { privacyRate, passCount, failCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/sec-001-network-trace.log`

---

#### NFR-SEC-002: Pattern Database Integrity [P1]

**Target**: SHA-256 checksum validation before pattern database load

**Measurement Protocol**:
- **Test Method**: Checksum verification (compute SHA-256, compare with expected value)
- **Sample Size**: 100 database loads (P1 NFR)
- **Pass Criteria**: 100% checksum validation (all loads verify integrity)
- **Fail Criteria**: Any checksum mismatch (tampered database)

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-database-integrity.mjs
import crypto from 'node:crypto';
import fs from 'node:fs';

async function benchmarkDatabaseIntegrity() {
  const expectedChecksum = loadExpectedChecksum('manifests/pattern-database.sha256');

  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < 100; i++) {
    const databaseContent = fs.readFileSync('validation/banned-patterns.md', 'utf-8');
    const actualChecksum = crypto.createHash('sha256').update(databaseContent).digest('hex');

    if (actualChecksum === expectedChecksum) {
      passCount++;
    } else {
      failCount++;
      console.error(`FAIL: Checksum mismatch (expected: ${expectedChecksum}, actual: ${actualChecksum})`);
    }
  }

  const integrityRate = passCount / 100;

  console.log(`Database Integrity: ${(integrityRate * 100).toFixed(2)}% (${passCount}/100 validations passed)`);

  // Assert 100% integrity
  if (integrityRate < 1.0) throw new Error(`FAIL: ${failCount} validations detected tampering`);

  return { integrityRate, passCount, failCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/sec-002-database-checksums.csv`

---

#### NFR-SEC-003: File Permissions Security [P0]

**Target**: Deployed file permissions match source permissions (no privilege escalation)

**Measurement Protocol**:
- **Test Method**: File permission comparison (before vs after deployment)
- **Sample Size**: 1000 deployments (P0 NFR)
- **Pass Criteria**: 100% permission match (no privilege escalation)
- **Fail Criteria**: Any permission mismatch

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-file-permissions.mjs
import fs from 'node:fs';

async function benchmarkFilePermissions() {
  let passCount = 0;
  let failCount = 0;

  for (let i = 0; i < 1000; i++) {
    // Get source file permissions
    const sourceStat = fs.statSync('agents/architecture-designer.md');
    const sourceMode = sourceStat.mode;

    // Deploy agents
    await deployAgents('/tmp/test-project');

    // Get deployed file permissions
    const deployedStat = fs.statSync('/tmp/test-project/.claude/agents/architecture-designer.md');
    const deployedMode = deployedStat.mode;

    if (sourceMode === deployedMode) {
      passCount++;
    } else {
      failCount++;
      console.error(`FAIL: Permission mismatch (source: ${sourceMode.toString(8)}, deployed: ${deployedMode.toString(8)})`);
    }
  }

  const securityRate = passCount / 1000;

  console.log(`File Permissions Security: ${(securityRate * 100).toFixed(2)}% (${passCount}/1000 deployments matched permissions)`);

  // Assert 100% match
  if (securityRate < 1.0) throw new Error(`FAIL: ${failCount} deployments had permission mismatches`);

  return { securityRate, passCount, failCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/sec-003-file-permissions.csv`

---

#### NFR-SEC-004: Backup Integrity [P1]

**Target**: SHA-256 checksum validation before rollback restoration

**Measurement Protocol**:
- **Test Method**: Checksum verification (compute SHA-256, compare with expected value)
- **Sample Size**: 100 rollback operations (P1 NFR)
- **Pass Criteria**: 100% checksum validation (all restorations verify integrity)
- **Fail Criteria**: Any checksum mismatch (corrupted backup)

**Test Implementation**: Similar to NFR-SEC-002 (database integrity), deferred to FID-005 (Plugin Rollback) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/sec-004-backup-checksums.csv`

---

### 3.7 Reliability NFRs (3 total)

#### NFR-REL-001: Deployment Success Rate [P2]

**Target**: 100% deployment success rate (zero partial deployments)

**Measurement Protocol**:
- **Test Method**: Deployment validation (verify all files copied, no missing files)
- **Sample Size**: 100 deployments (P2 NFR)
- **Pass Criteria**: 100% success rate (all files deployed)
- **Fail Criteria**: Any partial deployment (missing files)

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-deployment-success.mjs
async function benchmarkDeploymentSuccess() {
  const expectedFiles = loadManifest('agents/manifest.json').files;

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < 100; i++) {
    await deployAgents('/tmp/test-project');

    const deployedFiles = fs.readdirSync('/tmp/test-project/.claude/agents');
    const missingFiles = expectedFiles.filter(f => !deployedFiles.includes(f));

    if (missingFiles.length === 0) {
      successCount++;
    } else {
      failureCount++;
      console.error(`FAIL: Partial deployment detected (missing ${missingFiles.length} files)`);
    }
  }

  const successRate = successCount / 100;

  console.log(`Deployment Success Rate: ${(successRate * 100).toFixed(2)}% (${successCount}/100 deployments complete)`);

  // Assert 100% success
  if (successRate < 1.0) throw new Error(`FAIL: ${failureCount} partial deployments detected`);

  return { successRate, successCount, failureCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/rel-001-deployment-success.csv`

---

#### NFR-REL-002: Data Preservation During Updates [P2]

**Target**: Zero data loss during CLAUDE.md updates

**Measurement Protocol**:
- **Test Method**: Content comparison (before vs after update)
- **Sample Size**: 100 updates (P2 NFR)
- **Pass Criteria**: 100% data preservation (no content loss)
- **Fail Criteria**: Any data loss detected

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-data-preservation.mjs
async function benchmarkDataPreservation() {
  let preservationCount = 0;
  let lossCount = 0;

  for (let i = 0; i < 100; i++) {
    const beforeContent = fs.readFileSync('CLAUDE.md', 'utf-8');
    const beforeLength = beforeContent.length;

    await updateClaudeMd('CLAUDE.md', 'Add AIWG orchestration section');

    const afterContent = fs.readFileSync('CLAUDE.md', 'utf-8');
    const afterLength = afterContent.length;

    if (afterLength >= beforeLength && afterContent.includes(beforeContent)) {
      preservationCount++;
    } else {
      lossCount++;
      console.error(`FAIL: Data loss detected (before: ${beforeLength} chars, after: ${afterLength} chars)`);
    }
  }

  const preservationRate = preservationCount / 100;

  console.log(`Data Preservation Rate: ${(preservationRate * 100).toFixed(2)}% (${preservationCount}/100 updates preserved content)`);

  // Assert 100% preservation
  if (preservationRate < 1.0) throw new Error(`FAIL: ${lossCount} updates lost data`);

  return { preservationRate, preservationCount, lossCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/rel-002-data-preservation.csv`

---

#### NFR-REL-003: Rollback State Restoration [P2]

**Target**: 100% state restoration (all changes reverted)

**Measurement Protocol**:
- **Test Method**: State comparison (before installation vs after rollback)
- **Sample Size**: 100 rollback operations (P2 NFR)
- **Pass Criteria**: 100% state restoration (complete recovery)
- **Fail Criteria**: Any state mismatch

**Test Implementation**: Similar to NFR-REL-001 (deployment success), deferred to FID-005 (Plugin Rollback) implementation

**Data Storage**: `.aiwg/testing/nfr-measurements/rel-003-rollback-restoration.csv`

---

### 3.8 Usability NFRs (6 total)

#### NFR-USE-001: AI Validation Learning Curve [P0]

**Target**: 1-2 validation cycles to internalize feedback patterns

**Measurement Protocol**:
- **Test Method**: User study with 10 new users, observe task completion improvement
- **Sample Size**: 10 users (P0 NFR)
- **Pass Criteria**: 80% of users internalize feedback after 2 cycles
- **Fail Criteria**: <80% of users internalize feedback after 2 cycles

**Proxy Metric for Automated Testing**:
- **Measure**: Feedback consistency (same pattern flagged consistently across documents)
- **Target**: 95% consistency (pattern X always flagged in all documents)

**Test Implementation**: Manual user acceptance testing (UAT) deferred to Transition phase

**Data Storage**: `.aiwg/testing/nfr-measurements/use-001-learning-curve.csv`

---

#### NFR-USE-002: Validation Feedback Clarity [P1]

**Target**: 100% of feedback includes line numbers and specific rewrite suggestions

**Measurement Protocol**:
- **Test Method**: Feedback message inspection (regex validation)
- **Sample Size**: 100 validation runs (P1 NFR)
- **Pass Criteria**: 100% of feedback includes line numbers AND rewrite suggestions
- **Fail Criteria**: Any feedback missing line numbers OR rewrite suggestions

**Feedback Format Regex**:
```regex
/^Line \d+: .* detected - ".*"\nSuggestion: .*$/
```

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-feedback-clarity.mjs
async function benchmarkFeedbackClarity() {
  let clarityCount = 0;
  let unclearCount = 0;

  for (let i = 0; i < 100; i++) {
    const result = await validateContent('tests/fixtures/content-2000-words.md');

    for (const feedback of result.feedbackMessages) {
      if (/^Line \d+:/.test(feedback) && feedback.includes('Suggestion:')) {
        clarityCount++;
      } else {
        unclearCount++;
        console.error(`FAIL: Unclear feedback - ${feedback}`);
      }
    }
  }

  const clarityRate = clarityCount / (clarityCount + unclearCount);

  console.log(`Feedback Clarity: ${(clarityRate * 100).toFixed(2)}% (${clarityCount}/${clarityCount + unclearCount} messages clear)`);

  // Assert 100% clarity
  if (clarityRate < 1.0) throw new Error(`FAIL: ${unclearCount} feedback messages unclear`);

  return { clarityRate, clarityCount, unclearCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/use-002-feedback-clarity.csv`

---

#### NFR-USE-003: Progress Visibility (Real-time Score Updates) [P1]

**Target**: Score updates visible after each file validation (not batched)

**Measurement Protocol**:
- **Test Method**: UI inspection (manual testing)
- **Sample Size**: 10 batch validations (P1 NFR)
- **Pass Criteria**: Score updates visible after each file (real-time)
- **Fail Criteria**: Score updates batched (only at end)

**Test Implementation**: Manual UI inspection (requires UI testing framework), deferred to Construction phase (when UI implemented)

**Data Storage**: `.aiwg/testing/nfr-measurements/use-003-progress-visibility.csv`

---

#### NFR-USE-004: First-Time Setup Friction [P0]

**Target**: <15 minutes from install to first artifact (80% of users)

**Measurement Protocol**:
- **Test Method**: Timed user study with 10 new users, task completion observation
- **Sample Size**: 10 users (P0 NFR)
- **Pass Criteria**: 8/10 users (80%) complete setup in ≤15 minutes
- **Fail Criteria**: <8/10 users (60%) complete setup in ≤15 minutes

**Test Implementation**: Manual user acceptance testing (UAT) deferred to Transition phase

**Data Storage**: `.aiwg/testing/nfr-measurements/use-004-setup-friction.csv`

---

#### NFR-USE-005: Error Message Clarity [P0]

**Target**: 100% of error messages include clear remediation steps

**Measurement Protocol**:
- **Test Method**: Error message inspection (regex validation)
- **Sample Size**: 100 error scenarios (P0 NFR)
- **Pass Criteria**: 100% of error messages include remediation steps
- **Fail Criteria**: Any error message missing remediation steps

**Error Message Format**:
```
ERROR: <problem description>
REMEDIATION: <specific action to fix>
```

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-error-clarity.mjs
async function benchmarkErrorClarity() {
  const errorScenarios = loadErrorScenarios(100);

  let clarityCount = 0;
  let unclearCount = 0;

  for (const scenario of errorScenarios) {
    try {
      await scenario.trigger();
    } catch (error) {
      if (error.message.includes('REMEDIATION:')) {
        clarityCount++;
      } else {
        unclearCount++;
        console.error(`FAIL: Unclear error - ${error.message}`);
      }
    }
  }

  const clarityRate = clarityCount / 100;

  console.log(`Error Clarity: ${(clarityRate * 100).toFixed(2)}% (${clarityCount}/100 errors clear)`);

  // Assert 100% clarity
  if (clarityRate < 1.0) throw new Error(`FAIL: ${unclearCount} errors missing remediation`);

  return { clarityRate, clarityCount, unclearCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/use-005-error-clarity.csv`

---

#### NFR-USE-006: Onboarding Reduction [P2]

**Target**: 50% time savings vs manual template selection

**Measurement Protocol**:
- **Test Method**: A/B comparison (template selection with vs without AIWG)
- **Sample Size**: 20 users (10 AIWG, 10 manual control group)
- **Pass Criteria**: AIWG onboarding time <50% of manual onboarding time
- **Fail Criteria**: AIWG onboarding time ≥50% of manual onboarding time

**Calculation**:
```
Time Savings = 1 - (AIWG Time / Manual Time)
Example: AIWG 7 minutes, Manual 15 minutes = 1 - (7/15) = 53% savings PASS
```

**Test Implementation**: Manual user acceptance testing (UAT) deferred to Transition phase

**Data Storage**: `.aiwg/testing/nfr-measurements/use-006-onboarding-reduction.csv`

---

### 3.9 Data Retention NFRs (3 total)

#### NFR-DATA-001: Validation History Retention [P2]

**Target**: 30-day retention for validation history

**Measurement Protocol**:
- **Test Method**: File age validation (check oldest validation history file)
- **Sample Size**: Daily checks for 30 days
- **Pass Criteria**: Validation history files retained for 30+ days
- **Fail Criteria**: Validation history files deleted before 30 days

**Test Implementation**:
```bash
# Check oldest validation history file
oldest_file=$(ls -t .aiwg/testing/nfr-measurements/perf-001-validation-time.csv | tail -1)
file_age_days=$(( ($(date +%s) - $(stat -c %Y $oldest_file)) / 86400 ))

if [ $file_age_days -ge 30 ]; then
  echo "PASS: Validation history retained for $file_age_days days"
else
  echo "FAIL: Validation history only $file_age_days days old (need 30+)"
fi
```

**Data Storage**: `.aiwg/testing/nfr-measurements/data-001-retention-validation.csv`

---

#### NFR-DATA-002: Audit Trail Retention [P2]

**Target**: Permanent retention for multi-agent review history

**Measurement Protocol**:
- **Test Method**: Review history inspection (verify all reviews preserved)
- **Sample Size**: All artifacts in `.aiwg/working/` directories
- **Pass Criteria**: 100% of review history preserved (no deletions)
- **Fail Criteria**: Any review history deleted

**Test Implementation**:
```bash
# Count review files
review_count=$(find .aiwg/working/*/reviews/ -name '*.md' | wc -l)
echo "Review History Files: $review_count (permanent retention)"
```

**Data Storage**: `.aiwg/testing/nfr-measurements/data-002-audit-trail.csv`

---

#### NFR-DATA-003: Metrics Retention [P2]

**Target**: 12-month retention for historical metrics

**Measurement Protocol**:
- **Test Method**: File age validation (check oldest metrics file)
- **Sample Size**: Monthly checks for 12 months
- **Pass Criteria**: Metrics files retained for 12+ months
- **Fail Criteria**: Metrics files deleted before 12 months

**Test Implementation**: Similar to NFR-DATA-001 (validation history retention)

**Data Storage**: `.aiwg/testing/nfr-measurements/data-003-metrics-retention.csv`

---

### 3.10 Freshness NFRs (1 total)

#### NFR-FRESH-001: Metrics Data Freshness [P2]

**Target**: Real-time metric updates (no staleness)

**Measurement Protocol**:
- **Test Method**: Timestamp validation (verify metrics updated within last minute)
- **Sample Size**: 100 metric queries (P2 NFR)
- **Pass Criteria**: 100% of metrics updated within last 60 seconds
- **Fail Criteria**: Any metrics stale (>60 seconds old)

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-metrics-freshness.mjs
async function benchmarkMetricsFreshness() {
  let freshCount = 0;
  let staleCount = 0;

  for (let i = 0; i < 100; i++) {
    const metrics = await loadMetrics('.aiwg/metrics/velocity-history.csv');
    const latestTimestamp = new Date(metrics[metrics.length - 1].timestamp);
    const now = new Date();
    const ageSeconds = (now - latestTimestamp) / 1000;

    if (ageSeconds <= 60) {
      freshCount++;
    } else {
      staleCount++;
      console.error(`FAIL: Metrics stale (age: ${ageSeconds.toFixed(0)} seconds)`);
    }
  }

  const freshnessRate = freshCount / 100;

  console.log(`Metrics Freshness: ${(freshnessRate * 100).toFixed(2)}% (${freshCount}/100 queries fresh)`);

  // Assert 100% freshness
  if (freshnessRate < 1.0) throw new Error(`FAIL: ${staleCount} queries returned stale metrics`);

  return { freshnessRate, freshCount, staleCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/fresh-001-metrics-freshness.csv`

---

### 3.11 Scalability NFRs (4 total)

#### NFR-SCAL-001: Maximum Content Size [P2]

**Target**: <100,000 words (validation completes without timeout)

**Measurement Protocol**:
- **Test Method**: Stress test with 100,000-word document
- **Sample Size**: 50 validations (P2 NFR)
- **Pass Criteria**: Validation completes without timeout (may exceed 60s NFR-PERF-001, but must complete)
- **Fail Criteria**: Validation times out or crashes

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-max-content-size.mjs
async function benchmarkMaxContentSize() {
  const largeDocument = generateDocument(100000); // 100k words

  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < 50; i++) {
    try {
      await validateContent(largeDocument, { timeout: 600000 }); // 10-minute timeout
      successCount++;
    } catch (error) {
      failureCount++;
      console.error(`FAIL: Validation timeout or crash - ${error.message}`);
    }
  }

  const successRate = successCount / 50;

  console.log(`Max Content Size: ${(successRate * 100).toFixed(2)}% (${successCount}/50 validations completed)`);

  // Assert 100% completion
  if (successRate < 1.0) throw new Error(`FAIL: ${failureCount} validations timed out`);

  return { successRate, successCount, failureCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/scal-001-max-content-size.csv`

---

#### NFR-SCAL-002: Minimum Content Size [P2]

**Target**: 100+ words (validation rejects documents <100 words)

**Measurement Protocol**:
- **Test Method**: Boundary test with 99-word document
- **Sample Size**: 100 validations (P2 NFR)
- **Pass Criteria**: 100% of validations reject 99-word document with clear error
- **Fail Criteria**: Any validation accepts 99-word document

**Error Message**:
```
ERROR: Minimum content size: 100 words (current: 99 words)
REMEDIATION: Add more content or disable minimum size check with --allow-short
```

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-min-content-size.mjs
async function benchmarkMinContentSize() {
  const shortDocument = generateDocument(99); // 99 words

  let rejectionCount = 0;
  let acceptanceCount = 0;

  for (let i = 0; i < 100; i++) {
    try {
      await validateContent(shortDocument);
      acceptanceCount++;
      console.error(`FAIL: Validation accepted 99-word document`);
    } catch (error) {
      if (error.message.includes('Minimum content size: 100 words')) {
        rejectionCount++;
      } else {
        throw error;
      }
    }
  }

  const rejectionRate = rejectionCount / 100;

  console.log(`Min Content Size: ${(rejectionRate * 100).toFixed(2)}% (${rejectionCount}/100 validations rejected short content)`);

  // Assert 100% rejection
  if (rejectionRate < 1.0) throw new Error(`FAIL: ${acceptanceCount} validations accepted short content`);

  return { rejectionRate, rejectionCount, acceptanceCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/scal-002-min-content-size.csv`

---

#### NFR-SCAL-003: Maximum Concurrent Agents [P2]

**Target**: 25 agents (orchestrator queues excess agents)

**Measurement Protocol**:
- **Test Method**: Stress test with 30 concurrent agent invocations
- **Sample Size**: 50 workflows (P2 NFR)
- **Pass Criteria**: Orchestrator queues excess agents (max 25 concurrent, 5 queued)
- **Fail Criteria**: Orchestrator crashes OR exceeds 25 concurrent agents

**Test Implementation**:
```javascript
// tests/benchmarks/benchmark-max-concurrent-agents.mjs
async function benchmarkMaxConcurrentAgents() {
  let successCount = 0;
  let failureCount = 0;

  for (let i = 0; i < 50; i++) {
    try {
      const agents = [];
      for (let j = 0; j < 30; j++) {
        agents.push(launchAgent('architecture-designer'));
      }

      // Monitor concurrent agents
      const maxConcurrent = monitorConcurrency(agents);

      if (maxConcurrent <= 25) {
        successCount++;
      } else {
        failureCount++;
        console.error(`FAIL: Exceeded 25 concurrent agents (max: ${maxConcurrent})`);
      }
    } catch (error) {
      failureCount++;
      console.error(`FAIL: Orchestrator crashed - ${error.message}`);
    }
  }

  const successRate = successCount / 50;

  console.log(`Max Concurrent Agents: ${(successRate * 100).toFixed(2)}% (${successCount}/50 workflows queued excess agents)`);

  // Assert 100% success
  if (successRate < 1.0) throw new Error(`FAIL: ${failureCount} workflows exceeded concurrency limit`);

  return { successRate, successCount, failureCount };
}
```

**Data Storage**: `.aiwg/testing/nfr-measurements/scal-003-max-concurrent-agents.csv`

---

#### NFR-SCAL-004: Maximum Artifact Size [P2]

**Target**: 10,000 words (orchestrator chunks or rejects artifacts exceeding limit)

**Measurement Protocol**:
- **Test Method**: Stress test with 15,000-word artifact generation
- **Sample Size**: 50 artifact generations (P2 NFR)
- **Pass Criteria**: Orchestrator chunks artifact OR rejects with clear error
- **Fail Criteria**: Orchestrator crashes OR accepts 15,000-word artifact without chunking

**Error Message**:
```
ERROR: Artifact size exceeds 10,000 words (current: 15,000 words)
REMEDIATION: Chunk artifact into smaller sections or reduce scope
```

**Test Implementation**: Similar to NFR-SCAL-001 (max content size)

**Data Storage**: `.aiwg/testing/nfr-measurements/scal-004-max-artifact-size.csv`

---

## 4. P0 NFR Measurement Priorities (12 NFRs)

### 4.1 Immediate Implementation (Construction Week 1-2)

The following 12 P0 NFRs are "make-or-break" for MVP and require immediate implementation:

#### Performance NFRs (3 P0)

1. **NFR-PERF-001**: Content Validation Time (95th percentile <60s) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Test Implementation**: `benchmark-content-validation.mjs`
   - **CI Integration**: GitHub Actions workflow with performance regression detection

2. **NFR-PERF-002**: SDLC Deployment Time (95th percentile <10s) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Test Implementation**: `benchmark-deployment-time.sh`
   - **CI Integration**: Pre-release validation (block release if deployment >10s)

3. **NFR-PERF-003**: Codebase Analysis Time (95th percentile <5min) - CRITICAL
   - **Implementation Week**: Construction Week 2
   - **Test Implementation**: `benchmark-codebase-analysis.mjs`
   - **CI Integration**: Weekly regression tracking (alert if >10% degradation)

#### Accuracy NFRs (3 P0)

4. **NFR-ACC-001**: AI Pattern False Positive Rate (<5%) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Test Implementation**: `benchmark-pattern-accuracy.mjs`
   - **Ground Truth Corpus**: Phase 1 (100 documents), Phase 2 (500 documents), Phase 3 (1000 documents)
   - **CI Integration**: Monthly accuracy validation with corpus expansion

5. **NFR-ACC-002**: Intake Field Accuracy (80-90%) - CRITICAL
   - **Implementation Week**: Construction Week 2
   - **Proxy Metric**: Field completeness (95% critical fields populated)
   - **User Study**: Deferred to Transition phase (UAT with beta testers)

6. **NFR-ACC-005**: Security Attack Detection (100%) - CRITICAL
   - **Implementation Week**: Construction Week 2
   - **Test Implementation**: `benchmark-attack-detection.mjs`
   - **Attack Database**: 50 known attack patterns (code injection, path traversal, XSS, etc.)
   - **CI Integration**: Pre-release security validation (block release if <100% detection)

#### Security NFRs (2 P0)

7. **NFR-SEC-001**: Content Privacy (0 external API calls) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Test Implementation**: `benchmark-content-privacy.mjs`
   - **CI Integration**: Automated network monitoring with nock library (fail build if external calls)

8. **NFR-SEC-003**: File Permissions Security (100% match) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Test Implementation**: `benchmark-file-permissions.mjs`
   - **CI Integration**: Pre-deployment validation (block deployment if permissions differ)

#### Usability NFRs (4 P0)

9. **NFR-USE-001**: AI Validation Learning Curve (1-2 cycles) - CRITICAL
   - **Implementation Week**: Construction Week 1
   - **Proxy Metric**: Feedback consistency (95% pattern flagging consistency)
   - **User Study**: Deferred to Transition phase (UAT with beta testers)

10. **NFR-USE-004**: First-Time Setup Friction (<15 min) - CRITICAL
    - **Implementation Week**: Construction Week 1
    - **User Study**: Deferred to Transition phase (UAT with beta testers)
    - **Proxy Metric**: Deployment time (<10s NFR-PERF-002)

11. **NFR-USE-005**: Error Message Clarity (100% with remediation) - CRITICAL
    - **Implementation Week**: Construction Week 2
    - **Test Implementation**: `benchmark-error-clarity.mjs`
    - **Error Catalog**: 100 error scenarios with remediation steps
    - **CI Integration**: Error message format validation (regex checks)

12. **NFR-REL-001**: Graceful Degradation (100% error handling) - P0
    - **Implementation Week**: Construction Week 2
    - **Test Implementation**: `benchmark-graceful-degradation.mjs`
    - **Fault Injection**: Simulate 1000 partial file read failures, network errors, timeout scenarios
    - **CI Integration**: Reliability validation (fail build if unhandled exceptions)

### 4.2 P0 NFR Measurement Schedule

| Week | NFRs | Benchmarks | CI Integration |
|------|------|-----------|---------------|
| **Construction Week 1** | PERF-001, PERF-002, SEC-001, SEC-003, USE-001, USE-004 | 6 benchmarks | GitHub Actions performance + security validation |
| **Construction Week 2** | PERF-003, ACC-001, ACC-002, ACC-005, USE-005, REL-001 | 6 benchmarks | Accuracy + error handling validation |
| **Construction Week 3** | P1 NFRs (Quality, Completeness) | 8 benchmarks | Traceability + test coverage validation |
| **Construction Week 4** | P1 NFRs (Performance, Throughput) | 5 benchmarks | Multi-agent workflow + batch operations |
| **Construction Week 5** | P2 NFRs (Reliability, Scalability) | 11 benchmarks | Rollback + scalability stress testing |

---

## 5. Data Collection and Reporting

### 5.1 Directory Structure

All NFR measurements are stored in `.aiwg/testing/nfr-measurements/`:

```
.aiwg/testing/nfr-measurements/
├── perf-001-validation-time.csv
├── perf-002-deployment-time.csv
├── perf-003-analysis-time.csv
├── perf-004-workflow-time.csv
├── perf-005-traceability-time.csv
├── perf-006-metrics-overhead.csv
├── perf-007-template-selection-time.csv
├── perf-008-test-generation-time.csv
├── perf-009-rollback-time.csv
├── perf-010-security-scan-time.csv
├── thru-001-batch-throughput.csv
├── thru-002-parallel-concurrency.csv
├── thru-003-iteration-velocity.csv
├── acc-001-false-positives.csv
├── acc-002-intake-accuracy.csv
├── acc-003-traceability-accuracy.csv
├── acc-004-recommendation-acceptance.csv
├── acc-005-attack-detection.csv
├── acc-006-security-false-positives.csv
├── qual-001-reviewer-sign-offs.csv
├── qual-002-traceability-coverage.csv
├── qual-003-test-coverage.csv
├── qual-004-template-completeness.csv
├── comp-001-pattern-count.csv
├── comp-002-critical-field-coverage.csv
├── comp-003-artifact-completeness.csv
├── comp-004-orphan-detection.csv
├── comp-005-orphan-files.csv
├── sec-001-network-trace.log
├── sec-002-database-checksums.csv
├── sec-003-file-permissions.csv
├── sec-004-backup-checksums.csv
├── rel-001-deployment-success.csv
├── rel-002-data-preservation.csv
├── rel-003-rollback-restoration.csv
├── use-001-learning-curve.csv
├── use-002-feedback-clarity.csv
├── use-003-progress-visibility.csv
├── use-004-setup-friction.csv
├── use-005-error-clarity.csv
├── use-006-onboarding-reduction.csv
├── data-001-retention-validation.csv
├── data-002-audit-trail.csv
├── data-003-metrics-retention.csv
├── fresh-001-metrics-freshness.csv
├── scal-001-max-content-size.csv
├── scal-002-min-content-size.csv
├── scal-003-max-concurrent-agents.csv
├── scal-004-max-artifact-size.csv
└── nfr-measurement-summary.json  # Consolidated report
```

### 5.2 CSV Format

All CSV files use the following format:

```csv
Test Run,Timestamp,Input Size,Measurement Value,Pass/Fail,Notes
1,2025-10-20T10:00:00Z,2000 words,45.3 seconds,PASS,95th percentile target: 60s
2,2025-10-20T10:01:00Z,2000 words,48.7 seconds,PASS,
3,2025-10-20T10:02:00Z,2000 words,62.1 seconds,FAIL,Exceeded target
...
```

### 5.3 Summary Report Format (JSON)

Consolidated NFR report generated weekly:

```json
{
  "nfr-id": "NFR-PERF-001",
  "category": "Performance",
  "priority": "P0",
  "measurement-date": "2025-10-20",
  "sample-size": 1000,
  "metric": "95th-percentile-response-time",
  "target": "60 seconds",
  "measured-value": "58.5 seconds",
  "pass": true,
  "confidence-interval": "[57.2s, 59.8s]",
  "baseline": "45 seconds",
  "regression": "30% increase from baseline (still within target)",
  "raw-data": ".aiwg/testing/nfr-measurements/perf-001-validation-time.csv",
  "trend": "stable (within 10% variance over 4 weeks)"
}
```

### 5.4 Report Generation

Generate consolidated summary report:

```bash
# Generate NFR summary report
node tools/testing/generate-nfr-report.mjs --target .aiwg/testing/nfr-measurements/ --output .aiwg/testing/nfr-summary.json

# Generate HTML dashboard
node tools/testing/generate-nfr-dashboard.mjs --input .aiwg/testing/nfr-summary.json --output .aiwg/testing/nfr-dashboard.html
```

---

## 6. Continuous Monitoring (CI/CD Integration)

### 6.1 Automated NFR Validation (GitHub Actions)

Run P0 NFR benchmarks on every PR (performance, accuracy, security):

```yaml
# .github/workflows/nfr-validation.yml
name: NFR Validation

on:
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * 0'  # Weekly full validation

jobs:
  performance-benchmarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Run Performance Benchmarks (P0)
        run: |
          npm install
          npm run benchmark:perf-001  # Content validation time
          npm run benchmark:perf-002  # Deployment time
          npm run benchmark:perf-003  # Codebase analysis time

      - name: Upload Performance Results
        uses: actions/upload-artifact@v3
        with:
          name: performance-benchmarks
          path: .aiwg/testing/nfr-measurements/perf-*.csv

  security-benchmarks:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Run Security Benchmarks (P0)
        run: |
          npm install
          npm run benchmark:sec-001  # Content privacy
          npm run benchmark:sec-003  # File permissions
          npm run benchmark:acc-005  # Attack detection

      - name: Upload Security Results
        uses: actions/upload-artifact@v3
        with:
          name: security-benchmarks
          path: .aiwg/testing/nfr-measurements/{sec,acc}-*.csv
```

### 6.2 Regression Detection

Alert if 95th percentile increases >10% from baseline:

```javascript
// tools/testing/detect-regressions.mjs
async function detectRegressions() {
  const baselines = loadBaselines('tests/performance/baselines.json');
  const current = loadCurrentMeasurements('.aiwg/testing/nfr-measurements/');

  const regressions = [];

  for (const [nfrId, baseline] of Object.entries(baselines)) {
    const currentMeasurement = current[nfrId];
    const regression = ((currentMeasurement.p95 - baseline.p95) / baseline.p95) * 100;

    if (regression > 10) {
      regressions.push({
        nfrId,
        baseline: baseline.p95,
        current: currentMeasurement.p95,
        regression: `${regression.toFixed(2)}%`
      });
    }
  }

  if (regressions.length > 0) {
    console.error('REGRESSIONS DETECTED:');
    console.table(regressions);
    process.exit(1);
  } else {
    console.log('No regressions detected');
  }
}
```

### 6.3 Performance Trending

Track 95th percentile over time (detect performance degradation):

```javascript
// tools/testing/track-performance-trend.mjs
async function trackPerformanceTrend(nfrId) {
  const history = loadMeasurementHistory(`.aiwg/testing/nfr-measurements/history/${nfrId}.csv`);

  // Calculate trend (linear regression)
  const trend = calculateTrend(history.map(h => h.p95));

  if (trend.slope > 0.1) {
    console.warn(`WARNING: ${nfrId} performance degrading (trend: +${(trend.slope * 100).toFixed(2)}% per week)`);
  } else {
    console.log(`${nfrId} performance stable (trend: ${(trend.slope * 100).toFixed(2)}% per week)`);
  }

  return trend;
}
```

Store historical measurements in `.aiwg/testing/nfr-measurements/history/`:

```
.aiwg/testing/nfr-measurements/history/
├── perf-001-validation-time.csv
├── perf-002-deployment-time.csv
├── perf-003-analysis-time.csv
...
```

### 6.4 Quality Gates

Fail CI pipeline if any P0 NFR fails:

```yaml
# .github/workflows/quality-gates.yml
- name: Validate P0 NFRs
  run: |
    npm run validate:nfr-perf-001 || exit 1  # Content validation <60s
    npm run validate:nfr-perf-002 || exit 1  # Deployment <10s
    npm run validate:nfr-perf-003 || exit 1  # Codebase analysis <5min
    npm run validate:nfr-acc-001 || exit 1   # False positives <5%
    npm run validate:nfr-acc-002 || exit 1   # Intake accuracy 80-90%
    npm run validate:nfr-acc-005 || exit 1   # Attack detection 100%
    npm run validate:nfr-sec-001 || exit 1   # Content privacy 100%
    npm run validate:nfr-sec-003 || exit 1   # File permissions match
    npm run validate:nfr-use-005 || exit 1   # Error clarity 100%
```

---

## Document Metadata

```markdown
---
document: NFR Measurement Protocols
version: 1.0
status: BASELINED
created: 2025-10-19
updated: 2025-10-19
project: AI Writing Guide - SDLC Framework
phase: Elaboration (Week 5)
owner: Test Architect
blockers-resolved: BLOCKER-002 (NFR Measurement Methodology Undefined)
enables: Construction Phase Start (NFR test implementation)
next-steps:
  - Test Engineer implements P0 NFR benchmarks (Weeks 1-2)
  - Create test data catalog (fixtures, ground truth corpora)
  - Create test infrastructure specification (multi-agent mocking, Git sandbox)
  - Integrate NFR validation into CI/CD pipeline
---
```

---

**Document Status**: BASELINED
**Version**: 1.0
**Created**: 2025-10-19
**Owner**: Test Architect
**Blockers Resolved**: BLOCKER-002 (NFR Measurement Methodology Undefined)
**Construction Phase**: READY TO START
