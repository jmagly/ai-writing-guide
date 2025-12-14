# Deploy Generators

Generate production-ready deployment configurations based on project analysis.

---

## Usage

```text
/deploy-gen docker [options]
/deploy-gen k8s [options]
/deploy-gen compose [options]
```

---

## Deployment Types

| Type | Output | Use Case |
|------|--------|----------|
| `docker` | Dockerfile, .dockerignore | Container builds |
| `k8s` | Kubernetes manifests | Production orchestration |
| `compose` | docker-compose.yml | Local development |

---

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--output` | `./deploy/` | Output directory |
| `--app-name` | from package.json | Application name |
| `--port` | 3000 | Application port |
| `--multi-stage` | true | Use multi-stage Dockerfile |
| `--health-check` | true | Include health check endpoints |

---

## Process

### 1. Project Analysis

The generator detects:
- Runtime (Node.js, Python, Go, Java)
- Package manager (npm, yarn, pip, go mod)
- Entry point
- Build requirements

### 2. Template Selection

| Runtime | Template |
|---------|----------|
| Node.js | Multi-stage with npm ci |
| Python | Multi-stage with pip |
| Go | Multi-stage with static binary |

### 3. Configuration Generation

Files are generated with project-specific values.

---

## Docker Output

```text
deploy/
├── Dockerfile           # Multi-stage build
├── .dockerignore        # Exclude dev files
└── docker-build.sh      # Build helper script
```

**Features:**
- Multi-stage build (build → production)
- Non-root user
- Health check
- Proper signal handling
- Layer caching optimization

---

## Kubernetes Output

```text
deploy/k8s/
├── deployment.yaml      # Pod specification
├── service.yaml         # Service exposure
├── configmap.yaml       # Environment configuration
├── hpa.yaml            # Horizontal Pod Autoscaler
└── kustomization.yaml  # Kustomize base
```

**Features:**
- Resource limits and requests
- Liveness and readiness probes
- ConfigMap for environment
- HPA for auto-scaling
- Kustomize for environment overlays

---

## Docker Compose Output

```text
deploy/
├── docker-compose.yml       # Service definition
├── docker-compose.dev.yml   # Development overrides
└── .env.example             # Environment template
```

---

## Examples

```text
# Generate Dockerfile for Node.js project
/deploy-gen docker

# Generate Kubernetes manifests with custom name/port
/deploy-gen k8s --app-name my-api --port 8080

# Generate Docker Compose in current directory
/deploy-gen compose --output ./

# Generate all deployment types
/deploy-gen docker
/deploy-gen k8s
/deploy-gen compose
```

---

## Template Variables

| Variable | Source |
|----------|--------|
| `{{APP_NAME}}` | --app-name or package.json |
| `{{PORT}}` | --port option |
| `{{NODE_VERSION}}` | .nvmrc or latest LTS |
| `{{PYTHON_VERSION}}` | .python-version or 3.11 |
| `{{ENTRY_POINT}}` | Detected from project |

---

## Security Best Practices

All generated configurations follow security best practices:

- **Non-root user** - Containers run as unprivileged user
- **Minimal base images** - Alpine or distroless where possible
- **No secrets in images** - Environment variables for configuration
- **Read-only filesystem** - Where supported
- **Resource limits** - Prevent resource exhaustion

---

## Related Commands

| Command | Description |
|---------|-------------|
| `/project-health-check` | Analyze project before deployment |
| `/security-audit` | Security review before production |
| `/flow-deploy-to-production` | Full deployment workflow |
