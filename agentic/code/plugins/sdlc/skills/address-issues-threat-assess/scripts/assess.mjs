#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const relativeSource = new URL('../../../../../../../agentic/code/frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs', import.meta.url);
const candidates = [
  relativeSource,
  pathToFileURL(path.resolve(process.cwd(), 'agentic/code/frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs')),
  pathToFileURL(path.resolve(process.cwd(), 'node_modules/aiwg/agentic/code/frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs')),
];
const source = candidates.find(candidate => fs.existsSync(candidate));
if (!source) throw new Error('Unable to locate the canonical AIWG threat-assessment wrapper');
const canonical = await import(source.href);

export const assessIssue = canonical.assessIssue;
export const runCli = canonical.runCli;

if (import.meta.url === `file://${process.argv[1]}`) runCli();
