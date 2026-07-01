#!/usr/bin/env python3
"""
Parallel Agent Dispatcher

Orchestrate multiple agents in parallel and collect results.

Usage:
    python parallel_dispatcher.py --config review-config.yaml
    python parallel_dispatcher.py --agents "agent1,agent2" --artifact path/to/artifact
    python parallel_dispatcher.py --list-groups
"""

import json
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Try to import yaml
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Built-in agent groups for common scenarios
AGENT_GROUPS = {
    'architecture-review': {
        'description': 'Review architecture artifacts for quality and compliance',
        'agents': ['security-architect', 'test-architect', 'requirements-analyst', 'technical-writer'],
        'timeout': 300
    },
    'security-review': {
        'description': 'Security-focused review of artifacts or code',
        'agents': ['security-architect', 'security-auditor', 'privacy-officer'],
        'timeout': 300
    },
    'documentation-review': {
        'description': 'Review documentation for clarity and completeness',
        'agents': ['technical-writer', 'requirements-analyst', 'domain-expert'],
        'timeout': 240
    },
    'marketing-review': {
        'description': 'Brand and compliance review of marketing assets',
        'agents': ['brand-guardian', 'legal-reviewer', 'quality-controller', 'accessibility-checker'],
        'timeout': 300
    },
    'code-review': {
        'description': 'Comprehensive code review',
        'agents': ['code-reviewer', 'security-auditor', 'test-engineer'],
        'timeout': 300
    },
    'gate-validation': {
        'description': 'Phase gate validation review',
        'agents': ['architecture-designer', 'test-architect', 'security-gatekeeper', 'requirements-analyst'],
        'timeout': 360
    }
}

# Default prompt templates per agent type
DEFAULT_PROMPTS = {
    'security-architect': '''Review the artifact for security concerns.
Focus on: authentication, authorization, data protection, input validation, secure defaults.
Artifact: {artifact_path}
Output: List findings with severity (Critical/High/Medium/Low) and recommendations.''',

    'test-architect': '''Review the artifact for testability and test coverage.
Focus on: test coverage gaps, edge cases, integration points, NFR validation.
Artifact: {artifact_path}
Output: List test recommendations with priority and coverage assessment.''',

    'requirements-analyst': '''Review the artifact for requirements traceability.
Focus on: requirement coverage, gaps, conflicts, ambiguities.
Artifact: {artifact_path}
Output: Traceability assessment with mapped requirements and gaps.''',

    'technical-writer': '''Review the artifact for clarity and documentation quality.
Focus on: completeness, consistency, readability, structure.
Artifact: {artifact_path}
Output: Documentation quality assessment with improvement suggestions.''',

    'security-auditor': '''Audit the artifact for security vulnerabilities.
Focus on: OWASP top 10, secrets exposure, injection risks, access control.
Artifact: {artifact_path}
Output: Vulnerability findings with CVSS scores and remediation steps.''',

    'privacy-officer': '''Review the artifact for privacy compliance.
Focus on: PII handling, data retention, consent, GDPR/CCPA compliance.
Artifact: {artifact_path}
Output: Privacy assessment with compliance gaps and recommendations.''',

    'brand-guardian': '''Review the asset for brand compliance.
Focus on: visual identity, verbal identity, tone consistency, guidelines adherence.
Asset: {artifact_path}
Output: Brand compliance report with issues and corrections needed.''',

    'legal-reviewer': '''Review the asset for legal compliance.
Focus on: claims substantiation, required disclosures, trademark usage, privacy.
Asset: {artifact_path}
Output: Legal review with risk assessment and required changes.''',

    'quality-controller': '''Review the asset for quality specifications.
Focus on: technical specs, formatting, links, rendering, accessibility basics.
Asset: {artifact_path}
Output: QA checklist results with issues by severity.''',

    'accessibility-checker': '''Review the asset for accessibility compliance.
Focus on: WCAG 2.1 AA, color contrast, alt text, keyboard navigation, screen reader.
Asset: {artifact_path}
Output: Accessibility audit with issues and remediation guidance.''',

    'code-reviewer': '''Review the code for quality and best practices.
Focus on: code style, patterns, performance, maintainability, error handling.
Artifact: {artifact_path}
Output: Code review with issues categorized and improvement suggestions.''',

    'domain-expert': '''Review the artifact for domain accuracy and completeness.
Focus on: business rules, domain terminology, workflow accuracy.
Artifact: {artifact_path}
Output: Domain validation with corrections and clarifications needed.'''
}


