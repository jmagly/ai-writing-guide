#!/usr/bin/env python3
"""
Template Engine

Load, validate, and populate templates for artifact generation.

Usage:
    python template_engine.py --template software-architecture-doc-template
    python template_engine.py --template sad --var project_name="MyProject"
    python template_engine.py --list --category architecture
    python template_engine.py --validate --template custom.md
"""

import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

# Try to import yaml
try:
    import yaml
    HAS_YAML = True
except ImportError:
    HAS_YAML = False


# Template search paths (relative to various roots)
TEMPLATE_PATHS = [
    '.aiwg/templates',
    'templates',
]

# Framework template locations
FRAMEWORK_TEMPLATE_PATHS = {
    'sdlc-complete': 'agentic/code/frameworks/sdlc-complete/templates',
    'media-marketing-kit': 'agentic/code/frameworks/media-marketing-kit/templates',
}

# Template category mappings
TEMPLATE_CATEGORIES = {
    'requirements': ['use-case', 'user-story', 'supplementary', 'srs', 'glossary', 'nfr'],
    'architecture': ['sad', 'adr', 'api', 'data-flow', 'database', 'component'],
    'testing': ['test-plan', 'test-strategy', 'test-case', 'defect'],
    'security': ['threat-model', 'security-req', 'vulnerability'],
    'deployment': ['deployment-plan', 'release-notes', 'runbook'],
    'management': ['iteration-plan', 'risk', 'project-status', 'assessment'],
    'intake': ['project-intake', 'solution-profile', 'campaign-intake'],
    'content': ['blog', 'case-study', 'whitepaper', 'newsletter'],
    'creative': ['creative-brief', 'asset-spec', 'design-system'],
    'email': ['email-campaign', 'email-sequence', 'nurture'],
    'analytics': ['kpi', 'measurement', 'campaign-report'],
}


def find_template(name: str, category: Optional[str] = None) -> Optional[Path]:
    """Find a template by name across all search locations."""
    # Normalize name
    if not name.endswith('.md'):
        search_names = [f"{name}.md", f"{name}-template.md", name]
    else:
        search_names = [name]

    # Build search paths
    search_paths = []

    # 1. Project templates
    cwd = Path.cwd()
    for base in TEMPLATE_PATHS:
        if category:
            search_paths.append(cwd / base / category)
        search_paths.append(cwd / base)

    # 2. Framework templates
    for framework, rel_path in FRAMEWORK_TEMPLATE_PATHS.items():
        framework_root = cwd / rel_path
        if framework_root.exists():
            if category:
                search_paths.append(framework_root / category)
            # Search all subdirs
            for subdir in framework_root.iterdir():
                if subdir.is_dir():
                    search_paths.append(subdir)
            search_paths.append(framework_root)

    # 3. AIWG installation
    aiwg_root = Path.home() / '.local' / 'share' / 'ai-writing-guide'
    if aiwg_root.exists():
        for framework, rel_path in FRAMEWORK_TEMPLATE_PATHS.items():
            framework_root = aiwg_root / rel_path
            if framework_root.exists():
                if category:
                    search_paths.append(framework_root / category)
                for subdir in framework_root.iterdir():
                    if subdir.is_dir():
                        search_paths.append(subdir)
                search_paths.append(framework_root)

    # Search
    for path in search_paths:
        if not path.exists():
            continue
        for search_name in search_names:
            candidate = path / search_name
            if candidate.exists():
                return candidate

    return None


def find_similar_templates(name: str, max_results: int = 5) -> List[Tuple[str, str]]:
    """Find templates with similar names."""
    all_templates = list_all_templates()
    similar = []

    name_lower = name.lower()
    for tpl_name, tpl_category in all_templates:
        tpl_lower = tpl_name.lower()
        # Simple similarity: contains or starts with
        if name_lower in tpl_lower or tpl_lower.startswith(name_lower[:3]):
            similar.append((tpl_name, tpl_category))

    return similar[:max_results]


