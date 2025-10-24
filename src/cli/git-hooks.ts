/**
 * Git Hook Installer
 *
 * Installs and manages git pre-commit and pre-push hooks for AIWG validation.
 */

import { readFile, writeFile, chmod, access, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve } from 'path';
import { constants } from 'fs';

export type HookType = 'pre-commit' | 'pre-push';

export interface HookInstallOptions {
  force?: boolean; // Overwrite existing hook
  append?: boolean; // Append to existing hook
  configPath?: string; // Path to .aiwgrc.json
}

/**
 * Git Hook Installer
 */
export class GitHookInstaller {
  private projectRoot: string;
  private hooksDir: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
    this.hooksDir = resolve(projectRoot, '.git', 'hooks');
  }

  /**
   * Install pre-commit hook
   */
  async installPreCommitHook(options: HookInstallOptions = {}): Promise<void> {
    const hookContent = this.generatePreCommitHook(options.configPath);
    await this.installHook('pre-commit', hookContent, options);
  }

  /**
   * Install pre-push hook
   */
  async installPrePushHook(options: HookInstallOptions = {}): Promise<void> {
    const hookContent = this.generatePrePushHook(options.configPath);
    await this.installHook('pre-push', hookContent, options);
  }

  /**
   * Uninstall hooks
   */
  async uninstallHooks(projectRoot: string): Promise<void> {
    const hooksToRemove: HookType[] = ['pre-commit', 'pre-push'];

    for (const hookType of hooksToRemove) {
      const hookPath = resolve(projectRoot, '.git', 'hooks', hookType);

      if (existsSync(hookPath)) {
        const content = await readFile(hookPath, 'utf-8');

        // Only remove if it's our hook
        if (content.includes('# AIWG')) {
          // Check if there's other content
          const lines = content.split('\n');
          const aiwgStart = lines.findIndex(l => l.includes('# AIWG'));
          const aiwgEnd = lines.findIndex((l, i) => i > aiwgStart && l.includes('# END AIWG'));

          if (aiwgStart >= 0 && aiwgEnd >= 0) {
            // Remove only AIWG section
            const newContent = [
              ...lines.slice(0, aiwgStart),
              ...lines.slice(aiwgEnd + 1)
            ].join('\n');

            if (newContent.trim().length > 0) {
              await writeFile(hookPath, newContent, 'utf-8');
            } else {
              // File would be empty, remove it
              await this.removeFile(hookPath);
            }
          } else {
            // Entire file is AIWG hook, remove it
            await this.removeFile(hookPath);
          }
        }
      }
    }
  }

  /**
   * Check if hook is installed
   */
  isInstalled(hookType: HookType): boolean {
    const hookPath = resolve(this.hooksDir, hookType);

    if (!existsSync(hookPath)) {
      return false;
    }

    try {
      const content = require('fs').readFileSync(hookPath, 'utf-8');
      return content.includes('# AIWG');
    } catch {
      return false;
    }
  }

  /**
   * Get hook content
   */
  async getHookContent(hookType: HookType): Promise<string | null> {
    const hookPath = resolve(this.hooksDir, hookType);

    if (!existsSync(hookPath)) {
      return null;
    }

    return await readFile(hookPath, 'utf-8');
  }

  /**
   * Verify git repository
   */
  isGitRepository(): boolean {
    return existsSync(resolve(this.projectRoot, '.git'));
  }

  // Private methods

  private async installHook(
    hookType: HookType,
    content: string,
    options: HookInstallOptions
  ): Promise<void> {
    // Verify git repository
    if (!this.isGitRepository()) {
      throw new Error('Not a git repository');
    }

    // Ensure hooks directory exists
    if (!existsSync(this.hooksDir)) {
      await mkdir(this.hooksDir, { recursive: true });
    }

    const hookPath = resolve(this.hooksDir, hookType);

    // Check if hook already exists
    if (existsSync(hookPath) && !options.force && !options.append) {
      throw new Error(`Hook ${hookType} already exists. Use --force to overwrite or --append to add to existing hook.`);
    }

    let finalContent = content;

    if (options.append && existsSync(hookPath)) {
      // Append to existing hook
      const existing = await readFile(hookPath, 'utf-8');

      // Check if AIWG section already exists
      if (existing.includes('# AIWG')) {
        throw new Error(`AIWG hook already exists in ${hookType}. Use --force to overwrite.`);
      }

      finalContent = `${existing}\n\n${content}`;
    }

    // Write hook file
    await writeFile(hookPath, finalContent, 'utf-8');

    // Make executable
    await chmod(hookPath, 0o755);
  }

  private generatePreCommitHook(configPath?: string): string {
    const configArg = configPath ? ` --config ${configPath}` : '';

    return `#!/bin/sh
# AIWG pre-commit hook
# Validates staged markdown and text files before commit

echo "Running AIWG validation..."

# Get staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep -E '\\.(md|txt)$' || true)

if [ -z "$STAGED_FILES" ]; then
  echo "No markdown or text files to validate"
  exit 0
fi

# Run AIWG workflow
node tools/cli/aiwg.mjs workflow $STAGED_FILES${configArg}
RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "AIWG validation failed. Please fix issues before committing."
  echo "To bypass this check, use: git commit --no-verify"
  exit 1
fi

echo "AIWG validation passed"
exit 0

# END AIWG
`;
  }

  private generatePrePushHook(configPath?: string): string {
    const configArg = configPath ? ` --config ${configPath}` : '';

    return `#!/bin/sh
# AIWG pre-push hook
# Validates all markdown and text files before push

echo "Running AIWG validation before push..."

# Find all markdown and text files
FILES=$(find . -type f \\( -name "*.md" -o -name "*.txt" \\) -not -path "*/node_modules/*" -not -path "*/.git/*" || true)

if [ -z "$FILES" ]; then
  echo "No markdown or text files to validate"
  exit 0
fi

# Run AIWG workflow
node tools/cli/aiwg.mjs workflow $FILES${configArg}
RESULT=$?

if [ $RESULT -ne 0 ]; then
  echo ""
  echo "AIWG validation failed. Please fix issues before pushing."
  echo "To bypass this check, use: git push --no-verify"
  exit 1
fi

echo "AIWG validation passed"
exit 0

# END AIWG
`;
  }

  private async removeFile(path: string): Promise<void> {
    const fs = await import('fs/promises');
    await fs.unlink(path);
  }

  /**
   * List all installed hooks
   */
  async listInstalledHooks(): Promise<HookType[]> {
    const installed: HookType[] = [];
    const hookTypes: HookType[] = ['pre-commit', 'pre-push'];

    for (const hookType of hookTypes) {
      if (this.isInstalled(hookType)) {
        installed.push(hookType);
      }
    }

    return installed;
  }

  /**
   * Validate hook installation
   */
  async validateHook(hookType: HookType): Promise<{ valid: boolean; error?: string }> {
    const hookPath = resolve(this.hooksDir, hookType);

    if (!existsSync(hookPath)) {
      return { valid: false, error: 'Hook file does not exist' };
    }

    try {
      // Check if executable
      await access(hookPath, constants.X_OK);
    } catch {
      return { valid: false, error: 'Hook file is not executable' };
    }

    // Check if contains AIWG marker
    const content = await readFile(hookPath, 'utf-8');
    if (!content.includes('# AIWG')) {
      return { valid: false, error: 'Hook does not contain AIWG marker' };
    }

    return { valid: true };
  }
}
