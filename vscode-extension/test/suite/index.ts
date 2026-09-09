/**
 * Test suite index — discovered by @vscode/test-electron.
 */

import * as path from 'path';
import Mocha from 'mocha';
import * as fs from 'fs/promises';

async function discoverTests(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await discoverTests(file));
    else if (entry.isFile() && entry.name.endsWith('.test.js')) files.push(file);
  }
  return files.sort();
}

export async function run(): Promise<void> {
  const mocha = new Mocha({ ui: 'tdd', color: true, timeout: 10000 });
  const testsRoot = path.resolve(__dirname, '.');
  const files = await discoverTests(testsRoot);
  if (!files.length) throw new Error('No compiled extension test files were discovered');
  for (const f of files.sort()) mocha.addFile(path.resolve(testsRoot, f));
  await mocha.loadFilesAsync();
  const registered: string[] = [];
  mocha.suite.eachTest(test => registered.push(test.fullTitle()));
  if (!registered.length) throw new Error('Extension test files registered zero cases');

  return new Promise((resolve, reject) => {
    const cases: { name: string; status: string; duration?: number; error?: string }[] = [];
    const runner = mocha.run(async (failures) => {
      try {
        if (process.env.AIWG_EXTENSION_TEST_REPORT) {
          await fs.writeFile(process.env.AIWG_EXTENSION_TEST_REPORT, JSON.stringify({
            files, registered, cases, stats: runner.stats,
          }, null, 2) + '\n');
        }
        if (failures > 0) reject(new Error(`${failures} tests failed`));
        else if (cases.length !== registered.length || cases.some(test => test.status !== 'passed')) {
          reject(new Error('Not every registered extension test passed'));
        } else resolve();
      } catch (error) { reject(error); }
    });
    runner.on('test end', test => cases.push({
      name: test.fullTitle(), status: test.state ?? 'unknown', duration: test.duration,
      ...(test.err ? { error: test.err.message } : {}),
    }));
  });
}