def list_all_templates(category_filter: Optional[str] = None) -> List[Tuple[str, str]]:
    """List all available templates."""
    templates = []
    seen = set()

    def scan_dir(path: Path, category: str = 'unknown'):
        if not path.exists():
            return
        for f in path.glob('*.md'):
            if f.name.startswith('_') or f.name == 'README.md':
                continue
            name = f.stem
            if name not in seen:
                seen.add(name)
                templates.append((name, category))

    # Scan all locations
    cwd = Path.cwd()
    aiwg_root = Path.home() / '.local' / 'share' / 'ai-writing-guide'

    for root in [cwd, aiwg_root]:
        for framework, rel_path in FRAMEWORK_TEMPLATE_PATHS.items():
            framework_root = root / rel_path
            if framework_root.exists():
                for subdir in framework_root.iterdir():
                    if subdir.is_dir():
                        cat = subdir.name
                        if category_filter and cat != category_filter:
                            continue
                        scan_dir(subdir, cat)

    # Sort by category then name
    templates.sort(key=lambda x: (x[1], x[0]))
    return templates


def parse_template(content: str) -> Dict[str, Any]:
    """Parse template to extract placeholders and structure."""
    result = {
        'placeholders': [],
        'conditionals': [],
        'loops': [],
        'includes': [],
        'raw_content': content
    }

    # Find simple placeholders: {{variable}} or {{variable|default:value}}
    placeholder_pattern = r'\{\{([^#/][^}]*?)\}\}'
    for match in re.finditer(placeholder_pattern, content):
        full_match = match.group(1).strip()

        # Parse variable and modifiers
        parts = full_match.split('|')
        var_name = parts[0].strip()

        placeholder = {
            'name': var_name,
            'full': full_match,
            'modifiers': []
        }

        for part in parts[1:]:
            if ':' in part:
                mod_name, mod_value = part.split(':', 1)
                placeholder['modifiers'].append({
                    'name': mod_name.strip(),
                    'value': mod_value.strip()
                })
            else:
                placeholder['modifiers'].append({'name': part.strip()})

        # Check for default
        for mod in placeholder['modifiers']:
            if mod['name'] == 'default':
                placeholder['default'] = mod.get('value', '')
                placeholder['required'] = False
                break
        else:
            placeholder['required'] = True

        if placeholder not in result['placeholders']:
            result['placeholders'].append(placeholder)

    # Find conditionals: {{#if condition}}...{{/if}}
    conditional_pattern = r'\{\{#if\s+(\w+)\}\}(.*?)\{\{/if\}\}'
    for match in re.finditer(conditional_pattern, content, re.DOTALL):
        result['conditionals'].append({
            'condition': match.group(1),
            'content': match.group(2)
        })

    # Find loops: {{#each collection}}...{{/each}}
    loop_pattern = r'\{\{#each\s+(\w+)\}\}(.*?)\{\{/each\}\}'
    for match in re.finditer(loop_pattern, content, re.DOTALL):
        result['loops'].append({
            'collection': match.group(1),
            'content': match.group(2)
        })

    # Find includes: {{> partial}}
    include_pattern = r'\{\{>\s*([^}]+)\}\}'
    for match in re.finditer(include_pattern, content):
        result['includes'].append(match.group(1).strip())

    return result


def get_required_variables(parsed: Dict) -> List[str]:
    """Get list of required variables from parsed template."""
    required = []
    for ph in parsed['placeholders']:
        if ph.get('required', True) and ph['name'] not in required:
            required.append(ph['name'])

    # Add conditional variables
    for cond in parsed['conditionals']:
        if cond['condition'] not in required:
            required.append(cond['condition'])

    # Add loop collection variables
    for loop in parsed['loops']:
        if loop['collection'] not in required:
            required.append(loop['collection'])

    return required


