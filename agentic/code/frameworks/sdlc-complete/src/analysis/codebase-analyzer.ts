/**
 * @file codebase-analyzer.ts
 * @description Brownfield codebase analysis for generating intake documentation
 *
 * Implements F-003/UC-003: Codebase Intake Generation
 * - Scans existing codebases to extract structure, dependencies, and metrics
 * - Generates intake forms automatically from code analysis
 * - Identifies technologies, frameworks, and architectural patterns
 * - Estimates technical debt and modernization opportunities
 *
 * @implements NFR-ACC-002: >85% accurate technology detection
 * @implements NFR-PERF-003: <2min analysis for medium codebases (<50k LOC)
 */

import { promises as fs } from 'fs';
import path from 'path';

// ============================================================================
// Types and Interfaces
// ============================================================================

export interface CodebaseMetrics {
  totalFiles: number;
  totalLines: number;
  codeLines: number;
  commentLines: number;
  blankLines: number;
  filesByLanguage: Record<string, number>;
  linesByLanguage: Record<string, number>;
}

export interface DependencyInfo {
  name: string;
  version: string;
  type: 'production' | 'development' | 'peer';
  vulnerabilities?: number;
  lastUpdated?: string;
}

export interface TechnologyStack {
  languages: Array<{ language: string; percentage: number; files: number }>;
  frameworks: Array<{ name: string; version?: string; confidence: number }>;
  databases: Array<{ type: string; confidence: number }>;
  buildTools: string[];
  testFrameworks: string[];
  cicd: string[];
}

export interface ArchitecturePattern {
  pattern: string; // MVC, microservices, monolith, etc.
  confidence: number; // 0-1
  indicators: string[];
}

export interface TechnicalDebt {
  category: 'deprecated' | 'outdated' | 'security' | 'complexity' | 'duplication';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  location: string;
  estimatedEffort: string; // hours or story points
}

export interface CodebaseAnalysisResult {
  projectName: string;
  projectPath: string;
  analyzedAt: Date;
  metrics: CodebaseMetrics;
  technologies: TechnologyStack;
  dependencies: DependencyInfo[];
  architecture: ArchitecturePattern[];
  technicalDebt: TechnicalDebt[];
  recommendations: string[];
  estimatedComplexity: 'simple' | 'moderate' | 'complex' | 'enterprise';
}

export interface AnalysisOptions {
  path: string;
  excludePaths?: string[]; // node_modules, .git, etc.
  maxFiles?: number; // Performance limit
  detectFrameworks?: boolean; // Default: true
  detectDebt?: boolean; // Default: true
  scanDependencies?: boolean; // Default: true
}

// ============================================================================
// Codebase Analyzer Class
// ============================================================================

export class CodebaseAnalyzer {
  private readonly defaultExcludePaths = [
    'node_modules',
    '.git',
    '.next',
    '.nuxt',
    'dist',
    'build',
    'coverage',
    '.venv',
    'venv',
    '__pycache__',
    '.pytest_cache',
    'target', // Java
    'bin', // Various
    'obj' // .NET
  ];

  private readonly languageExtensions: Record<string, string> = {
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.py': 'Python',
    '.java': 'Java',
    '.kt': 'Kotlin',
    '.go': 'Go',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.rs': 'Rust',
    '.swift': 'Swift',
    '.m': 'Objective-C',
    '.sh': 'Shell',
    '.sql': 'SQL',
    '.html': 'HTML',
    '.css': 'CSS',
    '.scss': 'SCSS',
    '.sass': 'Sass',
    '.json': 'JSON',
    '.yaml': 'YAML',
    '.yml': 'YAML',
    '.xml': 'XML',
    '.md': 'Markdown'
  };

  /**
   * Analyze a codebase and generate comprehensive analysis
   */
  public async analyze(options: AnalysisOptions): Promise<CodebaseAnalysisResult> {
    const startTime = Date.now();

    // Validate path exists
    await this.validatePath(options.path);

    // Gather metrics
    const metrics = await this.gatherMetrics(options);

    // Detect technologies
    const technologies = options.detectFrameworks !== false
      ? await this.detectTechnologies(options.path, metrics)
      : this.getEmptyTechStack();

    // Scan dependencies
    const dependencies = options.scanDependencies !== false
      ? await this.scanDependencies(options.path)
      : [];

    // Detect architecture
    const architecture = await this.detectArchitecture(options.path, metrics);

    // Detect technical debt
    const technicalDebt = options.detectDebt !== false
      ? await this.detectTechnicalDebt(options.path, metrics, dependencies)
      : [];

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      metrics,
      technologies,
      dependencies,
      technicalDebt
    );

