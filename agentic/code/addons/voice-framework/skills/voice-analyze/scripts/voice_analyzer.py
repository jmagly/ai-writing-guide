#!/usr/bin/env python3
"""
Voice Profile Analyzer

Reverse-engineer voice profiles from sample content.

Usage:
    python voice_analyzer.py --input sample.txt
    python voice_analyzer.py --input "file1.txt,file2.txt"
    cat sample.txt | python voice_analyzer.py --stdin
    python voice_analyzer.py --input sample.txt --name my-voice --output .aiwg/voices/
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

# Try to import yaml
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Hedging words that indicate lower confidence
HEDGING_WORDS = [
    'might', 'maybe', 'perhaps', 'possibly', 'probably', 'likely',
    'could', 'would', 'should', 'may', 'can',
    'somewhat', 'relatively', 'fairly', 'quite',
    'seems', 'appears', 'suggests', 'indicates',
    'generally', 'typically', 'usually', 'often',
    'in some cases', 'it depends', 'to some extent'
]

# Confidence indicators (assertive language)
CONFIDENCE_WORDS = [
    'definitely', 'certainly', 'absolutely', 'clearly',
    'always', 'never', 'must', 'will', 'is', 'are',
    'proven', 'established', 'confirmed', 'demonstrated',
    'fact', 'truth', 'known', 'obvious'
]

# Warmth indicators
WARMTH_WORDS = [
    'you', 'your', 'we', 'our', 'us', "let's",
    'help', 'support', 'guide', 'assist',
    'welcome', 'thanks', 'appreciate', 'glad',
    'feel', 'understand', 'imagine', 'consider'
]

# Energy indicators
ENERGY_MARKERS = [
    '!', 'exciting', 'amazing', 'incredible', 'fantastic',
    'love', 'great', 'awesome', 'wonderful',
    'breakthrough', 'revolutionary', 'game-changing'
]

# Common contractions
CONTRACTIONS = [
    "n't", "'s", "'re", "'ve", "'ll", "'d", "'m",
    "won't", "can't", "don't", "doesn't", "isn't", "aren't",
    "wasn't", "weren't", "hasn't", "haven't", "hadn't",
    "wouldn't", "couldn't", "shouldn't", "mustn't",
    "let's", "that's", "there's", "here's", "what's",
    "who's", "it's", "he's", "she's", "we're", "they're",
    "i'm", "you're", "we've", "they've", "i've", "you've",
    "i'll", "you'll", "we'll", "they'll", "he'll", "she'll",
    "i'd", "you'd", "we'd", "they'd", "he'd", "she'd"
]


def tokenize_sentences(text: str) -> List[str]:
    """Split text into sentences."""
    # Simple sentence splitting
    sentences = re.split(r'(?<=[.!?])\s+', text)
    return [s.strip() for s in sentences if s.strip()]


def tokenize_words(text: str) -> List[str]:
    """Split text into words."""
    words = re.findall(r'\b[a-zA-Z\']+\b', text.lower())
    return words


def count_syllables(word: str) -> int:
    """Estimate syllable count for a word."""
    word = word.lower()
    count = 0
    vowels = 'aeiouy'
    prev_vowel = False

    for char in word:
        is_vowel = char in vowels
        if is_vowel and not prev_vowel:
            count += 1
        prev_vowel = is_vowel

    # Adjust for silent e
    if word.endswith('e') and count > 1:
        count -= 1

    return max(1, count)


def analyze_text(text: str) -> Dict:
    """Analyze text and extract voice features."""
    sentences = tokenize_sentences(text)
    words = tokenize_words(text)
    text_lower = text.lower()

    total_words = len(words)
    total_sentences = len(sentences)

    if total_words == 0 or total_sentences == 0:
        return {'error': 'Insufficient text for analysis'}

    # Basic metrics
    avg_sentence_length = total_words / total_sentences
    avg_word_length = sum(len(w) for w in words) / total_words
    avg_syllables = sum(count_syllables(w) for w in words) / total_words

    # Contraction frequency (per 100 words)
    contraction_count = sum(1 for c in CONTRACTIONS if c in text_lower)
    contraction_freq = (contraction_count / total_words) * 100

    # Hedging frequency (per 100 words)
    hedging_count = sum(text_lower.count(h) for h in HEDGING_WORDS)
    hedging_freq = (hedging_count / total_words) * 100

    # Confidence word frequency
    confidence_count = sum(text_lower.count(c) for c in CONFIDENCE_WORDS)
    confidence_freq = (confidence_count / total_words) * 100

    # Warmth word frequency
    warmth_count = sum(text_lower.count(w) for w in WARMTH_WORDS)
    warmth_freq = (warmth_count / total_words) * 100

    # Energy markers
    energy_count = sum(text_lower.count(e) for e in ENERGY_MARKERS)
    exclamation_count = text.count('!')
    energy_freq = ((energy_count + exclamation_count * 2) / total_words) * 100

    # Question frequency
    question_count = text.count('?')
    question_freq = (question_count / total_sentences) * 100

    # First person frequency
    first_person = sum(text_lower.count(p) for p in ['i ', ' i ', "i'm", "i've", "i'll", 'my ', ' my ', 'me ', ' me '])
    first_person_freq = (first_person / total_words) * 100

    # Second person frequency
    second_person = sum(text_lower.count(p) for p in ['you ', ' you ', 'your ', ' your ', "you're", "you've", "you'll"])
    second_person_freq = (second_person / total_words) * 100

    # Passive voice detection (simple heuristic)
    passive_patterns = [' was ', ' were ', ' been ', ' being ', ' is ', ' are ', ' be ']
    passive_count = sum(text_lower.count(p) for p in passive_patterns)
    # Check for "was/were + past participle" pattern more accurately
    passive_matches = len(re.findall(r'\b(was|were|is|are|been|being)\s+\w+ed\b', text_lower))
    passive_freq = (passive_matches / total_sentences) * 100

    # List detection
    list_markers = text.count('\n- ') + text.count('\n* ') + text.count('\n1.') + text.count('\n2.')
    has_lists = list_markers > 0

    # Code/example detection
    code_blocks = len(re.findall(r'```', text))
    inline_code = len(re.findall(r'`[^`]+`', text))
    has_examples = code_blocks > 0 or inline_code > 2

    return {
        'total_words': total_words,
        'total_sentences': total_sentences,
        'avg_sentence_length': round(avg_sentence_length, 1),
        'avg_word_length': round(avg_word_length, 2),
        'avg_syllables': round(avg_syllables, 2),
        'contraction_freq': round(contraction_freq, 2),
        'hedging_freq': round(hedging_freq, 2),
        'confidence_freq': round(confidence_freq, 2),
        'warmth_freq': round(warmth_freq, 2),
        'energy_freq': round(energy_freq, 2),
        'question_freq': round(question_freq, 2),
        'first_person_freq': round(first_person_freq, 2),
        'second_person_freq': round(second_person_freq, 2),
        'passive_freq': round(passive_freq, 2),
        'has_lists': has_lists,
        'has_examples': has_examples
    }


def extract_signature_phrases(text: str) -> List[str]:
    """Extract potential signature phrases from text."""
    signatures = []

    # Look for repeated sentence starters
    sentences = tokenize_sentences(text)
    starters = {}
    for s in sentences:
        words = s.split()[:3]
        if len(words) >= 2:
            starter = ' '.join(words[:2])
            starters[starter] = starters.get(starter, 0) + 1

    # Add starters that appear multiple times
    for starter, count in starters.items():
        if count >= 2:
            signatures.append(f"{starter}...")

    # Look for common transitional phrases
    transitions = [
        'The key', 'This means', 'In other words', 'For example',
        'This shows', 'As a result', 'This allows', 'This enables'
    ]
    for t in transitions:
        if t.lower() in text.lower():
            signatures.append(f"{t}...")

    return signatures[:5]  # Return top 5


def features_to_dimensions(features: Dict) -> Dict:
    """Map extracted features to voice dimensions."""

    # Formality: inverse of contractions, longer sentences, formal vocabulary
    formality_score = 0.5
    if features['contraction_freq'] > 3:
        formality_score -= 0.3
    elif features['contraction_freq'] < 0.5:
        formality_score += 0.3

    if features['avg_sentence_length'] > 25:
        formality_score += 0.15
    elif features['avg_sentence_length'] < 12:
        formality_score -= 0.15

    if features['avg_syllables'] > 1.8:
        formality_score += 0.1
    elif features['avg_syllables'] < 1.4:
        formality_score -= 0.1

    # Confidence: confidence words minus hedging
    confidence_score = 0.5
    confidence_score += (features['confidence_freq'] - features['hedging_freq']) * 0.1
    confidence_score -= features['passive_freq'] * 0.01
    confidence_score -= features['question_freq'] * 0.005

    # Warmth: pronouns, questions, warmth words
    warmth_score = 0.5
    warmth_score += features['second_person_freq'] * 0.05
    warmth_score += features['first_person_freq'] * 0.02
    warmth_score += features['warmth_freq'] * 0.03
    warmth_score += features['question_freq'] * 0.01

    # Energy: exclamations, energy words, shorter sentences
    energy_score = 0.5
    energy_score += features['energy_freq'] * 0.1
    if features['avg_sentence_length'] < 15:
        energy_score += 0.1
    elif features['avg_sentence_length'] > 25:
        energy_score -= 0.1

    # Complexity: sentence length, word length, syllables
    complexity_score = 0.5
    if features['avg_sentence_length'] > 20:
        complexity_score += 0.2
    elif features['avg_sentence_length'] < 12:
        complexity_score -= 0.2

    if features['avg_syllables'] > 1.7:
        complexity_score += 0.15
    elif features['avg_syllables'] < 1.4:
        complexity_score -= 0.15

    # Clamp all scores to 0-1 range
    def clamp(v):
        return max(0.0, min(1.0, v))

    return {
        'formality': round(clamp(formality_score), 2),
        'confidence': round(clamp(confidence_score), 2),
        'warmth': round(clamp(warmth_score), 2),
        'energy': round(clamp(energy_score), 2),
        'complexity': round(clamp(complexity_score), 2)
    }


def features_to_structure(features: Dict) -> Dict:
    """Map features to structure preferences."""

    # Sentence length
    if features['avg_sentence_length'] < 12:
        sentence_length = 'short'
    elif features['avg_sentence_length'] > 22:
        sentence_length = 'long'
    else:
        sentence_length = 'medium'

    # Use lists
    use_lists = 'frequently' if features['has_lists'] else 'when-appropriate'

    # Use examples
    use_examples = 'frequently' if features['has_examples'] else 'when-appropriate'

    # Use questions
    if features['question_freq'] > 10:
        use_questions = 'frequently'
    elif features['question_freq'] > 3:
        use_questions = 'when-appropriate'
    else:
        use_questions = 'rarely'

    return {
        'sentence_length': sentence_length,
        'paragraph_length': 'medium',
        'sentence_variety': 'medium',
        'use_lists': use_lists,
        'use_examples': use_examples,
        'use_questions': use_questions
    }


def features_to_perspective(features: Dict) -> Dict:
    """Map features to perspective choices."""

    # Person
    if features['second_person_freq'] > features['first_person_freq']:
        person = 'second'
    elif features['first_person_freq'] > 1:
        person = 'first'
    else:
        person = 'third'

    # Voice
    voice = 'passive' if features['passive_freq'] > 20 else 'active'

    return {
        'person': person,
        'voice': voice,
        'tense': 'present'
    }


def calculate_confidence_score(features: Dict) -> float:
    """Calculate analysis confidence based on sample size."""
    words = features['total_words']

    if words < 100:
        return 0.3
    elif words < 300:
        return 0.5
    elif words < 500:
        return 0.7
    elif words < 1000:
        return 0.85
    else:
        return 0.95


def analyze_to_profile(text: str, name: Optional[str] = None) -> Dict:
    """Analyze text and generate voice profile."""

    features = analyze_text(text)

    if 'error' in features:
        return features

    # Generate name if not provided
    if not name:
        name = 'analyzed-voice'

    dimensions = features_to_dimensions(features)
    structure = features_to_structure(features)
    perspective = features_to_perspective(features)
    signatures = extract_signature_phrases(text)
    confidence = calculate_confidence_score(features)

    profile = {
        'name': name,
        'version': '1.0.0',
        'description': f'Voice profile extracted from {features["total_words"]} words of sample content',
        'analysis_source': {
            'sample_size': features['total_words'],
            'confidence': confidence
        },
        'tone': dimensions,
        'vocabulary': {
            'prefer': [],
            'avoid': [],
            'signature_phrases': signatures
        },
        'structure': structure,
        'perspective': perspective,
        'extracted_metrics': {
            'avg_sentence_length': features['avg_sentence_length'],
            'avg_syllables': features['avg_syllables'],
            'contraction_freq': features['contraction_freq'],
            'hedging_freq': features['hedging_freq'],
            'question_freq': features['question_freq']
        }
    }

    # Add authenticity markers based on analysis
    if dimensions['warmth'] > 0.6:
        profile['authenticity'] = {
            'include_opinions': True,
            'acknowledge_tradeoffs': features['hedging_freq'] > 1,
            'show_reasoning': True,
            'admit_limitations': dimensions['confidence'] < 0.8
        }

    return profile


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

    input_files = None
    use_stdin = False
    name = None
    output_dir = None
    use_global = False
    output_json = False

    i = 0
    while i < len(args):
        if args[i] == '--input' and i + 1 < len(args):
            input_files = args[i + 1]
            i += 2
        elif args[i] == '--stdin':
            use_stdin = True
            i += 1
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

    # Read input text
    text = ""
    if use_stdin:
        text = sys.stdin.read()
    elif input_files:
        files = [f.strip() for f in input_files.split(',')]
        for f in files:
            path = Path(f)
            if path.exists():
                text += path.read_text() + "\n\n"
            else:
                print(f"Warning: File not found: {f}", file=sys.stderr)
    else:
        print("Usage: python voice_analyzer.py --input sample.txt")
        print("       python voice_analyzer.py --stdin")
        print("       python voice_analyzer.py --help")
        sys.exit(1)

    if not text.strip():
        print("Error: No text to analyze", file=sys.stderr)
        sys.exit(1)

    # Analyze and generate profile
    profile = analyze_to_profile(text, name)

    if 'error' in profile:
        print(json.dumps(profile))
        sys.exit(1)

    # Output
    if output_json:
        print(json.dumps(profile, indent=2))
    elif output_dir:
        path = save_profile(profile, output_dir)
        print(f"Analyzed profile saved to: {path}")
    elif use_global:
        global_dir = Path.home() / '.config' / 'aiwg' / 'voices'
        path = save_profile(profile, global_dir)
        print(f"Analyzed profile saved to: {path}")
    else:
        # Default: save to project .aiwg/voices/
        project_dir = Path.cwd() / '.aiwg' / 'voices'
        path = save_profile(profile, project_dir)
        print(f"Analyzed profile saved to: {path}")

        # Also print summary
        print(f"\nAnalysis Summary ({profile['analysis_source']['sample_size']} words, {profile['analysis_source']['confidence']:.0%} confidence):")
        print("-" * 40)
        tone = profile['tone']
        print(f"  Formality:  {'█' * int(tone['formality'] * 10)}{'░' * (10 - int(tone['formality'] * 10))} {tone['formality']}")
        print(f"  Confidence: {'█' * int(tone['confidence'] * 10)}{'░' * (10 - int(tone['confidence'] * 10))} {tone['confidence']}")
        print(f"  Warmth:     {'█' * int(tone['warmth'] * 10)}{'░' * (10 - int(tone['warmth'] * 10))} {tone['warmth']}")
        print(f"  Energy:     {'█' * int(tone['energy'] * 10)}{'░' * (10 - int(tone['energy'] * 10))} {tone['energy']}")
        print(f"  Complexity: {'█' * int(tone['complexity'] * 10)}{'░' * (10 - int(tone['complexity'] * 10))} {tone['complexity']}")


if __name__ == '__main__':
    main()
