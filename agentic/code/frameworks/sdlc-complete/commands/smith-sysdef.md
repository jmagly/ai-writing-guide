---
description: Generate system definition file for ToolSmith with tested OS commands
category: smithing
argument-hint: [--categories <list>] [--output <path>] [--verify-only] [--update]
allowed-tools: Bash, Read, Write, Glob
model: haiku
---

# System Definition Generator

Generate a system definition file that catalogs available commands for the ToolSmith agent. This file describes the local operating system and provides a verified catalog of commands the ToolSmith can use to create tools.

## Arguments

- `--categories <list>` - Comma-separated categories to test: file-ops, text-processing, hashing, compression, network, process, json (default: all)
- `--output <path>` - Output file path (default: `.aiwg/smiths/system-definition.yaml`)
- `--verify-only` - Verify existing definition without regenerating
- `--update` - Update existing definition with any new commands

## Workflow

### Step 1: Ensure Directory Structure

Create the smiths directory if it doesn't exist:

```bash
mkdir -p .aiwg/smiths/toolsmith/tools
mkdir -p .aiwg/smiths/toolsmith/scripts
```

### Step 2: Probe System Information

Gather platform details:

```bash
# OS and kernel
uname -s        # OS name (Linux, Darwin)
uname -r        # Kernel version
uname -m        # Architecture (x86_64, arm64)

# Distribution (Linux)
cat /etc/os-release 2>/dev/null | grep -E "^(NAME|VERSION)="

# macOS version
sw_vers 2>/dev/null

# Shell
echo $SHELL
$SHELL --version 2>/dev/null | head -1

# User environment
echo $HOME
echo $PATH | tr ':' '\n' | head -5
```

### Step 3: Define Command Categories

Test commands in each category. For each command:
1. Check if it exists: `command -v <cmd>` or `which <cmd>`
2. Get version if available: `<cmd> --version 2>/dev/null | head -1`
3. Note capabilities based on common usage patterns

**file-ops** - File system operations:
- find, ls, cp, mv, rm, mkdir, rmdir, chmod, chown, stat, file, ln, touch, du, df

**text-processing** - Text manipulation:
- grep, sed, awk, sort, uniq, cut, tr, head, tail, wc, diff, comm, join, paste, column

**hashing** - Checksums and hashing:
- md5sum (or md5 on macOS), sha256sum (or shasum -a 256), sha1sum, cksum

**compression** - Archive and compression:
- gzip, gunzip, tar, zip, unzip, bzip2, xz

**network** - Network utilities:
- curl, wget, nc (netcat), ping, dig, host, ssh, scp, rsync

**process** - Process management:
- ps, kill, pkill, pgrep, top, nice, nohup, xargs

**json** - JSON processing:
- jq

### Step 4: Test Each Command

For each command in the selected categories:

```bash
# Check existence
if command -v <cmd> >/dev/null 2>&1; then
  # Get path
  CMD_PATH=$(command -v <cmd>)

  # Get version (various methods)
  VERSION=$(<cmd> --version 2>/dev/null | head -1 || <cmd> -V 2>/dev/null | head -1 || echo "unknown")

  # Mark as tested=true
fi
```

### Step 5: Generate YAML Output

Create `.aiwg/smiths/system-definition.yaml`:

```yaml
# System Definition for ToolSmith
# Generated: <timestamp>
# Platform: <os> <version>

platform:
  os: "<linux|darwin|windows>"
  distribution: "<Ubuntu 22.04|macOS 14.0|etc>"
  kernel: "<kernel version>"
  shell: "<shell path>"
  shell_version: "<shell version>"
  architecture: "<x86_64|arm64|etc>"

environment:
  home: "<home directory>"
  path_dirs:
    - /usr/local/bin
    - /usr/bin
    - /bin
  temp_dir: "/tmp"

categories:
  file-ops:
    description: "File system operations"
    commands:
      - name: find
        path: /usr/bin/find
        version: "4.8.0"
        tested: true
        capabilities:
          - recursive search
          - pattern matching
          - exec actions
          - time filters
      # ... more commands

  text-processing:
    description: "Text manipulation tools"
    commands:
      # ... commands

  # ... more categories
```

### Step 6: Report Summary

Output a summary of tested commands:

