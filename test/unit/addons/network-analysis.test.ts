import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '../../..');
const addonRoot = path.join(root, 'agentic/code/addons/network-analysis');

function read(relative: string): string {
  return readFileSync(path.join(addonRoot, relative), 'utf8');
}

describe('network-analysis addon scaffold (#2272)', () => {
  it('declares every deployable component and external tool as non-bundled', () => {
    const manifest = JSON.parse(read('manifest.json'));
    expect(manifest).toEqual(expect.objectContaining({
      id: 'network-analysis',
      type: 'addon',
      core: false,
      autoInstall: false,
    }));
    expect(manifest.skills).toEqual(['analyze-network-capture']);
    expect(manifest.rules).toEqual(['network-analysis-safety']);
    expect(manifest.dependencies.external).toEqual(expect.arrayContaining([
      'tshark >=4.4',
      'capinfos >=4.4',
      'termshark >=2.4 (optional)',
    ]));
    for (const component of [
      'skills/analyze-network-capture/SKILL.md',
      'rules/network-analysis-safety.md',
      'templates/analysis-request.md',
      'templates/termshark-handoff.md',
      'schemas/network-analysis-contracts.md',
      'docs/overview.md',
      'docs/operator-guide.md',
      'docs/maintainer-guide.md',
      'docs/integrations.md',
      'docs/release-checklist.md',
      'CHANGELOG.md',
    ]) expect(read(component).length, component).toBeGreaterThan(50);
  });

  it('uses discriminating packet-analysis triggers across providers', () => {
    const skill = read('skills/analyze-network-capture/SKILL.md');
    for (const phrase of [
      'analyze a PCAP',
      'inspect a PCAPNG capture',
      'troubleshoot packets with TShark',
      'review network evidence in Termshark',
      'diagnose DNS TCP TLS or HTTP from packets',
    ]) expect(skill).toContain(phrase);
    expect(skill).toContain('platforms: [all]');
    expect(skill).toContain('do not use for citation-network or bibliometric analysis');
    const indexedFrontmatter = skill.split('---', 3)[1];
    expect(indexedFrontmatter).not.toMatch(/citation-network|bibliometric/i);
    expect(read('schemas/network-analysis-contracts.md').split('---', 3)[1])
      .not.toContain('network analysis evidence schema');
  });

  it('documents safe defaults and diagnostic-only dependency handling', () => {
    const readme = read('README.md');
    const rule = read('rules/network-analysis-safety.md');
    expect(readme).toContain('AIWG does not bundle, install, update, or configure');
    expect(readme).toContain('offline-only');
    expect(readme).toContain('metadata-only');
    expect(rule).toContain('shell: false');
    expect(rule).toContain('separate policy decision');
    expect(rule).toContain('synthetic or documented sanitized captures');
  });

  it('ships a complete, safe release documentation set', () => {
    const operator = read('docs/operator-guide.md');
    const maintainer = read('docs/maintainer-guide.md');
    const checklist = read('docs/release-checklist.md');
    const integrations = read('docs/integrations.md');

    for (const distinction of ['Capture filter', 'Display filter', 'TShark', 'Termshark']) {
      expect(operator).toContain(distinction);
    }
    expect(operator).toMatch(/Do not run\s+AIWG, TShark, or Termshark as root/);
    expect(operator).toMatch(/provider transfer are two\s+separate decisions/);
    expect(operator).toContain('Retention and cleanup');
    expect(maintainer).toContain('two stable releases and 90 days');
    expect(checklist).toContain('conformance-report.v1');
    expect(checklist).toContain('npm pack --dry-run --json');
    for (const framework of ['Research Complete', 'Forensics Complete', 'Security Engineering', 'SDLC Complete', 'Ops Complete']) {
      expect(integrations).toContain(framework);
    }
    for (const doc of [operator, maintainer, checklist, integrations]) {
      expect(doc).not.toMatch(/(?:^|\s)(?:sudo|doas)\s+(?:tshark|termshark)/m);
      expect(doc).not.toMatch(/(?:tshark|termshark)\s+-i\s/m);
      expect(doc).not.toMatch(/(?:upload|send)\s+(?:the\s+)?(?:payload|capture)/i);
    }

    for (const generated of [
      'overview.md', 'operator-guide.md', 'offline-analysis.md',
      'termshark-handoff.md', 'integrations.md', 'maintainer-guide.md',
      'release-checklist.md',
    ]) {
      expect(readFileSync(path.join(root, 'docs/addons/network-analysis', generated), 'utf8'))
        .toBe(read(`docs/${generated}`));
    }
  });
});
