#!/usr/bin/env python3
"""
Artifact Metadata Manager

Manage artifact metadata, versioning, and history.

Usage:
    python artifact_metadata.py --create --artifact path/to/artifact.md --type architecture
    python artifact_metadata.py --version "1.0.0" --artifact path/to/artifact.md
    python artifact_metadata.py --review --artifact path/to/artifact.md --reviewer "agent-name"
    python artifact_metadata.py --query --artifact path/to/artifact.md
"""

import json
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any

# Try to import yaml for YAML output
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Artifact type configurations
ARTIFACT_TYPES = {
    'requirements': {
        'prefixes': ['UC', 'REQ', 'NFR', 'US'],
        'location': '.aiwg/requirements/',
        'default_owner': 'requirements-analyst'
    },
    'architecture': {
        'prefixes': ['SAD', 'ADR', 'API', 'DFD'],
        'location': '.aiwg/architecture/',
        'default_owner': 'architecture-designer'
    },
    'test': {
        'prefixes': ['TP', 'TC', 'TS', 'TR'],
        'location': '.aiwg/testing/',
        'default_owner': 'test-architect'
    },
    'security': {
        'prefixes': ['TM', 'SEC', 'VA'],
        'location': '.aiwg/security/',
        'default_owner': 'security-architect'
    },
    'deployment': {
        'prefixes': ['DP', 'RN', 'OP'],
        'location': '.aiwg/deployment/',
        'default_owner': 'deployment-manager'
    },
    'marketing': {
        'prefixes': ['CB', 'CA', 'BR'],
        'location': '.aiwg/marketing/',
        'default_owner': 'campaign-strategist'
    },
    'report': {
        'prefixes': ['RPT', 'SUM'],
        'location': '.aiwg/reports/',
        'default_owner': 'metrics-analyst'
    }
}

# Status transitions
VALID_TRANSITIONS = {
    'draft': ['review'],
    'review': ['approved', 'draft'],
    'approved': ['baselined'],
    'baselined': ['deprecated'],
    'deprecated': []
}


def generate_artifact_id(artifact_type: str, existing_ids: List[str] = None) -> str:
    """Generate a unique artifact ID."""
    type_config = ARTIFACT_TYPES.get(artifact_type, {})
    prefix = type_config.get('prefixes', ['ART'])[0]

    # Find highest existing number
    max_num = 0
    pattern = re.compile(rf'^{prefix}-(\d+)$')

    if existing_ids:
        for aid in existing_ids:
            match = pattern.match(aid)
            if match:
                max_num = max(max_num, int(match.group(1)))

    return f"{prefix}-{max_num + 1:03d}"


def create_metadata(
    artifact_path: Path,
    artifact_type: str,
    name: Optional[str] = None,
    owner: Optional[str] = None,
    artifact_id: Optional[str] = None
) -> dict:
    """Create new metadata for an artifact."""
    type_config = ARTIFACT_TYPES.get(artifact_type, {})

    if not artifact_id:
        artifact_id = generate_artifact_id(artifact_type)

    if not name:
        name = artifact_path.stem.replace('-', ' ').replace('_', ' ').title()

    if not owner:
        owner = type_config.get('default_owner', 'unknown')

    now = datetime.now().isoformat()

    return {
        'artifact_id': artifact_id,
        'name': name,
        'type': artifact_type,
        'version': '0.1.0',
        'status': 'draft',
        'owner': owner,
        'created': now,
        'modified': now,
        'baselined': None,
        'reviewers': [],
        'history': [
            {
                'version': '0.1.0',
                'date': now,
                'author': owner,
                'summary': 'Initial creation'
            }
        ],
        'reviews': [],
        'traceability': {
            'requirements': [],
            'parent': None,
            'children': []
        },
        'tags': []
    }


def get_metadata_path(artifact_path: Path) -> Path:
    """Get the metadata file path for an artifact."""
    # Check for metadata in same directory
    if artifact_path.is_dir():
        return artifact_path / 'metadata.json'
    else:
        # For files, put metadata alongside
        return artifact_path.parent / f"{artifact_path.stem}.metadata.json"


def load_metadata(artifact_path: Path) -> Optional[dict]:
    """Load metadata for an artifact."""
    meta_path = get_metadata_path(artifact_path)

    if meta_path.exists():
        with open(meta_path) as f:
            return json.load(f)

    # Also check for directory-level metadata
    if not artifact_path.is_dir():
        dir_meta = artifact_path.parent / 'metadata.json'
        if dir_meta.exists():
            with open(dir_meta) as f:
                return json.load(f)

    return None


