#!/usr/bin/env python3
"""
Project Awareness

Comprehensive project context detection and state awareness.

Usage:
    python project_awareness.py --full
    python project_awareness.py --tech-stack
    python project_awareness.py --aiwg-state
    python project_awareness.py --recommendations
"""

import json
import os
import re
import subprocess
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


def run_git_command(args: List[str], cwd: Path = None) -> Optional[str]:
    """Run a git command and return output."""
    try:
        result = subprocess.run(
            ['git'] + args,
            cwd=cwd or Path.cwd(),
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            return result.stdout.strip()
    except (subprocess.TimeoutExpired, FileNotFoundError):
        pass
    return None


def detect_project_type(root: Path) -> Dict[str, Any]:
    """Detect project type and basic info."""
    result = {
        'name': root.name,
        'type': 'unknown',
        'subtype': None,
        'root': str(root),
        'description': None
    }

    # Check for package.json
    pkg_json = root / 'package.json'
    if pkg_json.exists():
        try:
            with open(pkg_json) as f:
                pkg = json.load(f)
            result['name'] = pkg.get('name', result['name'])
            result['description'] = pkg.get('description')

            # Determine if library or application
            if 'main' in pkg and 'bin' not in pkg:
                result['type'] = 'library'
            else:
                result['type'] = 'application'

            # Check for specific app types
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
            if 'next' in deps:
                result['subtype'] = 'nextjs-app'
            elif 'express' in deps or 'fastify' in deps:
                result['subtype'] = 'api-server'
            elif 'react' in deps:
                result['subtype'] = 'react-app'
            elif 'vue' in deps:
                result['subtype'] = 'vue-app'
        except (json.JSONDecodeError, IOError):
            pass

    # Check for Python project
    pyproject = root / 'pyproject.toml'
    setup_py = root / 'setup.py'
    if pyproject.exists() or setup_py.exists():
        result['type'] = 'python-package'
        if (root / 'manage.py').exists():
            result['subtype'] = 'django-app'

    # Check for Go project
    if (root / 'go.mod').exists():
        result['type'] = 'go-module'

    # Check for Rust project
    if (root / 'Cargo.toml').exists():
        result['type'] = 'rust-crate'

    # Check for monorepo
    if (root / 'turbo.json').exists() or (root / 'lerna.json').exists():
        result['type'] = 'monorepo'
    elif (root / 'pnpm-workspace.yaml').exists():
        result['type'] = 'monorepo'

    # Get description from README if not found
    if not result['description']:
        readme = root / 'README.md'
        if readme.exists():
            try:
                content = readme.read_text()
                # Get first paragraph after title
                lines = content.split('\n')
                for i, line in enumerate(lines):
                    if line.startswith('#'):
                        # Get next non-empty line
                        for next_line in lines[i+1:]:
                            next_line = next_line.strip()
                            if next_line and not next_line.startswith('#'):
                                result['description'] = next_line[:200]
                                break
                        break
            except IOError:
                pass

    return result


def detect_tech_stack(root: Path) -> Dict[str, Any]:
    """Detect technology stack."""
    result = {
        'languages': [],
        'runtime': None,
        'framework': None,
        'package_manager': None,
        'database': None,
        'testing': None,
        'ci_cd': None
    }

    # Detect languages
    lang_indicators = {
        'typescript': ['tsconfig.json', '*.ts', '*.tsx'],
        'javascript': ['*.js', '*.jsx'],
        'python': ['*.py', 'requirements.txt', 'pyproject.toml'],
        'go': ['go.mod', '*.go'],
        'rust': ['Cargo.toml', '*.rs'],
        'java': ['pom.xml', 'build.gradle', '*.java'],
        'ruby': ['Gemfile', '*.rb'],
        'php': ['composer.json', '*.php'],
    }

    for lang, indicators in lang_indicators.items():
        for indicator in indicators:
            if '*' in indicator:
                if list(root.glob(indicator)):
                    if lang not in result['languages']:
                        result['languages'].append(lang)
                    break
            elif (root / indicator).exists():
                if lang not in result['languages']:
                    result['languages'].append(lang)
                break

    # Detect runtime
    if (root / 'package.json').exists():
        result['runtime'] = 'node'
    elif (root / 'requirements.txt').exists() or (root / 'pyproject.toml').exists():
        result['runtime'] = 'python'

    # Detect package manager
    if (root / 'pnpm-lock.yaml').exists():
        result['package_manager'] = 'pnpm'
    elif (root / 'yarn.lock').exists():
        result['package_manager'] = 'yarn'
    elif (root / 'package-lock.json').exists():
        result['package_manager'] = 'npm'
    elif (root / 'Pipfile.lock').exists():
        result['package_manager'] = 'pipenv'
    elif (root / 'poetry.lock').exists():
        result['package_manager'] = 'poetry'

    # Detect framework from package.json
    pkg_json = root / 'package.json'
    if pkg_json.exists():
        try:
            with open(pkg_json) as f:
                pkg = json.load(f)
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}

            frameworks = ['next', 'express', 'fastify', 'nestjs', 'react', 'vue', 'angular', 'svelte']
            for fw in frameworks:
                if fw in deps:
                    result['framework'] = fw
                    break

            # Detect testing
            test_frameworks = ['vitest', 'jest', 'mocha', 'ava', 'playwright', 'cypress']
            for tf in test_frameworks:
                if tf in deps:
                    result['testing'] = tf
                    break
        except (json.JSONDecodeError, IOError):
            pass

    # Detect CI/CD
    if (root / '.github' / 'workflows').exists():
        result['ci_cd'] = 'github-actions'
    elif (root / '.gitlab-ci.yml').exists():
        result['ci_cd'] = 'gitlab-ci'
    elif (root / 'Jenkinsfile').exists():
        result['ci_cd'] = 'jenkins'
    elif (root / '.circleci').exists():
        result['ci_cd'] = 'circleci'

    return result


