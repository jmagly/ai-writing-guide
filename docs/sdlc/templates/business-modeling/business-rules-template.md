# Business Rules Document Template

## Cover Page
- `<Project Name>`
- `Business Rules Document`
- `Version <1.0>`

## Revision History
| Date | Version | Description | Author |
| --- | --- | --- | --- |
| `<dd/mmm/yy>` | `<x.x>` | `<details>` | `<name>` |

## Ownership & Collaboration
- Document Owner: Business Process Analyst
- Contributor Roles: System Analyst, Requirements Reviewer
- Automation Inputs: Policy documents, regulatory guidance, stakeholder notes
- Automation Outputs: `business-rules.md` grouped by domain

## 1 Introduction
> Provide a brief overview of the document and how to use it as a shared terminology and rules reference.

### 1.1 Purpose
> Explain why this business rules document is being maintained.

### 1.2 Scope
> Describe which projects, processes, or domains these rules apply to.

### 1.3 References
> List related documents (glossary, regulations, policy manuals) with retrieval details.

### 1.4 Overview
> Summarize how the remainder of the document is organized.

## 2 Definitions
> Present each business rule or term alphabetically. Group related rules when helpful for comprehension.

### 2.1 `<BusinessRule>`
> Provide the definition, constraints, and usage notes.

### 2.2 `<AnotherBusinessRule>`
> Provide the definition, constraints, and usage notes.

### 2.3 `<GroupOfBusinessRules>`
> Describe the grouping and why these rules belong together.

#### 2.3.1 `<GroupBusinessRule>`
> Define the rule within the group context.

#### 2.3.2 `<AnotherGroupBusinessRule>`
> Define the rule within the group context.

### 2.4 `<SecondGroupOfBusinessRules>`
> Introduce another grouping if required.

#### 2.4.1 `<YetAnotherGroupBusinessRule>`
> Provide definition and relevant guidance.

#### 2.4.2 `<AndAnotherGroupBusinessRule>`
> Provide definition and relevant guidance.

## Appendices (Optional)
> Attach data dictionaries, policy excerpts, or traceability matrices that support the rules catalog.

## Agent Notes
- Alphabetize rules inside each group for deterministic parsing.
- Reference canonical sources (policy IDs, regulation numbers) alongside each rule.
- Verify the Automation Outputs entry is satisfied before signaling completion.
