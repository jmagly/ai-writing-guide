#!/usr/bin/env python3
"""
Voice Profile Blender

Combine multiple voice profiles with weighted mixing.

Usage:
    python voice_blender.py --voices "technical-authority,friendly-explainer"
    python voice_blender.py --voices "technical-authority:0.7,friendly-explainer:0.3"
    python voice_blender.py --voices "..." --name my-blend --output .aiwg/voices/
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Import voice loader from sibling skill
sys.path.insert(0, str(Path(__file__).parent.parent.parent / 'voice-apply' / 'scripts'))
try:
    from voice_loader import load_profile, list_available_profiles, find_voice_profile
except ImportError:
    # Fallback: define minimal loader
    def load_profile(name: str) -> dict:
        return {'error': f'Could not load voice_loader module. Profile: {name}'}

    def list_available_profiles() -> list:
        return []

# Try to import yaml
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


def parse_voice_spec(spec: str) -> List[Tuple[str, float]]:
    """Parse voice specification string into list of (name, weight) tuples.

    Formats:
        "voice1,voice2" -> [("voice1", 0.5), ("voice2", 0.5)]
        "voice1:0.7,voice2:0.3" -> [("voice1", 0.7), ("voice2", 0.3)]
        "70% voice1, 30% voice2" -> [("voice1", 0.7), ("voice2", 0.3)]
    """
    voices = []

    # Split by comma
    parts = [p.strip() for p in spec.split(',')]

    for part in parts:
        # Check for "70% voice" format
        pct_match = re.match(r'(\d+)%\s*(.+)', part)
        if pct_match:
            weight = int(pct_match.group(1)) / 100
            name = pct_match.group(2).strip()
            voices.append((name, weight))
            continue

        # Check for "voice:0.7" format
        if ':' in part:
            name, weight_str = part.rsplit(':', 1)
            try:
                weight = float(weight_str)
            except ValueError:
                weight = None
            if weight is not None:
                voices.append((name.strip(), weight))
                continue

        # Just a name, weight will be calculated later
        voices.append((part.strip(), None))

    # Calculate equal weights for unweighted voices
    unweighted = [v for v in voices if v[1] is None]
    weighted = [v for v in voices if v[1] is not None]

    if unweighted:
        total_weighted = sum(w for _, w in weighted)
        remaining = 1.0 - total_weighted
        equal_weight = remaining / len(unweighted) if remaining > 0 else 1.0 / len(unweighted)

        voices = weighted + [(name, equal_weight) for name, _ in unweighted]

    # Normalize weights to sum to 1.0
    total = sum(w for _, w in voices)
    if total > 0 and abs(total - 1.0) > 0.001:
        voices = [(name, weight / total) for name, weight in voices]

    return voices


def interpolate_value(values: List[Tuple[float, float]]) -> float:
    """Interpolate numeric values with weights.

    Args:
        values: List of (value, weight) tuples

    Returns:
        Weighted average
    """
    if not values:
        return 0.5

    total_weight = sum(w for _, w in values)
    if total_weight == 0:
        return sum(v for v, _ in values) / len(values)

    return sum(v * w for v, w in values) / total_weight


def merge_lists(lists: List[Tuple[List[str], float]], mode: str = 'union') -> List[str]:
    """Merge vocabulary lists with weights.

    Args:
        lists: List of (items, weight) tuples
        mode: 'union' (all items), 'intersection' (common items), 'weighted' (top by weight)

    Returns:
        Merged list
    """
    if not lists:
        return []

    if mode == 'union':
        # Union: all unique items
        all_items = []
        seen = set()
        for items, _ in lists:
            for item in items:
                if item not in seen:
                    all_items.append(item)
                    seen.add(item)
        return all_items

    elif mode == 'intersection':
        # Intersection: only items in all lists
        if len(lists) == 1:
            return lists[0][0]
        sets = [set(items) for items, _ in lists]
        common = sets[0]
        for s in sets[1:]:
            common = common.intersection(s)
        return list(common)

    elif mode == 'weighted':
        # Weighted: items from each source proportional to weight
        result = []
        for items, weight in sorted(lists, key=lambda x: -x[1]):
            # Take items proportional to weight
            count = max(1, int(len(items) * weight * 2))
            for item in items[:count]:
                if item not in result:
                    result.append(item)
        return result

    return []


def get_dominant_value(values: List[Tuple[str, float]]) -> str:
    """Get value from the highest-weighted source."""
    if not values:
        return None
    return max(values, key=lambda x: x[1])[0]


def average_enum(values: List[Tuple[str, float]], enum_order: List[str]) -> str:
    """Average enum values by converting to numeric, averaging, then back to enum."""
    if not values:
        return enum_order[len(enum_order) // 2]

    # Convert to numeric
    enum_map = {v: i for i, v in enumerate(enum_order)}
    numeric_values = [(enum_map.get(v, len(enum_order) // 2), w) for v, w in values]

    # Interpolate
    avg = interpolate_value(numeric_values)

    # Convert back to enum
    idx = min(len(enum_order) - 1, max(0, round(avg)))
    return enum_order[idx]


def blend_profiles(voice_specs: List[Tuple[str, float]], name: Optional[str] = None) -> dict:
    """Blend multiple voice profiles with weights.

    Args:
        voice_specs: List of (profile_name, weight) tuples
        name: Name for the blended profile (auto-generated if None)

    Returns:
        Blended voice profile dict
    """
    # Load all profiles
    profiles = []
    for profile_name, weight in voice_specs:
        profile = load_profile(profile_name)
        if 'error' in profile:
            print(f"Warning: Could not load profile '{profile_name}': {profile['error']}", file=sys.stderr)
            continue
        profiles.append((profile, weight))

    if not profiles:
        return {'error': 'No valid profiles to blend'}

    # Auto-generate name
    if not name:
        names = [p.get('name', 'unknown') for p, _ in profiles]
        name = '-'.join(n.split('-')[0] for n in names[:3]) + '-blend'

    # Blend tone dimensions
    tone_dimensions = ['formality', 'confidence', 'warmth', 'energy', 'complexity']
    blended_tone = {}
    for dim in tone_dimensions:
        values = []
        for profile, weight in profiles:
            tone = profile.get('tone', {})
            if dim in tone:
                values.append((tone[dim], weight))
        blended_tone[dim] = round(interpolate_value(values), 2) if values else 0.5

    # Merge vocabulary
    prefer_lists = [(p.get('vocabulary', {}).get('prefer', []), w) for p, w in profiles]
    avoid_lists = [(p.get('vocabulary', {}).get('avoid', []), w) for p, w in profiles]
    signature_lists = [(p.get('vocabulary', {}).get('signature_phrases', []), w) for p, w in profiles]

    blended_vocabulary = {
        'prefer': merge_lists(prefer_lists, 'union'),
        'avoid': merge_lists(avoid_lists, 'intersection'),
        'signature_phrases': merge_lists(signature_lists, 'weighted')
    }

    # Blend structure (use dominant for most, average for some)
    structure_values = {}
    for profile, weight in profiles:
        structure = profile.get('structure', {})
        for key, value in structure.items():
            if key not in structure_values:
                structure_values[key] = []
            structure_values[key].append((value, weight))

    length_enum = ['short', 'medium', 'long', 'varied']
    variety_enum = ['low', 'medium', 'high']
    frequency_enum = ['rarely', 'when-appropriate', 'frequently']

    blended_structure = {}
    for key, values in structure_values.items():
        if key in ['sentence_length', 'paragraph_length']:
            blended_structure[key] = average_enum(values, length_enum)
        elif key == 'sentence_variety':
            blended_structure[key] = average_enum(values, variety_enum)
        elif key in ['use_lists', 'use_examples', 'use_analogies', 'use_questions']:
            blended_structure[key] = average_enum(values, frequency_enum)
        else:
            blended_structure[key] = get_dominant_value(values)

    # Blend perspective (majority vote)
    person_votes = {}
    voice_votes = {}
    tense_votes = {}
    for profile, weight in profiles:
        perspective = profile.get('perspective', {})
        person = perspective.get('person', 'second')
        voice = perspective.get('voice', 'active')
        tense = perspective.get('tense', 'present')

        person_votes[person] = person_votes.get(person, 0) + weight
        voice_votes[voice] = voice_votes.get(voice, 0) + weight
        tense_votes[tense] = tense_votes.get(tense, 0) + weight

    blended_perspective = {
        'person': max(person_votes, key=person_votes.get) if person_votes else 'second',
        'voice': max(voice_votes, key=voice_votes.get) if voice_votes else 'active',
        'tense': max(tense_votes, key=tense_votes.get) if tense_votes else 'present'
    }

    # Build blended profile
    blended = {
        'name': name,
        'version': '1.0.0',
        'description': f"Blended voice profile from {len(profiles)} sources",
        'blend_sources': [
            {'name': p.get('name', 'unknown'), 'weight': round(w, 2)}
            for p, w in profiles
        ],
        'tone': blended_tone,
        'vocabulary': blended_vocabulary,
        'structure': blended_structure,
        'perspective': blended_perspective
    }

    # Include authenticity if any source has it with high weight
    auth_values = []
    for profile, weight in profiles:
        if 'authenticity' in profile:
            auth_values.append((profile['authenticity'], weight))

    if auth_values:
        # Use dominant authenticity settings
        dominant_auth = max(auth_values, key=lambda x: x[1])[0]
        blended['authenticity'] = dominant_auth

    return blended


def profile_to_yaml(profile: dict) -> str:
    """Convert profile dict to YAML string."""
    if HAS_YAML:
        return yaml.dump(profile, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Manual YAML generation
    lines = []

    def write_value(key, value, indent=0):
        prefix = '  ' * indent
        if isinstance(value, dict):
            lines.append(f'{prefix}{key}:')
            for k, v in value.items():
                write_value(k, v, indent + 1)
        elif isinstance(value, list):
            lines.append(f'{prefix}{key}:')
            for item in value:
                if isinstance(item, dict):
                    lines.append(f'{prefix}  -')
                    for k, v in item.items():
                        lines.append(f'{prefix}    {k}: {v}')
                else:
                    lines.append(f'{prefix}  - "{item}"' if isinstance(item, str) else f'{prefix}  - {item}')
        elif isinstance(value, bool):
            lines.append(f'{prefix}{key}: {str(value).lower()}')
        elif isinstance(value, str):
            if ':' in value or '#' in value:
                lines.append(f'{prefix}{key}: "{value}"')
            else:
                lines.append(f'{prefix}{key}: {value}')
        else:
            lines.append(f'{prefix}{key}: {value}')

    for key, value in profile.items():
        write_value(key, value)

    return '\n'.join(lines)


def save_profile(profile: dict, output_dir: Path) -> Path:
    """Save profile to YAML file."""
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / f"{profile['name']}.yaml"

    yaml_content = profile_to_yaml(profile)
    output_path.write_text(yaml_content)

    return output_path


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    voices_spec = None
    name = None
    output_dir = None
    use_global = False
    output_json = False

    i = 0
    while i < len(args):
        if args[i] == '--voices' and i + 1 < len(args):
            voices_spec = args[i + 1]
            i += 2
        elif args[i] == '--name' and i + 1 < len(args):
            name = args[i + 1]
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            output_dir = Path(args[i + 1])
            i += 2
        elif args[i] == '--global':
            use_global = True
            i += 1
        elif args[i] == '--json':
            output_json = True
            i += 1
        elif args[i] == '--list':
            # List available profiles
            profiles = list_available_profiles()
            print("Available voice profiles:")
            for p in profiles:
                print(f"  - {p['name']} ({p['location']})")
            sys.exit(0)
        elif args[i] == '--help':
            print(__doc__)
            sys.exit(0)
        else:
            i += 1

    if not voices_spec:
        print("Usage: python voice_blender.py --voices \"voice1,voice2\"")
        print("       python voice_blender.py --voices \"voice1:0.7,voice2:0.3\"")
        print("       python voice_blender.py --list")
        print("       python voice_blender.py --help")
        sys.exit(1)

    # Parse voice specification
    voice_specs = parse_voice_spec(voices_spec)
    print(f"Blending voices: {voice_specs}", file=sys.stderr)

    # Blend profiles
    blended = blend_profiles(voice_specs, name)

    if 'error' in blended:
        print(json.dumps(blended))
        sys.exit(1)

    # Output
    if output_json:
        print(json.dumps(blended, indent=2))
    elif output_dir:
        path = save_profile(blended, output_dir)
        print(f"Blended profile saved to: {path}")
    elif use_global:
        global_dir = Path.home() / '.config' / 'aiwg' / 'voices'
        path = save_profile(blended, global_dir)
        print(f"Blended profile saved to: {path}")
    else:
        # Default: save to project .aiwg/voices/
        project_dir = Path.cwd() / '.aiwg' / 'voices'
        path = save_profile(blended, project_dir)
        print(f"Blended profile saved to: {path}")

        # Also print the YAML
        print("\nBlended profile:")
        print("-" * 40)
        print(profile_to_yaml(blended))


if __name__ == '__main__':
    main()
