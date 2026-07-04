import { spawn } from 'node:child_process';
import { platform } from 'node:os';

const SERVICE = 'aiwg-cockpit-bridge';
const FOLDER = 'AIWG Cockpit';
const WALLET = process.env.AIWG_COCKPIT_KWALLET || 'kdewallet';

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

export async function storeCockpitToken(token, account = `bridge-${process.pid}`) {
  if (process.env.AIWG_COCKPIT_KEYCHAIN_DISABLED === '1') {
    throw new Error('OS keychain disabled by AIWG_COCKPIT_KEYCHAIN_DISABLED');
  }
  const os = platform();
  if (os === 'darwin' && await canRun('security')) {
    await collect('security', ['add-generic-password', '-a', account, '-s', SERVICE, '-w', token, '-U']);
    return { backend: 'macos-keychain', service: SERVICE, account };
  }
  if (os === 'win32' && await canRun('cmdkey')) {
    const target = `${SERVICE}:${account}`;
    await collect('cmdkey', [`/generic:${target}`, `/user:${account}`, `/pass:${token}`]);
    return { backend: 'windows-credential-manager', service: SERVICE, account, target };
  }
  if (await canRun('secret-tool')) {
    await collect('secret-tool', ['store', '--label', 'AIWG Cockpit Bridge', 'service', SERVICE, 'account', account], token);
    return { backend: 'libsecret', service: SERVICE, account };
  }
  if (process.env.AIWG_COCKPIT_ENABLE_KWALLET === '1' && await canRun('kwallet-query')) {
    await collect('kwallet-query', ['-f', FOLDER, '-w', account, WALLET], token);
    return { backend: 'kwallet', service: SERVICE, account, wallet: WALLET, folder: FOLDER };
  }
  throw new Error('no supported OS keychain command found');
}

export async function readCockpitToken(ref) {
  if (!ref || typeof ref !== 'object') throw new Error('missing keychain reference');
  if (ref.backend === 'macos-keychain') {
    return (await collect('security', ['find-generic-password', '-a', ref.account, '-s', ref.service || SERVICE, '-w'])).trim();
  }
  if (ref.backend === 'windows-credential-manager') {
    throw new Error('Windows Credential Manager read requires the shell-provided runtime token until native shell integration lands');
  }
  if (ref.backend === 'libsecret') {
    return (await collect('secret-tool', ['lookup', 'service', ref.service || SERVICE, 'account', ref.account])).trim();
  }
  if (ref.backend === 'kwallet') {
    return (await collect('kwallet-query', ['-f', ref.folder || FOLDER, '-r', ref.account, ref.wallet || WALLET])).trim();
  }
  throw new Error(`unsupported keychain backend: ${ref.backend}`);
}
