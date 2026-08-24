import { execFileSync } from 'node:child_process';

function quoteCmdArgument(value) {
  return `"${String(value).replace(/%/g, '%%').replace(/"/g, '""')}"`;
}

/**
 * Resolve a package-manager invocation without asking Node to execute a
 * Windows command script directly. Node rejects direct .cmd/.bat execution on
 * current Windows releases; cmd.exe is the native interpreter for those files.
 */
export function resolveManagerCommand(file, args, options = {}) {
  const platform = options.platform ?? process.platform;
  if (platform !== 'win32' || !/\.(?:cmd|bat)$/i.test(file)) {
    return { file, args };
  }

  const env = options.env ?? process.env;
  const commandInterpreter = env.ComSpec || env.COMSPEC || 'cmd.exe';
  const command = `"${[file, ...args].map(quoteCmdArgument).join(' ')}"`;
  return {
    file: commandInterpreter,
    args: ['/d', '/s', '/c', command],
  };
}

export function executeManagerCommand(file, args, options = {}) {
  const invocation = resolveManagerCommand(file, args, options);
  const execute = options.execute ?? execFileSync;
  return execute(invocation.file, invocation.args, options.execOptions ?? { stdio: 'inherit' });
}
