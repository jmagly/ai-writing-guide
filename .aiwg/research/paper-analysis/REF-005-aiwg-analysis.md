# REF-005 AIWG Analysis: Miller's Law (Cognitive Limits)

> **Source Paper**: [The Magical Number Seven, Plus or Minus Two](https://doi.org/10.1037/h0043158)
> **Research Corpus**: [Full Documentation](https://git.integrolabs.net/roctinam/research-papers)
> **Analysis Date**: 2026-01-24

## Overview

George Miller's seminal 1956 paper established that human working memory has a limited capacity of approximately 7 (±2) items. This limitation applies across sensory modalities and types of information. Miller introduced "chunking" as a strategy to overcome this limitation by organizing information into meaningful units. This analysis extracts all AIWG-specific applications of cognitive capacity limits.

## Core Findings Relevant to AIWG

### 1. The 7±2 Capacity Limit

**Finding**: Working memory limited to ~7 chunks (range 5-9)

**AIWG Application**: Design decisions across framework

**Quote**: "The span of immediate memory seems to be almost independent of the number of bits per chunk, at least over the range that has been examined to date." (p. 93)

### 2. Chunking Increases Capacity

**Finding**: By organizing information into larger meaningful units, total information capacity increases while chunk count remains constant.

**AIWG Application**: Hierarchical decomposition, semantic groupings, named abstractions

**Quote**: "Recoding is an extremely powerful weapon for increasing the amount of information that we can deal with." (p. 95)

### 3. Bits vs. Chunks Distinction

**Finding**: Limitation is on number of chunks, not information content per chunk.

**AIWG Application**: Templates and abstractions pack more information into each "slot"

**Quote**: "I have fallen into the custom of distinguishing between bits of information and chunks of information." (p. 92-93)

### 4. Multidimensional Stimuli Extend Capacity

**Finding**: Multiple orthogonal dimensions allow richer categorization with subadditive capacity gains.

**AIWG Application**: Status + Priority + Type + Owner allows complex categorization within limits

## AIWG Implementation Mapping

| Miller's Law Principle | AIWG Implementation | Rationale |
|------------------------|---------------------|-----------|
| **7±2 Capacity Limit** | Task decomposition: Parent tasks → 5-7 child tasks; Checklist items: 5-7 per category; Phase gates: 5-7 criteria | Respects working memory limits for simultaneous consideration |
| **Chunking Strategy** | Requirements grouped into cohesive modules; Activities clustered; Hierarchical decomposition | Increases information density per working memory "slot" |
| **Span of Absolute Judgment** | Review panels: 3-5 reviewers; Agent selection: 5-7 options maximum | Prevents cognitive overload when making comparative judgments |
| **Recoding Information** | Complex technical concepts → higher-level abstractions; Domain terminology as information-rich chunks | Packs more meaning into each chunk |
| **Multidimensional Stimuli** | Multiple orthogonal attributes (priority, status, type, owner) | Exploits ability to make crude simultaneous judgments across dimensions |
| **Sequential Organization** | Multi-stage processes (Inception→Elaboration→Construction→Transition→Production) | Sequential chunking extends capacity beyond single-step limits |
| **Working Memory Management** | Context windows chunked into discrete sections; Ralph loop state as discrete items; Status displays: ≤7 key metrics | Prevents exceeding immediate memory span during active processing |
| **Bits vs. Chunks Distinction** | Templates provide high-information chunks (each section = 1 chunk with rich structure) | Chunk count matters more than raw information for human comprehension |

## Specific AIWG Design Decisions

### 1. Agent Review Panels

**Limit**: 3-5 reviewers maximum

**Rationale**: Synthesis agent must hold all perspectives in working memory during integration. Beyond 7 reviewers, perspectives cannot be simultaneously considered.

**Location**: Multi-agent documentation pattern

### 2. Phase Gate Criteria

**Limit**: 5-7 "must meet" + 5-7 "should meet" criteria per gate

**Rationale**: Evaluators must consider all criteria simultaneously when assessing readiness. Exceeding 7±2 causes sequential evaluation with loss of holistic judgment.

**Location**: `agentic/code/frameworks/sdlc-complete/gates/`

### 3. Output Formatting

**Limit**: Key insights as bulleted lists of ≤7 items

**Rationale**: Readers can scan and comprehend list at a glance. Beyond 7 items requires sequential processing.

**Location**: All agent output templates

### 4. Template Sections

**Limit**: Major documents divided into 5-7 primary sections

**Rationale**: Users can mentally map document structure. Exceeding 7 sections requires reference back to table of contents.

**Location**: `agentic/code/frameworks/sdlc-complete/templates/`

### 5. Checklist Design

**Limit**: Sub-checklists capped at 7 items each

**Strategy**: For larger sets, use hierarchical grouping (7 categories × 7 items = 49 items manageable)

**Rationale**: Individual categories comprehensible; total set too large for simultaneous consideration but navigable via hierarchy.

**Location**: All checklist templates

### 6. Navigation Breadth

**Limit**: ≤7 peer items at any hierarchy level

**Rationale**: Users selecting from navigation menu can compare all options simultaneously. Beyond 7 requires sequential scanning.

**Location**: Documentation structure, CLI menus

### 7. Agent Role Definitions

**Limit**: Each agent's tools/capabilities limited to 5-7 primary functions

**Rationale**: Users understanding agent capabilities can hold full skill set in working memory. Overly complex agents require reference documentation mid-task.

**Location**: All 53 agent definitions

### 8. Iteration Summaries

**Limit**: Ralph loop reports limited to 7 key accomplishments per iteration

**Rationale**: Users reviewing progress can comprehend full iteration impact at a glance.

**Location**: Ralph loop reporting

### 9. Risk Categories

**Limit**: Risk register uses 5-7 risk categories (technical, schedule, resource, etc.)

**Rationale**: Project teams assessing risk exposure can consider all categories simultaneously.

**Location**: Risk register templates

### 10. Acceptance Criteria

**Limit**: User stories limited to 5-7 acceptance criteria each

**Rationale**: Developers implementing story can hold all criteria in mind while coding. Testers can verify all criteria without missing items.

**Location**: User story templates

## Chunking Strategies in AIWG

### 1. Semantic Chunking

**Strategy**: Group related requirements into features, features into epics

**Example**:
- Epic: "User Authentication" (1 chunk)
  - Feature: "Login" (1 chunk) → 5 user stories
  - Feature: "Password Reset" (1 chunk) → 3 user stories
  - Feature: "Session Management" (1 chunk) → 4 user stories

**Benefit**: 3 features easier to manage than 12 individual stories

**Location**: Requirements organization

### 2. Temporal Chunking

**Strategy**: Divide project into phases, phases into iterations

**Example**:
- Project (1 chunk) → 4 phases (4 chunks)
  - Elaboration phase (1 chunk) → 3 iterations (3 chunks)
    - Iteration 1 (1 chunk) → 6 user stories

**Benefit**: Hierarchical time management respects working memory at each level

**Location**: Project planning structures

### 3. Functional Chunking

**Strategy**: Group system components by functional area

**Example**:
- System (1 chunk) → 6 modules (6 chunks)
  - Authentication module (1 chunk) → 4 components
  - Data Access module (1 chunk) → 5 components

**Benefit**: Functional boundaries create natural chunks

**Location**: Architecture documentation

### 4. Role-Based Chunking

**Strategy**: Organize agents by specialized expertise domain

**Example**:
- SDLC Agents (1 chunk) → 7 categories (7 chunks)
  - Requirements category (1 chunk) → 5 agents
  - Architecture category (1 chunk) → 7 agents
  - Testing category (1 chunk) → 6 agents

**Benefit**: Category provides meaningful chunk, individual agents within category manageable

**Location**: Agent catalog organization

### 5. Hierarchical Chunking

**Strategy**: Use nested structure to manage large sets (7 categories × 7 items = 49 items manageable)

**Example**:
- Documentation (1 chunk) → 7 sections (7 chunks)
  - Section 1 (1 chunk) → 7 subsections (7 chunks)
    - Subsection 1.1 (1 chunk) → Content

**Benefit**: Each level respects 7±2 limit while total capacity exponentially increases

**Location**: Documentation hierarchies

## Recoding Strategies in AIWG

### 1. Natural Language → Structured Templates

**Recoding**: Vague requirement → Standardized use case template

**Information Increase**: "Users need to log in" (low information) → Complete use case with actors, preconditions, flow, postconditions (high information)

**Benefit**: Template occupies 1 chunk but contains 10x information

**Location**: Requirements templates

### 2. Technical Details → Executive Summary

**Recoding**: 20-page architecture document → 5-7 key points

**Information Decrease**: Intentional reduction for executive consumption

**Benefit**: Summary respects executive working memory limits

**Location**: All major documents have executive summaries

### 3. Scattered Issues → Grouped Categories

**Recoding**: 50 individual defects → 7 categories of related defects

**Information Preservation**: All 50 defects retained, but organized

**Benefit**: Categories are chunks, individual defects accessed via drill-down

**Location**: Issue tracking, risk registers

### 4. Sequential Steps → Named Phases

**Recoding**: "Step 1, 2, 3... 15" → "Inception, Elaboration, Construction, Transition, Production"

**Information Preservation**: Steps mapped to phases

**Benefit**: 5 named phases easier to remember than 15 numbered steps

**Location**: SDLC phase structure

### 5. Raw Metrics → Dashboard

**Recoding**: 50+ data points → 5-7 key indicators

**Information Filtering**: Only critical metrics surfaced

**Benefit**: Dashboard provides actionable overview without overload

**Location**: Status reporting

## Experimental Evidence Applied to AIWG

### Channel Capacity for Absolute Judgments

**Miller's Finding**: ~2.6 bits (~6 categories) for unidimensional stimuli

**AIWG Application**: Priority levels limited to 5 (Critical, High, Medium, Low, Info)

**Rationale**: 5 < 7, provides safety margin. More granular scales (10-point) exceed discrimination capacity.

**Location**: Priority classification systems

### Immediate Memory Span

**Miller's Finding**: ~7 items for immediate recall

**AIWG Application**:
- Todo lists: ≤7 items for current iteration
- Agent task lists: ≤7 concurrent responsibilities
- Output summaries: ≤7 key findings

**Rationale**: Items must be held in working memory for task execution

**Location**: Task management, agent workflows

### Subitizing (Instant Recognition)

**Miller's Finding**: 1-6 items recognized instantly, 7+ require counting

**AIWG Application**: Visual status indicators limited to 6 items (e.g., 6 phase status dots)

**Rationale**: Users can assess status at a glance without sequential scanning

**Location**: UI design patterns

### Recoding Binary Digits Experiment

**Miller's Finding**: Sidney Smith increased span from 9 binary digits to 40 (4.4x) via recoding to octal

**AIWG Application**: Complex architectural patterns named (e.g., "Repository Pattern" vs describing 12 implementation steps)

**Rationale**: Named pattern = 1 chunk, full description = 12 chunks

**Location**: Architecture documentation, design patterns

## Validation Against Modern Cognitive Science

**Miller (1956)**: 7±2 chunks

**Cowan (2001)**: Revised to ~4 chunks for "pure" working memory

**AIWG Conservative Approach**: Use 5-7 range
- Lower than Miller's 7±2 (max 9)
- Higher than Cowan's 4
- Provides safety margin for diverse users
- Acknowledges AIWG chunks are often complex structures

**Design Decision**: Better to underestimate capacity than overload

## Integration with Other Research

### REF-006 (Cognitive Load Theory)

**Connection**: Working memory limit is foundational assumption of CLT

**AIWG Application**: Cognitive load management informed by both Miller's capacity limits and Sweller's instructional design principles

### REF-010 (Stage-Gate Systems)

**Connection**: Cooper's 5-stage model respects 7±2 limit

**AIWG Application**: 5 SDLC phases (Inception through Production) align with both Miller and Cooper

### REF-020 (Tree of Thoughts)

**Connection**: ToT branching factor typically 3-7 alternatives per node

**AIWG Application**: Decision trees and option comparisons limited similarly

## Key Quotes with Page Numbers

### On Working Memory Limits

> "There is a clear and definite limit to the accuracy with which we can identify absolutely the magnitude of a unidimensional stimulus variable." (p. 83)

> "The span of absolute judgment and the span of immediate memory impose severe limitations on the amount of information that we are able to receive, process, and remember." (p. 95)

### On Chunking

> "The span of immediate memory seems to be almost independent of the number of bits per chunk, at least over the range that has been examined to date." (p. 93)

> "By organizing the stimulus input simultaneously into several dimensions and successively into a sequence of chunks, we manage to break (or at least stretch) this informational bottleneck." (p. 95)

### On Recoding

> "Recoding is an extremely powerful weapon for increasing the amount of information that we can deal with." (p. 95)

> "Our language is tremendously useful for repackaging material into a few chunks rich in information." (p. 95)

### On The Number Seven

> "My problem is that I have been persecuted by an integer. For seven years this number has followed me around, has intruded in my most private data, and has assaulted me from the pages of our most public journals." (p. 81)

> "For the present I propose to withhold judgment. Perhaps there is something deep and profound behind all these sevens, something just calling out for us to discover it. But I suspect that it is only a pernicious, Pythagorean coincidence." (p. 96)

## Practical Implications for AIWG

### For Agent Designers

1. **Limit option sets**: When asking agents to select from alternatives, provide ≤7 options
2. **Chunk instructions**: Group related directives into named categories
3. **Hierarchical prompts**: Break complex instructions into 5-7 major sections
4. **Recoding outputs**: Train agents to summarize findings into 5-7 key points
5. **Working memory simulation**: Track "active" information chunks in agent context

**Location**: Agent design guidelines

### For User Interface Design

1. **Menu breadth**: Top-level navigation ≤7 items
2. **Dashboard metrics**: Display 5-7 key indicators, not 20+
3. **Form sections**: Break long forms into 5-7 sections
4. **Workflow steps**: Visualize processes with 5-7 major stages
5. **Error messages**: Group validation errors into ≤7 categories

**Location**: UI/UX patterns

### For Documentation

1. **Section limits**: Major documents have 5-7 primary sections
2. **List length**: Bulleted lists ≤7 items (or use hierarchical structure)
3. **Summary boxes**: Executive summaries highlight 5-7 key points
4. **Table rows**: When possible, limit table rows to 7 for at-a-glance comprehension
5. **Cross-references**: Related documents listed in groups of ≤7

**Location**: Documentation standards

### For Task Management

1. **Sprint goals**: 5-7 objectives per sprint
2. **Daily standups**: Each person reports 3-5 items (yesterday, today, blockers)
3. **Acceptance criteria**: 5-7 criteria per user story
4. **Retrospective themes**: Categorize feedback into 5-7 themes
5. **Action items**: ≤7 actions from any meeting

**Location**: Agile workflows

## Improvement Opportunities for AIWG

### High Priority

1. **Audit Existing Violations**
   - Find lists >7 items without hierarchical grouping
   - Identify agent tools >7 primary functions
   - Check gate criteria counts
   - Document rationale for necessary exceptions

2. **Formalize Chunking Guidelines**
   - Create design guide: "When to chunk, how to chunk"
   - Provide chunking patterns library
   - Add chunking validation to templates

3. **Hierarchical Navigation**
   - Ensure no level exceeds 7 peer items
   - Add breadcrumbs for deep hierarchies
   - Validate documentation structure

### Medium Priority

4. **Cognitive Load Monitoring**
   - Add "chunk count" metric to task complexity
   - Warn when agent prompts exceed 7 major instructions
   - Track user feedback on cognitive overload

5. **Recoding Library**
   - Catalog successful recodings (complex → simple)
   - Provide recoding templates
   - Train agents in recoding strategies

### Future Enhancements

6. **Adaptive Presentation**
   - Detect user expertise level
   - Adjust chunking granularity
   - Provide drill-down on demand

7. **Working Memory Simulation**
   - Model human working memory in agent context management
   - Limit "active" chunks during task execution
   - Simulate chunking/recoding processes

## Implementation Checklist

- [ ] **Task Decomposition**: Parent tasks limited to 5-7 children
- [ ] **Gate Criteria**: Each gate has 5-7 must-meet + 5-7 should-meet criteria
- [ ] **Output Lists**: Key insights ≤7 items
- [ ] **Template Sections**: Major documents 5-7 primary sections
- [ ] **Checklists**: Sub-checklists ≤7 items, hierarchical for larger sets
- [ ] **Navigation**: ≤7 peer items at any level
- [ ] **Agent Tools**: 5-7 primary functions per agent
- [ ] **Iteration Reports**: ≤7 key accomplishments per iteration
- [ ] **Risk Categories**: 5-7 risk types
- [ ] **Acceptance Criteria**: 5-7 criteria per user story
- [ ] **Review Panels**: 3-5 reviewers maximum
- [ ] **Priority Levels**: ≤5 priority classifications
- [ ] **Status Indicators**: ≤6 visual status elements
- [ ] **Dashboard Metrics**: 5-7 key indicators

## Related AIWG Components

| Component | Relevance |
|-----------|-----------|
| `@agentic/code/frameworks/sdlc-complete/docs/task-decomposition-guidelines.md` | 7±2 limit applied to task breakdown |
| `@agentic/code/frameworks/sdlc-complete/templates/` | All templates respect section limits |
| `@agentic/code/frameworks/sdlc-complete/agents/` | Agent tool count validation |
| `@docs/design/cognitive-load-management.md` | Broader cognitive load guidance (to be created) |
| `@.aiwg/planning/chunking-strategies.md` | Chunking pattern library (to be created) |

## References

- **Source Paper**: Miller, G. A. (1956). [The magical number seven, plus or minus two](https://doi.org/10.1037/h0043158). Psychological Review, 63(2), 81-97.
- **Modern Update**: Cowan, N. (2001). The magical number 4 in short-term memory: A reconsideration of mental storage capacity. Behavioral and Brain Sciences, 24, 87-185.
- **AIWG Components**: Task decomposition, template design, agent catalog
- **Related Research**: REF-006 (Cognitive Load Theory), REF-010 (Stage-Gate), REF-020 (Tree of Thoughts)
