# MCPSmith

MCPSmith is a specialized Smith agent that creates MCP (Model Context Protocol) servers dynamically using Docker containers. It enables on-demand creation of isolated MCP tools that can be spun up, cached, and reused across workflows.

## Overview

**Problem**: Custom MCP tools are needed on-demand during agentic workflows, but adding them to the main AIWG MCP server requires code changes, and custom tools may have conflicting dependencies.

**Solution**: MCPSmith creates Dockerized MCP servers dynamically:
1. Receives tool request from orchestrating agent
2. Checks catalog for existing container/tool
3. Generates MCP implementation + Dockerfile
4. Builds and runs container
5. Registers in catalog for reuse
6. Returns connection info to orchestrator

## Getting Started

### 1. Generate MCP Environment Definition

Before using MCPSmith, generate an MCP environment definition:

```
/smith-mcpdef
```

This probes your system and creates `.aiwg/smiths/mcp-definition.yaml` with:
- Docker availability and version
- Node.js version
- MCP SDK version
- Available base images
- Network configuration

### 2. Request an MCP Tool

Orchestrating agents can request MCP tools via the Task tool:

```
Task(MCPSmith) -> "Create an MCP tool to fetch and parse JSON from URLs"
```

MCPSmith will:
1. Check if a matching tool exists in the catalog
2. If not, design and implement the tool
3. Build a Docker container
4. Test the MCP protocol
5. Register in the catalog
6. Return the container image and usage instructions

### 3. Use the MCP Tool

Tools are run as Docker containers with stdio transport:

```bash
# Run the container
docker run -i --rm aiwg-mcp/json-fetcher:1.0.0

# Send MCP requests via stdin
echo '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"fetch-json","arguments":{"url":"https://api.example.com"}}}' | \
docker run -i --rm aiwg-mcp/json-fetcher:1.0.0
```

## Directory Structure

```
.aiwg/smiths/
├── mcp-definition.yaml         # MCP/Docker environment
└── mcpsmith/
    ├── catalog.yaml            # Index of MCP tools
    ├── tools/                  # Tool specifications (YAML)
    │   └── json-fetcher.yaml
    ├── implementations/        # Generated MCP tool code
    │   └── json-fetcher/
    │       ├── index.mjs
    │       ├── package.json
    │       └── Dockerfile
    ├── templates/              # Base templates
    │   ├── Dockerfile.template
    │   ├── index.mjs.template
    │   └── package.json.template
    └── images/                 # Built image metadata
        └── json-fetcher.json
```

## MCP Environment Definition

The environment definition (`mcp-definition.yaml`) describes:

```yaml
docker:
  available: true
  version: "24.0.7"
  daemon_running: true

node:
  available: true
  version: "20.10.0"

mcp:
  sdk_version: "1.24.0"
  spec_version: "2025-11-25"
  transports:
    - stdio

base_images:
  node_alpine:
    image: "node:20-alpine"
    cached: true

network:
  name: "aiwg-mcp-network"
  exists: false

ports:
  range_start: 9100
  range_end: 9199
```

## Tool Specification

MCP tools are defined with YAML specifications:

```yaml
name: json-fetcher
version: "1.0.0"
description: "Fetches and parses JSON from URLs"

mcp:
  tool_name: "fetch-json"
  title: "JSON Fetcher"
  description: "Fetches JSON data from a URL and returns parsed content"

inputs:
  - name: url
    type: string
    required: true
    description: "URL to fetch JSON from"
  - name: headers
    type: object
    required: false
    description: "Optional HTTP headers"

outputs:
  - name: data
    type: json
    description: "Parsed JSON data"

docker:
  base_image: "node:20-alpine"
  transport: stdio
  dependencies:
    - node-fetch

tests:
  - name: "Basic fetch"
    input:
      url: "https://jsonplaceholder.typicode.com/posts/1"
    expect_contains: "userId"

tags: [http, json, fetch, api]
```

