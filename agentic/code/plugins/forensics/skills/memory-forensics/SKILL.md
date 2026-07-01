---
namespace: aiwg
name: memory-forensics
description: "Volatility 3 memory forensics workflows covering acquisition with LiME and WinPmem, and structured analysis using Volatility 3 plugin reference"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# memory-forensics

Guides memory acquisition and analysis for both Linux and Windows targets. Acquisition uses LiME (Linux) or WinPmem (Windows). Analysis uses Volatility 3 with a structured plugin sequence covering process analysis, network connections, injected code detection, and rootkit indicators.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "vol3" / "volatility" → Volatility 3 memory analysis
- "LSASS" → credential extraction analysis
- "memory dump" → volatile memory analysis

## Purpose

Memory forensics recovers volatile evidence unavailable on disk: running processes with no on-disk binary, injected shellcode, encryption keys, credential material, and network connections active at time of capture. This skill provides a repeatable acquisition and analysis workflow that produces structured findings from a raw memory image.

## Behavior

When triggered, this skill:

1. **Determine acquisition path**:
   - If target OS is Linux: use LiME kernel module
   - If target OS is Windows: use WinPmem
   - If a memory image path is provided directly: skip acquisition and proceed to analysis
   - Verify available disk space at output path before starting acquisition

2. **Linux memory acquisition with LiME**:
   - Identify kernel version: `uname -r`
   - Check for pre-built LiME module matching kernel, or note that one must be compiled:
     ```bash
     # Compile LiME against the target kernel headers
     make -C /lib/modules/$(uname -r)/build M=$(pwd) modules
     ```
   - Load module and write to file (local) or network (to avoid writing to target disk):
     ```bash
     # Write to file
     insmod lime.ko "path=/mnt/evidence/memory.lime format=lime"
     # Stream over network to examiner host
     insmod lime.ko "path=tcp:4444 format=lime"
     # On examiner: nc -l 4444 > memory.lime
     ```
   - Record SHA-256 hash of acquired image immediately after capture
   - Unload module: `rmmod lime`

3. **Windows memory acquisition with WinPmem**:
   - Transfer `winpmem_multi_x64.exe` to target (verify hash before use)
   - Acquire to file:
     ```
     winpmem_multi_x64.exe memory.raw
     ```
   - For large systems, use the `--split` option to produce chunked output
   - Record SHA-256 hash of each output file
   - Optionally stream directly to examiner host using WinPmem's network mode

4. **Volatility 3 environment setup**:
   - Verify Volatility 3 is installed: `vol --version`
   - Set image path variable for subsequent commands
   - For Linux targets, provide the Volatility 3 ISF (Intermediate Symbol Format) symbol table; generate if not available using `dwarf2json`
   - For Windows targets, Volatility 3 auto-selects symbols from its built-in PDB download capability

5. **Process analysis plugins**:
   - `vol -f <image> windows.pslist` / `linux.pslist` — full process listing with parent relationships
   - `vol -f <image> windows.pstree` / `linux.pstree` — tree view for spotting orphaned processes
   - `vol -f <image> windows.psscan` — scan raw memory for EPROCESS structures (finds hidden processes not in list)
   - Compare pslist vs psscan output to identify DKOM-hidden processes

6. **Code injection and malicious process detection**:
   - `vol -f <image> windows.malfind` — find process memory regions with PAGE_EXECUTE_READWRITE and no backing file
   - `vol -f <image> windows.dlllist --pid <pid>` — DLL list per process; compare against baseline
   - `vol -f <image> windows.handles --pid <pid>` — open handles including files, registry keys, mutexes
   - `vol -f <image> linux.proc_maps` — memory map for Linux processes; flag rwx anonymous mappings

7. **Network connection analysis**:
   - `vol -f <image> windows.netstat` — active and recently closed TCP/UDP connections with owning process
   - `vol -f <image> linux.sockstat` — Linux socket state
   - Extract unique remote IPs and ports for IOC enrichment

8. **Persistence and rootkit indicators**:
   - `vol -f <image> windows.svcscan` — Windows service list including those not in SCM
   - `vol -f <image> windows.driverirp` — driver IRP hook detection
   - `vol -f <image> windows.ssdt` — SSDT hook detection
   - `vol -f <image> linux.check_syscall` — Linux syscall table hook detection
   - `vol -f <image> linux.check_modules` — kernel module list integrity

9. **Credential and artifact extraction**:
   - `vol -f <image> windows.hashdump` — extract NTLM hashes from SAM/SYSTEM
   - `vol -f <image> windows.lsadump` — LSA secrets
   - `vol -f <image> windows.cmdline` — command-line arguments for all processes
   - `vol -f <image> windows.filescan` — file handles in memory (recovers paths of deleted files)

10. **Write findings document**:
    - Save to `.aiwg/forensics/findings/<hostname>-memory.md`
    - Include: image hash, acquisition metadata, suspicious processes, injection findings, network IOCs, rootkit indicators

## Usage Examples

### Example 1 — Analyze existing image
```
memory dump analysis /evidence/memory.lime
```

### Example 2 — Full acquisition and analysis
```
acquire memory from user@compromised-host.example.com
```

### Example 3 — Windows target
```
memory forensics windows /mnt/evidence/win-memory.raw
```

## Output Locations

- Findings: `.aiwg/forensics/findings/<hostname>-memory.md`
- Memory image: `.aiwg/forensics/evidence/<hostname>-memory.lime` (or `.raw`)
- Image hash: `.aiwg/forensics/evidence/<hostname>-memory.sha256`
- Volatility output: `.aiwg/forensics/evidence/<hostname>-volatility/`

## Configuration

```yaml
memory_forensics:
  volatility_path: vol
  lime_format: lime
  winpmem_path: winpmem_multi_x64.exe
  hash_algorithm: sha256
  linux_symbol_path: /opt/volatility3/symbols/linux/
  malfind_dump_vads: true
  plugins:
    windows:
      - windows.pslist
      - windows.psscan
      - windows.pstree
      - windows.malfind
      - windows.netstat
      - windows.svcscan
      - windows.cmdline
      - windows.dlllist
    linux:
      - linux.pslist
      - linux.pstree
      - linux.proc_maps
      - linux.sockstat
      - linux.check_syscall
      - linux.check_modules
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/volatility-order.md — Memory is the most volatile artifact; acquire before any disk or log collection
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Hash memory image immediately after acquisition; record hash in custody log
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Verify disk space, kernel version, and tool availability before starting acquisition
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate when malfind, DKOM-hidden processes, or SSDT hooks are found in memory
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/skills/ioc-extraction/SKILL.md — Extract network IOCs from Volatility netstat/sockstat output for cross-referencing
