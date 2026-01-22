#!/bin/bash
# claude-role: Launch Claude Code with role-specific MCP configurations
#
# Installation:
#   1. Copy to ~/.local/bin/ or source in .bashrc/.zshrc
#   2. Set CLAUDE_ROLES_DIR to your roles directory
#
# Usage:
#   claude-role              # List available roles
#   claude-role dev          # Launch with dev MCPs
#   claude-role ops --resume # Resume session with ops MCPs

# Configuration - set this to your roles directory
CLAUDE_ROLES_DIR="${CLAUDE_ROLES_DIR:-${HOME}/.claude/roles}"

claude-role() {
    local role="$1"
    shift  # Remove role from args, pass rest to claude

    # No role specified - show help
    if [[ -z "$role" ]]; then
        echo "Usage: claude-role <role> [claude args...]"
        echo ""
        echo "Available roles:"
        for f in "${CLAUDE_ROLES_DIR}"/*.json; do
            [[ -e "$f" ]] || continue
            local name=$(basename "$f" .json)
            local mcps=$(jq -r '.mcpServers | keys | join(", ")' "$f" 2>/dev/null)
            printf "  %-12s %s\n" "$name" "→ $mcps"
        done
        echo ""
        echo "Examples:"
        echo "  claude-role dev              # Start with dev MCPs"
        echo "  claude-role ops --resume     # Resume with ops MCPs"
        echo "  claude-role minimal -p 'fix this'  # One-shot minimal"
        return 0
    fi

    local config="${CLAUDE_ROLES_DIR}/${role}.json"

    # Check if role exists
    if [[ ! -f "$config" ]]; then
        echo "Error: Role '$role' not found"
        echo "Available roles: $(ls -1 "${CLAUDE_ROLES_DIR}"/*.json 2>/dev/null | xargs -I{} basename {} .json | tr '\n' ' ')"
        return 1
    fi

    # Launch claude with the role's MCP config
    echo "Starting Claude with role: $role"
    echo "MCPs: $(jq -r '.mcpServers | keys | join(", ")' "$config")"
    echo "---"

    claude --mcp-config "$config" "$@"
}

# Bash completion
_claude_role_completions() {
    local cur="${COMP_WORDS[COMP_CWORD]}"
    if [[ ${COMP_CWORD} -eq 1 ]]; then
        local roles=$(ls -1 "${CLAUDE_ROLES_DIR}"/*.json 2>/dev/null | xargs -I{} basename {} .json)
        COMPREPLY=($(compgen -W "$roles" -- "$cur"))
    fi
}

# Register completion (bash)
if [[ -n "$BASH_VERSION" ]]; then
    complete -F _claude_role_completions claude-role
fi

# Zsh completion
if [[ -n "$ZSH_VERSION" ]]; then
    _claude_role_completions_zsh() {
        local roles=(${(f)"$(ls -1 "${CLAUDE_ROLES_DIR}"/*.json 2>/dev/null | xargs -I{} basename {} .json)"})
        _describe 'role' roles
    }
    compdef _claude_role_completions_zsh claude-role
fi

# Convenience aliases (uncomment if desired)
# alias cc-dev='claude-role dev'
# alias cc-ops='claude-role ops'
# alias cc-min='claude-role minimal'
