import { spawn } from 'node:child_process';

export const ANTIGRAVITY_CONTRACT_VERSION = '1.0.0';
export const ANTIGRAVITY_QUALIFIED_CLI_VERSION = '1.1.26';

function nonEmptyString(value, name) {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`Antigravity ${name} must be a non-empty string`);
  return value;
}

export function buildAntigravityArgs(prompt, options = {}) {
  const args = ['-p', nonEmptyString(prompt, 'prompt')];
  if (options.outputFormat === 'stream-json') {
    args.push('--output-format', 'stream-json');
  } else {
    args.push('--output-format', 'json');
  }
  if (options.agent) args.push('--agent', String(options.agent));
  if (options.model) args.push('--model', String(options.model));
  if (options.effort) {
    if (!['low', 'medium', 'high'].includes(options.effort)) throw new Error(`Unsupported Antigravity effort '${options.effort}'`);
    args.push('--effort', options.effort);
  }
  if (options.mode) {
    if (!['accept-edits', 'plan'].includes(options.mode)) throw new Error(`Unsupported Antigravity mode '${options.mode}'`);
    args.push('--mode', options.mode);
  }
  if (options.sandbox) args.push('--sandbox');
  if (options.continue === true) args.push('--continue');
  if (options.conversation) args.push('--conversation', String(options.conversation));
  if (options.dangerous === true) args.unshift('--dangerously-skip-permissions');
  return args;
}

export function parseAntigravityJson(input) {
  let value;
  try { value = typeof input === 'string' ? JSON.parse(input) : input; }
  catch (error) { throw new Error(`Invalid Antigravity JSON output: ${error.message}`); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid Antigravity JSON envelope: expected object');
  nonEmptyString(value.conversation_id, 'conversation_id');
  nonEmptyString(value.status, 'status');
  if (typeof value.response !== 'string') throw new Error('Invalid Antigravity JSON envelope: response must be a string');
  if (value.error !== undefined && typeof value.error !== 'string') throw new Error('Invalid Antigravity JSON envelope: error must be a string');
  return value;
}

export function parseAntigravityStream(input) {
  const lines = String(input).split(/\r?\n/).filter(line => line.trim());
  if (!lines.length) throw new Error('Invalid Antigravity stream: no events');
  const events = lines.map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`Invalid Antigravity stream event ${index}: ${error.message}`); }
  });
  if (events[0]?.event !== 'init') throw new Error('Invalid Antigravity stream: first event must be init');
  const results = events.filter(event => event?.event === 'result');
  if (results.length !== 1 || events.at(-1)?.event !== 'result') throw new Error('Invalid Antigravity stream: exactly one terminal result is required');
  for (const [index, event] of events.entries()) {
    if (!['init', 'step_update', 'result'].includes(event?.event)) throw new Error(`Invalid Antigravity stream event ${index}: unknown event`);
    if (event.event === 'init') {
      nonEmptyString(event.conversation_id, 'conversation_id');
      if (!event.init || typeof event.init !== 'object' || Array.isArray(event.init)) {
        throw new Error(`Invalid Antigravity stream event ${index}: init payload must be an object`);
      }
    }
    if (event.event === 'step_update') {
      if (!event.step_update || typeof event.step_update !== 'object' || Array.isArray(event.step_update)) {
        throw new Error(`Invalid Antigravity stream event ${index}: step_update payload must be an object`);
      }
      if (!['ACTIVE', 'DONE'].includes(event.step_update.state)) {
        throw new Error(`Invalid Antigravity stream event ${index}: unknown state`);
      }
    }
  }
  parseAntigravityJson(results[0].result);
  return events;
}

export function runAntigravity(prompt, options = {}) {
  const timeoutMs = options.timeoutMs ?? 300_000;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1) throw new Error('Antigravity timeoutMs must be a positive integer');
  const binary = options.binary || 'agy';
  const args = buildAntigravityArgs(prompt, options);
  return new Promise((resolve, reject) => {
    const child = (options.spawnImpl || spawn)(binary, args, {
      cwd: options.cwd,
      env: options.env || process.env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: false,
    });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const timer = setTimeout(() => {
      settled = true;
      child.kill('SIGTERM');
      reject(new Error(`Antigravity invocation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
    child.stdout.on('data', chunk => { stdout += chunk; });
    child.stderr.on('data', chunk => { stderr += chunk; });
    child.on('error', error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      reject(new Error(`Unable to start Antigravity CLI (${binary}): ${error.message}`));
    });
    child.on('close', code => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (code !== 0) {
        const diagnostic = stderr.trim() || 'no diagnostic output';
        reject(new Error(`Antigravity CLI exited ${code}: ${diagnostic}`));
        return;
      }
      try {
        const output = options.outputFormat === 'stream-json'
          ? parseAntigravityStream(stdout)
          : parseAntigravityJson(stdout);
        resolve({ output, stderr, exitCode: code });
      } catch (error) { reject(error); }
    });
    child.stdin.end();
  });
}
