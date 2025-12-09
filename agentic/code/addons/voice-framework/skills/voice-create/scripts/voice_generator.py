#!/usr/bin/env python3
"""
Voice Profile Generator

Generate voice profiles from natural language descriptions.

Usage:
    python voice_generator.py --description "friendly technical writer for beginners"
    python voice_generator.py --description "..." --name my-voice
    python voice_generator.py --description "..." --output .aiwg/voices/
    python voice_generator.py --description "..." --global  # saves to ~/.config/aiwg/voices/
"""

import json
import re
import sys
from pathlib import Path
from typing import Optional

# Try to import yaml for output formatting
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Dimension keyword mappings
DIMENSION_KEYWORDS = {
    'formality': {
        'low': ['casual', 'relaxed', 'conversational', 'informal', 'chatty', 'laid-back', 'friendly'],
        'medium': ['professional', 'business', 'balanced', 'moderate', 'standard'],
        'high': ['formal', 'academic', 'official', 'proper', 'structured', 'ceremonial']
    },
    'confidence': {
        'low': ['tentative', 'careful', 'hedging', 'uncertain', 'cautious', 'questioning'],
        'medium': ['balanced', 'measured', 'considered', 'thoughtful'],
        'high': ['assertive', 'authoritative', 'direct', 'confident', 'decisive', 'bold', 'no-nonsense']
    },
    'warmth': {
        'low': ['clinical', 'detached', 'objective', 'impersonal', 'neutral', 'factual'],
        'medium': ['professional', 'cordial', 'polite', 'respectful'],
        'high': ['friendly', 'warm', 'personable', 'empathetic', 'caring', 'encouraging', 'supportive', 'patient']
    },
    'energy': {
        'low': ['calm', 'measured', 'understated', 'reserved', 'quiet', 'subdued'],
        'medium': ['balanced', 'engaged', 'steady', 'moderate'],
        'high': ['enthusiastic', 'dynamic', 'energetic', 'passionate', 'excited', 'vibrant', 'lively']
    },
    'complexity': {
        'low': ['simple', 'accessible', 'plain', 'easy', 'beginner', 'basic', 'straightforward'],
        'medium': ['clear', 'moderate', 'intermediate', 'standard'],
        'high': ['sophisticated', 'detailed', 'nuanced', 'complex', 'advanced', 'expert', 'technical', 'deep']
    }
}

# Domain detection keywords
DOMAIN_KEYWORDS = {
    'technical': ['api', 'code', 'system', 'architecture', 'implementation', 'developer', 'programming',
                  'software', 'engineering', 'documentation', 'technical'],
    'marketing': ['brand', 'campaign', 'audience', 'engagement', 'conversion', 'marketing', 'sales',
                  'customer', 'product', 'launch'],
    'academic': ['research', 'methodology', 'analysis', 'findings', 'literature', 'study', 'academic',
                 'scholarly', 'peer', 'journal'],
    'executive': ['strategy', 'roi', 'stakeholder', 'decision', 'outcome', 'executive', 'board',
                  'leadership', 'business', 'quarterly'],
    'support': ['help', 'issue', 'solution', 'troubleshoot', 'resolve', 'support', 'customer',
                'problem', 'fix', 'guide'],
    'tutorial': ['tutorial', 'learn', 'beginner', 'guide', 'how-to', 'lesson', 'teaching', 'educational']
}