def save_metadata(artifact_path: Path, metadata: dict) -> Path:
    """Save metadata for an artifact."""
    meta_path = get_metadata_path(artifact_path)
    meta_path.parent.mkdir(parents=True, exist_ok=True)

    with open(meta_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    return meta_path


def update_version(
    metadata: dict,
    new_version: str,
    author: str,
    summary: str
) -> dict:
    """Update artifact version."""
    now = datetime.now().isoformat()

    # Validate version format
    if not re.match(r'^\d+\.\d+\.\d+$', new_version):
        raise ValueError(f"Invalid version format: {new_version}. Use semantic versioning (x.y.z)")

    # Check version is increasing
    old_parts = [int(x) for x in metadata['version'].split('.')]
    new_parts = [int(x) for x in new_version.split('.')]

    if new_parts <= old_parts:
        raise ValueError(f"New version {new_version} must be greater than {metadata['version']}")

    metadata['version'] = new_version
    metadata['modified'] = now

    # Add to history
    metadata['history'].append({
        'version': new_version,
        'date': now,
        'author': author,
        'summary': summary
    })

    # Check for baseline transition
    if new_parts[0] >= 1 and metadata['status'] == 'approved':
        metadata['status'] = 'baselined'
        metadata['baselined'] = now

    return metadata


def update_status(metadata: dict, new_status: str) -> dict:
    """Update artifact status."""
    current = metadata['status']

    if new_status not in VALID_TRANSITIONS.get(current, []):
        valid = VALID_TRANSITIONS.get(current, [])
        raise ValueError(
            f"Cannot transition from '{current}' to '{new_status}'. "
            f"Valid transitions: {valid}"
        )

    metadata['status'] = new_status
    metadata['modified'] = datetime.now().isoformat()

    if new_status == 'baselined':
        metadata['baselined'] = metadata['modified']

    return metadata


def add_review(
    metadata: dict,
    reviewer: str,
    outcome: str,
    comments: Optional[str] = None
) -> dict:
    """Add a review record."""
    if outcome not in ['approved', 'conditional', 'rejected']:
        raise ValueError(f"Invalid outcome: {outcome}. Use: approved, conditional, rejected")

    now = datetime.now().isoformat()

    review = {
        'reviewer': reviewer,
        'date': now,
        'outcome': outcome,
        'comments': comments or ''
    }

    metadata['reviews'].append(review)
    metadata['modified'] = now

    # Add reviewer to list if not present
    if reviewer not in metadata['reviewers']:
        metadata['reviewers'].append(reviewer)

    # Check if all reviews are approved for status transition
    if metadata['status'] == 'review':
        outcomes = [r['outcome'] for r in metadata['reviews']]
        if 'rejected' in outcomes:
            metadata['status'] = 'draft'
        elif all(o == 'approved' for o in outcomes) and len(outcomes) >= 1:
            metadata['status'] = 'approved'

    return metadata


def add_traceability(
    metadata: dict,
    requirements: Optional[List[str]] = None,
    parent: Optional[str] = None,
    children: Optional[List[str]] = None
) -> dict:
    """Add traceability links."""
    if requirements:
        for req in requirements:
            if req not in metadata['traceability']['requirements']:
                metadata['traceability']['requirements'].append(req)

    if parent:
        metadata['traceability']['parent'] = parent

    if children:
        for child in children:
            if child not in metadata['traceability']['children']:
                metadata['traceability']['children'].append(child)

    metadata['modified'] = datetime.now().isoformat()
    return metadata


def query_metadata(metadata: dict, format_type: str = 'summary') -> str:
    """Format metadata for display."""
    if format_type == 'json':
        return json.dumps(metadata, indent=2)

    if format_type == 'yaml' and HAS_YAML:
        return yaml.dump(metadata, default_flow_style=False)

    # Summary format
    lines = [
        f"Artifact: {metadata['name']} ({metadata['artifact_id']})",
        f"Type: {metadata['type']}",
        f"Version: {metadata['version']}",
        f"Status: {metadata['status']}",
        f"Owner: {metadata['owner']}",
        f"Created: {metadata['created'][:10]}",
        f"Modified: {metadata['modified'][:10]}",
    ]

    if metadata.get('baselined'):
        lines.append(f"Baselined: {metadata['baselined'][:10]}")

    if metadata['reviewers']:
        lines.append(f"Reviewers: {', '.join(metadata['reviewers'])}")

    if metadata['reviews']:
        lines.append(f"Reviews: {len(metadata['reviews'])}")
        latest = metadata['reviews'][-1]
        lines.append(f"  Latest: {latest['reviewer']} - {latest['outcome']}")

    trace = metadata.get('traceability', {})
    if trace.get('requirements'):
        lines.append(f"Requirements: {', '.join(trace['requirements'])}")

    if metadata.get('tags'):
        lines.append(f"Tags: {', '.join(metadata['tags'])}")

    return '\n'.join(lines)


def list_artifacts(root_path: Path, status_filter: Optional[str] = None) -> List[dict]:
    """List all artifacts with metadata."""
    artifacts = []

    # Search for metadata files
    for meta_file in root_path.rglob('*.metadata.json'):
        with open(meta_file) as f:
            meta = json.load(f)

        if status_filter and meta.get('status') != status_filter:
            continue

        meta['_path'] = str(meta_file)
        artifacts.append(meta)

    # Also check directory metadata
    for meta_file in root_path.rglob('metadata.json'):
        if meta_file.name == 'metadata.json':
            with open(meta_file) as f:
                meta = json.load(f)

            if status_filter and meta.get('status') != status_filter:
                continue

            meta['_path'] = str(meta_file)
            artifacts.append(meta)

    return artifacts


def validate_metadata(metadata: dict) -> List[str]:
    """Validate metadata against schema rules."""
    errors = []

    required = ['artifact_id', 'name', 'type', 'version', 'status', 'owner']
    for field in required:
        if field not in metadata:
            errors.append(f"Missing required field: {field}")

    if 'version' in metadata:
        if not re.match(r'^\d+\.\d+\.\d+$', metadata['version']):
            errors.append(f"Invalid version format: {metadata['version']}")

    if 'status' in metadata:
        valid_statuses = ['draft', 'review', 'approved', 'baselined', 'deprecated']
        if metadata['status'] not in valid_statuses:
            errors.append(f"Invalid status: {metadata['status']}")

    if 'type' in metadata:
        if metadata['type'] not in ARTIFACT_TYPES:
            errors.append(f"Unknown artifact type: {metadata['type']}")

    return errors


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    artifact_path = None
    artifact_type = None
    action = None
    version = None
    summary = None
    reviewer = None
    outcome = None
    comments = None
    status_filter = None
    output_format = 'summary'
    author = 'user'

    i = 0
    while i < len(args):
        if args[i] == '--artifact' and i + 1 < len(args):
            artifact_path = Path(args[i + 1])
            i += 2
        elif args[i] == '--type' and i + 1 < len(args):
            artifact_type = args[i + 1]
            i += 2
        elif args[i] == '--create':
            action = 'create'
            i += 1
        elif args[i] == '--query':
            action = 'query'
            i += 1
        elif args[i] == '--version' and i + 1 < len(args):
            action = 'version'
            version = args[i + 1]
            i += 2
        elif args[i] == '--summary' and i + 1 < len(args):
            summary = args[i + 1]
            i += 2
        elif args[i] == '--review':
            action = 'review'
            i += 1
        elif args[i] == '--reviewer' and i + 1 < len(args):
            reviewer = args[i + 1]
            i += 2
        elif args[i] == '--outcome' and i + 1 < len(args):
            outcome = args[i + 1]
            i += 2
        elif args[i] == '--comments' and i + 1 < len(args):
            comments = args[i + 1]
            i += 2
        elif args[i] == '--status' and i + 1 < len(args):
            if action == 'list':
                status_filter = args[i + 1]
            else:
                action = 'status'
                status_filter = args[i + 1]
            i += 2
        elif args[i] == '--list':
            action = 'list'
            i += 1
        elif args[i] == '--validate':
            action = 'validate'
            i += 1
        elif args[i] == '--validate-all':
            action = 'validate-all'
            i += 1
        elif args[i] == '--format' and i + 1 < len(args):
            output_format = args[i + 1]
            i += 2
        elif args[i] == '--author' and i + 1 < len(args):
            author = args[i + 1]
            i += 2
        elif args[i] == '--json':
            output_format = 'json'
            i += 1
        elif args[i] == '--help':
            print(__doc__)
            sys.exit(0)
        else:
            i += 1

    # Execute action
    if action == 'create':
        if not artifact_path:
            print("Error: --artifact required for create", file=sys.stderr)
            sys.exit(1)
        if not artifact_type:
            print("Error: --type required for create", file=sys.stderr)
            sys.exit(1)

        metadata = create_metadata(artifact_path, artifact_type)
        meta_path = save_metadata(artifact_path, metadata)
        print(f"Created metadata: {meta_path}")
        print(query_metadata(metadata, output_format))

    elif action == 'query':
        if not artifact_path:
            print("Error: --artifact required for query", file=sys.stderr)
            sys.exit(1)

        metadata = load_metadata(artifact_path)
        if not metadata:
            print(f"No metadata found for: {artifact_path}", file=sys.stderr)
            sys.exit(1)

        print(query_metadata(metadata, output_format))

    elif action == 'version':
        if not artifact_path:
            print("Error: --artifact required", file=sys.stderr)
            sys.exit(1)

        metadata = load_metadata(artifact_path)
        if not metadata:
            print(f"No metadata found for: {artifact_path}", file=sys.stderr)
            sys.exit(1)

        try:
            metadata = update_version(metadata, version, author, summary or "Version update")
            save_metadata(artifact_path, metadata)
            print(f"Updated version to {version}")
            print(query_metadata(metadata, output_format))
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    elif action == 'review':
        if not artifact_path:
            print("Error: --artifact required", file=sys.stderr)
            sys.exit(1)
        if not reviewer:
            print("Error: --reviewer required", file=sys.stderr)
            sys.exit(1)
        if not outcome:
            print("Error: --outcome required (approved/conditional/rejected)", file=sys.stderr)
            sys.exit(1)

        metadata = load_metadata(artifact_path)
        if not metadata:
            print(f"No metadata found for: {artifact_path}", file=sys.stderr)
            sys.exit(1)

        try:
            metadata = add_review(metadata, reviewer, outcome, comments)
            save_metadata(artifact_path, metadata)
            print(f"Added review from {reviewer}: {outcome}")
            print(query_metadata(metadata, output_format))
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    elif action == 'status':
        if not artifact_path:
            print("Error: --artifact required", file=sys.stderr)
            sys.exit(1)

        metadata = load_metadata(artifact_path)
        if not metadata:
            print(f"No metadata found for: {artifact_path}", file=sys.stderr)
            sys.exit(1)

        try:
            metadata = update_status(metadata, status_filter)
            save_metadata(artifact_path, metadata)
            print(f"Updated status to {status_filter}")
        except ValueError as e:
            print(f"Error: {e}", file=sys.stderr)
            sys.exit(1)

    elif action == 'list':
        root = artifact_path or Path('.aiwg')
        artifacts = list_artifacts(root, status_filter)

        if output_format == 'json':
            print(json.dumps(artifacts, indent=2))
        else:
            print(f"Found {len(artifacts)} artifacts")
            for a in artifacts:
                print(f"  [{a['status']}] {a['artifact_id']}: {a['name']} (v{a['version']})")

    elif action == 'validate':
        if not artifact_path:
            print("Error: --artifact required", file=sys.stderr)
            sys.exit(1)

        metadata = load_metadata(artifact_path)
        if not metadata:
            print(f"No metadata found for: {artifact_path}", file=sys.stderr)
            sys.exit(1)

        errors = validate_metadata(metadata)
        if errors:
            print("Validation errors:")
            for err in errors:
                print(f"  - {err}")
            sys.exit(1)
        else:
            print("Metadata is valid")

    elif action == 'validate-all':
        root = artifact_path or Path('.aiwg')
        artifacts = list_artifacts(root)
        all_valid = True

        for a in artifacts:
            errors = validate_metadata(a)
            if errors:
                all_valid = False
                print(f"\n{a['artifact_id']}: INVALID")
                for err in errors:
                    print(f"  - {err}")

        if all_valid:
            print(f"All {len(artifacts)} artifacts have valid metadata")
        else:
            sys.exit(1)

    else:
        print("Usage: python artifact_metadata.py --create|--query|--version|--review|--list|--validate")
        print("       python artifact_metadata.py --help")
        sys.exit(1)


if __name__ == '__main__':
    main()
