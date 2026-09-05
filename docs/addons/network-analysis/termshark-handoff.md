# Termshark local review handoff

Termshark is an optional local review surface for evidence already produced by
the bounded TShark analyzer. A missing or incompatible Termshark installation
adds a diagnostic and leaves the TShark evidence bundle unchanged.

## Reviewed command

Create the handoff from the exact capture path, analysis-context digest, display
filter, and TShark executable recorded by the evidence bundle. AIWG hashes the
capture while preparing the handoff and again immediately before launch. A
frame or TCP/UDP stream focus must already occur as a locator in the selected
evidence context.

For a supported Termshark 2.x release, the preview has this argument structure:

```text
/absolute/path/to/termshark -r /absolute/path/to/capture.pcapng -Y '(reviewed filter)' -C profile-name
```

The runtime passes these values as an argument array with shell execution
disabled. `-r` selects the saved capture, `-Y` applies the reviewed display
filter and evidence-backed focus, and `-C` selects the explicit profile. The
[Termshark user guide](https://github.com/gcla/termshark/blob/master/docs/UserGuide.md)
documents these command-line options and the XDG profile layout.

Preview generation does not launch the program. Launch requires a separate,
explicit local operator action. AIWG does not send keystrokes, scrape terminal
screens, parse Termshark's private cache formats, or infer that the TUI review
was completed. Only notes the operator returns with locators already present in
the evidence bundle can be recorded as review results.

## Profiles and local state

Set an absolute, real config directory and a safe profile name. If a profile
file is supplied, it must resolve below that config directory. The handoff
records its canonical path and SHA-256 digest; it does not copy or serialize the
file contents. Keep passwords, decryption keys, tokens, and other secrets out of
handoff notes and evidence output.

The launcher gives Termshark an isolated XDG environment under the explicit
config directory:

- configuration: the selected config directory
- cache: `<config-directory>/cache`
- data: `<config-directory>/data`

Termshark and TShark may need additional disk space to index a capture. Check
free space before reviewing a large file. Start with the bounded TShark result,
use a narrow evidence-backed frame or stream focus, and retain the original
limits in the case record. A successful launch does not guarantee that a large
capture will fit in memory or available storage.

## Local and remote review

For local review, keep the capture at its verified path and launch the reviewed
command on that host. If the capture, filter, TShark path, profile, or locator
changes, create a new handoff so its identity record remains accurate.

For remote review, connect to an authorized host where the capture already
exists and create a new evidence-bound handoff using that host's absolute paths.
The handoff does not run `scp`, port forwarding, file-sharing utilities, or any
other capture transfer. An SSH session does not expand the capture's authorized
boundary or permit provider transfer.

## Cleanup and retention

Record the capture, config, cache, and data retention decision before launch.
After review, inspect the explicit XDG directories and delete or retain them
according to the case policy. Record the time, actor, paths, and result of any
verified deletion. AIWG does not silently remove Termshark state, because that
could destroy case evidence or conceal a failed cleanup.