def instantiate_template(
    content: str,
    variables: Dict[str, Any],
    parsed: Optional[Dict] = None
) -> str:
    """Instantiate template with variables."""
    if parsed is None:
        parsed = parse_template(content)

    result = content

    # Process conditionals first
    for cond in parsed['conditionals']:
        condition = cond['condition']
        cond_content = cond['content']
        pattern = rf'\{{\{{#if\s+{condition}\}}\}}.*?\{{\{{/if\}}\}}'

        if variables.get(condition):
            # Keep content, remove markers
            replacement = cond_content
        else:
            # Remove entire block
            replacement = ''

        result = re.sub(pattern, replacement, result, flags=re.DOTALL)

    # Process loops
    for loop in parsed['loops']:
        collection = loop['collection']
        loop_content = loop['content']
        pattern = rf'\{{\{{#each\s+{collection}\}}\}}.*?\{{\{{/each\}}\}}'

        items = variables.get(collection, [])
        if isinstance(items, list) and items:
            expanded = []
            for item in items:
                item_content = loop_content
                if isinstance(item, dict):
                    for key, value in item.items():
                        item_content = item_content.replace(f'{{{{{key}}}}}', str(value))
                else:
                    item_content = item_content.replace('{{.}}', str(item))
                expanded.append(item_content)
            replacement = '\n'.join(expanded)
        else:
            replacement = ''

        result = re.sub(pattern, replacement, result, flags=re.DOTALL)

    # Process simple placeholders
    for ph in parsed['placeholders']:
        var_name = ph['name']
        full = ph['full']
        pattern = rf'\{{\{{{re.escape(full)}\}}\}}'

        if var_name in variables:
            value = str(variables[var_name])
        elif 'default' in ph:
            value = ph['default']
        else:
            # Leave placeholder for missing required variables
            continue

        # Apply modifiers
        for mod in ph.get('modifiers', []):
            if mod['name'] == 'kebab':
                value = value.lower().replace(' ', '-').replace('_', '-')
            elif mod['name'] == 'upper':
                value = value.upper()
            elif mod['name'] == 'lower':
                value = value.lower()
            elif mod['name'] == 'title':
                value = value.title()
            elif mod['name'] == 'pad':
                pad_len = int(mod.get('value', 3))
                if value.isdigit():
                    value = value.zfill(pad_len)

        result = re.sub(pattern, value, result)

    # Handle special variables
    now = datetime.now()
    result = result.replace('{{now}}', now.strftime('%Y-%m-%d'))
    result = result.replace('{{now|format:YYYY-MM-DD}}', now.strftime('%Y-%m-%d'))
    result = result.replace('{{now|format:YYYY-MM-DD HH:mm}}', now.strftime('%Y-%m-%d %H:%M'))

    return result


def validate_template(content: str) -> List[str]:
    """Validate template syntax."""
    errors = []

    # Check for balanced conditionals
    if_count = len(re.findall(r'\{\{#if\s+\w+\}\}', content))
    endif_count = len(re.findall(r'\{\{/if\}\}', content))
    if if_count != endif_count:
        errors.append(f"Unbalanced conditionals: {if_count} #if vs {endif_count} /if")

    # Check for balanced loops
    each_count = len(re.findall(r'\{\{#each\s+\w+\}\}', content))
    endeach_count = len(re.findall(r'\{\{/each\}\}', content))
    if each_count != endeach_count:
        errors.append(f"Unbalanced loops: {each_count} #each vs {endeach_count} /each")

    # Check for malformed placeholders
    for match in re.finditer(r'\{\{([^}]*)\}', content):
        if not match.group(0).endswith('}}'):
            errors.append(f"Malformed placeholder: {match.group(0)}")

    return errors


def load_template_meta(template_path: Path) -> Optional[Dict]:
    """Load template metadata if available."""
    meta_path = template_path.with_suffix('.meta.yaml')
    if not meta_path.exists():
        meta_path = template_path.parent / f"{template_path.stem}.meta.yaml"

    if meta_path.exists() and HAS_YAML:
        with open(meta_path) as f:
            return yaml.safe_load(f)

    return None


def prompt_for_variables(required: List[str], existing: Dict[str, Any]) -> Dict[str, Any]:
    """Interactively prompt for missing variables."""
    result = dict(existing)

    for var in required:
        if var not in result:
            value = input(f"Enter value for '{var}': ").strip()
            if value:
                result[var] = value

    return result


