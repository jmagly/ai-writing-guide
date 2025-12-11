---
description: Create a Product Requirements Document (PRD) for a product feature
category: project-task-management
argument-hint: "<feature description> [output-path]" [--guidance "text"] [--interactive]
allowed-tools: Write, TodoWrite
---

Create a comprehensive Product Requirements Document (PRD) based on the feature description provided.

## Instructions:
1. Parse the arguments:
   - First argument: Feature description (required)
   - Second argument: Output path (optional, defaults to `PRD.md` in current directory)

2. Create a well-structured PRD that includes:
   - **Executive Summary**: Brief overview of the feature
   - **Problem Statement**: What problem does this solve?
   - **Objectives**: Clear, measurable goals
   - **User Stories**: Who are the users and what are their needs?
   - **Functional Requirements**: What the feature must do
   - **Non-Functional Requirements**: Performance, security, usability standards
   - **Success Metrics**: How will we measure success?
   - **Assumptions & Constraints**: Any limitations or dependencies
   - **Out of Scope**: What this PRD does NOT cover

3. Focus on:
   - User needs and business value (not technical implementation)
   - Clear, measurable objectives
   - Specific acceptance criteria
   - User personas and their journey

4. Use the TodoWrite tool to track PRD sections as you complete them


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/create-prd --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/create-prd --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Example usage:
- `/create-prd "Add dark mode toggle to settings"`
- `/create-prd "Implement user authentication with SSO" auth-PRD.md`

Feature description: $ARGUMENTS