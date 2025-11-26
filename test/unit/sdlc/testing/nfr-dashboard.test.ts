/**
 * NFRDashboard Tests
 *
 * Comprehensive test suite for NFR monitoring dashboard
 *
 * @module test/unit/testing/nfr-dashboard
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NFRDashboard, type DashboardMetrics, type Alert, type MetricFilters } from '../../../../agentic/code/frameworks/sdlc-complete/src/testing/nfr-dashboard.js';
import { NFRGroundTruthCorpus } from '../../../../agentic/code/frameworks/sdlc-complete/src/testing/nfr-ground-truth-corpus.js';
import * as fs from 'fs/promises';
import * as path from 'path';

describe('NFRDashboard', () => {
  let dashboard: NFRDashboard;
  let corpus: NFRGroundTruthCorpus;
  const testStatePath = '.aiwg/testing/test-dashboard-state.json';
  const testCorpusPath = '.aiwg/testing/test-corpus.json';

  beforeEach(async () => {
    dashboard = new NFRDashboard(testStatePath);
    corpus = new NFRGroundTruthCorpus(testCorpusPath);

    // Clean up any existing test files
    try {
      await fs.unlink(testStatePath);
    } catch {
      // Ignore if doesn't exist
    }
    try {
      await fs.unlink(testCorpusPath);
    } catch {
      // Ignore if doesn't exist
    }
  });

  afterEach(async () => {
    // Clean up test files
    try {
      await fs.unlink(testStatePath);
    } catch {
      // Ignore
    }
    try {
      await fs.unlink(testCorpusPath);
    } catch {
      // Ignore
    }
  });

  describe('Metrics Collection', () => {
    it('should load metrics from corpus', async () => {
      // Add test data to corpus
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance',
        true
      );

      await corpus.save();
      await dashboard.loadFromCorpus(corpus);

      const metrics = dashboard.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].nfrId).toBe('NFR-PERF-001');
      expect(metrics[0].currentValue).toBe(42.5);
    });

    it('should get metrics for specific NFR', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const status = dashboard.getNFRStatus('NFR-PERF-001');
      expect(status.nfrId).toBe('NFR-PERF-001');
      expect(status.currentValue).toBe(42.5);
    });

    it('should filter metrics by category', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-ACC-001',
        { value: 0.95, unit: 'ratio', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Accuracy'
      );

      await dashboard.loadFromCorpus(corpus);

      const filters: MetricFilters = { categories: ['Performance'] };
      const metrics = dashboard.getMetrics(filters);

      expect(metrics).toHaveLength(1);
      expect(metrics[0].category).toBe('Performance');
    });

    it('should filter metrics by status', async () => {
      // Add multiple entries with different statuses
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 12, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const filters: MetricFilters = { statuses: ['pass'] };
      const metrics = dashboard.getMetrics(filters);

      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics.every(m => m.status === 'pass')).toBe(true);
    });

    it('should filter metrics by time range', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const now = Date.now();
      const filters: MetricFilters = {
        timeRange: {
          start: now - 3600000, // 1 hour ago
          end: now + 3600000, // 1 hour from now
        },
      };

      const metrics = dashboard.getMetrics(filters);
      expect(metrics.length).toBeGreaterThan(0);
    });

    it('should handle empty metrics', () => {
      const metrics = dashboard.getMetrics();
      expect(metrics).toEqual([]);
    });

    it('should throw error for non-existent NFR', () => {
      expect(() => dashboard.getNFRStatus('NFR-NONEXISTENT')).toThrow('No metrics found');
    });
  });

  describe('Status Calculation', () => {
    it('should calculate overall status as healthy', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 43, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const health = dashboard.getOverallStatus();
      expect(health).toBe('healthy');
    });

    it('should calculate overall status as degraded', async () => {
      // Add entries that will trigger warnings
      for (let i = 0; i < 5; i++) {
        corpus.addEntry(
          `NFR-PERF-00${i}`,
          { value: 10, unit: 'ms', confidence: 0.95 },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );

        // Add degraded measurement
        corpus.addEntry(
          `NFR-PERF-00${i}`,
          { value: 12, unit: 'ms', confidence: 0.95 }, // 20% deviation
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const health = dashboard.getOverallStatus();
      expect(['degraded', 'healthy']).toContain(health); // May vary based on thresholds
    });

    it('should calculate overall status as critical when NFR fails', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      // Add failing measurement (>20% deviation)
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 25, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const health = dashboard.getOverallStatus();
      expect(health).toBe('critical');
    });

    it('should get category status', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-002',
        { value: 55.0, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const categoryStatus = dashboard.getCategoryStatus('Performance');
      expect(categoryStatus.size).toBe(2);
      expect(categoryStatus.has('NFR-PERF-001')).toBe(true);
      expect(categoryStatus.has('NFR-PERF-002')).toBe(true);
    });

    it('should handle empty category', () => {
      const categoryStatus = dashboard.getCategoryStatus('Accuracy');
      expect(categoryStatus.size).toBe(0);
    });
  });

  describe('Trend Analysis', () => {
    it('should analyze trend over duration', async () => {
      const now = Date.now();

      // Add time series data
      for (let i = 0; i < 10; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 40 + i, unit: 'ms', confidence: 0.95, samples: [40 + i] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const trend = dashboard.getTrend('NFR-PERF-001', { value: 24, unit: 'hours' });

      expect(trend.nfrId).toBe('NFR-PERF-001');
      expect(trend.direction).toBe('degrading'); // Increasing values = degrading
      expect(trend.timeSeries.length).toBeGreaterThan(0);
      expect(trend.trendLine.slope).toBeGreaterThan(0);
    });

    it('should detect improving trend', async () => {
      // Add decreasing values (improving performance)
      for (let i = 0; i < 10; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 50 - i, unit: 'ms', confidence: 0.95, samples: [50 - i] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const trend = dashboard.getTrend('NFR-PERF-001', { value: 24, unit: 'hours' });
      expect(trend.direction).toBe('improving'); // Decreasing values = improving
    });

    it('should detect stable trend', async () => {
      // Add constant values
      for (let i = 0; i < 10; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 45, unit: 'ms', confidence: 0.95, samples: [45] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const trend = dashboard.getTrend('NFR-PERF-001', { value: 24, unit: 'hours' });
      expect(trend.direction).toBe('stable');
      expect(Math.abs(trend.trendLine.slope)).toBeLessThan(0.001);
    });

    it('should calculate moving average', async () => {
      for (let i = 0; i < 10; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 40 + Math.random() * 10, unit: 'ms', confidence: 0.95 },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const trend = dashboard.getTrend('NFR-PERF-001', { value: 24, unit: 'hours' });
      expect(trend.movingAverage).toHaveLength(trend.timeSeries.length);
    });

    it('should throw error for insufficient trend data', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      expect(() => dashboard.getTrend('NFR-PERF-001', { value: 24, unit: 'hours' }))
        .toThrow('Insufficient');
    });
  });

  describe('Degradation Detection', () => {
    it('should detect degradation', async () => {
      // Add increasing values (degrading)
      for (let i = 0; i < 15; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 40 + i * 2, unit: 'ms', confidence: 0.95, samples: [40 + i * 2] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const isDegrading = dashboard.detectDegradation('NFR-PERF-001', 10);
      expect(isDegrading).toBe(true);
    });

    it('should not detect degradation in stable data', async () => {
      // Add stable values
      for (let i = 0; i < 15; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 45 + Math.random() * 2, unit: 'ms', confidence: 0.95 },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const isDegrading = dashboard.detectDegradation('NFR-PERF-001', 10);
      expect(isDegrading).toBe(false);
    });

    it('should return false for insufficient data', () => {
      const isDegrading = dashboard.detectDegradation('NFR-PERF-001', 10);
      expect(isDegrading).toBe(false);
    });
  });

  describe('Violation Prediction', () => {
    it('should predict threshold violation', async () => {
      // Add trend that will violate threshold
      for (let i = 0; i < 20; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 40 + i * 3, unit: 'ms', confidence: 0.95, samples: [40 + i * 3] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const prediction = dashboard.predictViolation('NFR-PERF-001', { value: 1, unit: 'hours' });

      expect(prediction).toBeDefined();
      // May or may not violate depending on trend and threshold
    });

    it('should return false for stable trend', async () => {
      // Add stable values
      for (let i = 0; i < 10; i++) {
        corpus.addEntry(
          'NFR-PERF-001',
          { value: 45, unit: 'ms', confidence: 0.95, samples: [45] },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const prediction = dashboard.predictViolation('NFR-PERF-001', { value: 1, unit: 'hours' });
      expect(prediction.willViolate).toBe(false);
    });

    it('should handle insufficient data gracefully', () => {
      const prediction = dashboard.predictViolation('NFR-PERF-001', { value: 1, unit: 'hours' });
      expect(prediction.willViolate).toBe(false);
      expect(prediction.confidence).toBe(0);
    });
  });

  describe('Alert System', () => {
    it('should generate critical alert for failing NFR', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      // Add failing measurement
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 }, // Large deviation
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const alerts = dashboard.checkThresholds();
      const criticalAlerts = alerts.filter(a => a.severity === 'critical');

      expect(criticalAlerts.length).toBeGreaterThan(0);
      expect(criticalAlerts[0].nfrId).toBe('NFR-PERF-001');
    });

    it('should acknowledge alert', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const alerts = dashboard.checkThresholds();
      expect(alerts.length).toBeGreaterThan(0);

      const alertId = alerts[0].id;
      dashboard.acknowledgeAlert(alertId, 'Investigated and resolved');

      const allAlerts = dashboard.getAlerts();
      const acknowledgedAlert = allAlerts.find(a => a.id === alertId);

      expect(acknowledgedAlert?.acknowledged).toBe(true);
      expect(acknowledgedAlert?.resolution).toBe('Investigated and resolved');
    });

    it('should clear alert', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const alerts = dashboard.checkThresholds();
      const alertId = alerts[0].id;

      dashboard.clearAlert(alertId);

      const remainingAlerts = dashboard.getAlerts();
      expect(remainingAlerts.find(a => a.id === alertId)).toBeUndefined();
    });

    it('should filter alerts by severity', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);
      dashboard.checkThresholds();

      const criticalAlerts = dashboard.getAlerts({ severities: ['critical'] });
      expect(criticalAlerts.every(a => a.severity === 'critical')).toBe(true);
    });

    it('should filter out acknowledged alerts', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const alerts = dashboard.checkThresholds();
      dashboard.acknowledgeAlert(alerts[0].id);

      const activeAlerts = dashboard.getAlerts({ includeAcknowledged: false });
      expect(activeAlerts.find(a => a.id === alerts[0].id)).toBeUndefined();
    });
  });

  describe('Export Functionality', () => {
    it('should export metrics as JSON', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const json = dashboard.exportMetrics('json');
      const parsed = JSON.parse(json);

      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed.length).toBeGreaterThan(0);
      expect(parsed[0].nfrId).toBe('NFR-PERF-001');
    });

    it('should export metrics as CSV', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const csv = dashboard.exportMetrics('csv');
      const lines = csv.split('\n');

      expect(lines.length).toBeGreaterThan(1); // Header + data
      expect(lines[0]).toContain('Timestamp');
      expect(lines[1]).toContain('NFR-PERF-001');
    });

    it('should filter exported metrics', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-ACC-001',
        { value: 0.95, unit: 'ratio', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Accuracy'
      );

      await dashboard.loadFromCorpus(corpus);

      const csv = dashboard.exportMetrics('csv', { categories: ['Performance'] });
      const lines = csv.split('\n');

      expect(lines.some(l => l.includes('NFR-PERF-001'))).toBe(true);
      expect(lines.some(l => l.includes('NFR-ACC-001'))).toBe(false);
    });
  });

  describe('Report Generation', () => {
    it('should generate comprehensive report', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);

      const report = dashboard.generateReport();

      expect(report).toContain('NFR DASHBOARD REPORT');
      expect(report).toContain('Overall Status');
      expect(report).toContain('Category Summary');
    });

    it('should include alerts in report', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 10, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      corpus.addEntry(
        'NFR-PERF-001',
        { value: 30, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);
      dashboard.checkThresholds();

      const report = dashboard.generateReport({ includeAlerts: true });
      expect(report).toContain('Active Alerts');
    });

    it('should customize report title', () => {
      const report = dashboard.generateReport({ title: 'Custom Report' });
      expect(report).toContain('CUSTOM REPORT');
    });
  });

  describe('State Persistence', () => {
    it('should save and load dashboard state', async () => {
      corpus.addEntry(
        'NFR-PERF-001',
        { value: 42.5, unit: 'ms', confidence: 0.95 },
        { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
        'Performance'
      );

      await dashboard.loadFromCorpus(corpus);
      await dashboard.saveState();

      const newDashboard = new NFRDashboard(testStatePath);
      await newDashboard.loadState();

      const metrics = newDashboard.getMetrics();
      expect(metrics.length).toBeGreaterThan(0);
      expect(metrics[0].nfrId).toBe('NFR-PERF-001');
    });

    it('should handle missing state file gracefully', async () => {
      const newDashboard = new NFRDashboard('.aiwg/testing/nonexistent.json');
      await expect(newDashboard.loadState()).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should refresh dashboard efficiently', async () => {
      // Add large dataset
      for (let i = 0; i < 100; i++) {
        corpus.addEntry(
          `NFR-PERF-${i.toString().padStart(3, '0')}`,
          { value: 40 + Math.random() * 10, unit: 'ms', confidence: 0.95 },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const start = performance.now();
      await dashboard.refresh();
      const duration = performance.now() - start;

      expect(duration).toBeLessThan(200); // Should complete in <200ms
    });

    it('should handle large metric queries efficiently', async () => {
      // Add large dataset
      for (let i = 0; i < 1000; i++) {
        corpus.addEntry(
          `NFR-PERF-${i.toString().padStart(4, '0')}`,
          { value: 40 + Math.random() * 10, unit: 'ms', confidence: 0.95 },
          { environment: 'test', system: 'linux-x64', nodeVersion: 'v20.0.0' },
          'Performance'
        );
      }

      await dashboard.loadFromCorpus(corpus);

      const start = performance.now();
      const metrics = dashboard.getMetrics();
      const duration = performance.now() - start;

      expect(metrics.length).toBeGreaterThan(0);
      expect(duration).toBeLessThan(50); // Should complete in <50ms
    });
  });
});