def load_yaml_config(path: Path) -> dict:
    """Load YAML configuration file."""
    if not HAS_YAML:
        raise ImportError("PyYAML required for config files. Install with: pip install pyyaml")

    with open(path) as f:
        return yaml.safe_load(f)


def get_agent_group(group_name: str) -> dict:
    """Get predefined agent group configuration."""
    if group_name not in AGENT_GROUPS:
        available = ', '.join(AGENT_GROUPS.keys())
        raise ValueError(f"Unknown group '{group_name}'. Available: {available}")
    return AGENT_GROUPS[group_name]


def build_agent_prompt(agent_name: str, context: dict, custom_prompt: Optional[str] = None) -> str:
    """Build the prompt for an agent."""
    template = custom_prompt or DEFAULT_PROMPTS.get(agent_name,
        f"Review the artifact at {{artifact_path}}. Provide analysis and recommendations.")

    # Substitute context variables
    prompt = template
    for key, value in context.items():
        prompt = prompt.replace(f'{{{key}}}', str(value))

    return prompt


def generate_dispatch_config(
    agents: List[str],
    artifact_path: str,
    timeout: int = 300,
    custom_prompts: Optional[Dict[str, str]] = None,
    context: Optional[dict] = None
) -> dict:
    """Generate a dispatch configuration."""
    ctx = context or {}
    ctx['artifact_path'] = artifact_path

    agent_configs = []
    for agent in agents:
        prompt = build_agent_prompt(
            agent,
            ctx,
            custom_prompts.get(agent) if custom_prompts else None
        )
        agent_configs.append({
            'name': agent,
            'prompt': prompt
        })

    return {
        'dispatch': {
            'name': f"dispatch-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            'timeout': timeout,
            'agents': agent_configs,
            'context': ctx,
            'result_format': 'structured',
            'aggregate': True
        }
    }


def validate_config(config: dict) -> List[str]:
    """Validate dispatch configuration."""
    errors = []

    dispatch = config.get('dispatch', {})

    if 'agents' not in dispatch:
        errors.append("Missing 'agents' list in dispatch configuration")
    elif not isinstance(dispatch['agents'], list):
        errors.append("'agents' must be a list")
    elif len(dispatch['agents']) == 0:
        errors.append("'agents' list cannot be empty")
    else:
        for i, agent in enumerate(dispatch['agents']):
            if not isinstance(agent, dict):
                errors.append(f"Agent {i} must be a dictionary")
            elif 'name' not in agent:
                errors.append(f"Agent {i} missing 'name' field")

    if 'timeout' in dispatch:
        timeout = dispatch['timeout']
        if not isinstance(timeout, (int, float)) or timeout <= 0:
            errors.append("'timeout' must be a positive number")
        elif timeout > 600:
            errors.append("'timeout' should not exceed 600 seconds (10 minutes)")

    return errors


def generate_orchestration_prompt(config: dict) -> str:
    """Generate the orchestration prompt for Claude Code to execute."""
    dispatch = config['dispatch']
    agents = dispatch['agents']
    timeout = dispatch.get('timeout', 300)

    prompt_lines = [
        "# Parallel Agent Dispatch",
        "",
        f"Dispatch ID: {dispatch.get('name', 'unnamed')}",
        f"Timeout: {timeout} seconds",
        f"Agents: {len(agents)}",
        "",
        "## Agent Tasks",
        "",
        "Launch the following agents in parallel using the Task tool.",
        "Send a SINGLE message with multiple Task tool invocations.",
        ""
    ]

    for agent in agents:
        prompt_lines.extend([
            f"### {agent['name']}",
            "",
            "```",
            agent['prompt'],
            "```",
            ""
        ])

    prompt_lines.extend([
        "## Execution Instructions",
        "",
        "1. Launch ALL agents listed above in a SINGLE message",
        "2. Each agent should use subagent_type matching the agent name",
        "3. Collect all results",
        "4. Return structured results with per-agent output",
        "",
        "## Expected Output Format",
        "",
        "```json",
        "{",
        '  "dispatch_id": "...",',
        '  "status": "completed|partial|failed",',
        '  "agents": {',
        '    "agent-name": {',
        '      "status": "success|failed|timeout",',
        '      "output": "..."',
        '    }',
        '  }',
        "}",
        "```"
    ])

    return '\n'.join(prompt_lines)


def create_result_template(config: dict) -> dict:
    """Create a result template structure."""
    dispatch = config['dispatch']
    agents = dispatch['agents']

    return {
        'dispatch_id': dispatch.get('name', f"dispatch-{datetime.now().strftime('%Y%m%d-%H%M%S')}"),
        'status': 'pending',
        'started_at': datetime.now().isoformat(),
        'timeout': dispatch.get('timeout', 300),
        'agents': {
            agent['name']: {
                'status': 'pending',
                'output': None
            }
            for agent in agents
        },
        'aggregate': None
    }