def main():
    """CLI entry point."""
    args = sys.argv[1:]

    template_name = None
    category = None
    variables = {}
    output_path = None
    interactive = False
    preview = False
    validate_only = False
    list_templates = False
    output_format = 'text'

    i = 0
    while i < len(args):
        if args[i] == '--template' and i + 1 < len(args):
            template_name = args[i + 1]
            i += 2
        elif args[i] == '--category' and i + 1 < len(args):
            category = args[i + 1]
            i += 2
        elif args[i] == '--var' and i + 1 < len(args):
            var_spec = args[i + 1]
            if '=' in var_spec:
                key, value = var_spec.split('=', 1)
                variables[key.strip()] = value.strip()
            i += 2
        elif args[i] == '--output' and i + 1 < len(args):
            output_path = Path(args[i + 1])
            i += 2
        elif args[i] == '--interactive':
            interactive = True
            i += 1
        elif args[i] == '--preview':
            preview = True
            i += 1
        elif args[i] == '--validate':
            validate_only = True
            i += 1
        elif args[i] == '--list':
            list_templates = True
            i += 1
        elif args[i] == '--json':
            output_format = 'json'
            i += 1
        elif args[i] == '--help':
            print(__doc__)
            sys.exit(0)
        else:
            i += 1

    # List templates
    if list_templates:
        templates = list_all_templates(category)

        if output_format == 'json':
            print(json.dumps([{'name': n, 'category': c} for n, c in templates], indent=2))
        else:
            current_cat = None
            for name, cat in templates:
                if cat != current_cat:
                    if current_cat:
                        print()
                    print(f"{cat.title()}:")
                    current_cat = cat
                print(f"  - {name}")
        sys.exit(0)

    # Require template name for other operations
    if not template_name:
        print("Error: --template required", file=sys.stderr)
        print("Use --list to see available templates", file=sys.stderr)
        sys.exit(1)

    # Find template
    template_path = find_template(template_name, category)

    if not template_path:
        print(f"Template '{template_name}' not found.", file=sys.stderr)
        similar = find_similar_templates(template_name)
        if similar:
            print("Did you mean:", file=sys.stderr)
            for name, cat in similar:
                print(f"  - {name} ({cat})", file=sys.stderr)
        sys.exit(1)

    # Load template
    content = template_path.read_text()

    # Validate only
    if validate_only:
        errors = validate_template(content)
        if errors:
            print("Validation errors:")
            for err in errors:
                print(f"  - {err}")
            sys.exit(1)
        else:
            print(f"Template '{template_name}' is valid")
            parsed = parse_template(content)
            required = get_required_variables(parsed)
            if required:
                print(f"Required variables: {', '.join(required)}")
        sys.exit(0)

    # Parse and get required variables
    parsed = parse_template(content)
    required = get_required_variables(parsed)

    # Load meta if available
    meta = load_template_meta(template_path)
    if meta:
        # Apply defaults from meta
        for var_def in meta.get('variables', []):
            if var_def['name'] not in variables and 'default' in var_def:
                variables[var_def['name']] = var_def['default']

    # Interactive mode
    if interactive:
        print(f"Template: {template_name}")
        print(f"Required variables: {', '.join(required)}")
        print()
        variables = prompt_for_variables(required, variables)

    # Check for missing required variables
    missing = [v for v in required if v not in variables]
    if missing and not preview:
        print(f"Missing required variables: {', '.join(missing)}", file=sys.stderr)
        print("Use --var name=value or --interactive", file=sys.stderr)
        sys.exit(1)

    # Instantiate
    result = instantiate_template(content, variables, parsed)

    # Preview or save
    if preview:
        print(result)
    else:
        if not output_path:
            # Generate output path from meta or template name
            if meta and 'output' in meta:
                out_dir = Path(meta['output'].get('location', '.aiwg/'))
                filename = meta['output'].get('filename', f"{template_name}.md")
                # Process filename placeholders
                filename = instantiate_template(filename, variables)
                output_path = out_dir / filename
            else:
                output_path = Path('.aiwg') / f"{template_name}-output.md"

        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(result)
        print(f"Created: {output_path}")


if __name__ == '__main__':
    main()
