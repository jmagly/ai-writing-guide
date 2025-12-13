---
id: jq
name: jq
version: "1.7"
category: utilities
platform: linux
platformNotes: "Available on all major platforms via package managers"
status: verified
verifiedDate: 2025-12-12
capabilities:
  - json-processing
  - filtering
  - transformation
  - streaming
synopsis: "Lightweight and flexible command-line JSON processor"
---

# jq - Command-line JSON Processor

## Quick Reference

```bash
# Essential patterns - copy and use immediately
jq '.' file.json                     # Pretty print JSON
jq '.field' file.json                # Extract single field
jq '.array[]' file.json              # Iterate array elements
jq -r '.name' file.json              # Raw output (no quotes)
cat data.json | jq '.items'          # Process piped input
```

## Synopsis

jq is a lightweight command-line JSON processor that allows you to slice, filter, map, and transform structured JSON data. It uses a domain-specific language for querying and manipulating JSON, making it ideal for shell scripting, API response processing, and data transformation pipelines. Think of it as `sed` or `awk` for JSON data.

## Common Patterns

### Basic Field Access

```bash
# Extract single field
jq '.name' data.json

# Nested field access
jq '.user.profile.email' data.json

# Multiple fields
jq '.name, .age' data.json

# Create new object from fields
jq '{name: .name, id: .identifier}' data.json
```

### Array Operations

```bash
# Get all array elements
jq '.items[]' data.json

# Get specific index
jq '.items[0]' data.json

# Get range (slice)
jq '.items[2:5]' data.json

# Get last element
jq '.items[-1]' data.json

# Array length
jq '.items | length' data.json
```

### Filtering

```bash
# Filter by condition
jq '.[] | select(.status == "active")' data.json

# Filter with comparison
jq '.[] | select(.count > 10)' data.json

# Multiple conditions
jq '.[] | select(.type == "user" and .active == true)' data.json

# Filter and transform
jq '[.[] | select(.price < 100) | {name, price}]' data.json
```

### Transformation

```bash
# Map over array
jq '[.items[] | .name]' data.json

# Add/modify fields
jq '.items[] | . + {processed: true}' data.json

# Delete field
jq 'del(.password)' data.json

# Rename field
jq '.items[] | {username: .name, id}' data.json

# Convert to CSV-like
jq -r '.items[] | [.name, .email] | @csv' data.json
```

### Aggregation

```bash
# Count items
jq '[.items[]] | length' data.json

# Sum values
jq '[.items[].price] | add' data.json

# Group by field
jq 'group_by(.category)' data.json

# Unique values
jq '[.items[].type] | unique' data.json

# Min/max
jq '[.items[].price] | min' data.json
jq '[.items[].price] | max' data.json
```

## Key Flags

| Flag | Description | Example |
|------|-------------|---------|
| `-r` | Raw output (no JSON quotes) | `jq -r '.name'` |
| `-c` | Compact output (single line) | `jq -c '.'` |
| `-s` | Slurp: read all inputs into array | `jq -s '.'` |
| `-S` | Sort object keys | `jq -S '.'` |
| `-e` | Exit 1 if result is null/false | `jq -e '.field'` |
| `-n` | Null input (for generating JSON) | `jq -n '{a:1}'` |
| `--arg` | Pass string variable | `jq --arg v "$VAR" '.x = $v'` |
| `--argjson` | Pass JSON variable | `jq --argjson n 5 '.count = $n'` |
| `--slurpfile` | Load JSON file as variable | `jq --slurpfile ref ref.json '...'` |
| `-f` | Read filter from file | `jq -f filter.jq data.json` |

## Input/Output

### Input Formats
- JSON file: `jq '.' file.json`
- stdin: `cat file.json | jq '.'`
- Multiple files: `jq '.' file1.json file2.json`
- URL (via curl): `curl -s api.example.com | jq '.'`

### Output Formats
- JSON (default): `jq '.'`
- Raw strings: `jq -r '.name'`
- CSV: `jq -r '@csv'`
- TSV: `jq -r '@tsv'`
- URI encoded: `jq -r '@uri'`
- Base64: `jq -r '@base64'`

### Exit Codes
| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Syntax error in filter |
| 2 | System error |
| 3 | Compile error |
| 5 | No result (with -e flag) |

## Error Handling

```bash
# Check if field exists before accessing
jq 'if .field then .field else "default" end' data.json

# Null coalescing (use default if null)
jq '.field // "default"' data.json

# Try/catch pattern
jq 'try .field catch "error"' data.json

# Validate JSON (exits non-zero if invalid)
jq empty file.json && echo "Valid JSON" || echo "Invalid JSON"

# Handle missing files
jq '.' file.json 2>/dev/null || echo "File not found or invalid"

# Safe navigation (won't error on missing keys)
jq '.user?.profile?.email // "no email"' data.json
```

