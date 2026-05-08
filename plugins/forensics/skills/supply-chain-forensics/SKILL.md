---
namespace: aiwg
name: supply-chain-forensics
description: "SBOM analysis, build pipeline forensics, and dependency verification covering package integrity, build reproducibility, and CI/CD pipeline tampering"
tools: Bash, Read, Write, Glob, Grep
platforms: [all]

---

# supply-chain-forensics

Investigates software supply chain compromise across three vectors: dependency integrity (packages and libraries), build pipeline tampering (CI/CD systems and build scripts), and SBOM-based composition analysis. Maps findings to SLSA (Supply-chain Levels for Software Artifacts) and MITRE ATT&CK techniques for supply chain attacks.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "SBOM" → Software Bill of Materials analysis
- "build pipeline audit" → supply chain security review
- "dependency confusion" → supply chain attack vector

## Purpose

Supply chain attacks compromise software before it reaches users — through malicious packages, tampered build scripts, or poisoned CI/CD pipelines. These attacks are difficult to detect because the delivered artifact may appear legitimate. This skill applies systematic verification of components and build processes to identify tampering.

## Behavior

When triggered, this skill:

1. **Identify project type and package ecosystem**:
   - Detect ecosystems from lock files and manifests: `package-lock.json`, `yarn.lock`, `Cargo.lock`, `Pipfile.lock`, `go.sum`, `Gemfile.lock`, `pom.xml`, `build.gradle`
   - Record all detected ecosystems for targeted analysis
   - Identify package manager in use: npm, pip, cargo, go mod, gem, maven, gradle

2. **SBOM generation and analysis**:
   - Generate SBOM if not present:
     - npm/Node: `npx @cyclonedx/cyclonedx-npm --output-file sbom.json`
     - Python: `cyclonedx-bom -r -o sbom.json`
     - Go: `cyclonedx-gomod mod -json -o sbom.json`
   - If SBOM already exists, validate schema compliance (CycloneDX or SPDX)
   - Count total components, direct vs transitive dependencies
   - Flag: components with no version pinning, components with no identified license, components with known CVEs (cross-reference against OSV.dev if network available)

3. **Dependency integrity verification**:
   - npm: compare `package-lock.json` `integrity` (sha512) fields against registry-published hashes
     ```bash
     npm audit --json 2>/dev/null | jq '.vulnerabilities | keys[]'
     ```
   - pip: verify hashes in `Pipfile.lock` against PyPI:
     ```bash
     pip hash --algorithm sha256 <package>.whl
     ```
   - Go: verify `go.sum` entries against module proxy checksums:
     ```bash
     go mod verify
     ```
   - Cargo: `cargo verify-project` and check `Cargo.lock` hash fields
   - Flag any dependency where the recorded hash does not match the current registry value (typosquatting or package substitution indicator)

4. **Typosquatting and dependency confusion detection**:
   - Check for packages with names similar to popular packages (Levenshtein distance <= 2)
   - Check for internal package names that also exist on public registries (dependency confusion vector)
   - Flag packages with very high version numbers (confusion attack often uses high semver to win resolution)
   - Flag packages published by single-user accounts with no prior history

5. **Build script analysis**:
   - Locate build scripts: `Makefile`, `build.sh`, `.github/workflows/`, `.gitlab-ci.yml`, `Jenkinsfile`, `azure-pipelines.yml`, `buildkite.yml`
   - Scan for: inline base64-encoded payloads, `curl | sh` patterns, outbound network calls during build
     ```bash
     grep -rE 'curl.*(sh|bash)|wget.*sh|base64.*decode|eval.*\$\(' .github/workflows/
     ```
   - Check for pinned action versions (SHA vs tag): unpinned tags can be silently replaced
   - Identify steps that write to artifact directories after the build verification step

6. **CI/CD pipeline tampering indicators**:
   - Compare current workflow files against git history: `git log --oneline -- .github/workflows/`
   - Identify workflow changes made by accounts other than core maintainers
   - Check for workflow files added in dependency branches or PRs from forks with write access
   - Review secrets usage: identify workflows that access secrets but are triggerable by external contributors
   - Flag `pull_request_target` triggers with checkout of untrusted code — common privilege escalation vector

7. **Build reproducibility check**:
   - Identify artifacts for which the build is declared reproducible
   - For npm packages: use `reprotest` or manual rebuild and hash comparison
   - Check for embedded timestamps, random salts, or non-deterministic ordering in build output
   - Compare artifact hash against published hash in package registry
   - Record: reproducibility claim, verification result, variance source if not reproducible

8. **SLSA level assessment**:
   - Level 1: Build process is scripted (automated, not manual)
   - Level 2: Build service generates provenance; source is version-controlled
   - Level 3: Build runs in an isolated environment; provenance is signed
   - Level 4: Reproducible builds; two-party review for all changes
   - Report achieved SLSA level and gaps to next level

9. **Write findings document**:
    - Save to `.aiwg/forensics/findings/supply-chain-forensics.md`
    - Sections: SBOM summary, integrity failures, typosquatting risks, build script anomalies, pipeline tampering indicators, SLSA assessment, remediation recommendations

## Usage Examples

### Example 1 — Full supply chain audit
```
supply chain forensics
```
Runs against the current working directory.

### Example 2 — SBOM analysis only
```
sbom analysis ./sbom.json
```

### Example 3 — Dependency audit for specific ecosystem
```
dependency audit --ecosystem npm
```

### Example 4 — CI/CD pipeline investigation
```
build pipeline investigation .github/workflows/
```

## Output Locations

- Findings: `.aiwg/forensics/findings/supply-chain-forensics.md`
- Generated SBOM: `.aiwg/forensics/evidence/sbom.json`
- Integrity report: `.aiwg/forensics/evidence/dependency-integrity.txt`

## Configuration

```yaml
supply_chain_forensics:
  sbom_format: cyclonedx
  sbom_version: "1.5"
  typosquatting_distance: 2
  check_osv: true
  check_reproducibility: true
  slsa_assessment: true
  pinned_action_check: true
  high_risk_patterns:
    - "curl.*|.*sh"
    - "wget.*sh"
    - "base64.*-d.*|.*sh"
    - "eval.*\\$\\("
    - "pull_request_target"
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Identify package ecosystems and build pipeline from lock files before starting analysis
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/evidence-integrity.md — Do not run build scripts during investigation; analyze artifacts read-only to avoid triggering payloads
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md — Report integrity failures and tampering indicators; await human decision before blocking or removing dependencies
- @$AIWG_ROOT/agentic/code/frameworks/forensics-complete/rules/red-flag-escalation.md — Escalate immediately when dependency hash mismatches or CI/CD script injection is confirmed
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/token-security.md — Supply chain audit checks for secrets in build pipelines; this rule defines what constitutes a violation
