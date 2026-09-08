# Runner adapters

`pytest_reporter.py` is an explicitly invoked serial pytest hook reporter. A reviewed normalization plan copies it to
`.aiwg/testing/conformance/adapters/pytest_reporter.py`. Select the target interpreter in both lane commands and
`versionCommand`; the scaffold uses `python3` and requires pytest already installed in that interpreter.

Discovery invokes pytest with `--collect-only` and records `session.items`, including parameter expansions. Pytest
imports test modules and runs collection hooks. Test bodies are not executed. Execution aggregates setup, call and
teardown reports: a teardown failure remains a failure, setup skips remain skipped, and absent terminal reports or
collection/internal errors make evidence incomplete. Worker aggregation for pytest-xdist is not qualified. Extra runner
arguments follow `--`.

Reports use exclusive creation at the caller-provided output path. They declare discovery versus execution, actual
interpreter and pytest versions, case source paths, and full node IDs. Recommendations and profile detection never
invoke this helper; collection executes it only through an explicit lane command. It installs no packages.

Vitest uses its installed CLI directly: `list --json=<path>` performs real collection, while `run --reporter=json
--outputFile=<path>` executes tests. The result adapter preserves matching hierarchy-delimited names. Static
parse/file-only lists do not establish case registration. Native Node TAP remains execution evidence; the Node profile
has no authoritative collect-only discovery command and therefore cannot satisfy the default discovery gate without a
separately qualified adapter.

Qualification tests use fresh temporary projects, actual SUT imports, parameter expansions, a body-execution marker,
source-staleness checks, and an injected boundary defect. Python tests require an existing interpreter with pytest: set
`TEST_CONFORMANCE_PYTHON` if `python3` does not provide it. A missing interpreter dependency produces an explicit
skipped qualification test; it is never counted as demonstrated compatibility.
