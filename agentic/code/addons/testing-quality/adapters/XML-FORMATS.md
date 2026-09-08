# Qualified XML dialect boundaries

`lib/xml-results.mjs` handles Maven Surefire and pytest JUnit XML (`testsuite` or a flat `testsuites` wrapper), and flat
Microsoft VSTest TRX with the TeamTest 2010 namespace. These are execution reports. Neither format establishes
authoritative case discovery. Parsing success establishes structural evidence, not project compatibility or conformance.

JUnit uses explicit testcase `file` when present. Class names are retained in case names and never converted into
invented source paths. Missing file provenance remains `null`; gates requiring a source mapping stay unresolved. Case
failure, error and skip children drive terminal states. Suite counts are reconciled when present, and `tests` is
required on each suite. Suite-level errors, conflicting states, repeated case identities, unsupported retry-history
elements and nested/foreign suite dialects fail closed. Empty reports cannot prove execution. File-missing xunit2 output
may be usable for execution counts while remaining insufficient for source obligations.

TRX retains `testId::testName` as the case identity, requires unique execution IDs, reconciles
total/executed/passed/failed and other supplied counters, and interprets only Passed, Failed, Error, Timeout, Aborted
and NotExecuted terminal records. Nonzero unqualified counters, nonterminal outcomes, duplicate identities, nested
data-driven result aggregation, and inconsistent run summaries fail closed. DLL storage locations and test definitions
do not imply source file paths. NotExecuted is preserved as skipped evidence and cannot satisfy the default no-skips
gate.

XML input is bounded to 10 MiB, 100,000 elements and depth 64. A strict SAX parser checks well-formedness; DTD/entity
declarations are rejected before parsing and in the parser callback. No external resolver, schema loading, network
access or custom entity registration exists. Schema-location hints are ignored as metadata. Mixed namespaces,
malformed/truncated documents and duplicate attributes are rejected. These are producer-specific semantic checks, not
general-purpose XSD validation.

The direct dependency `saxes` 6.0.0 was confirmed from the npm registry on 2026-09-08. Its repository is archived
(2025-12-31), which is a maintenance limitation; the dependency was selected for strict, bounded SAX events and no
automatic entity resolver. A future replacement must retain these adversarial checks. Installation applies to this
tooling package, never to a target project.

Primary references, inspected 2026-09-08:

- [Surefire report schema](https://maven.apache.org/surefire/maven-surefire-plugin/xsd/surefire-test-report.xsd)
- [pytest JUnit XML configuration](https://docs.pytest.org/en/stable/reference/reference.html#confval-junit_family)
- [VSTest run summary
  counters](https://github.com/microsoft/vstest/blob/main/src/Microsoft.TestPlatform.Extensions.TrxLogger/ObjectModel/TestRunSummary.cs)
- [VSTest outcome
  semantics](https://github.com/microsoft/vstest/blob/main/src/Microsoft.TestPlatform.Extensions.TrxLogger/ObjectModel/TestOutcome.cs)
- [Saxes parser, strictness and entity behavior](https://github.com/lddubeau/saxes)

Fixtures verify supported XML structure and adversarial rejection. Actual Java/Maven and .NET execution has not been
qualified in this environment; these adapters do not change that status.
