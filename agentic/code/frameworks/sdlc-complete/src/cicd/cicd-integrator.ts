/**
 * @file cicd-integrator.ts
 * @description CI/CD pipeline integration and automation
 *
 * Implements F-009/UC-009: CI/CD Integration
 * - GitHub Actions workflow generation
 * - GitLab CI/CD configuration
 * - Jenkins pipeline support
 * - Build automation
 * - Test execution integration
 * - Deployment automation
 * - Status badge generation
 *
 * @implements NFR-CICD-001: Pipeline generation <30s
 * @implements NFR-CICD-002: Support 3+ major CI platforms
 * @implements NFR-CICD-003: 100% valid YAML/pipeline syntax
 */

import { promises as fs } from 'fs';
import path from 'path';
import YAML from 'yaml';

// ============================================================================
// Types and Interfaces
// ============================================================================

export type CICDPlatform = 'github-actions' | 'gitlab-ci' | 'jenkins' | 'circleci' | 'travis';
export type BuildTool = 'npm' | 'yarn' | 'pnpm' | 'maven' | 'gradle' | 'make';
export type DeployTarget = 'vercel' | 'netlify' | 'aws' | 'gcp' | 'azure' | 'heroku';

export interface CICDConfig {
  platform: CICDPlatform;
  projectPath: string;
  projectName?: string;
  buildTool?: BuildTool;
  testCommand?: string;
  buildCommand?: string;
  deployTarget?: DeployTarget;
  nodeVersion?: string;
  javaVersion?: string;
  pythonVersion?: string;
}

export interface Pipeline {
  name: string;
  triggers: PipelineTrigger[];
  jobs: PipelineJob[];
  env?: Record<string, string>;
}

export interface PipelineTrigger {
  type: 'push' | 'pull_request' | 'schedule' | 'manual';
  branches?: string[];
  schedule?: string; // cron format
}

export interface PipelineJob {
  name: string;
  steps: PipelineStep[];
  runsOn?: string;
  env?: Record<string, string>;
  dependsOn?: string[];
}

export interface PipelineStep {
  name: string;
  command?: string;
  uses?: string; // Action/plugin
  with?: Record<string, any>;
  env?: Record<string, string>;
}

export interface CICDResult {
  success: boolean;
  platform: CICDPlatform;
  filePath?: string;
  content?: string;
  error?: string;
  duration: number;
}

// ============================================================================
// CI/CD Integrator Class
// ============================================================================

