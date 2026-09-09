/**
 * VS Code Extension Test Runner
 * Uses @vscode/test-electron to launch the Extension Development Host.
 */

import * as path from 'path';
import * as fs from 'fs/promises';
import * as os from 'os';
import { runTests } from '@vscode/test-electron';

async function main(): Promise<void> {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, './suite/index');
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-extension-host-'));
  try {
    const workspace = path.join(temporary, 'workspace');
    await fs.mkdir(path.join(workspace, '.vscode'), { recursive: true });
    await fs.writeFile(path.join(workspace, '.vscode/settings.json'), JSON.stringify({
      'aiwg.init.autoPrompt': false, 'aiwg.mcp.autoStart': false,
    }));
    await runTests({
      extensionDevelopmentPath, extensionTestsPath,
      ...(process.env.AIWG_VSCODE_EXECUTABLE ? { vscodeExecutablePath: process.env.AIWG_VSCODE_EXECUTABLE } : {}),
      launchArgs: [workspace, '--disable-extensions', '--skip-welcome', '--skip-release-notes',
        '--disable-workspace-trust', '--disable-gpu',
        `--user-data-dir=${path.join(temporary, 'user-data')}`,
        `--extensions-dir=${path.join(temporary, 'extensions')}`],
    });
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
}

main().catch((err: unknown) => {
  console.error('Failed to run tests', err);
  process.exit(1);
});
