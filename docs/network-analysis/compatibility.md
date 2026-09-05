# Network Analysis Compatibility

## Tool Policy

The network-analysis probe discovers `tshark` and `capinfos` as required tools and `termshark` as optional. It never installs software, escalates privileges, opens packet-capture handles, or shells through a command string. Probe subprocesses run with an isolated temporary Wireshark config directory, empty `PATH`, `TERM=dumb`, and locale pinned to `C`; the temporary directory is removed after each command.

Executable resolution is fail-closed:

- Explicit configured paths must be absolute and executable.
- Explicit configured paths take precedence over search directories.
- If an explicit path is invalid, the probe reports that tool as missing and does not fall back to another executable.
- When no explicit path is configured, the probe searches only caller-supplied absolute trusted search directories.
- The current working directory and the user's ambient `PATH` are not searched implicitly.

The probe records executable path, trust source, version, build capabilities, output formats, statistics, field names, verified capture read formats, advertised write formats, command exit metadata, declared profile paths, and declared config paths in provenance. Declared profile/config paths are caller provenance only; the current probe intentionally does not load user profiles or Wireshark config files during capability discovery.

Command execution is bounded per probe:

- Version, help, and lightweight format probes use a 3 second timeout and 2 MiB output budget.
- `tshark -z help` uses a 5 second timeout and 4 MiB output budget.
- `tshark -G fields` uses a 10 second timeout and 32 MiB output budget because real field registries are many megabytes on maintained Wireshark builds.
- Output-limit failures are recorded separately from timeouts so drift, hangs, and unexpectedly large output are distinguishable.
- Non-zero command exits, timeouts, and output-limit failures prevent a required tool from being classified as fully supported, even when partial stdout contains otherwise recognizable text.

## Supported Versions

Version policy was verified on 2026-09-05 against upstream project sources:

- Wireshark download page: stable release `4.6.8`, old stable release `4.4.18`.
- Wireshark release lifecycle: branch `4.4` remains supported until `5.0.0`; branch `4.2` ended when `4.6.0` was released.
- Termshark GitHub releases: latest release `v2.4.0`.

The supported TShark/Capinfos policy is the maintained Wireshark line only: `4.6.x` and `4.4.x` at the verification date above. Older releases are reported as unsupported. A maintained release that lacks required feature detections is reported as partially capable.

Termshark is managed as an optional dependency because `v2.4.0` is the latest upstream release and dates to 2022. Its absence disables only the future interactive handoff; machine-readable analysis can still proceed when required Wireshark CLI tools are supported. Future Termshark major/minor versions are treated as optional drift until explicitly validated.

## Feature Detection

Required TShark detections:

- Output formats include `json` and `fields`.
- Statistics include conversation support, reported as `conv`.
- Fields include `frame.time_epoch`.
- Synthetic empty `pcap` and `pcapng` read smoke checks both pass.
- Advertised write formats are recorded separately from verified read formats.

Required Capinfos detections:

- Synthetic empty `pcap` and `pcapng` read smoke checks both pass.

Termshark detection records version and help output capabilities when available, but it does not affect the overall probe status.

## Tested Versus Proposed

| Platform | Node | Verification | Packet-tool qualification |
|---|---|---|---|
| Linux x64 | 24.12.0 | Parser, trust, drift, real subprocess isolation, forced timeout, output bound, cleanup | Not run; tools absent |
| macOS / Windows | Not tested | No qualification claim | Required before declaring platform support |

The subprocess tests use the installed Node executable as a harmless stub. A
child that ignores SIGTERM is forcibly terminated at its deadline; output
exhaustion is recorded separately. These tests do not substitute for the real
TShark release matrix required by #2281.

Unit tests use representative synthetic excerpt fixtures for the currently proposed supported versions, `tshark`/`capinfos` `4.6.8` and `termshark` `2.4.0`. The implementation has not performed live local packet-tool qualification because the local host has no packet tools installed, and it does not claim host-level compatibility beyond the deterministic probe behavior covered by tests.

## Compatibility maintenance and deprecation

Review this matrix for every addon release and whenever Wireshark changes its
stable or old-stable branches. Version recognition is necessary but not
sufficient: qualify JSON/fields output, conversation statistics,
`frame.time_epoch`, synthetic PCAP and PCAPNG reads, time/output bounds, and the
recipe field inventory before expanding support. Record installed-tool skips as
skips, never as successful qualification.

Schema v1 and recipe v1 changes remain additive. A breaking schema or recipe
change receives a new identity and migration guide. A runtime API or supported
tool-line removal must provide a replacement, announce the migration in the
addon and root changelogs, and remain supported for at least two stable releases
and 90 days. Security fixes may fail closed sooner; the release note must state
the affected versions and recovery path.

New Wireshark or Termshark majors are unsupported until explicitly qualified.
No version fallback may silently widen a declared range. The
[`network-analysis` release checklist](../../agentic/code/addons/network-analysis/docs/release-checklist.md)
requires supported-version review and conformance evidence before distribution.