## Performance Tips

- Use `-c` (compact) for large outputs to reduce I/O
- Stream large files with `--stream` flag for memory efficiency
- Avoid `.[]` on huge arrays; use `limit(n; .[])` for first N items
- For very large files, consider `gojq` (Go implementation) which is faster
- Pre-compile complex filters with `-f filter.jq` for reuse
- Use `first()` and `last()` instead of `.[0]` and `.[-1]` for clarity

## Platform-Specific Notes

### Linux
- **Installation**: `apt install jq` / `dnf install jq` / `pacman -S jq`
- **Path**: Usually `/usr/bin/jq`
- **Notes**: Pre-installed on many distributions; check version with `jq --version`

### macOS
- **Installation**: `brew install jq`
- **Path**: `/opt/homebrew/bin/jq` (Apple Silicon) or `/usr/local/bin/jq` (Intel)
- **Notes**: Not pre-installed; requires Homebrew or manual installation

### Windows/WSL
- **Installation**: `choco install jq` / `scoop install jq`
- **WSL**: Same as Linux within WSL environment
- **Notes**: PowerShell has `ConvertFrom-Json` but jq is more powerful for complex operations

## Integration Examples

### With Shell Scripts

```bash
#!/bin/bash
# Process API response and extract user emails

API_URL="https://api.example.com/users"
OUTPUT_FILE="emails.txt"

curl -s "$API_URL" | \
  jq -r '.users[] | select(.active == true) | .email' > "$OUTPUT_FILE"

echo "Extracted $(wc -l < "$OUTPUT_FILE") emails"
```

### With Other Tools

```bash
# Pipe from curl (API responses)
curl -s https://api.github.com/users/octocat | jq '.login, .name'

# Pipe to xargs (parallel processing)
jq -r '.urls[]' list.json | xargs -P4 -I{} curl -s {}

# Combine with grep (text filtering)
jq -c '.logs[]' data.json | grep "error"

# Format for diff
jq -S '.' a.json > a_sorted.json
jq -S '.' b.json > b_sorted.json
diff a_sorted.json b_sorted.json

# Convert JSON to environment variables
export $(jq -r 'to_entries | .[] | "\(.key)=\(.value)"' config.json | xargs)
```

### With Programming Languages

```bash
# Python - pass JSON to script
jq '.' data.json | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['name'])"

# Node.js - inline processing
node -e "const d=$(jq -c '.' data.json); console.log(d.name)"
```

## Troubleshooting

### Common Issues

**Issue**: `parse error: Invalid numeric literal`
**Solution**: Ensure JSON is valid. Common causes: trailing commas, single quotes (use double), unquoted keys.

**Issue**: `null` output when field should exist
**Solution**: Check exact key name (case-sensitive). Use `keys` to list available keys: `jq 'keys' data.json`

**Issue**: `Cannot iterate over null`
**Solution**: Add null check: `jq '.items // [] | .[]'` or use `try`

**Issue**: Quotes in output when piping
**Solution**: Use `-r` flag for raw strings: `jq -r '.name'`

**Issue**: Unicode/encoding issues
**Solution**: Ensure file is UTF-8. Use `--rawfile` for binary data.

### Debug Mode

```bash
# Show input and output
jq --debug '.' data.json

# Test filter step by step
jq '.items' data.json          # Step 1
jq '.items[]' data.json        # Step 2
jq '.items[] | .name' data.json # Step 3

# Print intermediate values
jq '.items | debug | .[]' data.json
```

## See Also

- **Man page**: `man jq`
- **Help**: `jq --help`
- **Documentation**: https://stedolan.github.io/jq/manual/
- **Online playground**: https://jqplay.org/
- **Related tools**:
  - `yq` - YAML processor (jq syntax)
  - `fx` - Interactive JSON viewer
  - `gron` - Make JSON greppable
  - `jo` - JSON output from shell

## Version History

| Version | Notable Changes |
|---------|-----------------|
| 1.7 | SQL-like operators, `$ENV`, `@base32d`, improvements |
| 1.6 | `limit`, `until`, `range`, `isnan`, path expressions |
| 1.5 | `@base64d`, `@uri`, streaming parser, `$__loc__` |
| 1.4 | `env`, `$ENV`, `split`, `join`, regex support |

---

**Specification Metadata**
- Generated: 2025-12-12T10:00:00Z
- Source: .aiwg/smiths/toolsmith/tools/utilities/jq.tool.md
- Platform: linux
- Status: verified
