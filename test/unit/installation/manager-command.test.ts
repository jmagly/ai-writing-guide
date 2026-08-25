import { describe, expect, it, vi } from 'vitest';
import { executeManagerCommand } from '../../../src/installation/manager-command.mjs';

describe('executeManagerCommand', () => {
  it('hands a quoted Windows wrapper payload to cmd.exe verbatim', () => {
    const execute = vi.fn();

    executeManagerCommand(
      'C:\\Program Files\\nodejs\\npm.cmd',
      ['install', '--global', 'aiwg@latest'],
      {
        platform: 'win32',
        env: { ComSpec: 'C:\\Windows\\System32\\cmd.exe' },
        execute,
      },
    );

    expect(execute).toHaveBeenCalledWith(
      'C:\\Windows\\System32\\cmd.exe',
      [
        '/d',
        '/s',
        '/c',
        '""C:\\Program Files\\nodejs\\npm.cmd" "install" "--global" "aiwg@latest""',
      ],
      { stdio: 'inherit', windowsVerbatimArguments: true },
    );
  });

  it('preserves manager-probe execution options when enabling verbatim arguments', () => {
    const execute = vi.fn();
    const execOptions = {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 10_000,
    };

    executeManagerCommand('C:\\Program Files\\nodejs\\npm.cmd', ['--version'], {
      platform: 'win32',
      execute,
      execOptions,
    });

    expect(execute).toHaveBeenCalledWith(
      'cmd.exe',
      ['/d', '/s', '/c', '""C:\\Program Files\\nodejs\\npm.cmd" "--version""'],
      { ...execOptions, windowsVerbatimArguments: true },
    );
    expect(execOptions).not.toHaveProperty('windowsVerbatimArguments');
  });

  it('does not enable Windows verbatim arguments for native executables', () => {
    const execute = vi.fn();

    executeManagerCommand('/usr/local/bin/npm', ['--version'], {
      platform: 'linux',
      execute,
    });

    expect(execute).toHaveBeenCalledWith(
      '/usr/local/bin/npm',
      ['--version'],
      { stdio: 'inherit' },
    );
  });
});
