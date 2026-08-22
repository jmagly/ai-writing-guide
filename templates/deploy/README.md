# Deployment Templates

Production-ready deployment configurations for containerized applications.

## Research Foundation

**REF-001**: BP-8 - Containerized Deployment

> "Production-grade agentic workflows require containerized deployment with proper isolation, resource management, and orchestration."

## Available Templates

### Docker

| Template | Purpose |
|----------|---------|
| `docker/node.Dockerfile` | Multi-stage Node.js build |
| `docker/python.Dockerfile` | Multi-stage Python build |

Features:

- Multi-stage builds (smaller images)
- Non-root user (security)
- Health checks
- Layer caching optimization

### Kubernetes

| Template | Purpose |
|----------|---------|
| `kubernetes/deployment.yaml` | Pod specification with probes |
| `kubernetes/service.yaml` | Service exposure |

Features:

- Resource limits and requests
- Liveness and readiness probes
- Security context (non-root, read-only)
- Pod anti-affinity

### Static sites

| Template | Purpose |
|----------|---------|
| `static-site/flow.aiwg.io/` | Approved #2125 bootstrap for the private `roctinam/flow.aiwg.io` repository on the shared `serve-static` origin |
| `static-site/per-site-container/` | Guarded fallback for a site that requires its own Caddy container and unique localhost origin port |

The Flow site bootstrap contains a versioned deployment plan, exact Caddy host
block, read-only volume mapping, and pinned Gitea deploy workflow. Validate the
plan before copying it:

```bash
node tools/deploy/validate-flow-domain-static-site-plan.mjs \
  templates/deploy/static-site/flow.aiwg.io/deployment-plan.json
```

It approves `flow.aiwg.io` with graph content under `/graph/`; fourth-level DNS
names are rejected. The bootstrap does not create a repository or mutate live
DNS, Cloudflare, tunnels, origins, or access policies.

## Usage

### Via Command

```bash
/deploy-gen docker --app-name my-app --port 3000
/deploy-gen k8s --app-name my-app --port 3000
```

### Manual Copy

```bash
cp templates/deploy/docker/node.Dockerfile ./Dockerfile
# Then replace {{VARIABLES}} with actual values
```

For an approved static-site repository, copy its reviewed workflow template to
`.gitea/workflows/deploy.yml`. Keep protected values in the tracker or approved
secret broker and commit only interface names.

## Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `{{APP_NAME}}` | Application name | `my-api` |
| `{{PORT}}` | Application port | `3000` |
| `{{NODE_VERSION}}` | Node.js version | `20-alpine` |
| `{{PYTHON_VERSION}}` | Python version | `3.11` |
| `{{ENTRY_POINT}}` | Application entry point | `dist/index.js` |
| `{{IMAGE_REGISTRY}}` | Container registry | `ghcr.io/org` |
| `{{IMAGE_TAG}}` | Image tag | `latest` |

## Best Practices

### Docker

1. Use multi-stage builds to reduce image size
2. Run as non-root user
3. Include health check endpoint
4. Use `.dockerignore` to exclude dev files
5. Pin base image versions

### Kubernetes

1. Set resource requests AND limits
2. Include liveness AND readiness probes
3. Use ConfigMaps for configuration
4. Enable pod anti-affinity for HA
5. Use security contexts

## Success Metrics

| Metric | Target |
|--------|--------|
| Time to containerize | <2 minutes |
| Image size | Minimal (multi-stage) |
| Security baseline | Non-root, read-only FS |
