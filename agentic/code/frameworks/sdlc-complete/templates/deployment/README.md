# Deployment Templates

Artifacts for deployment planning, automation, infrastructure, and release collateral.

## Deployment Planning

- deployment-plan-template.md - Strategic deployment approach and rollout strategy
- product-acceptance-plan-template.md - Acceptance criteria and sign-off procedures
- release-notes-template.md - Customer-facing release communication
- bill-of-materials-template.md - Component inventory and versions

## DevOps Automation (NEW)

- ci-cd-pipeline-template.md - Continuous integration and deployment pipeline definition
- automated-quality-gate-template.md - Quality gate criteria and enforcement
- infrastructure-definition-template.md - Infrastructure-as-Code specifications
- deployment-environment-template.md - Environment-specific configurations and characteristics

## Operations

- support-runbook-template.md - Operational procedures and troubleshooting
- rollout-checklist-card.md - Manual deployment verification steps
- runbook-entry-card.md - Specific operational procedure documentation
- feature-toggle-card.md - Feature flag management and rollout

## Template Selection Guidance

### For Automated CI/CD Pipelines

Start with:

1. ci-cd-pipeline-template.md (pipeline structure and stages)
2. automated-quality-gate-template.md (gate criteria)
3. deployment-plan-template.md (strategic approach)

### For Infrastructure Provisioning

Start with:

1. infrastructure-definition-template.md (infrastructure resources)
2. deployment-environment-template.md (per-environment configuration)
3. deployment-plan-template.md (deployment approach)

### For Manual Deployments

Start with:

1. deployment-plan-template.md (strategy)
2. rollout-checklist-card.md (verification steps)
3. support-runbook-template.md (operations)

### For Progressive Delivery

Start with:

1. ci-cd-pipeline-template.md (automation)
2. feature-toggle-card.md (feature flags)
3. deployment-plan-template.md (phased rollout)

## Key Principles

The DevOps automation templates (ci-cd-pipeline, automated-quality-gate, infrastructure-definition, deployment-environment) are intentionally **tool-agnostic**. They specify:

- **WHAT** must be accomplished (pipeline stages, quality criteria, infrastructure resources)
- **WHICH** patterns to follow (quality gates, immutable infrastructure, environment parity)

They do **NOT** prescribe:

- **HOW** to implement (GitHub Actions vs. Jenkins, Terraform vs. CloudFormation)
- Specific tool syntax or configurations

This approach allows teams to:

- Choose tools that fit their organization
- Migrate between tools without rewriting specifications
- Let agents generate tool-specific configurations from requirements