def detect_aiwg_state(root: Path) -> Dict[str, Any]:
    """Detect AIWG installation and state."""
    result = {
        'installed': False,
        'frameworks': [],
        'addons': [],
        'phase': None,
        'iteration': None,
        'agents_deployed': 0,
        'commands_deployed': 0
    }

    aiwg_dir = root / '.aiwg'
    if not aiwg_dir.exists():
        return result

    result['installed'] = True

    # Check registry
    registry_path = aiwg_dir / 'config' / 'registry.json'
    if registry_path.exists():
        try:
            with open(registry_path) as f:
                registry = json.load(f)
            result['frameworks'] = registry.get('frameworks', [])
            result['addons'] = registry.get('addons', [])
        except (json.JSONDecodeError, IOError):
            pass

    # Detect frameworks from directory structure
    if not result['frameworks']:
        if (aiwg_dir / 'requirements').exists() or (aiwg_dir / 'architecture').exists():
            result['frameworks'].append('sdlc-complete')
        if (aiwg_dir / 'marketing').exists():
            result['frameworks'].append('media-marketing-kit')

    # Detect phase from planning docs
    planning_dir = aiwg_dir / 'planning'
    if planning_dir.exists():
        phase_files = list(planning_dir.glob('phase-plan-*.md'))
        if phase_files:
            # Get latest phase
            phases = ['inception', 'elaboration', 'construction', 'transition']
            for phase in reversed(phases):
                if any(phase in f.name for f in phase_files):
                    result['phase'] = phase
                    break

    # Detect iteration
    if planning_dir.exists():
        iter_files = list(planning_dir.glob('iteration-*.md'))
        if iter_files:
            # Extract iteration numbers
            numbers = []
            for f in iter_files:
                match = re.search(r'iteration-(\d+)', f.name)
                if match:
                    numbers.append(int(match.group(1)))
            if numbers:
                result['iteration'] = max(numbers)

    # Count deployed agents and commands
    claude_dir = root / '.claude'
    if claude_dir.exists():
        agents_dir = claude_dir / 'agents'
        commands_dir = claude_dir / 'commands'

        if agents_dir.exists():
            result['agents_deployed'] = len(list(agents_dir.glob('*.md')))

        if commands_dir.exists():
            result['commands_deployed'] = len(list(commands_dir.glob('*.md')))

    return result


def detect_team(root: Path) -> Dict[str, Any]:
    """Detect team configuration."""
    result = {
        'members': [],
        'agent_assignments': {}
    }

    team_dir = root / '.aiwg' / 'team'
    if not team_dir.exists():
        return result

    # Load team profile
    team_file = team_dir / 'team-profile.yaml'
    if team_file.exists() and HAS_YAML:
        try:
            with open(team_file) as f:
                team = yaml.safe_load(f)
            result['members'] = team.get('members', [])
        except (yaml.YAMLError, IOError):
            pass

    # Load agent assignments
    assignments_file = team_dir / 'agent-assignments.md'
    if assignments_file.exists():
        try:
            content = assignments_file.read_text()
            # Parse markdown table
            for line in content.split('\n'):
                if '|' in line and not line.startswith('|--'):
                    parts = [p.strip() for p in line.split('|') if p.strip()]
                    if len(parts) >= 2:
                        agent = parts[0]
                        assignee = parts[1]
                        if agent and assignee and agent != 'Agent':
                            result['agent_assignments'][agent] = assignee
        except IOError:
            pass

    return result


