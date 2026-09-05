# Network analysis operator guide

Use this addon only with a saved PCAP or PCAPNG whose collection and analysis
are authorized. The default workflow keeps the source local and read-only,
extracts metadata through bounded TShark recipes, and writes a digest-bound
evidence bundle. It never starts a capture or changes capture privileges.

## Prepare the workspace

Install AIWG, then deploy the addon for the active provider:

```bash
aiwg use network-analysis --provider <provider>
```

AIWG does not bundle packet tools. Install a maintained Wireshark release from
the [official Wireshark download page](https://www.wireshark.org/download.html)
to obtain `tshark` and `capinfos`. The optional local TUI is available from the
[official Termshark repository](https://github.com/gcla/termshark). Do not run
AIWG, TShark, or Termshark as root for saved-capture analysis. The addon never
installs tools or grants packet-capture capabilities.

The maintained tool matrix and qualification status are in the
[compatibility guide](https://github.com/jmagly/aiwg/blob/main/docs/network-analysis/compatibility.md).
Give the analyzer absolute executable paths or absolute trusted search roots;
it does not trust the ambient `PATH`.

## Record the analysis decision

Complete `templates/analysis-request.md` before execution. Record:

- capture path and collection authority;
- purpose, scope, expected traffic, capture point, topology, and clock context;
- sensitivity, redaction, disclosure, retention, and cleanup decisions;
- selected recipe, bounds, authorized output root, and executable trust;
- known gaps such as packet loss, asymmetric visibility, truncation, or
  encrypted fields.

Raw captures are Restricted evidence. IP addresses, DNS names, TLS SNI, and
HTTP hosts can also identify people or systems. Keep the default provider
disclosure state at `withheld` until a separate policy decision names the exact
derived fields and destination. Payload output and provider transfer are two
separate decisions; neither follows from permission to analyze locally.

## Choose a recipe

Start with `overview`, then select the smallest recipe that answers the stated
question. The [recipe catalog](../recipes/README.md) identifies direct
observations and heuristic limits for DNS, TCP, TLS, HTTP metadata, streams,
timing, and before/after comparison.

Keep these terms distinct:

| Term | Meaning in this workflow |
| --- | --- |
| Capture filter | A collection-time BPF expression. The addon records it as acquisition context and never applies it to start a capture. |
| Display filter | A Wireshark/TShark expression applied while reading a saved capture. It is stored and digest-bound to the result. |
| TShark | The required noninteractive machine interface used for bounded extraction. |
| Termshark | An optional local terminal viewer launched only after an explicit operator action. |

Do not copy a capture filter into a display-filter field: the syntaxes and
execution stages differ. Treat a heuristic result as a review lead with its
method and false-positive conditions, never as proof of intent or root cause.

## Run and review

Ask the active agent to analyze the authorized saved capture with the chosen
recipe. The governed skill probes tools, validates source identity, compiles a
version-compatible argument array, and writes output below the authorized root.
The programmatic example in [bounded offline analysis](offline-analysis.md) is
covered by analyzer tests and the generated synthetic fixture corpus.

Review the final status:

- `completed`: evidence exists and no execution error was recorded;
- `empty`: the supported capture contained no selected packets;
- `partial`: bounded evidence exists, but cancellation, timeout, output
  exhaustion, or a tool failure limited the result;
- `error`: no successful analysis result is available.

Verify the source digest, derived digest, recipe and tool versions, exact
display-filter digest, bounds, errors, redactions, and frame/stream locators.
Do not present a partial result as complete. Preserve the raw capture separately
when forensic chain of custody applies.

## Optional Termshark review

Generate a handoff only from the exact capture identity and display filter in
the evidence bundle. Previewing the command does not launch it. Launch requires
an explicit local operator action after the capture, profile, filter, TShark
path, locator, disk space, and retention decision are reviewed. Follow the
[Termshark handoff guide](termshark-handoff.md); remote review requires a new
host-local handoff and never transfers the capture.

## Retention and cleanup

At each output or handoff, restate the approved retention period and disposal
method. Evidence writers never overwrite existing files. Termshark state is
kept under the declared XDG config, cache, and data paths. After the case action:

1. inventory the source, derived evidence, snapshots, profiles, caches, and
   temporary paths;
2. retain items required by case, legal-hold, or reproducibility policy;
3. verify deletion of expired items and record actor, time, path, and result;
4. preserve failure evidence when cleanup cannot be verified.

The addon does not silently delete evidence or viewer state.

## Troubleshooting

| Diagnostic | Action |
| --- | --- |
| Required tool missing | Install from the official project, or correct the explicit absolute path/trusted root. Do not widen privileges. |
| Unsupported version | Use a maintained, qualified Wireshark line. Unsupported majors fail closed. |
| Required field missing | Confirm the probe inventory and recipe compatibility; do not substitute an unprobed field. |
| Input rejected | Use an authorized regular, non-symlinked PCAP/PCAPNG within the byte limit. URLs and compressed input are rejected. |
| Partial result | Preserve the error and bounded evidence, reduce scope or limits only within policy, and rerun as a new analysis context. |
| Termshark unavailable | Continue with TShark evidence; the optional review surface does not affect analyzer validity. |
| Before/after incomparable | Align capture point, filter, duration, topology, load, clock, loss, and encryption conditions before drawing a change conclusion. |
