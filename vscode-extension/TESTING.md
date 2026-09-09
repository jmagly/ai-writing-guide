# Extension tests

Install the package's development dependencies using `npm ci` in this directory.
`npm test` builds the extension and TypeScript test sources, then runs the suite
inside a VS Code Extension Development Host. The build output goes to ignored
`dist/` and `test-output/` directories. Missing test files, zero registered cases,
failures, skips and unexecuted cases fail the test command.

The host uses a fresh temporary workspace, user-data directory and extensions
directory for each invocation. Test settings disable automatic project prompts
and MCP configuration; the test command removes its temporary directories after
the host exits.

By default `@vscode/test-electron` obtains its supported stable host. To use an
already installed VS Code executable, set `AIWG_VSCODE_EXECUTABLE` to its Electron
binary. Set `AIWG_EXTENSION_TEST_REPORT` to an absolute filename in an existing
directory to retain JSON containing discovered files, registered case identities,
executed outcomes and Mocha counters. Use a unique report filename for every run.

For a headless Linux host with Xvfb installed:

```sh
AIWG_VSCODE_EXECUTABLE=/usr/share/code/code xvfb-run -a npm test
```

The test toolchain requires Node 20.19+ or 22.12+ (Mocha 12). This does not change
the extension's runtime API requirement. Record the actual VS Code version with
test evidence; passing one host version does not qualify every supported host.

The suite exercises activation, declared command registration, missing-CLI
handling, and MCP configuration creation/preservation. It does not establish
complete extension behavior coverage. See the repository's full-audit tracking
for remaining cases and platform qualification.