```
System Definition Generated
============================
Platform: Ubuntu 22.04 (Linux 5.15)
Shell: /bin/bash 5.1.16
Architecture: x86_64

Categories tested:
  file-ops:        15/15 commands available
  text-processing: 15/15 commands available
  hashing:         4/4 commands available
  compression:     5/7 commands available (missing: xz, bzip2)
  network:         7/9 commands available (missing: nc, dig)
  process:         8/8 commands available
  json:            1/1 commands available

Total: 55/59 commands verified

Output: .aiwg/smiths/system-definition.yaml
```

## Command Capability Mappings

Map each command to its key capabilities for catalog matching:

### file-ops
| Command | Capabilities |
|---------|-------------|
| find | recursive search, pattern matching, exec actions, time/size filters |
| ls | directory listing, detailed output, sorting, hidden files |
| cp | copy files, recursive copy, preserve attributes |
| mv | move/rename files, force overwrite |
| rm | remove files, recursive delete, force delete |
| mkdir | create directories, create parents |
| chmod | change permissions, recursive |
| chown | change ownership |
| stat | file metadata, timestamps |
| file | file type detection |
| ln | symbolic links, hard links |
| touch | create files, update timestamps |
| du | disk usage, summarize |
| df | filesystem space |

### text-processing
| Command | Capabilities |
|---------|-------------|
| grep | pattern matching, regex, recursive, context lines |
| sed | stream editing, substitution, in-place edit |
| awk | field processing, calculations, pattern-action |
| sort | sorting, numeric sort, reverse, unique |
| uniq | deduplicate, count occurrences |
| cut | extract columns, delimiter-based |
| tr | character translation, delete |
| head | first N lines |
| tail | last N lines, follow |
| wc | line/word/char count |
| diff | compare files, unified diff |
| comm | compare sorted files |

### hashing
| Command | Capabilities |
|---------|-------------|
| md5sum | MD5 checksums |
| sha256sum | SHA-256 checksums |
| sha1sum | SHA-1 checksums |

### compression
| Command | Capabilities |
|---------|-------------|
| gzip | gzip compression/decompression |
| tar | archive creation/extraction, compression integration |
| zip | zip archive creation |
| unzip | zip extraction |

### network
| Command | Capabilities |
|---------|-------------|
| curl | HTTP requests, downloads, headers, POST data |
| wget | file downloads, recursive, resume |
| ping | connectivity testing |
| ssh | remote execution |
| rsync | efficient file sync, incremental |

### process
| Command | Capabilities |
|---------|-------------|
| ps | process listing, detailed info |
| kill | send signals |
| pkill | kill by name |
| pgrep | find processes by name |
| xargs | build commands from input |

### json
| Command | Capabilities |
|---------|-------------|
| jq | JSON parsing, filtering, transformation |

## Verify-Only Mode

When `--verify-only` is specified:

1. Read existing `.aiwg/smiths/system-definition.yaml`
2. Re-test all listed commands
3. Report any commands that no longer work
4. Do NOT modify the file

```
Verifying system definition...

  file-ops:        15/15 commands OK
  text-processing: 15/15 commands OK
  hashing:         4/4 commands OK
  compression:     5/5 commands OK
  network:         6/7 commands CHANGED
    - nc: was available, now missing
  process:         8/8 commands OK
  json:            1/1 commands OK

Verification complete. 1 command changed.
Run with --update to fix system definition.
```

## Update Mode

When `--update` is specified:

1. Read existing system definition
2. Re-test all commands
3. Add any new commands found
4. Remove commands no longer available
5. Update timestamps
6. Preserve user customizations (if any)

## Usage Examples

```bash
# Generate full system definition
/smith-sysdef

# Test only specific categories
/smith-sysdef --categories file-ops,text-processing

# Custom output location
/smith-sysdef --output ./custom-sysdef.yaml

# Verify existing definition
/smith-sysdef --verify-only

# Update definition with changes
/smith-sysdef --update
```

## Error Handling

**No commands available in category**:
```
Warning: Category 'json' has no available commands.
  - jq: not found

Consider installing: apt install jq (Debian/Ubuntu) or brew install jq (macOS)
```

**Permission issues**:
```
Warning: Some commands may require elevated permissions:
  - chown: requires root for ownership changes
  - kill: may require root for other users' processes
```

## Success Criteria

- [ ] Directory structure created (`.aiwg/smiths/toolsmith/`)
- [ ] System definition file generated with correct YAML format
- [ ] All commands in selected categories tested
- [ ] Capabilities documented for each command
- [ ] Summary report shows available vs missing commands

## References

- ToolSmith agent: `@agentic/code/frameworks/sdlc-complete/agents/toolsmith-dynamic.md`
- Tool catalog: `.aiwg/smiths/toolsmith/catalog.yaml`
