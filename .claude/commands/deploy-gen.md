---
name: deploy-gen
description: Generate deployment configurations (Docker, Kubernetes) for the current project
argument-hint: [--guidance "text"] [--interactive]
args: <type> [--output <dir>] [--app-name <name>] [--port <port>]
---

# Deploy Generator

Generate production-ready deployment configurations based on project analysis.

## Research Foundation

**REF-001**: BP-8 - Containerized Deployment

> "Production-grade agentic workflows require containerized deployment with proper isolation, resource management, and orchestration."

## Usage

```bash
/deploy-gen docker [options]
/deploy-gen k8s [options]
/deploy-gen compose [options]
```

## Arguments

| Argument | Required | Description |
|----------|----------|-------------|
| type | Yes | Deployment type: docker, k8s, compose |

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --output | ./deploy/ | Output directory for generated files |
| --app-name | (from package.json) | Application name |
| --port | 3000 | Application port |
| --multi-stage | true | Use multi-stage Dockerfile |
| --health-check | true | Include health check endpoints |

## Process

### 1. Project Analysis

Detect project characteristics:

```
Analyzing project...
- Runtime: [node/python/go/java]
- Package manager: [npm/yarn/pip/go mod]
- Entry point: [detected or ask]
- Dependencies: [count]
- Build required: [yes/no]
```

### 2. Template Selection

Choose appropriate templates based on analysis:

| Runtime | Template |
|---------|----------|
| Node.js | `templates/deploy/docker/node.Dockerfile` |
| Python | `templates/deploy/docker/python.Dockerfile` |
| Go | `templates/deploy/docker/go.Dockerfile` |

### 3. Configuration Generation

Generate deployment files with project-specific values.

## Output: Docker

```
deploy/
├── Dockerfile           # Multi-stage build
├── .dockerignore        # Exclude dev files
└── docker-build.sh      # Build helper script
```

### Dockerfile Features

- Multi-stage build (build → production)
- Non-root user
- Health check
- Proper signal handling
- Layer caching optimization

## Output: Kubernetes

```
deploy/k8s/
├── deployment.yaml      # Pod specification
├── service.yaml         # Service exposure
├── configmap.yaml       # Environment configuration
├── hpa.yaml            # Horizontal Pod Autoscaler
└── kustomization.yaml  # Kustomize base
```

### Kubernetes Features

- Resource limits and requests
- Liveness and readiness probes
- ConfigMap for environment
- HPA for auto-scaling
- Kustomize for environment overlays

## Output: Docker Compose

```
deploy/
├── docker-compose.yml       # Service definition
├── docker-compose.dev.yml   # Development overrides
└── .env.example             # Environment template
```

## Examples

```bash
# Generate Dockerfile for Node.js project
/deploy-gen docker

# Generate full Kubernetes manifests
/deploy-gen k8s --app-name my-api --port 8080

# Generate Docker Compose for local development
/deploy-gen compose --output ./

# Generate all deployment types
/deploy-gen docker && /deploy-gen k8s && /deploy-gen compose
```

## Template Variables

Templates use these variables:

| Variable | Source |
|----------|--------|
| `{{APP_NAME}}` | --app-name or package.json |
| `{{PORT}}` | --port option |
| `{{NODE_VERSION}}` | .nvmrc or latest LTS |
| `{{PYTHON_VERSION}}` | .python-version or 3.11 |
| `{{ENTRY_POINT}}` | Detected from project |

## CLI Equivalent

```bash
aiwg deploy-gen <type> [options]
```

## Related Commands

- `/project-health-check` - Analyze project before deployment
- `/security-audit` - Security review before production
- `/flow-deploy-to-production` - Full deployment workflow


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/deploy-gen --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/deploy-gen --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Success Metrics

From Unified Plan:

| Metric | Target |
|--------|--------|
| Zero to containerized | <2 minutes |
| Generated configs | Production-ready |
| Security baseline | Non-root, minimal image |

Generate deployment for: $ARGUMENTS