    // Estimate complexity
    const estimatedComplexity = this.estimateComplexity(metrics, technologies, architecture);

    const duration = Date.now() - startTime;

    // Log performance (NFR-PERF-003: <2min for medium codebases)
    if (metrics.totalLines > 10000 && metrics.totalLines < 50000) {
      console.log(`Analysis duration: ${duration}ms for ${metrics.totalLines} lines`);
    }

    return {
      projectName: path.basename(options.path),
      projectPath: options.path,
      analyzedAt: new Date(),
      metrics,
      technologies,
      dependencies,
      architecture,
      technicalDebt,
      recommendations,
      estimatedComplexity
    };
  }

  /**
   * Validate analysis path exists and is accessible
   */
  private async validatePath(targetPath: string): Promise<void> {
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${targetPath}`);
      }
    } catch (error) {
      throw new Error(`Invalid path: ${targetPath} - ${error}`);
    }
  }

  /**
   * Gather codebase metrics (lines, files, languages)
   */
  private async gatherMetrics(options: AnalysisOptions): Promise<CodebaseMetrics> {
    const metrics: CodebaseMetrics = {
      totalFiles: 0,
      totalLines: 0,
      codeLines: 0,
      commentLines: 0,
      blankLines: 0,
      filesByLanguage: {},
      linesByLanguage: {}
    };

    const excludePaths = options.excludePaths || this.defaultExcludePaths;
    const maxFiles = options.maxFiles || 10000;

    await this.walkDirectory(options.path, async (filePath) => {
      // Check exclusions
      if (this.shouldExclude(filePath, excludePaths)) {
        return;
      }

      // Check file limit
      if (metrics.totalFiles >= maxFiles) {
        return;
      }

      const ext = path.extname(filePath);
      const language = this.languageExtensions[ext];

      if (!language) {
        return; // Skip unknown file types
      }

      metrics.totalFiles++;

      // Count file by language
      metrics.filesByLanguage[language] = (metrics.filesByLanguage[language] || 0) + 1;

      // Count lines
      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const lines = content.split('\n');

        metrics.totalLines += lines.length;
        metrics.linesByLanguage[language] = (metrics.linesByLanguage[language] || 0) + lines.length;

        // Classify lines (simple heuristic)
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed === '') {
            metrics.blankLines++;
          } else if (trimmed.startsWith('//') || trimmed.startsWith('#') ||
                     trimmed.startsWith('/*') || trimmed.startsWith('*')) {
            metrics.commentLines++;
          } else {
            metrics.codeLines++;
          }
        }
      } catch {
        // Skip files that can't be read
      }
    });

    return metrics;
  }

  /**
   * Detect technologies, frameworks, and tools
   */
  private async detectTechnologies(
    basePath: string,
    metrics: CodebaseMetrics
  ): Promise<TechnologyStack> {
    const technologies: TechnologyStack = {
      languages: [],
      frameworks: [],
      databases: [],
      buildTools: [],
      testFrameworks: [],
      cicd: []
    };

    // Calculate language percentages
    const totalLines = metrics.totalLines || 1;
    for (const [language, lines] of Object.entries(metrics.linesByLanguage)) {
      technologies.languages.push({
        language,
        percentage: (lines / totalLines) * 100,
        files: metrics.filesByLanguage[language] || 0
      });
    }

    // Sort by percentage
    technologies.languages.sort((a, b) => b.percentage - a.percentage);

    // Detect frameworks from config files
    technologies.frameworks = await this.detectFrameworks(basePath);

    // Detect databases from config/dependencies
    technologies.databases = await this.detectDatabases(basePath);

    // Detect build tools
    technologies.buildTools = await this.detectBuildTools(basePath);

    // Detect test frameworks
    technologies.testFrameworks = await this.detectTestFrameworks(basePath);

    // Detect CI/CD
    technologies.cicd = await this.detectCICD(basePath);

    return technologies;
  }

  /**
   * Detect frameworks from package.json, requirements.txt, pom.xml, etc.
   */
  private async detectFrameworks(basePath: string): Promise<Array<{ name: string; version?: string; confidence: number }>> {
    const frameworks: Array<{ name: string; version?: string; confidence: number }> = [];

    // Check package.json (Node.js)
    try {
      const packageJson = await fs.readFile(path.join(basePath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(packageJson);

      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['react']) {
        frameworks.push({ name: 'React', version: deps['react'], confidence: 1.0 });
      }
      if (deps['vue']) {
        frameworks.push({ name: 'Vue.js', version: deps['vue'], confidence: 1.0 });
      }
      if (deps['angular'] || deps['@angular/core']) {
        frameworks.push({ name: 'Angular', version: deps['@angular/core'] || deps['angular'], confidence: 1.0 });
      }
      if (deps['express']) {
        frameworks.push({ name: 'Express.js', version: deps['express'], confidence: 1.0 });
      }
      if (deps['next']) {
        frameworks.push({ name: 'Next.js', version: deps['next'], confidence: 1.0 });
      }
      if (deps['nuxt']) {
        frameworks.push({ name: 'Nuxt.js', version: deps['nuxt'], confidence: 1.0 });
      }
    } catch {
      // No package.json or parse error
    }

    // Check requirements.txt (Python)
    try {
      const requirements = await fs.readFile(path.join(basePath, 'requirements.txt'), 'utf-8');
      if (requirements.includes('django')) {
        frameworks.push({ name: 'Django', confidence: 0.9 });
      }
      if (requirements.includes('flask')) {
        frameworks.push({ name: 'Flask', confidence: 0.9 });
      }
      if (requirements.includes('fastapi')) {
        frameworks.push({ name: 'FastAPI', confidence: 0.9 });
      }
    } catch {
      // No requirements.txt
    }

    // Check pom.xml (Java/Maven)
    try {
      const pom = await fs.readFile(path.join(basePath, 'pom.xml'), 'utf-8');
      if (pom.includes('spring-boot')) {
        frameworks.push({ name: 'Spring Boot', confidence: 0.95 });
      }
    } catch {
      // No pom.xml
    }

    // Check Gemfile (Ruby)
    try {
      const gemfile = await fs.readFile(path.join(basePath, 'Gemfile'), 'utf-8');
      if (gemfile.includes('rails')) {
        frameworks.push({ name: 'Ruby on Rails', confidence: 0.95 });
      }
    } catch {
      // No Gemfile
    }

    return frameworks;
  }

  /**
   * Detect databases from configuration files
   */
  private async detectDatabases(basePath: string): Promise<Array<{ type: string; confidence: number }>> {
    const databases: Array<{ type: string; confidence: number }> = [];

    // Check for database config files
    const configPatterns = [
      { file: 'database.yml', db: 'PostgreSQL', confidence: 0.7 },
      { file: '.env', db: 'Various', confidence: 0.5 },
      { file: 'docker-compose.yml', db: 'Various', confidence: 0.6 }
    ];

    for (const pattern of configPatterns) {
      try {
        const content = await fs.readFile(path.join(basePath, pattern.file), 'utf-8');

        if (content.includes('postgres')) {
          databases.push({ type: 'PostgreSQL', confidence: pattern.confidence + 0.3 });
        }
        if (content.includes('mysql')) {
          databases.push({ type: 'MySQL', confidence: pattern.confidence + 0.3 });
        }
        if (content.includes('mongodb') || content.includes('mongo')) {
          databases.push({ type: 'MongoDB', confidence: pattern.confidence + 0.3 });
        }
        if (content.includes('redis')) {
          databases.push({ type: 'Redis', confidence: pattern.confidence + 0.3 });
        }
        if (content.includes('sqlite')) {
          databases.push({ type: 'SQLite', confidence: pattern.confidence + 0.3 });
        }
      } catch {
        // File doesn't exist
      }
    }

    return databases;
  }

  /**
   * Detect build tools
   */
  private async detectBuildTools(basePath: string): Promise<string[]> {
    const buildTools: string[] = [];

    const checkFiles = [
      { file: 'package.json', tool: 'npm' },
      { file: 'yarn.lock', tool: 'yarn' },
      { file: 'pnpm-lock.yaml', tool: 'pnpm' },
      { file: 'Makefile', tool: 'make' },
      { file: 'webpack.config.js', tool: 'webpack' },
      { file: 'vite.config.ts', tool: 'Vite' },
      { file: 'rollup.config.js', tool: 'Rollup' },
      { file: 'pom.xml', tool: 'Maven' },
      { file: 'build.gradle', tool: 'Gradle' },
      { file: 'CMakeLists.txt', tool: 'CMake' }
    ];

    for (const check of checkFiles) {
      try {
        await fs.access(path.join(basePath, check.file));
        buildTools.push(check.tool);
      } catch {
        // File doesn't exist
      }
    }

    return buildTools;
  }

  /**
   * Detect test frameworks
   */
  private async detectTestFrameworks(basePath: string): Promise<string[]> {
    const frameworks: string[] = [];

    try {
      const packageJson = await fs.readFile(path.join(basePath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(packageJson);
      const deps = { ...pkg.dependencies, ...pkg.devDependencies };

      if (deps['jest']) frameworks.push('Jest');
      if (deps['vitest']) frameworks.push('Vitest');
      if (deps['mocha']) frameworks.push('Mocha');
      if (deps['@testing-library/react']) frameworks.push('React Testing Library');
      if (deps['cypress']) frameworks.push('Cypress');
      if (deps['playwright']) frameworks.push('Playwright');
    } catch {
      // No package.json
    }

    try {
      const requirements = await fs.readFile(path.join(basePath, 'requirements.txt'), 'utf-8');
      if (requirements.includes('pytest')) frameworks.push('pytest');
      if (requirements.includes('unittest')) frameworks.push('unittest');
    } catch {
      // No requirements.txt
    }

    return frameworks;
  }

  /**
   * Detect CI/CD configuration
   */
  private async detectCICD(basePath: string): Promise<string[]> {
    const cicd: string[] = [];

    const checks = [
      { path: '.github/workflows', name: 'GitHub Actions' },
      { path: '.gitlab-ci.yml', name: 'GitLab CI' },
      { path: '.travis.yml', name: 'Travis CI' },
      { path: '.circleci/config.yml', name: 'CircleCI' },
      { path: 'Jenkinsfile', name: 'Jenkins' },
      { path: 'azure-pipelines.yml', name: 'Azure Pipelines' }
    ];

    for (const check of checks) {
      try {
        await fs.access(path.join(basePath, check.path));
        cicd.push(check.name);
      } catch {
        // Path doesn't exist
      }
    }

    return cicd;
  }

  /**
   * Scan project dependencies
   */
  private async scanDependencies(basePath: string): Promise<DependencyInfo[]> {
    const dependencies: DependencyInfo[] = [];

    try {
      const packageJson = await fs.readFile(path.join(basePath, 'package.json'), 'utf-8');
      const pkg = JSON.parse(packageJson);

      for (const [name, version] of Object.entries(pkg.dependencies || {})) {
        dependencies.push({
          name,
          version: version as string,
          type: 'production'
        });
      }

      for (const [name, version] of Object.entries(pkg.devDependencies || {})) {
        dependencies.push({
          name,
          version: version as string,
          type: 'development'
        });
      }
    } catch {
      // No package.json or parse error
    }

    return dependencies;
  }

  /**
   * Detect architecture patterns
   */
  private async detectArchitecture(
    basePath: string,
    metrics: CodebaseMetrics
  ): Promise<ArchitecturePattern[]> {
    const patterns: ArchitecturePattern[] = [];

    // Check for common directory structures
    try {
      const entries = await fs.readdir(basePath);

      // MVC pattern
      if (entries.includes('models') && entries.includes('views') && entries.includes('controllers')) {
        patterns.push({
          pattern: 'MVC (Model-View-Controller)',
          confidence: 0.9,
          indicators: ['models/', 'views/', 'controllers/ directories present']
        });
      }

      // Microservices
      if (entries.includes('services') || entries.includes('microservices')) {
        patterns.push({
          pattern: 'Microservices',
          confidence: 0.7,
          indicators: ['services/ directory, possibly multiple service subdirectories']
        });
      }

      // Layered architecture
      if (entries.some(e => ['src', 'lib', 'app'].includes(e))) {
        patterns.push({
          pattern: 'Layered Architecture',
          confidence: 0.6,
          indicators: ['Standard src/lib/app structure']
        });
      }

      // Monolith (default if no specific pattern detected)
      if (patterns.length === 0) {
        patterns.push({
          pattern: 'Monolithic',
          confidence: 0.5,
          indicators: ['No clear microservices or modular structure']
        });
      }
    } catch {
      // Error reading directory
    }

    return patterns;
  }

  /**
   * Detect technical debt
   */
  private async detectTechnicalDebt(
    basePath: string,
    metrics: CodebaseMetrics,
    dependencies: DependencyInfo[]
  ): Promise<TechnicalDebt[]> {
    const debt: TechnicalDebt[] = [];

    // Check for outdated dependencies
    const outdatedDeps = dependencies.filter(d =>
      d.version.startsWith('^0.') || d.version.startsWith('~0.')
    );

    if (outdatedDeps.length > 0) {
      debt.push({
        category: 'outdated',
        severity: 'medium',
        description: `${outdatedDeps.length} dependencies on pre-1.0 versions`,
        location: 'package.json',
        estimatedEffort: `${outdatedDeps.length * 2}h`
      });
    }

    // Check for high complexity (many files)
    if (metrics.totalFiles > 1000) {
      debt.push({
        category: 'complexity',
        severity: 'high',
        description: `High file count (${metrics.totalFiles} files) indicates potential refactoring needs`,
        location: 'Codebase-wide',
        estimatedEffort: '80-160h'
      });
    }

    // Check for low test coverage (heuristic: no test files)
    if (!metrics.filesByLanguage['Test']) {
      debt.push({
        category: 'complexity',
        severity: 'high',
        description: 'No test files detected - missing test coverage',
        location: 'Codebase-wide',
        estimatedEffort: '40-80h'
      });
    }

    return debt;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(
    metrics: CodebaseMetrics,
    technologies: TechnologyStack,
    dependencies: DependencyInfo[],
    technicalDebt: TechnicalDebt[]
  ): string[] {
    const recommendations: string[] = [];

    // High-level recommendations based on analysis
    if (metrics.totalLines > 100000) {
      recommendations.push('Consider breaking down monolith into smaller modules or microservices');
    }

    if (technicalDebt.some(d => d.category === 'outdated')) {
      recommendations.push('Update outdated dependencies to improve security and performance');
    }

    if (technologies.testFrameworks.length === 0) {
      recommendations.push('Add automated testing framework (Jest, Vitest, pytest, etc.)');
    }

    if (technologies.cicd.length === 0) {
      recommendations.push('Implement CI/CD pipeline for automated testing and deployment');
    }

    if (technicalDebt.length > 5) {
      recommendations.push('Schedule technical debt sprint to address accumulated issues');
    }

    return recommendations;
  }

  /**
   * Estimate project complexity
   */
  private estimateComplexity(
    metrics: CodebaseMetrics,
    technologies: TechnologyStack,
    architecture: ArchitecturePattern[]
  ): 'simple' | 'moderate' | 'complex' | 'enterprise' {
    let score = 0;

    // Lines of code
    if (metrics.totalLines < 10000) score += 1;
    else if (metrics.totalLines < 50000) score += 2;
    else if (metrics.totalLines < 200000) score += 3;
    else score += 4;

    // Number of languages
    score += technologies.languages.length;

    // Number of frameworks
    score += technologies.frameworks.length;

    // Architecture complexity
    if (architecture.some(a => a.pattern.includes('Microservices'))) {
      score += 3;
    }

    // Classify
    if (score <= 4) return 'simple';
    if (score <= 8) return 'moderate';
    if (score <= 12) return 'complex';
    return 'enterprise';
  }

  /**
   * Walk directory recursively
   */
  private async walkDirectory(
    dir: string,
    callback: (filePath: string) => Promise<void>
  ): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          await this.walkDirectory(fullPath, callback);
        } else if (entry.isFile()) {
          await callback(fullPath);
        }
      }
    } catch {
      // Skip directories that can't be read
    }
  }

  /**
   * Check if path should be excluded
   */
  private shouldExclude(filePath: string, excludePaths: string[]): boolean {
    return excludePaths.some(exclude => filePath.includes(`/${exclude}/`) || filePath.endsWith(`/${exclude}`));
  }

  /**
   * Get empty tech stack
   */
  private getEmptyTechStack(): TechnologyStack {
    return {
      languages: [],
      frameworks: [],
      databases: [],
      buildTools: [],
      testFrameworks: [],
      cicd: []
    };
  }
}

export default CodebaseAnalyzer;
