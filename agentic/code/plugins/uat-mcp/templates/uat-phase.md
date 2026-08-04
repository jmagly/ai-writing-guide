# UAT Phase {N}: {Phase Name}

**Purpose**: {What this phase validates}
**Duration**: ~{estimated} minutes
**Prerequisites**: {Phase N-1 completed | None}
**Tools Tested**: {comma-separated list of MCP tool names}
**Test Count**: {number of tests in this phase}

## Test Cases

### {PHASE_ID}-{SEQ}: {Test Name}

**MCP Tool**: {exact_tool_name}
**Isolation**: {Required | Not required}
**Mode**: {happy_path | edge_case | negative}

**Parameters**:
```json
{
  "param1": "value1",
  "param2": "${STORED_VARIABLE}"
}
```

**Pass Criteria**:
- [ ] {Specific, checkable criterion 1}
- [ ] {Specific, checkable criterion 2}
- [ ] {Specific, checkable criterion 3}

**Store**: {VARIABLE_NAME} = response.{field_path}

**Notes**: {Any special considerations, e.g., "Run after P02-003 creates the test entity"}

---

### {PHASE_ID}-{SEQ}: {Next Test Name}

...

---

## Phase Summary

| Metric | Value |
|--------|-------|
| Total tests | {count} |
| Happy path | {count} |
| Edge cases | {count} |
| Negative (isolated) | {count} |
| Variables stored | {list} |
| Variables consumed | {list} |

## Dependencies

| This Phase Needs | From Phase |
|-----------------|------------|
| {VARIABLE_NAME} | Phase {N} |

| This Phase Provides | Used By Phase |
|---------------------|---------------|
| {VARIABLE_NAME} | Phase {N} |