def detect_activity(root: Path) -> Dict[str, Any]:
    """Detect recent git and artifact activity."""
    result = {
        'current_branch': None,
        'recent_commits': [],
        'open_prs': [],
        'modified_artifacts': [],
        'last_gate_check': None
    }

    # Git branch
    branch = run_git_command(['rev-parse', '--abbrev-ref', 'HEAD'], root)
    if branch:
        result['current_branch'] = branch

    # Recent commits
    log = run_git_command(['log', '--oneline', '-10'], root)
    if log:
        result['recent_commits'] = log.split('\n')

    # Modified artifacts
    aiwg_dir = root / '.aiwg'
    if aiwg_dir.exists():
        # Get recently modified .md files in .aiwg
        artifacts = []
        for md_file in aiwg_dir.rglob('*.md'):
            try:
                mtime = md_file.stat().st_mtime
                artifacts.append({
                    'path': str(md_file.relative_to(root)),
                    'modified': datetime.fromtimestamp(mtime).isoformat()
                })
            except OSError:
                pass

        # Sort by modification time, newest first
        artifacts.sort(key=lambda x: x['modified'], reverse=True)
        result['modified_artifacts'] = artifacts[:10]

    # Last gate check
    gates_dir = aiwg_dir / 'gates' if aiwg_dir.exists() else None
    if gates_dir and gates_dir.exists():
        gate_files = list(gates_dir.glob('*-gate-report.md'))
        if gate_files:
            latest = max(gate_files, key=lambda f: f.stat().st_mtime)
            result['last_gate_check'] = datetime.fromtimestamp(
                latest.stat().st_mtime
            ).strftime('%Y-%m-%d')

    return result


def detect_artifacts(root: Path) -> Dict[str, Any]:
    """Detect artifact status summary."""
    result = {
        'total': 0,
        'by_status': {
            'draft': 0,
            'review': 0,
            'approved': 0,
            'baselined': 0
        },
        'recent': []
    }

    aiwg_dir = root / '.aiwg'
    if not aiwg_dir.exists():
        return result

    # Find all metadata files
    for meta_file in aiwg_dir.rglob('*.metadata.json'):
        try:
            with open(meta_file) as f:
                meta = json.load(f)
            result['total'] += 1
            status = meta.get('status', 'draft')
            if status in result['by_status']:
                result['by_status'][status] += 1

            # Track recent
            result['recent'].append({
                'id': meta.get('artifact_id', meta_file.stem),
                'name': meta.get('name', meta_file.stem),
                'status': status,
                'modified': meta.get('modified', '')
            })
        except (json.JSONDecodeError, IOError):
            pass

    # Also check for directory metadata.json
    for meta_file in aiwg_dir.rglob('metadata.json'):
        if meta_file.name == 'metadata.json':
            try:
                with open(meta_file) as f:
                    meta = json.load(f)
                if 'artifact_id' in meta:
                    result['total'] += 1
                    status = meta.get('status', 'draft')
                    if status in result['by_status']:
                        result['by_status'][status] += 1
            except (json.JSONDecodeError, IOError):
                pass

    # Sort recent by modified date
    result['recent'].sort(key=lambda x: x.get('modified', ''), reverse=True)
    result['recent'] = result['recent'][:5]

    return result


def generate_recommendations(context: Dict) -> List[str]:
    """Generate recommendations based on context."""
    recommendations = []

    aiwg = context.get('aiwg', {})
    artifacts = context.get('artifacts', {})
    activity = context.get('activity', {})

    # Phase-based recommendations
    phase = aiwg.get('phase')
    if phase == 'inception':
        if artifacts.get('by_status', {}).get('draft', 0) > 0:
            recommendations.append("Complete draft artifacts for Inception milestone")
        recommendations.append("Run /flow-gate-check inception before transitioning")

    elif phase == 'elaboration':
        recommendations.append("Ensure architecture baseline is complete")
        recommendations.append("Validate requirements traceability")

    elif phase == 'construction':
        recommendations.append("Monitor test coverage")
        recommendations.append("Track iteration velocity")

    # Activity-based recommendations
    if activity.get('modified_artifacts'):
        drafts = [a for a in activity['modified_artifacts']
                  if 'draft' in a.get('path', '').lower()]
        if drafts:
            recommendations.append(f"Review {len(drafts)} recently modified drafts")

    # Gate check recommendation
    last_gate = activity.get('last_gate_check')
    if last_gate:
        from datetime import datetime
        gate_date = datetime.strptime(last_gate, '%Y-%m-%d')
        days_ago = (datetime.now() - gate_date).days
        if days_ago > 7:
            recommendations.append(f"Gate check is {days_ago} days old - consider re-running")
    elif phase:
        recommendations.append(f"Run initial gate check for {phase} phase")

    # Artifact status recommendations
    review_count = artifacts.get('by_status', {}).get('review', 0)
    if review_count > 0:
        recommendations.append(f"Complete review for {review_count} pending artifacts")

    return recommendations[:5]  # Limit to 5 recommendations


