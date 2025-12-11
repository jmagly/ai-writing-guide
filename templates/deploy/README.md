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
