#!/usr/bin/env node
/**
 * Prefill card metadata (Owner) using a team profile mapping.
 *
 * Usage:
 *   node tools/cards/prefill-cards.mjs --target <path> --team <team-profile.(yml|yaml|json)> [--write]
 */
import fs from 'fs';
import path from 'path';

function parseArgs() {
  const args = process.argv.slice(2);
  let target = null;
  let team = null;
  let write = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--target' && args[i + 1]) target = path.resolve(args[++i]);
    else if (a === '--team' && args[i + 1]) team = path.resolve(args[++i]);
    else if (a === '--write') write = true;
  }
  if (!target || !team) {
    console.error('Usage: prefill-cards.mjs --target <path> --team <team-profile.yaml> [--write]');
    process.exit(1);
  }
  return { target, team, write };
}

function listMdFiles(dir) {
  const out = [];
  function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.name === 'node_modules' || e.name === '.git' || e.name === '.claude') continue;
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name.toLowerCase().endsWith('.md')) out.push(p);
    }
  }
  walk(dir);
  return out;
}

function parseTeamProfile(file) {
  const txt = fs.readFileSync(file, 'utf8');
  let roles = {};
  if (file.endsWith('.json')) {
    const json = JSON.parse(txt);
    roles = json.roles || {};
  } else {
    // Very simple YAML: scan lines under roles:
    const lines = txt.split(/\r?\n/);
    let inRoles = false;
    for (const raw of lines) {
      const line = raw.trim();
      if (line.startsWith('roles:')) { inRoles = true; continue; }
      if (inRoles) {
        if (!line || /^[^\s].*:/.test(line)) { // next top-level or blank
          if (line && !line.startsWith('roles:')) inRoles = false;
        }
        const m = line.match(/^([a-zA-Z0-9_\-]+):\s*"?([^"#]+)"?/);
        if (m) {
          const key = m[1];
          const val = m[2].trim();
          roles[key] = val;
        }
      }
    }
  }
  return roles;
}

const roleNameToKey = new Map([
  ['Requirements Analyst', 'requirements_analyst'],
  ['System Analyst', 'system_analyst'],
  ['Architecture Designer', 'architecture_designer'],
  ['API Designer', 'api_designer'],
  ['Software Implementer', 'software_implementer'],
  ['Test Architect', 'test_architect'],
  ['Test Engineer', 'test_engineer'],
  ['Security Architect', 'security_architect'],
  ['Reliability Engineer', 'reliability_engineer'],
  ['Deployment Manager', 'deployment_manager'],
  ['Configuration Manager', 'configuration_manager'],
  ['Project Manager', 'project_manager'],
  ['Product Strategist', 'product_strategist'],
  ['Vision Owner', 'vision_owner']
]);

function prefillOwnerLine(line, rolesMap) {
  // Match pattern: - Owner: <Role Name> (docs/agents/...)
  const m = line.match(/^-\s*Owner:\s*([^\(\n]+)\s*(\(.*\))?/);
  if (!m) return null;
  const roleLabel = m[1].trim();
  const key = roleNameToKey.get(roleLabel);
  if (!key) return null;
  const person = rolesMap[key];
  if (!person) return null;
  const suffix = m[2] ? ` ${m[2]}` : ` (${roleLabel})`;
  return `- Owner: ${person}${suffix}`;
}

function mapRolesList(listStr, rolesMap) {
  // Split by comma and map each token (role label) to Name (Role)
  const parts = listStr.split(',').map(s => s.trim()).filter(Boolean);
  const mapped = parts.map(tok => {
    // if already looks like Name (Role), keep
    if (/\(.+\)/.test(tok)) return tok;
    const key = roleNameToKey.get(tok);
    if (!key) return tok;
    const person = rolesMap[key];
    return person ? `${person} (${tok})` : tok;
  });
  return mapped.join(', ');
}

function prefillContribsLine(line, rolesMap) {
  const m = line.match(/^-\s*Contributors?:\s*(.+)$/);
  if (!m) return null;
  const val = m[1].trim();
  return `- Contributors: ${mapRolesList(val, rolesMap)}`;
}

function prefillReviewersLine(line, rolesMap) {
  const m = line.match(/^-\s*Reviewers?:\s*(.+)$/);
  if (!m) return null;
  const val = m[1].trim();
  return `- Reviewers: ${mapRolesList(val, rolesMap)}`;
}

function processFile(file, rolesMap, write) {
  const orig = fs.readFileSync(file, 'utf8');
  const lines = orig.split(/\r?\n/);
  let changed = false;
  for (let i = 0; i < lines.length; i++) {
    if (/^##\s*Metadata\b/.test(lines[i])) {
      // Inspect following lines until next heading or blank block end
      let j = i + 1;
      while (j < lines.length && !/^##\s+/.test(lines[j])) {
        const newOwner = prefillOwnerLine(lines[j], rolesMap);
        if (newOwner && newOwner !== lines[j]) {
          lines[j] = newOwner;
          changed = true;
        }
        const newContrib = prefillContribsLine(lines[j], rolesMap);
        if (newContrib && newContrib !== lines[j]) {
          lines[j] = newContrib;
          changed = true;
        }
        const newReview = prefillReviewersLine(lines[j], rolesMap);
        if (newReview && newReview !== lines[j]) {
          lines[j] = newReview;
          changed = true;
        }
        j++;
      }
      break;
    }
  }
  if (changed && write) fs.writeFileSync(file, lines.join('\n') + '\n', 'utf8');
  return changed;
}

(function main() {
  const { target, team, write } = parseArgs();
  const rolesMap = parseTeamProfile(team);
  const files = listMdFiles(target);
  let changedCount = 0;
  for (const f of files) {
    const changed = processFile(f, rolesMap, write);
    if (changed) {
      changedCount++;
      console.log(`${write ? 'updated' : 'would-update'} ${path.relative(process.cwd(), f)}`);
    }
  }
  console.log(`${write ? 'Updated' : 'Would update'} ${changedCount} file(s).`);
})();
