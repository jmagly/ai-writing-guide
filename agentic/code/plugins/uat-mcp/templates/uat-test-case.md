# Test Case: {TEST_ID}

## Metadata

| Field | Value |
|-------|-------|
| **ID** | {PHASE_ID}-{SEQUENCE} |
| **Name** | {descriptive_test_name} |
| **Phase** | Phase {N}: {Phase Name} |
| **MCP Tool** | {exact_tool_name} |
| **Mode** | {happy_path | edge_case | negative} |
| **Isolation** | {Required | Not required} |
| **Priority** | {P1 | P2 | P3} |

## MCP Call

**Tool**: `{tool_name}`

**Parameters**:
```json
{
  "param1": "literal_value",
  "param2": "${STORED_VARIABLE_NAME}",
  "param3": 42
}
```

## Expected Response

```json
{
  "field1": "expected_value",
  "field2": "{any_value_accepted}"
}
```

## Pass Criteria

- [ ] {Criterion 1: Specific, verifiable condition}
- [ ] {Criterion 2: Check specific field values}
- [ ] {Criterion 3: Verify side effects if applicable}

## Variable Storage

| Variable | Source | Used By |
|----------|--------|---------|
| {VAR_NAME} | response.{field_path} | Phase {N}, Test {ID} |

## Dependencies

### Requires
- {VAR_NAME} from {TEST_ID} (Phase {N})
- {Prerequisite condition}

### Provides
- {VAR_NAME} for {TEST_ID} (Phase {N})

## Failure Behavior

- **On fail**: File issue with labels `bug`, `uat`
- **On error**: Record error details, continue execution
- **On timeout**: Record as error, continue execution

## Notes

{Special considerations, known limitations, or context for this test}