# Domain-specific vocabulary templates
DOMAIN_VOCABULARY = {
    'technical': {
        'prefer': [
            'precise technical terminology',
            'concrete metrics and measurements',
            'specific version numbers and references',
            'code examples where relevant'
        ],
        'avoid': [
            'marketing superlatives',
            'vague qualifiers',
            'unnecessary jargon without explanation'
        ],
        'signatures': [
            'The system handles...',
            'This returns...',
            'When X occurs, Y happens'
        ]
    },
    'marketing': {
        'prefer': [
            'benefit-focused language',
            'action verbs',
            'customer-centric framing',
            'clear value propositions'
        ],
        'avoid': [
            'technical implementation details',
            'passive constructions',
            'competitor mentions'
        ],
        'signatures': [
            'You can...',
            'This helps you...',
            'Get started with...'
        ]
    },
    'academic': {
        'prefer': [
            'precise definitions',
            'citations and references',
            'methodological clarity',
            'evidence-based claims'
        ],
        'avoid': [
            'colloquialisms',
            'unsupported assertions',
            'first-person singular'
        ],
        'signatures': [
            'The findings suggest...',
            'This analysis demonstrates...',
            'According to...'
        ]
    },
    'executive': {
        'prefer': [
            'outcome-focused language',
            'quantified impacts',
            'strategic framing',
            'clear recommendations'
        ],
        'avoid': [
            'technical implementation details',
            'lengthy explanations',
            'hedging language'
        ],
        'signatures': [
            'The key takeaway is...',
            'This will result in...',
            'We recommend...'
        ]
    },
    'support': {
        'prefer': [
            'step-by-step instructions',
            'reassuring language',
            'clear action items',
            'solution-focused framing'
        ],
        'avoid': [
            'blame language',
            'technical jargon without explanation',
            'dismissive phrases'
        ],
        'signatures': [
            'To resolve this...',
            'Here\'s what you can do...',
            'Let me help you with...'
        ]
    },
    'tutorial': {
        'prefer': [
            'progressive complexity',
            'concrete examples',
            'analogies to familiar concepts',
            'encouraging checkpoints'
        ],
        'avoid': [
            'assuming prior knowledge',
            'skipping steps',
            'complex terminology without explanation'
        ],
        'signatures': [
            'Think of it like...',
            'Now let\'s try...',
            'Great! You\'ve just...'
        ]
    }
}


def detect_dimension_value(description: str, dimension: str) -> float:
    """Detect dimension value from description keywords."""
    desc_lower = description.lower()
    keywords = DIMENSION_KEYWORDS.get(dimension, {})

    # Check for explicit keywords
    for level, words in keywords.items():
        for word in words:
            if word in desc_lower:
                if level == 'low':
                    return 0.2
                elif level == 'medium':
                    return 0.5
                elif level == 'high':
                    return 0.8

    # Default to medium
    return 0.5


def detect_domain(description: str) -> str:
    """Detect primary domain from description."""
    desc_lower = description.lower()
    scores = {}

    for domain, keywords in DOMAIN_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        scores[domain] = score

    if max(scores.values()) > 0:
        return max(scores, key=scores.get)

    return 'general'


def generate_name_from_description(description: str) -> str:
    """Generate a kebab-case name from description."""
    # Extract key words
    words = re.findall(r'\b[a-z]+\b', description.lower())
    # Filter out common words
    stop_words = {'a', 'an', 'the', 'for', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
                  'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                  'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'that',
                  'this', 'these', 'those', 'with', 'from', 'into', 'like', 'make', 'me'}
    key_words = [w for w in words if w not in stop_words][:4]

    if not key_words:
        return 'custom-voice'

    return '-'.join(key_words)


