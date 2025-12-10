# API Adapter Extension

HTTP/Webhook interface for triggering AIWG workflows from external systems.

## Research Foundation

**REF-001**: BP-7 - External System Integration

> "Production agentic systems must integrate with existing infrastructure via standard protocols (HTTP, webhooks, message queues)."

## Purpose

Enable external systems (CI/CD, issue trackers, chat platforms) to trigger AIWG workflows without direct CLI access.

## Architecture

```
External System → API Adapter → Claude Code CLI → AIWG Workflow
     │                │               │                │
 Webhook/HTTP    Express/FastAPI   claude invoke    Task Orchestration
```

## Status: SPECIFICATION

This is a design specification. Implementation is planned for P3.

## Endpoints

### POST /workflows/trigger

Trigger a workflow by name.

```json
{
  "workflow": "flow-security-review-cycle",
  "project_path": "/path/to/project",
  "guidance": "Focus on authentication",
  "async": true
}
```

Response:

```json
{
  "job_id": "uuid",
  "status": "queued",
  "estimated_duration": "5-10m"
}
```

### GET /workflows/{job_id}/status

Check workflow status.

```json
{
  "job_id": "uuid",
  "status": "running",
  "progress": {
    "completed": ["primary-draft", "security-review"],
    "in_progress": ["test-review"],
    "pending": ["synthesis"]
  }
}
```

### POST /workflows/{job_id}/cancel

Cancel a running workflow.

### GET /workflows/available

List available workflows.

```json
{
  "workflows": [
    {
      "name": "flow-security-review-cycle",
      "description": "Security validation workflow",
      "parameters": ["iteration", "guidance"]
    }
  ]
}
```

## Authentication

### API Key

```bash
curl -H "Authorization: Bearer $AIWG_API_KEY" ...
```

### Webhook Signature

For incoming webhooks (GitHub, GitLab, etc.):

```python
import hmac
signature = request.headers.get('X-Hub-Signature-256')
expected = hmac.new(secret, request.body, 'sha256').hexdigest()
```

## Event Triggers

### GitHub Integration

```yaml
# .github/workflows/aiwg-security.yml
on:
  pull_request:
    types: [opened, synchronize]

jobs:
  security-review:
    steps:
      - uses: aiwg/trigger-workflow@v1
        with:
          workflow: flow-security-review-cycle
          api_url: ${{ secrets.AIWG_API_URL }}
          api_key: ${{ secrets.AIWG_API_KEY }}
```

### GitLab Integration

```yaml
# .gitlab-ci.yml
aiwg_security:
  stage: test
  script:
    - curl -X POST "$AIWG_API_URL/workflows/trigger" \
        -H "Authorization: Bearer $AIWG_API_KEY" \
        -d '{"workflow": "flow-security-review-cycle"}'
```

### Slack Integration

```
/aiwg security-review --guidance "Focus on auth"
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `AIWG_API_PORT` | Server port (default: 3100) |
| `AIWG_API_KEY` | Authentication key |
| `AIWG_PROJECT_ROOT` | Default project path |
| `AIWG_CLAUDE_PATH` | Path to Claude CLI |

### Config File

```yaml
# aiwg-api.config.yaml
server:
  port: 3100
  cors_origins: ["https://github.com"]

auth:
  type: api_key  # or oauth2, jwt
  keys_file: ./api-keys.enc

claude:
  path: /usr/local/bin/claude
  default_model: sonnet

webhooks:
  github:
    enabled: true
    secret_env: GITHUB_WEBHOOK_SECRET
```

## Implementation Reference

### Node.js (Express)

```typescript
// server.ts
import express from 'express';
import { execSync } from 'child_process';

const app = express();

app.post('/workflows/trigger', async (req, res) => {
  const { workflow, project_path, guidance } = req.body;

  // Validate workflow exists
  // Queue job
  // Return job_id

  // Background execution
  execSync(`claude invoke /${workflow} --guidance "${guidance}"`, {
    cwd: project_path
  });
});
```

### Python (FastAPI)

```python
# server.py
from fastapi import FastAPI, BackgroundTasks
import subprocess

app = FastAPI()

@app.post("/workflows/trigger")
async def trigger_workflow(
    workflow: str,
    project_path: str,
    background_tasks: BackgroundTasks
):
    job_id = uuid.uuid4()

    background_tasks.add_task(
        run_workflow, workflow, project_path, job_id
    )

    return {"job_id": str(job_id), "status": "queued"}

def run_workflow(workflow, project_path, job_id):
    subprocess.run(
        ["claude", "invoke", f"/{workflow}"],
        cwd=project_path
    )
```

## OpenAPI Specification

See `openapi.yaml` for full API specification (to be generated).

## Security Considerations

1. **Authentication Required**: All endpoints require authentication
2. **Rate Limiting**: Prevent workflow spam
3. **Project Isolation**: Each request scoped to project
4. **Secret Management**: API keys and webhook secrets encrypted
5. **Audit Logging**: All triggers logged with source

## Future Enhancements

### P3 Scope

- WebSocket support for real-time progress
- Message queue integration (Redis, RabbitMQ)
- OAuth2/OIDC authentication
- Multi-tenant support

### Post-P3

- GraphQL API
- gRPC interface
- SDK libraries (Node, Python, Go)

## Related

- `flow-*.md` - Workflow commands
- `deploy-gen` - Deployment configuration
- `aiwg-hooks` - Native hook integration
