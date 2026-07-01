#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const root = process.cwd();
const disclosureDir = path.join(root, '.aiwg', 'security-engineering', 'reviews', 'disclosures');

function parseArgs(argv) {
  const args = { config: null, channel: 'primary', interactive: false, json: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--config' && argv[i + 1]) args.config = argv[++i];
    else if (a === '--channel' && argv[i + 1]) args.channel = argv[++i];
    else if (a === '--interactive') args.interactive = true;
    else if (a === '--json') args.json = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: report.mjs [--config <path>] [--channel primary|fallback] [--interactive] [--json]');
      process.exit(0);
    }
  }
  return args;
}

function readPolicy(configPath) {
  const candidates = [
    configPath,
    path.join(root, '.aiwg', 'security', 'disclosure-config.yaml'),
    path.join(root, 'SECURITY.md'),
    path.join(root, 'docs', 'SECURITY.md'),
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const text = fs.readFileSync(candidate, 'utf8');
    return { path: candidate, ...parsePolicyText(text) };
  }
  return null;
}

function parsePolicyText(text) {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || null;
  const advisory = text.match(/https?:\/\/\S*security\/advisories\/new/i)?.[0] || null;
  const form = text.match(/https?:\/\/\S*(?:security|disclosure|vulnerability)\S*/i)?.[0] || null;
  const fingerprint = text.match(/(?:fingerprint|pgp|gpg)[^A-F0-9]*([A-F0-9]{40,64})/i)?.[1] || null;
  const ackMatch = text.match(/(\d+)\s*(?:h|hour|hours|day|days)\s*(?:ack|acknowledg)/i);
  const embargoMatch = text.match(/(\d+)\s*(?:calendar\s*)?days?[^\n]*(?:disclosure|embargo|window)/i);
  const primary = advisory || email || form;
  return {
    primaryChannel: primary,
    fallbackChannel: email && email !== primary ? email : null,
    pgpFingerprint: fingerprint,
    ackWindow: ackMatch ? ackMatch[0] : '24 hours',
    embargoDays: embargoMatch ? Number(embargoMatch[1]) : 90,
  };
}

async function collect(interactive) {
  if (!interactive) {
    return {
      affected: process.env.AIWG_DISCLOSURE_AFFECTED || 'unspecified',
      className: process.env.AIWG_DISCLOSURE_CLASS || 'unspecified',
      severity: process.env.AIWG_DISCLOSURE_SEVERITY || 'medium',
      impact: process.env.AIWG_DISCLOSURE_IMPACT || 'provided out-of-band',
      reproduction: process.env.AIWG_DISCLOSURE_REPRO || 'provided out-of-band',
      discovery: process.env.AIWG_DISCLOSURE_DISCOVERY || 'unspecified',
      contact: process.env.AIWG_DISCLOSURE_CONTACT || 'anonymous',
      credit: process.env.AIWG_DISCLOSURE_CREDIT || 'anonymous',
    };
  }
  const rl = readline.createInterface({ input, output });
  try {
    const ask = async (q) => (await rl.question(`${q}: `)).trim();
    return {
      affected: await ask('Affected version(s) or commit'),
      className: await ask('Vulnerability class'),
      severity: await ask('Severity (critical/high/medium/low)'),
      impact: await ask('Impact'),
      reproduction: await ask('Minimal reproduction steps'),
      discovery: await ask('Discovery context'),
      contact: await ask('Reporter contact'),
      credit: await ask('Credit preference'),
    };
  } finally {
    rl.close();
  }
}

function hashContact(contact) {
  return crypto.createHash('sha256').update(contact || 'anonymous').digest('hex').slice(0, 16);
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function caseId(now) {
  const stamp = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `SEC-${stamp}-${crypto.randomBytes(3).toString('hex')}`;
}

function writeCustody(id, policy, report, channel, now) {
  fs.mkdirSync(disclosureDir, { recursive: true });
  const ackDays = /day/i.test(policy.ackWindow) ? Number(policy.ackWindow.match(/\d+/)?.[0] || 1) : 1;
  const ackDeadline = addDays(now, ackDays);
  const embargoEnd = addDays(now, policy.embargoDays || 90);
  const content = `# Disclosure Case: ${id}\n\n` +
    `- **Received**: ${now.toISOString()}\n` +
    `- **Channel**: ${channel}\n` +
    `- **Reporter**: ${report.credit || 'anonymous'}\n` +
    `- **Contact hash**: ${hashContact(report.contact)}\n` +
    `- **Vulnerability class**: ${report.className}\n` +
    `- **Reporter severity assessment**: ${report.severity}\n` +
    `- **Routing destination**: ${channel === 'fallback' ? policy.fallbackChannel || policy.primaryChannel : policy.primaryChannel}\n` +
    `- **Acknowledgment commitment**: by ${ackDeadline.toISOString()}\n` +
    `- **Embargo default**: ${embargoEnd.toISOString()}\n\n` +
    `## Routing Evidence\n\nPolicy: ${path.relative(root, policy.path)}\n\n` +
    `## Intake Summary\n\n` +
    `- Affected: ${report.affected}\n` +
    `- Discovery: ${report.discovery}\n\n` +
    `## Next Steps\n\n` +
    `- [ ] Maintainer acknowledges by ${ackDeadline.toISOString()}\n` +
    `- [ ] Triage assigns severity and assignee within 7 days\n` +
    `- [ ] Fix tracked privately until disclosure\n` +
    `- [ ] Public advisory prepared before ${embargoEnd.toISOString()}\n`;
  const file = path.join(disclosureDir, `${id}.md`);
  fs.writeFileSync(file, content);
  return { file, ackDeadline, embargoEnd };
}

const args = parseArgs(process.argv.slice(2));
const policy = readPolicy(args.config);
if (!policy || !policy.primaryChannel) {
  console.error('No private disclosure policy found. Add SECURITY.md or .aiwg/security/disclosure-config.yaml before collecting vulnerability details.');
  process.exit(1);
}
const report = await collect(args.interactive);
const now = new Date();
const id = caseId(now);
const custody = writeCustody(id, policy, report, args.channel, now);
const result = {
  caseId: id,
  routedVia: args.channel,
  destination: args.channel === 'fallback' ? policy.fallbackChannel || policy.primaryChannel : policy.primaryChannel,
  custodyRecord: path.relative(root, custody.file),
  acknowledgmentBy: custody.ackDeadline.toISOString(),
  embargoEnds: custody.embargoEnd.toISOString(),
  pgpFingerprint: policy.pgpFingerprint,
};
if (args.json) console.log(JSON.stringify(result, null, 2));
else {
  console.log('Report received and routed to private channel.');
  console.log(`Case ID:        ${result.caseId}`);
  console.log(`Routed via:     ${result.destination}`);
  console.log(`Custody record: ${result.custodyRecord}`);
  console.log(`Ack expected:   ${result.acknowledgmentBy}`);
  console.log(`Embargo ends:   ${result.embargoEnds}`);
  if (result.pgpFingerprint) console.log(`PGP fingerprint declared: ${result.pgpFingerprint}`);
}