export class CICDIntegrator {
  /**
   * Generate CI/CD pipeline configuration
   */
  public async generatePipeline(config: CICDConfig): Promise<CICDResult> {
    const startTime = Date.now();

    try {
      const pipeline = this.createPipeline(config);
      const { content, filePath } = await this.renderPipeline(pipeline, config);

      // Write to project
      const fullPath = path.join(config.projectPath, filePath);
      const dir = path.dirname(fullPath);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(fullPath, content, 'utf-8');

      return {
        success: true,
        platform: config.platform,
        filePath,
        content,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        platform: config.platform,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Generate badge markdown for CI status
   */
  public generateBadge(config: CICDConfig, repoOwner: string, repoName: string): string {
    switch (config.platform) {
      case 'github-actions':
        return `![CI](https://github.com/${repoOwner}/${repoName}/actions/workflows/ci.yml/badge.svg)`;

      case 'gitlab-ci':
        return `![pipeline status](https://gitlab.com/${repoOwner}/${repoName}/badges/main/pipeline.svg)`;

      case 'circleci':
        return `![CircleCI](https://circleci.com/gh/${repoOwner}/${repoName}.svg?style=svg)`;

      case 'travis':
        return `![Build Status](https://travis-ci.com/${repoOwner}/${repoName}.svg?branch=main)`;

      default:
        return '';
    }
  }

  /**
   * Validate pipeline configuration
   */
  public async validatePipeline(filePath: string): Promise<boolean> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      YAML.parse(content); // Will throw if invalid
      return true;
    } catch {
      return false;
    }
  }

  // ========================================================================
  // Pipeline Creation Methods
  // ========================================================================

  /**
   * Create pipeline structure
   */
  private createPipeline(config: CICDConfig): Pipeline {
    return {
      name: config.projectName || 'CI/CD Pipeline',
      triggers: this.createTriggers(),
      jobs: this.createJobs(config),
      env: this.createEnv(config)
    };
  }

  /**
   * Create pipeline triggers
   */
  private createTriggers(): PipelineTrigger[] {
    return [
      {
        type: 'push',
        branches: ['main', 'develop']
      },
      {
        type: 'pull_request',
        branches: ['main']
      }
    ];
  }

  /**
   * Create pipeline jobs
   */
  private createJobs(config: CICDConfig): PipelineJob[] {
    const jobs: PipelineJob[] = [];

    // Build & Test job
    jobs.push({
      name: 'build-and-test',
      runsOn: 'ubuntu-latest',
      steps: [
        ...this.createSetupSteps(config),
        ...this.createInstallSteps(config),
        ...this.createBuildSteps(config),
        ...this.createTestSteps(config)
      ]
    });

    // Deploy job (if deploy target specified)
    if (config.deployTarget) {
      jobs.push({
        name: 'deploy',
        runsOn: 'ubuntu-latest',
        dependsOn: ['build-and-test'],
        steps: this.createDeploySteps(config)
      });
    }

    return jobs;
  }

  /**
   * Create environment variables
   */
  private createEnv(config: CICDConfig): Record<string, string> {
    const env: Record<string, string> = {};

    if (config.nodeVersion) {
      env.NODE_VERSION = config.nodeVersion;
    }

    return env;
  }

  /**
   * Create setup steps (checkout, runtime setup)
   */
  private createSetupSteps(config: CICDConfig): PipelineStep[] {
    const steps: PipelineStep[] = [
      {
        name: 'Checkout code',
        uses: 'actions/checkout@v4'
      }
    ];

    // Setup runtime based on project type
    if (config.nodeVersion || config.buildTool?.startsWith('npm')) {
      steps.push({
        name: 'Setup Node.js',
        uses: 'actions/setup-node@v4',
        with: {
          'node-version': config.nodeVersion || '20'
        }
      });
    }

    if (config.javaVersion) {
      steps.push({
        name: 'Setup Java',
        uses: 'actions/setup-java@v4',
        with: {
          'java-version': config.javaVersion,
          'distribution': 'temurin'
        }
      });
    }

    if (config.pythonVersion) {
      steps.push({
        name: 'Setup Python',
        uses: 'actions/setup-python@v5',
        with: {
          'python-version': config.pythonVersion
        }
      });
    }

    return steps;
  }

  /**
   * Create dependency installation steps
   */
  private createInstallSteps(config: CICDConfig): PipelineStep[] {
    const buildTool = config.buildTool || this.detectBuildTool(config.projectPath);

    const installCommands: Record<BuildTool, string> = {
      npm: 'npm ci',
      yarn: 'yarn install --frozen-lockfile',
      pnpm: 'pnpm install --frozen-lockfile',
      maven: 'mvn install -DskipTests',
      gradle: './gradlew build -x test',
      make: 'make deps'
    };

    return [
      {
        name: 'Install dependencies',
        command: installCommands[buildTool] || 'npm ci'
      }
    ];
  }

  /**
   * Create build steps
   */
  private createBuildSteps(config: CICDConfig): PipelineStep[] {
    const buildCommand = config.buildCommand || this.detectBuildCommand(config);

    if (!buildCommand) {
      return [];
    }

    return [
      {
        name: 'Build project',
        command: buildCommand
      }
    ];
  }

  /**
   * Create test steps
   */
  private createTestSteps(config: CICDConfig): PipelineStep[] {
    const testCommand = config.testCommand || this.detectTestCommand(config);

    if (!testCommand) {
      return [];
    }

    return [
      {
        name: 'Run tests',
        command: testCommand
      }
    ];
  }

  /**
   * Create deployment steps
   */
  private createDeploySteps(config: CICDConfig): PipelineStep[] {
    if (!config.deployTarget) {
      return [];
    }

    switch (config.deployTarget) {
      case 'vercel':
        return [
          {
            name: 'Deploy to Vercel',
            uses: 'amondnet/vercel-action@v25',
            with: {
              'vercel-token': '${{ secrets.VERCEL_TOKEN }}',
              'vercel-org-id': '${{ secrets.VERCEL_ORG_ID }}',
              'vercel-project-id': '${{ secrets.VERCEL_PROJECT_ID }}'
            }
          }
        ];

      case 'netlify':
        return [
          {
            name: 'Deploy to Netlify',
            uses: 'nwtgck/actions-netlify@v3',
            with: {
              'publish-dir': './dist',
              'production-branch': 'main',
              'github-token': '${{ secrets.GITHUB_TOKEN }}',
              'deploy-message': 'Deploy from GitHub Actions'
            }
          }
        ];

      case 'aws':
        return [
          {
            name: 'Configure AWS credentials',
            uses: 'aws-actions/configure-aws-credentials@v4',
            with: {
              'aws-access-key-id': '${{ secrets.AWS_ACCESS_KEY_ID }}',
              'aws-secret-access-key': '${{ secrets.AWS_SECRET_ACCESS_KEY }}',
              'aws-region': 'us-east-1'
            }
          },
          {
            name: 'Deploy to AWS',
            command: 'aws s3 sync ./dist s3://${{ secrets.S3_BUCKET }}'
          }
        ];

      default:
        return [];
    }
  }

  // ========================================================================
  // Platform-Specific Rendering
  // ========================================================================

  /**
   * Render pipeline to platform-specific format
   */
  private async renderPipeline(
    pipeline: Pipeline,
    config: CICDConfig
  ): Promise<{ content: string; filePath: string }> {
    switch (config.platform) {
      case 'github-actions':
        return this.renderGitHubActions(pipeline, config);

      case 'gitlab-ci':
        return this.renderGitLabCI(pipeline, config);

      case 'jenkins':
        return this.renderJenkins(pipeline, config);

      case 'circleci':
        return this.renderCircleCI(pipeline, config);

      case 'travis':
        return this.renderTravis(pipeline, config);

      default:
        throw new Error(`Unsupported platform: ${config.platform}`);
    }
  }

  /**
   * Render GitHub Actions workflow
   */
  private renderGitHubActions(pipeline: Pipeline, _config: CICDConfig): { content: string; filePath: string } {
    const workflow: any = {
      name: pipeline.name,
      on: {}
    };

    // Triggers
    for (const trigger of pipeline.triggers) {
      if (trigger.type === 'push' || trigger.type === 'pull_request') {
        workflow.on[trigger.type] = {
          branches: trigger.branches
        };
      }
    }

    // Jobs
    workflow.jobs = {};
    for (const job of pipeline.jobs) {
      const jobConfig: any = {
        'runs-on': job.runsOn || 'ubuntu-latest',
        steps: []
      };

      for (const step of job.steps) {
        const stepConfig: any = { name: step.name };

        if (step.uses) {
          stepConfig.uses = step.uses;
          if (step.with) {
            stepConfig.with = step.with;
          }
        } else if (step.command) {
          stepConfig.run = step.command;
        }

        jobConfig.steps.push(stepConfig);
      }

      if (job.dependsOn && job.dependsOn.length > 0) {
        jobConfig.needs = job.dependsOn;
      }

      workflow.jobs[job.name] = jobConfig;
    }

    const content = YAML.stringify(workflow);

    return {
      content,
      filePath: '.github/workflows/ci.yml'
    };
  }

  /**
   * Render GitLab CI configuration
   */
  private renderGitLabCI(pipeline: Pipeline, _config: CICDConfig): { content: string; filePath: string } {
    const gitlabConfig: any = {
      stages: pipeline.jobs.map(j => j.name)
    };

    for (const job of pipeline.jobs) {
      gitlabConfig[job.name] = {
        stage: job.name,
        script: job.steps
          .filter(s => s.command)
          .map(s => s.command)
      };

      if (job.dependsOn && job.dependsOn.length > 0) {
        gitlabConfig[job.name].needs = job.dependsOn;
      }
    }

    const content = YAML.stringify(gitlabConfig);

    return {
      content,
      filePath: '.gitlab-ci.yml'
    };
  }

  /**
   * Render Jenkins pipeline
   */
  private renderJenkins(pipeline: Pipeline, _config: CICDConfig): { content: string; filePath: string } {
    const stages = pipeline.jobs.map(job => {
      const commands = job.steps
        .filter(s => s.command)
        .map(s => s.command)
        .join('\n                ');

      return `        stage('${job.name}') {
            steps {
                ${commands}
            }
        }`;
    }).join('\n\n');

    const content = `pipeline {
    agent any

    stages {
${stages}
    }
}`;

    return {
      content,
      filePath: 'Jenkinsfile'
    };
  }

  /**
   * Render CircleCI configuration
   */
  private renderCircleCI(pipeline: Pipeline, _config: CICDConfig): { content: string; filePath: string } {
    const circleConfig: any = {
      version: 2.1,
      jobs: {},
      workflows: {
        main: {
          jobs: pipeline.jobs.map(j => j.name)
        }
      }
    };

    for (const job of pipeline.jobs) {
      circleConfig.jobs[job.name] = {
        docker: [{ image: 'cimg/node:20.0' }],
        steps: [
          'checkout',
          ...job.steps.map(s => ({ run: s.command }))
        ]
      };
    }

    const content = YAML.stringify(circleConfig);

    return {
      content,
      filePath: '.circleci/config.yml'
    };
  }

  /**
   * Render Travis CI configuration
   */
  private renderTravis(pipeline: Pipeline, config: CICDConfig): { content: string; filePath: string } {
    const travisConfig: any = {
      language: 'node_js',
      'node_js': [config.nodeVersion || '20'],
      script: []
    };

    for (const job of pipeline.jobs) {
      for (const step of job.steps) {
        if (step.command) {
          travisConfig.script.push(step.command);
        }
      }
    }

    const content = YAML.stringify(travisConfig);

    return {
      content,
      filePath: '.travis.yml'
    };
  }

  // ========================================================================
  // Detection Methods
  // ========================================================================

  /**
   * Detect build tool from project
   */
  /**
   * Detect build tool from project
   */
  private detectBuildTool(_projectPath: string): BuildTool {
    // Note: fs.access returns a Promise, cannot synchronously check in this context
    // This method would need refactoring to be async or use synchronous fs
    // For now, return default
    return 'npm';
  }

  /**
   * Detect build command
   */
  private detectBuildCommand(config: CICDConfig): string | null {
    const buildTool = config.buildTool || 'npm';

    const buildCommands: Partial<Record<BuildTool, string>> = {
      npm: 'npm run build',
      yarn: 'yarn build',
      pnpm: 'pnpm build',
      maven: 'mvn package',
      gradle: './gradlew build'
    };

    return buildCommands[buildTool] || null;
  }

  /**
   * Detect test command
   */
  private detectTestCommand(config: CICDConfig): string | null {
    const buildTool = config.buildTool || 'npm';

    const testCommands: Partial<Record<BuildTool, string>> = {
      npm: 'npm test',
      yarn: 'yarn test',
      pnpm: 'pnpm test',
      maven: 'mvn test',
      gradle: './gradlew test'
    };

    return testCommands[buildTool] || null;
  }
}