def generate_voice_profile(description: str, name: Optional[str] = None) -> dict:
    """Generate a complete voice profile from description."""

    # Auto-generate name if not provided
    if not name:
        name = generate_name_from_description(description)

    # Detect dimensions
    formality = detect_dimension_value(description, 'formality')
    confidence = detect_dimension_value(description, 'confidence')
    warmth = detect_dimension_value(description, 'warmth')
    energy = detect_dimension_value(description, 'energy')
    complexity = detect_dimension_value(description, 'complexity')

    # Detect domain
    domain = detect_domain(description)

    # Get domain vocabulary or use general defaults
    vocab = DOMAIN_VOCABULARY.get(domain, {
        'prefer': ['clear language', 'concrete examples'],
        'avoid': ['unnecessary jargon', 'vague claims'],
        'signatures': ['This shows...', 'Here we see...']
    })

    # Determine structure based on dimensions
    sentence_length = 'short' if formality < 0.4 else 'medium' if formality < 0.7 else 'long'
    if complexity < 0.4:
        sentence_length = 'short'

    paragraph_length = 'short' if energy > 0.7 or complexity < 0.4 else 'medium'

    use_lists = 'frequently' if complexity < 0.5 else 'when-appropriate'
    use_examples = 'frequently' if warmth > 0.6 or domain == 'tutorial' else 'when-appropriate'
    use_analogies = 'frequently' if warmth > 0.6 or complexity < 0.4 else 'when-appropriate' if warmth > 0.4 else 'rarely'

    # Build profile
    profile = {
        'name': name,
        'version': '1.0.0',
        'description': f'Auto-generated voice profile: {description}',
        'generated_from': description,
        'detected_domain': domain,
        'tone': {
            'formality': round(formality, 2),
            'confidence': round(confidence, 2),
            'warmth': round(warmth, 2),
            'energy': round(energy, 2),
            'complexity': round(complexity, 2)
        },
        'vocabulary': {
            'prefer': vocab['prefer'],
            'avoid': vocab['avoid'],
            'signature_phrases': vocab['signatures']
        },
        'structure': {
            'sentence_length': sentence_length,
            'paragraph_length': paragraph_length,
            'sentence_variety': 'high' if energy > 0.6 else 'medium',
            'use_lists': use_lists,
            'use_examples': use_examples,
            'use_analogies': use_analogies,
            'use_questions': 'frequently' if warmth > 0.7 else 'when-appropriate' if warmth > 0.4 else 'rarely'
        },
        'perspective': {
            'person': 'second' if warmth > 0.5 else 'third',
            'voice': 'active',
            'tense': 'present'
        }
    }

    # Add authenticity markers for high-warmth voices
    if warmth > 0.6:
        profile['authenticity'] = {
            'include_opinions': True,
            'acknowledge_tradeoffs': True,
            'show_reasoning': True,
            'admit_limitations': confidence < 0.8
        }

    return profile


def profile_to_yaml(profile: dict) -> str:
    """Convert profile dict to YAML string."""
    if HAS_YAML:
        return yaml.dump(profile, default_flow_style=False, sort_keys=False, allow_unicode=True)

    # Manual YAML generation for simple structures
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
                lines.append(f'{prefix}  - "{item}"' if isinstance(item, str) else f'{prefix}  - {item}')
        elif isinstance(value, bool):
            lines.append(f'{prefix}{key}: {str(value).lower()}')
        elif isinstance(value, str):
            # Quote strings with special characters
            if ':' in value or '#' in value or value.startswith('{') or value.startswith('['):
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

    description = None
    name = None
    output_dir = None
    use_global = False
    output_json = False

    i = 0
    while i < len(args):
        if args[i] == '--description' and i + 1 < len(args):
            description = args[i + 1]
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
        elif args[i] == '--help':
            print(__doc__)
            sys.exit(0)
        else:
            i += 1

    if not description:
        print("Usage: python voice_generator.py --description \"your voice description\"")
        print("       python voice_generator.py --help")
        sys.exit(1)

    # Generate profile
    profile = generate_voice_profile(description, name)

    # Determine output
    if output_json:
        print(json.dumps(profile, indent=2))
    elif output_dir:
        path = save_profile(profile, output_dir)
        print(f"Voice profile saved to: {path}")
    elif use_global:
        global_dir = Path.home() / '.config' / 'aiwg' / 'voices'
        path = save_profile(profile, global_dir)
        print(f"Voice profile saved to: {path}")
    else:
        # Default: save to project .aiwg/voices/
        project_dir = Path.cwd() / '.aiwg' / 'voices'
        path = save_profile(profile, project_dir)
        print(f"Voice profile saved to: {path}")

        # Also print the YAML for reference
        print("\nGenerated profile:")
        print("-" * 40)
        print(profile_to_yaml(profile))


if __name__ == '__main__':
    main()
