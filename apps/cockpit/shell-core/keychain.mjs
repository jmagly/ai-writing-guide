import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const SERVICE = 'aiwg-cockpit-bridge';
const FOLDER = 'AIWG Cockpit';

function collect(cmd, args, input, timeoutMs = 2_000) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      p.kill();
      reject(new Error(`${cmd} timed out`));
    }, timeoutMs);
    p.stdout.on('data', (d) => { stdout += d; });
    p.stderr.on('data', (d) => { stderr += d; });
    p.once('error', (err) => { clearTimeout(timer); reject(err); });
    p.once('close', (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `${cmd} exit ${code}`));
    });
    if (input !== undefined) p.stdin.end(input);
    else p.stdin.end();
  });
}

async function canRun(cmd) {
  try {
    if (process.platform === 'win32') await collect('where', [cmd]);
    else await collect('sh', ['-lc', `command -v ${cmd}`]);
    return true;
  } catch {
    return false;
  }
}

/**
 * Build the cross-platform keychain adapter around injectable platform and
 * process seams. Production uses the defaults below; tests exercise the exact
 * argv/stdin contract for every OS without pretending the CI host is macOS or
 * Windows.
 */
export function createKeychainAdapter({
  os = platform(),
  env = process.env,
  run = collect,
  commandAvailable = canRun,
} = {}) {
  const wallet = env.AIWG_COCKPIT_KWALLET || 'kdewallet';

  async function windowsPowerShell() {
    if (await commandAvailable('powershell')) return 'powershell';
    if (await commandAvailable('pwsh')) return 'pwsh';
    throw new Error('no supported Windows PowerShell command found');
  }

  async function storeWindowsCredential(token, account) {
    const ps = await windowsPowerShell();
    const script = [
      '[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]',
      '$vault = New-Object Windows.Security.Credentials.PasswordVault',
      'try { $vault.Remove($vault.Retrieve($args[0], $args[1])) } catch {}',
      '$password = [Console]::In.ReadToEnd()',
      '$credential = New-Object Windows.Security.Credentials.PasswordCredential -ArgumentList $args[0], $args[1], $password',
      '$vault.Add($credential)',
    ].join('; ');
    await run(ps, ['-NoProfile', '-NonInteractive', '-Command', script, SERVICE, account], token);
    return { backend: 'windows-credential-manager', service: SERVICE, account, target: `${SERVICE}:${account}` };
  }

  async function readWindowsCredential(ref) {
    const ps = await windowsPowerShell();
    const script = [
      '[void][Windows.Security.Credentials.PasswordVault,Windows.Security.Credentials,ContentType=WindowsRuntime]',
      '$vault = New-Object Windows.Security.Credentials.PasswordVault',
      '$credential = $vault.Retrieve($args[0], $args[1])',
      '$credential.RetrievePassword()',
      '[Console]::Out.Write($credential.Password)',
    ].join('; ');
    return (await run(ps, ['-NoProfile', '-NonInteractive', '-Command', script, ref.service || SERVICE, ref.account])).trim();
  }

  return {
    async store(token, account = `bridge-${process.pid}`) {
      if (env.AIWG_COCKPIT_KEYCHAIN_DISABLED === '1') {
        throw new Error('OS keychain disabled by AIWG_COCKPIT_KEYCHAIN_DISABLED');
      }
      if (os === 'darwin' && await commandAvailable('security')) {
        await run('security', ['add-generic-password', '-a', account, '-s', SERVICE, '-w', token, '-U']);
        return { backend: 'macos-keychain', service: SERVICE, account };
      }
      if (os === 'win32') return storeWindowsCredential(token, account);
      if (await commandAvailable('secret-tool')) {
        await run('secret-tool', ['store', '--label', 'AIWG Cockpit Bridge', 'service', SERVICE, 'account', account], token);
        return { backend: 'libsecret', service: SERVICE, account };
      }
      if (env.AIWG_COCKPIT_ENABLE_KWALLET === '1' && await commandAvailable('kwallet-query')) {
        await run('kwallet-query', ['-f', FOLDER, '-w', account, wallet], token);
        return { backend: 'kwallet', service: SERVICE, account, wallet, folder: FOLDER };
      }
      throw new Error('no supported OS keychain command found');
    },

    async read(ref) {
      if (!ref || typeof ref !== 'object') throw new Error('missing keychain reference');
      if (ref.backend === 'macos-keychain') {
        return (await run('security', ['find-generic-password', '-a', ref.account, '-s', ref.service || SERVICE, '-w'])).trim();
      }
      if (ref.backend === 'windows-credential-manager') return readWindowsCredential(ref);
      if (ref.backend === 'libsecret') {
        return (await run('secret-tool', ['lookup', 'service', ref.service || SERVICE, 'account', ref.account])).trim();
      }
      if (ref.backend === 'kwallet') {
        return (await run('kwallet-query', ['-f', ref.folder || FOLDER, '-r', ref.account, ref.wallet || wallet])).trim();
      }
      throw new Error(`unsupported keychain backend: ${ref.backend}`);
    },
  };
}

export async function storeCockpitToken(token, account = `bridge-${process.pid}`) {
  return createKeychainAdapter().store(token, account);
}

export async function readCockpitToken(ref) {
  return createKeychainAdapter().read(ref);
}