## Workflow

```
┌─────────────────────┐
│ Orchestrating Agent │
└──────────┬──────────┘
           │
           │ "Need an MCP tool to..."
           ▼
┌─────────────────────┐
│     MCPSmith        │
└──────────┬──────────┘
           │
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Catalog │ │ MCP-Def │
│ Check   │ │         │
└────┬────┘ └────┬────┘
     │           │
     ├───────────┤
     ▼           ▼
┌─────────┐ ┌─────────┐
│ Reuse   │ │ Create  │
│ Image   │ │ Image   │
└────┬────┘ └────┬────┘
     │           │
     │      ┌────┴────┐
     │      ▼         ▼
     │   Generate   Build
     │   Code      Container
     │      │         │
     │      └────┬────┘
     │           ▼
     │        Test MCP
     │           │
     └─────┬─────┘
           ▼
┌─────────────────────┐
│ Return Image Name   │
│ + Usage Instructions│
└─────────────────────┘
```

## Commands

### /smith-mcpdef

Generate or update the MCP environment definition.

```bash
# Generate full MCP definition
/smith-mcpdef

# Verify existing definition
/smith-mcpdef --verify-only

# Update with changes and create network
/smith-mcpdef --update --create-network
```

## Container Lifecycle

### Build
```bash
docker build -t aiwg-mcp/<name>:<version> .aiwg/smiths/mcpsmith/implementations/<name>/
```

### Run (stdio mode)
```bash
docker run -i --rm aiwg-mcp/<name>:<version>
```

### Stop
```bash
docker stop <container_id>
```

### Cleanup
```bash
docker rmi aiwg-mcp/<name>:<version>
```

## MCP Protocol Integration

MCPSmith creates tools that follow the MCP specification (2025-11-25):

### Initialize Handshake
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {"name": "client", "version": "1.0.0"}
  }
}
```

### Tool Call
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "fetch-json",
    "arguments": {
      "url": "https://api.example.com/data"
    }
  }
}
```

### Response
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "content": [
      {"type": "text", "text": "{\"data\": ...}"}
    ]
  }
}
```

## Best Practices

### For Orchestrating Agents

1. **Be specific in requests**: "Fetch JSON from URL with custom headers" is better than "get data"
2. **Include error handling needs**: Specify how errors should be reported
3. **Check catalog first**: The catalog may already have what you need

### For Tool Design

1. **Use Zod validation**: Always validate inputs before processing
2. **Return structured data**: Use JSON for complex outputs
3. **Handle errors gracefully**: Return `isError: true` for failures
4. **Include tests**: At least one test case per tool

### For Docker Images

1. **Use Alpine base**: Smaller images, faster builds
2. **Pin dependency versions**: Reproducible builds
3. **Don't include dev dependencies**: Production only
4. **Test locally first**: Verify before building

## Limitations

- **Stdio transport only**: HTTP transport planned for future
- **Single tool per container**: Each container hosts one MCP tool
- **Local Docker required**: Cannot use remote Docker hosts (yet)
- **No GPU support**: ML tools require additional configuration

## Troubleshooting

### "Docker not available"

Ensure Docker is installed and running:
```bash
docker --version
docker info
```

### "Image build failed"

Check the build output for errors:
```bash
docker build -t test .aiwg/smiths/mcpsmith/implementations/<name>/
```

### "MCP protocol error"

Verify the container responds to MCP:
```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}}}' | \
docker run -i --rm aiwg-mcp/<name>:<version>
```

## References

- MCPSmith Agent: `agentic/code/frameworks/sdlc-complete/agents/mcpsmith.md`
- MCP Definition Command: `agentic/code/frameworks/sdlc-complete/commands/smith-mcpdef.md`
- MCP Specification: `docs/content/references/REF-003-mcp-specification-2025.md`
- ToolSmith (sibling): `docs/smithing/README.md`