def build_full_context(root: Path) -> Dict[str, Any]:
    """Build complete project context."""
    context = {
        'project': detect_project_type(root),
        'tech_stack': detect_tech_stack(root),
        'aiwg': detect_aiwg_state(root),
        'team': detect_team(root),
        'activity': detect_activity(root),
        'artifacts': detect_artifacts(root)
    }

    context['recommendations'] = generate_recommendations(context)

    return context


def format_summary(context: Dict) -> str:
    """Format context as readable summary."""
    lines = []

    # Project info
    proj = context.get('project', {})
    lines.append(f"Project: {proj.get('name', 'Unknown')}")
    if proj.get('type'):
        lines.append(f"Type: {proj['type']}" + (f" ({proj['subtype']})" if proj.get('subtype') else ""))
    if proj.get('description'):
        lines.append(f"Description: {proj['description'][:80]}")

    # Tech stack
    tech = context.get('tech_stack', {})
    if tech.get('languages'):
        lines.append(f"\nTech Stack: {', '.join(tech['languages'])}")
        if tech.get('framework'):
            lines.append(f"Framework: {tech['framework']}")
        if tech.get('testing'):
            lines.append(f"Testing: {tech['testing']}")

    # AIWG state
    aiwg = context.get('aiwg', {})
    if aiwg.get('installed'):
        lines.append(f"\nAIWG: Installed")
        if aiwg.get('frameworks'):
            lines.append(f"Frameworks: {', '.join(aiwg['frameworks'])}")
        if aiwg.get('phase'):
            phase_str = aiwg['phase'].title()
            if aiwg.get('iteration'):
                phase_str += f" (Iteration {aiwg['iteration']})"
            lines.append(f"Phase: {phase_str}")
        lines.append(f"Agents: {aiwg.get('agents_deployed', 0)}, Commands: {aiwg.get('commands_deployed', 0)}")

    # Artifacts summary
    artifacts = context.get('artifacts', {})
    if artifacts.get('total', 0) > 0:
        lines.append(f"\nArtifacts: {artifacts['total']} total")
        by_status = artifacts.get('by_status', {})
        status_parts = []
        for status, count in by_status.items():
            if count > 0:
                status_parts.append(f"{count} {status}")
        if status_parts:
            lines.append(f"  Status: {', '.join(status_parts)}")

    # Activity
    activity = context.get('activity', {})
    if activity.get('current_branch'):
        lines.append(f"\nBranch: {activity['current_branch']}")

    # Recommendations
    recommendations = context.get('recommendations', [])
    if recommendations:
        lines.append("\nRecommendations:")
        for rec in recommendations:
            lines.append(f"  • {rec}")

    return '\n'.join(lines)


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    root = Path.cwd()
    output_format = 'summary'
    aspect = 'full'

    i = 0
    while i < len(args):
        if args[i] == '--root' and i + 1 < len(args):
            root = Path(args[i + 1])
            i += 2
        elif args[i] == '--full':
            aspect = 'full'
            i += 1
        elif args[i] == '--tech-stack':
            aspect = 'tech_stack'
            i += 1
        elif args[i] == '--aiwg-state':
            aspect = 'aiwg'
            i += 1
        elif args[i] == '--team':
            aspect = 'team'
            i += 1
        elif args[i] == '--activity':
            aspect = 'activity'
            i += 1
        elif args[i] == '--artifacts':
            aspect = 'artifacts'
            i += 1
        elif args[i] == '--recommendations':
            aspect = 'recommendations'
            i += 1
        elif args[i] == '--json':
            output_format = 'json'
            i += 1
        elif args[i] == '--help':
            print(__doc__)
            sys.exit(0)
        else:
            i += 1

    # Build context
    if aspect == 'full':
        context = build_full_context(root)
    elif aspect == 'tech_stack':
        context = {'tech_stack': detect_tech_stack(root)}
    elif aspect == 'aiwg':
        context = {'aiwg': detect_aiwg_state(root)}
    elif aspect == 'team':
        context = {'team': detect_team(root)}
    elif aspect == 'activity':
        context = {'activity': detect_activity(root)}
    elif aspect == 'artifacts':
        context = {'artifacts': detect_artifacts(root)}
    elif aspect == 'recommendations':
        full_context = build_full_context(root)
        context = {'recommendations': full_context['recommendations']}

    # Output
    if output_format == 'json':
        print(json.dumps(context, indent=2))
    else:
        if aspect == 'full':
            print(format_summary(context))
        else:
            print(json.dumps(context, indent=2))


if __name__ == '__main__':
    main()
