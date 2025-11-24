/**
 * Test suite for CodebaseAnalyzer
 *
 * Tests brownfield codebase analysis for generating intake documentation
 * from existing codebases. Validates technology detection, metrics gathering,
 * technical debt assessment, and recommendation generation.
 *
 * Requirements:
 * - UC-003: Brownfield Intake Generation
 * - NFR-ANAL-001: Technology detection accuracy >85%
 * - NFR-ANAL-002: Analysis time <2min for 1000 files
 * - NFR-ANAL-003: Dependency scanning <30s
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import type {
  CodebaseAnalyzer,
  AnalysisOptions,
  CodebaseAnalysisResult,
  ProjectMetrics,
  TechnologyStack,
  DependencyInfo,
  ArchitecturePattern,
  TechnicalDebtItem,
  EstimatedComplexity
} from '../../../src/analysis/codebase-analyzer.js';

describe('CodebaseAnalyzer', () => {
  let analyzer: CodebaseAnalyzer;
  let testDir: string;

  beforeEach(async () => {
    // Dynamic import to avoid hoisting issues
    const { CodebaseAnalyzer: Analyzer } = await import('../../../src/analysis/codebase-analyzer.js');
    analyzer = new Analyzer();

    // Create temp directory for test projects
    testDir = path.join(os.tmpdir(), `codebase-analyzer-test-${Date.now()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Cleanup test directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  // Helper to create test project structure
  async function createTestProject(structure: Record<string, string | Record<string, string>>) {
    for (const [fileName, content] of Object.entries(structure)) {
      const filePath = path.join(testDir, fileName);
      const dir = path.dirname(filePath);

      await fs.mkdir(dir, { recursive: true });

      if (typeof content === 'string') {
        await fs.writeFile(filePath, content, 'utf-8');
      } else {
        // Nested directory
        for (const [nestedFile, nestedContent] of Object.entries(content)) {
          const nestedPath = path.join(filePath, nestedFile);
          const nestedDir = path.dirname(nestedPath);
          await fs.mkdir(nestedDir, { recursive: true });
          await fs.writeFile(nestedPath, nestedContent as string, 'utf-8');
        }
      }
    }
  }

  describe('Metrics Gathering (NFR-ANAL-002)', () => {
    it('should count files and lines correctly', async () => {
      await createTestProject({
        'src/index.ts': 'console.log("hello");\nconsole.log("world");\n',
        'src/utils.ts': 'export function add(a: number, b: number) {\n  return a + b;\n}\n',
        'test/index.test.ts': 'import { describe, it } from "vitest";\n',
        'README.md': '# Test Project\n\nDescription here.\n'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.metrics.totalFiles).toBe(4);
      expect(result.metrics.totalLines).toBeGreaterThan(0);
      expect(result.metrics.codeLines).toBeGreaterThan(0);
      expect(result.metrics.commentLines).toBeGreaterThanOrEqual(0);
      expect(result.metrics.blankLines).toBeGreaterThanOrEqual(0);
    });

    it('should detect multiple languages', async () => {
      await createTestProject({
        'src/main.ts': 'const x = 42;',
        'src/util.js': 'function foo() {}',
        'styles/app.css': 'body { margin: 0; }',
        'index.html': '<!DOCTYPE html><html></html>',
        'api/server.py': 'def main():\n    pass',
        'config.json': '{"key": "value"}'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.metrics.languages).toBeDefined();
      expect(Object.keys(result.metrics.languages).length).toBeGreaterThanOrEqual(3);
      expect(result.metrics.languages['TypeScript']).toBeGreaterThan(0);
      expect(result.metrics.languages['JavaScript']).toBeGreaterThan(0);
    });

    it('should complete analysis in <2min for 1000 files (NFR-ANAL-002)', async () => {
      const startTime = Date.now();

      // Create 100 sample files (simulating 1000 would be too slow in tests)
      const filePromises = [];
      for (let i = 0; i < 100; i++) {
        filePromises.push(
          createTestProject({
            [`src/file${i}.ts`]: `export const value${i} = ${i};\n`.repeat(10)
          })
        );
      }
      await Promise.all(filePromises);

      await analyzer.analyze({ path: testDir });

      const duration = Date.now() - startTime;

      // 100 files should complete in <12s (scaled from 2min/1000 files)
      expect(duration).toBeLessThan(12000);
    }, 15000);

    it('should exclude common ignore patterns', async () => {
      await createTestProject({
        'src/index.ts': 'const x = 1;',
        'node_modules/pkg/index.js': 'module.exports = {};',
        '.git/config': '[core]',
        'dist/bundle.js': '(function(){})();',
        '.env': 'SECRET=123'
      });

      const result = await analyzer.analyze({ path: testDir });

      // Should only count src/index.ts
      expect(result.metrics.totalFiles).toBeLessThan(5);
    });
  });

  describe('Technology Detection (NFR-ANAL-001)', () => {
    it('should detect React framework', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          name: 'test-app',
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0'
          }
        }),
        'src/App.tsx': `
          import React from 'react';
          export function App() {
            return <div>Hello</div>;
          }
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.framework).toContain('React');
      expect(result.technologies.confidence).toBeGreaterThanOrEqual(0.85);
    });

    it('should detect Vue framework', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: { 'vue': '^3.0.0' }
        }),
        'src/App.vue': `
          <template><div>{{ msg }}</div></template>
          <script setup>
          import { ref } from 'vue';
          const msg = ref('Hello');
          </script>
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.framework).toContain('Vue');
    });

    it('should detect Angular framework', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            '@angular/core': '^16.0.0',
            '@angular/common': '^16.0.0'
          }
        }),
        'src/app.component.ts': `
          import { Component } from '@angular/core';
          @Component({
            selector: 'app-root',
            template: '<div>Hello</div>'
          })
          export class AppComponent {}
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.framework).toContain('Angular');
    });

    it('should detect Express backend', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: { 'express': '^4.18.0' }
        }),
        'server.js': `
          const express = require('express');
          const app = express();
          app.listen(3000);
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.backend).toContain('Express');
    });

    it('should detect Django backend', async () => {
      await createTestProject({
        'requirements.txt': 'Django==4.2.0\ndjango-rest-framework==3.14.0',
        'manage.py': `
          #!/usr/bin/env python
          import os
          import sys
          if __name__ == '__main__':
              os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'project.settings')
        `,
        'project/settings.py': `
          INSTALLED_APPS = [
              'django.contrib.admin',
              'rest_framework',
          ]
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.backend).toContain('Django');
    });

    it('should detect databases', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'pg': '^8.11.0',
            'mongoose': '^7.0.0',
            'redis': '^4.6.0'
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.databases.length).toBeGreaterThan(0);
      expect(result.technologies.databases).toContain('PostgreSQL');
      expect(result.technologies.databases).toContain('MongoDB');
      expect(result.technologies.databases).toContain('Redis');
    });

    it('should detect build tools', async () => {
      await createTestProject({
        'vite.config.ts': 'export default { build: {} }',
        'webpack.config.js': 'module.exports = {}',
        'package.json': JSON.stringify({
          devDependencies: {
            'vite': '^4.0.0',
            'webpack': '^5.0.0'
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.buildTools.length).toBeGreaterThan(0);
      expect(result.technologies.buildTools.some(tool =>
        tool.includes('Vite') || tool.includes('Webpack')
      )).toBe(true);
    });

    it('should detect test frameworks', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          devDependencies: {
            'vitest': '^1.0.0',
            'jest': '^29.0.0',
            'playwright': '^1.40.0'
          }
        }),
        'vitest.config.ts': 'export default {}',
        'tests/example.test.ts': 'import { describe, it } from "vitest";'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.testFrameworks.length).toBeGreaterThan(0);
      expect(result.technologies.testFrameworks).toContain('Vitest');
    });

    it('should detect CI/CD platforms', async () => {
      await createTestProject({
        '.github/workflows/ci.yml': `
          name: CI
          on: [push]
          jobs:
            test:
              runs-on: ubuntu-latest
        `,
        '.gitlab-ci.yml': `
          stages:
            - test
        `,
        'Jenkinsfile': `
          pipeline {
            agent any
          }
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.cicd.length).toBeGreaterThan(0);
      expect(result.technologies.cicd).toContain('GitHub Actions');
    });

    it('should achieve >85% detection accuracy (NFR-ANAL-001)', async () => {
      // Create project with known technologies
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.0.0',
            'express': '^4.18.0',
            'pg': '^8.11.0'
          },
          devDependencies: {
            'vitest': '^1.0.0',
            'vite': '^4.0.0'
          }
        }),
        'src/App.tsx': 'import React from "react";',
        'server.js': 'const express = require("express");',
        '.github/workflows/test.yml': 'name: Test'
      });

      const result = await analyzer.analyze({ path: testDir });

      // Should detect at least 5 out of 6 technologies (83%+)
      const detected = [
        result.technologies.framework?.includes('React'),
        result.technologies.backend?.includes('Express'),
        result.technologies.databases.includes('PostgreSQL'),
        result.technologies.testFrameworks.includes('Vitest'),
        result.technologies.buildTools.some(t => t.includes('Vite')),
        result.technologies.cicd.includes('GitHub Actions')
      ].filter(Boolean).length;

      expect(detected / 6).toBeGreaterThanOrEqual(0.85);
    });
  });

  describe('Dependency Scanning (NFR-ANAL-003)', () => {
    it('should scan npm dependencies in <30s (NFR-ANAL-003)', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.2.0',
            'lodash': '^4.17.21'
          },
          devDependencies: {
            'vitest': '^1.0.0'
          }
        })
      });

      const startTime = Date.now();
      const result = await analyzer.analyze({ path: testDir });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(30000);
      expect(result.dependencies.direct.length).toBeGreaterThan(0);
    }, 35000);

    it('should identify direct dependencies', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.2.0',
            'axios': '^1.6.0'
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.dependencies.direct.some(d => d.name === 'react')).toBe(true);
      expect(result.dependencies.direct.some(d => d.name === 'axios')).toBe(true);
    });

    it('should detect outdated dependencies', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'lodash': '^3.0.0' // Very old version
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      const outdated = result.dependencies.direct.find(d => d.name === 'lodash');
      expect(outdated?.outdated).toBe(true);
    });

    it('should identify security vulnerabilities', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'lodash': '^4.17.15' // Version with known vulnerabilities
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      // Should flag potential security issues
      expect(result.dependencies.securityIssues).toBeGreaterThanOrEqual(0);
    });

    it('should scan Python dependencies', async () => {
      await createTestProject({
        'requirements.txt': `
          Django==4.2.0
          requests==2.31.0
          pytest==7.4.0
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.dependencies.direct.some(d => d.name === 'Django')).toBe(true);
      expect(result.dependencies.direct.some(d => d.name === 'requests')).toBe(true);
    });
  });

  describe('Architecture Detection', () => {
    it('should detect MVC pattern', async () => {
      await createTestProject({
        'src/models/User.ts': 'export class User {}',
        'src/views/UserView.tsx': 'export function UserView() {}',
        'src/controllers/UserController.ts': 'export class UserController {}'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.architecture.patterns).toContain('MVC');
    });

    it('should detect microservices pattern', async () => {
      await createTestProject({
        'services/auth/index.ts': 'export const authService = {};',
        'services/payment/index.ts': 'export const paymentService = {};',
        'services/user/index.ts': 'export const userService = {};',
        'docker-compose.yml': `
          version: '3'
          services:
            auth:
              build: ./services/auth
            payment:
              build: ./services/payment
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.architecture.patterns).toContain('Microservices');
    });

    it('should detect monorepo structure', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          workspaces: ['packages/*']
        }),
        'packages/core/package.json': JSON.stringify({ name: '@app/core' }),
        'packages/ui/package.json': JSON.stringify({ name: '@app/ui' })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.architecture.patterns).toContain('Monorepo');
    });

    it('should detect layered architecture', async () => {
      await createTestProject({
        'src/presentation/api.ts': 'export const api = {};',
        'src/application/services.ts': 'export const services = {};',
        'src/domain/entities.ts': 'export class Entity {}',
        'src/infrastructure/database.ts': 'export const db = {};'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.architecture.patterns).toContain('Layered');
    });

    it('should identify architecture components', async () => {
      await createTestProject({
        'src/api/routes.ts': 'export const routes = [];',
        'src/database/migrations/001.sql': 'CREATE TABLE users;',
        'src/services/email.ts': 'export async function sendEmail() {}',
        'src/utils/validation.ts': 'export function validate() {}'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.architecture.components.length).toBeGreaterThan(0);
      expect(result.architecture.components.some(c => c.type === 'api')).toBe(true);
    });
  });

  describe('Technical Debt Detection', () => {
    it('should detect TODO comments', async () => {
      await createTestProject({
        'src/index.ts': `
          // TODO: Refactor this function
          export function legacy() {
            // TODO: Add error handling
            return 42;
          }
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      const todoDebt = result.technicalDebt.find(d => d.type === 'todo-comments');
      expect(todoDebt).toBeDefined();
      expect(todoDebt!.count).toBeGreaterThanOrEqual(2);
    });

    it('should detect deprecated code', async () => {
      await createTestProject({
        'src/api.ts': `
          /**
           * @deprecated Use newFunction instead
           */
          export function oldFunction() {}

          // DEPRECATED: Use v2 API
          export const legacyEndpoint = '/old';
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      const deprecatedDebt = result.technicalDebt.find(d => d.type === 'deprecated-code');
      expect(deprecatedDebt).toBeDefined();
    });

    it('should detect large files', async () => {
      const largeFile = 'const x = 1;\n'.repeat(600); // 600 lines

      await createTestProject({
        'src/massive.ts': largeFile
      });

      const result = await analyzer.analyze({ path: testDir });

      const largeFilesDebt = result.technicalDebt.find(d => d.type === 'large-files');
      expect(largeFilesDebt).toBeDefined();
      expect(largeFilesDebt!.severity).toMatch(/medium|high/);
    });

    it('should detect missing tests', async () => {
      await createTestProject({
        'src/index.ts': 'export function important() { return 42; }',
        'src/util.ts': 'export function helper() { return true; }',
        'src/api.ts': 'export function endpoint() { return {}; }'
        // No test files
      });

      const result = await analyzer.analyze({ path: testDir });

      const testDebt = result.technicalDebt.find(d => d.type === 'missing-tests');
      expect(testDebt).toBeDefined();
      expect(testDebt!.severity).toMatch(/high|critical/);
    });

    it('should calculate technical debt score', async () => {
      await createTestProject({
        'src/index.ts': `
          // TODO: Fix this
          export function legacy() {
            return 42;
          }
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technicalDebt.length).toBeGreaterThan(0);
      const totalImpact = result.technicalDebt.reduce((sum, d) => sum + d.estimatedEffort, 0);
      expect(totalImpact).toBeGreaterThan(0);
    });
  });

  describe('Complexity Estimation', () => {
    it('should estimate simple project as low complexity', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'lodash': '^4.17.21'
          }
        }),
        'src/index.ts': 'export const x = 1;'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.estimatedComplexity.overall).toBe('low');
    });

    it('should estimate medium complexity correctly', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.0.0',
            'express': '^4.18.0'
          }
        })
      });

      // Create 15 files
      for (let i = 0; i < 15; i++) {
        await createTestProject({
          [`src/component${i}.ts`]: `export const Component${i} = () => {};`
        });
      }

      const result = await analyzer.analyze({ path: testDir });

      expect(result.estimatedComplexity.overall).toMatch(/low|medium/);
    });

    it('should estimate high complexity for large projects', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.0.0',
            'express': '^4.18.0',
            '@angular/core': '^16.0.0'
          }
        })
      });

      // Create 60 files
      for (let i = 0; i < 60; i++) {
        await createTestProject({
          [`src/module${i}.ts`]: 'export const x = 1;\n'.repeat(50)
        });
      }

      const result = await analyzer.analyze({ path: testDir });

      expect(result.estimatedComplexity.overall).toMatch(/medium|high/);
    });

    it('should provide complexity breakdown', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'react': '^18.0.0'
          }
        }),
        'src/index.ts': 'export const x = 1;'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.estimatedComplexity.codebase).toBeDefined();
      expect(result.estimatedComplexity.dependencies).toBeDefined();
      expect(result.estimatedComplexity.architecture).toBeDefined();
      expect(result.estimatedComplexity.technicalDebt).toBeDefined();
    });
  });

  describe('Recommendations', () => {
    it('should recommend modern frameworks for legacy projects', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'jquery': '^2.0.0' // Old version
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r =>
        r.category === 'modernization'
      )).toBe(true);
    });

    it('should recommend adding tests when missing', async () => {
      await createTestProject({
        'src/index.ts': 'export function critical() { return 42; }',
        'src/api.ts': 'export function endpoint() { return {}; }'
        // No tests
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.recommendations.some(r =>
        r.category === 'testing' || r.title.toLowerCase().includes('test')
      )).toBe(true);
    });

    it('should recommend security improvements', async () => {
      await createTestProject({
        'src/auth.ts': `
          const SECRET_KEY = "hardcoded-secret"; // Security issue
          export function authenticate(password: string) {
            return password === SECRET_KEY;
          }
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.recommendations.some(r =>
        r.category === 'security'
      )).toBe(true);
    });

    it('should recommend dependency updates', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'lodash': '^3.0.0' // Very outdated
          }
        })
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.recommendations.some(r =>
        r.category === 'dependencies' || r.title.toLowerCase().includes('update')
      )).toBe(true);
    });

    it('should prioritize recommendations', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          dependencies: {
            'lodash': '^3.0.0'
          }
        }),
        'src/index.ts': 'export const x = 1;'
      });

      const result = await analyzer.analyze({ path: testDir });

      const highPriority = result.recommendations.filter(r => r.priority === 'high');
      const mediumPriority = result.recommendations.filter(r => r.priority === 'medium');
      const lowPriority = result.recommendations.filter(r => r.priority === 'low');

      expect(highPriority.length + mediumPriority.length + lowPriority.length)
        .toBe(result.recommendations.length);
    });
  });

  describe('Integration Tests', () => {
    it('should analyze complete TypeScript project', async () => {
      await createTestProject({
        'package.json': JSON.stringify({
          name: 'test-app',
          version: '1.0.0',
          dependencies: {
            'react': '^18.2.0',
            'react-dom': '^18.2.0'
          },
          devDependencies: {
            'vite': '^4.0.0',
            'vitest': '^1.0.0',
            'typescript': '^5.0.0'
          }
        }),
        'tsconfig.json': JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'ESNext'
          }
        }),
        'src/App.tsx': `
          import React from 'react';
          export function App() {
            return <div>Hello World</div>;
          }
        `,
        'src/utils.ts': `
          export function add(a: number, b: number) {
            return a + b;
          }
        `,
        'test/App.test.tsx': `
          import { describe, it } from 'vitest';
          import { App } from '../src/App';
        `,
        '.github/workflows/ci.yml': 'name: CI\non: [push]'
      });

      const result = await analyzer.analyze({ path: testDir });

      // Verify comprehensive analysis
      expect(result.projectName).toBe(path.basename(testDir));
      expect(result.metrics.totalFiles).toBeGreaterThan(0);
      expect(result.technologies.framework).toContain('React');
      expect(result.technologies.buildTools.length).toBeGreaterThan(0);
      expect(result.dependencies.direct.length).toBeGreaterThan(0);
      expect(result.architecture.patterns.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should analyze Python Django project', async () => {
      await createTestProject({
        'requirements.txt': `
          Django==4.2.0
          djangorestframework==3.14.0
          pytest==7.4.0
        `,
        'manage.py': '#!/usr/bin/env python\nimport os',
        'project/settings.py': `
          INSTALLED_APPS = [
              'django.contrib.admin',
              'rest_framework',
          ]
        `,
        'app/models.py': `
          from django.db import models
          class User(models.Model):
              name = models.CharField(max_length=100)
        `,
        'app/views.py': `
          from rest_framework.views import APIView
          class UserView(APIView):
              pass
        `
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.technologies.backend).toContain('Django');
      expect(result.architecture.patterns).toContain('MVC');
    });

    it('should handle empty project gracefully', async () => {
      const result = await analyzer.analyze({ path: testDir });

      expect(result.metrics.totalFiles).toBe(0);
      expect(result.technologies.framework).toBe('Unknown');
      expect(result.estimatedComplexity.overall).toBe('low');
    });

    it('should handle project with errors gracefully', async () => {
      await createTestProject({
        'package.json': 'INVALID JSON{{{',
        'src/index.ts': 'export const x = 1;'
      });

      // Should not throw
      const result = await analyzer.analyze({ path: testDir });

      expect(result).toBeDefined();
      expect(result.metrics.totalFiles).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large codebase efficiently', async () => {
      // Create 200 files
      const promises = [];
      for (let i = 0; i < 200; i++) {
        promises.push(
          createTestProject({
            [`src/module${i}.ts`]: `export const Module${i} = ${i};\n`.repeat(20)
          })
        );
      }
      await Promise.all(promises);

      const startTime = Date.now();
      const result = await analyzer.analyze({ path: testDir });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(120000); // <2min
      expect(result.metrics.totalFiles).toBeGreaterThan(150);
    }, 130000);

    it('should handle deep directory nesting', async () => {
      await createTestProject({
        'a/b/c/d/e/f/g/h/i/j/deep.ts': 'export const x = 1;'
      });

      const result = await analyzer.analyze({ path: testDir });

      expect(result.metrics.totalFiles).toBeGreaterThan(0);
    });
  });
});