def list_groups() -> None:
    """List available agent groups."""
    print("Available Agent Groups:")
    print("=" * 60)
    for name, group in AGENT_GROUPS.items():
        print(f"\n{name}")
        print(f"  Description: {group['description']}")
        print(f"  Agents: {', '.join(group['agents'])}")
        print(f"  Default timeout: {group['timeout']}s")


def list_default_agents() -> None:
    """List agents with default prompts."""
    print("Agents with Default Prompts:")
    print("=" * 60)
    for name in sorted(DEFAULT_PROMPTS.keys()):
        print(f"  - {name}")


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    config_path = None
    agents_str = None
    artifact_path = None
    group_name = None
    timeout = 300
    output_json = False
    validate_only = False
    show_prompt = False

    i = 0
    while i < len(args):
        if args[i] == '--config' and i + 1 < len(args):
            config_path = args[i + 1]
            i += 2
        elif args[i] == '--agents' and i + 1 < len(args):
            agents_str = args[i + 1]
            i += 2
        elif args[i] == '--artifact' and i + 1 < len(args):
            artifact_path = args[i + 1]
            i += 2
        elif args[i] == '--group' and i + 1 < len(args):
            group_name = args[i + 1]
            i += 2
        elif args[i] == '--timeout' and i + 1 < len(args):
            timeout = int(args[i + 1])
            i += 2
        elif args[i] == '--json':
            output_json = True
            i += 1
        elif args[i] == '--validate':
            validate_only = True
            i += 1
        elif args[i] == '--show-prompt':
            show_prompt = True
            i += 1
        elif args[i] == '--list-groups':
            list_groups()
            sys.exit(0)
        elif args[i] == '--list-agents':
            list_default_agents()
            sys.exit(0)
        elif args[i] == '--help':
            print(__doc__)
            print("\nOptions:")
            print("  --config FILE      Load configuration from YAML file")
            print("  --agents LIST      Comma-separated agent names")
            print("  --artifact PATH    Path to artifact to review")
            print("  --group NAME       Use predefined agent group")
            print("  --timeout SECS     Timeout in seconds (default: 300)")
            print("  --json             Output as JSON")
            print("  --validate         Validate config only, don't generate prompt")
            print("  --show-prompt      Show orchestration prompt")
            print("  --list-groups      List available agent groups")
            print("  --list-agents      List agents with default prompts")
            sys.exit(0)
        else:
            i += 1

    # Build configuration
    config = None

    if config_path:
        config = load_yaml_config(Path(config_path))
    elif group_name:
        group = get_agent_group(group_name)
        if not artifact_path:
            print("Error: --artifact required when using --group", file=sys.stderr)
            sys.exit(1)
        config = generate_dispatch_config(
            agents=group['agents'],
            artifact_path=artifact_path,
            timeout=group.get('timeout', timeout)
        )
    elif agents_str:
        if not artifact_path:
            print("Error: --artifact required when using --agents", file=sys.stderr)
            sys.exit(1)
        agents = [a.strip() for a in agents_str.split(',')]
        config = generate_dispatch_config(
            agents=agents,
            artifact_path=artifact_path,
            timeout=timeout
        )
    else:
        print("Error: Must specify --config, --group, or --agents", file=sys.stderr)
        print("Use --help for usage information", file=sys.stderr)
        sys.exit(1)

    # Validate
    errors = validate_config(config)
    if errors:
        print("Configuration errors:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        sys.exit(1)

    if validate_only:
        print("Configuration is valid.")
        sys.exit(0)

    # Generate outputs
    if show_prompt or not output_json:
        prompt = generate_orchestration_prompt(config)
        if show_prompt:
            print(prompt)
            sys.exit(0)

    if output_json:
        print(json.dumps(config, indent=2))
    else:
        # Default: show config summary and prompt
        dispatch = config['dispatch']
        print(f"Dispatch Configuration: {dispatch.get('name', 'unnamed')}")
        print(f"Agents: {len(dispatch['agents'])}")
        for agent in dispatch['agents']:
            print(f"  - {agent['name']}")
        print(f"Timeout: {dispatch.get('timeout', 300)}s")
        print()
        print("Orchestration Prompt:")
        print("-" * 60)
        print(generate_orchestration_prompt(config))


if __name__ == '__main__':
    main()
