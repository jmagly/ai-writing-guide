import { GRAPH_CONFORMANCE_CASES, runGraphConformance } from '../lib/conformance.mjs';

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}
export default async function graphConformance(args) {
  if (args.includes('--help') || args.includes('-h')) return { exitCode: 0, message: `Usage: aiwg graph conformance [--fixture <name>] [--format human|json]\nFixtures: ${GRAPH_CONFORMANCE_CASES.join(', ')}` };
  try {
    const report = await runGraphConformance({ fixture: option(args, '--fixture') });
    const human = `Graph conformance: ${report.passedCount}/${report.total} passed (${report.profile})`;
    return { exitCode: report.passed ? 0 : 1, message: option(args, '--format') === 'human' ? human : JSON.stringify(report, null, 2) };
  } catch (error) {
    return { exitCode: 2, message: JSON.stringify({ schemaVersion: 'graph.flow.aiwg.io/v1', kind: 'GraphConformanceReport', passed: false, code: error.code ?? 'CONFORMANCE_FAILED', message: error.message }, null, 2) };
  }
}
