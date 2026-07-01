#!/usr/bin/env python3
"""
Voice Profile Loader

Load and validate voice profiles from YAML files.

Usage:
    python voice_loader.py --profile <name>
    python voice_loader.py --profile <name> --format json
    python voice_loader.py --list
"""

import json
import sys
from pathlib import Path
from typing import Optional

# Try to import yaml, fall back to basic parsing if not available
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def parse_simple_yaml(content: str) -> dict:
    """Basic YAML parser for simple voice profiles (fallback if PyYAML not installed)."""
    result = {}
    current_key = None
    current_dict = result
    indent_stack = [(0, result)]

    for line in content.split('\n'):
        stripped = line.strip()
        if not stripped or stripped.startswith('#'):
            continue

        indent = len(line) - len(line.lstrip())

        # Handle list items
        if stripped.startswith('- '):
            if current_key and isinstance(current_dict.get(current_key), list):
                current_dict[current_key].append(stripped[2:].strip().strip('"\''))
            continue

        if ':' in stripped:
            key, _, value = stripped.partition(':')
            key = key.strip()
            value = value.strip().strip('"\'')

            # Adjust dict level based on indent
            while indent_stack and indent <= indent_stack[-1][0]:
                indent_stack.pop()

            if indent_stack:
                current_dict = indent_stack[-1][1]

            if value:
                # Simple key: value
                if value.lower() == 'true':
                    current_dict[key] = True
                elif value.lower() == 'false':
                    current_dict[key] = False
                elif value.lower() == 'null':
                    current_dict[key] = None
                else:
                    try:
                        current_dict[key] = float(value) if '.' in value else int(value)
                    except ValueError:
                        current_dict[key] = value
            else:
                # Nested dict or list
                next_line_idx = content.split('\n').index(line) + 1
                next_lines = content.split('\n')[next_line_idx:]
                for nl in next_lines:
                    ns = nl.strip()
                    if ns.startswith('- '):
                        current_dict[key] = []
                        break
                    elif ns and not ns.startswith('#'):
                        current_dict[key] = {}
                        indent_stack.append((indent + 2, current_dict[key]))
                        break
                else:
                    current_dict[key] = {}

            current_key = key

    return result


def find_voice_profile(name: str) -> Optional[Path]:
    """Find voice profile in standard locations."""
    locations = [
        # Project-local
        Path.cwd() / '.aiwg' / 'voices' / f'{name}.yaml',
        Path.cwd() / '.aiwg' / 'voices' / f'{name}.yml',
        # User config
        Path.home() / '.config' / 'aiwg' / 'voices' / f'{name}.yaml',
        Path.home() / '.config' / 'aiwg' / 'voices' / f'{name}.yml',
    ]

    # Add built-in templates location (relative to this script)
    # Script is in skills/voice-apply/scripts/, so go up 3 levels to addon root
    script_dir = Path(__file__).resolve().parent.parent.parent.parent
    locations.extend([
        script_dir / 'voices' / 'templates' / f'{name}.yaml',
        script_dir / 'voices' / 'templates' / f'{name}.yml',
    ])

    for loc in locations:
        if loc.exists():
            return loc

    return None


def list_available_profiles() -> list:
    """List all available voice profiles."""
    profiles = []

    # Check all locations
    locations = [
        Path.cwd() / '.aiwg' / 'voices',
        Path.home() / '.config' / 'aiwg' / 'voices',
        Path(__file__).resolve().parent.parent.parent.parent / 'voices' / 'templates',
    ]

    for loc in locations:
        if loc.exists():
            for f in loc.glob('*.yaml'):
                profiles.append({
                    'name': f.stem,
                    'path': str(f),
                    'location': 'project' if '.aiwg' in str(f) else 'user' if '.config' in str(f) else 'built-in'
                })
            for f in loc.glob('*.yml'):
                profiles.append({
                    'name': f.stem,
                    'path': str(f),
                    'location': 'project' if '.aiwg' in str(f) else 'user' if '.config' in str(f) else 'built-in'
                })

    # Deduplicate by name (project overrides user overrides built-in)
    seen = {}
    for p in profiles:
        if p['name'] not in seen:
            seen[p['name']] = p

    return list(seen.values())


def load_profile(name: str) -> dict:
    """Load a voice profile by name."""
    path = find_voice_profile(name)

    if not path:
        return {'error': f'Profile not found: {name}'}

    content = path.read_text()

    if HAS_YAML:
        profile = yaml.safe_load(content)
    else:
        profile = parse_simple_yaml(content)

    profile['_source'] = str(path)
    return profile


def validate_profile(profile: dict) -> dict:
    """Validate a voice profile against schema requirements."""
    errors = []
    warnings = []

    # Required fields
    required = ['name', 'version', 'description', 'tone']
    for field in required:
        if field not in profile:
            errors.append(f'Missing required field: {field}')

    # Validate tone values
    if 'tone' in profile:
        tone = profile['tone']
        tone_fields = ['formality', 'confidence', 'warmth', 'energy', 'complexity']
        for field in tone_fields:
            if field in tone:
                val = tone[field]
                if not isinstance(val, (int, float)) or val < 0 or val > 1:
                    errors.append(f'tone.{field} must be a number between 0 and 1')

    # Validate structure enums
    if 'structure' in profile:
        structure = profile['structure']
        enum_fields = {
            'sentence_length': ['short', 'medium', 'long', 'varied'],
            'paragraph_length': ['short', 'medium', 'long', 'varied'],
            'sentence_variety': ['low', 'medium', 'high'],
            'use_lists': ['rarely', 'when-appropriate', 'frequently'],
            'use_examples': ['rarely', 'when-appropriate', 'frequently'],
        }
        for field, allowed in enum_fields.items():
            if field in structure and structure[field] not in allowed:
                errors.append(f'structure.{field} must be one of: {allowed}')

    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    if '--help' in args or '-h' in args:
        print(__doc__)
        sys.exit(0)

    if '--list' in args:
        profiles = list_available_profiles()
        print(json.dumps(profiles, indent=2))
        return

    profile_name = None
    output_format = 'yaml'

    for i, arg in enumerate(args):
        if arg == '--profile' and i + 1 < len(args):
            profile_name = args[i + 1]
        elif arg == '--format' and i + 1 < len(args):
            output_format = args[i + 1]

    if not profile_name:
        print("Usage: python voice_loader.py --profile <name> [--format json|yaml]")
        print("       python voice_loader.py --list")
        print("       python voice_loader.py --help")
        sys.exit(0)

    profile = load_profile(profile_name)

    if 'error' in profile:
        print(json.dumps(profile))
        sys.exit(1)

    validation = validate_profile(profile)
    profile['_validation'] = validation

    if output_format == 'json':
        print(json.dumps(profile, indent=2))
    else:
        # Output as formatted text
        print(f"Voice Profile: {profile.get('name', 'unknown')}")
        print(f"Version: {profile.get('version', '?')}")
        print(f"Description: {profile.get('description', '')}")
        print(f"Source: {profile.get('_source', '?')}")
        print(f"Valid: {validation['valid']}")
        if validation['errors']:
            print(f"Errors: {validation['errors']}")
        if 'tone' in profile:
            print("\nTone:")
            for k, v in profile['tone'].items():
                bar = '█' * int(v * 10) + '░' * (10 - int(v * 10))
                print(f"  {k}: [{bar}] {v}")


if __name__ == '__main__':
    main()
