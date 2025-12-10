# Risk Register

## Project: TaskFlow Pro

| ID | Risk | Probability | Impact | Score | Mitigation | Owner | Status |
|----|------|-------------|--------|-------|------------|-------|--------|
| R-001 | Timeline too aggressive | High | High | 9 | Reduce MVP scope, parallel workstreams | Bob | ACTIVE |
| R-002 | Redis expertise gap | Medium | Medium | 4 | Training, Redis Cloud managed service | Carol | MITIGATING |
| R-003 | Calendar API reliability | Medium | High | 6 | Fallback to polling, circuit breaker | Dan | MONITORING |
| R-004 | Okta integration complexity | Low | High | 3 | Early spike, Okta support engagement | Eve | CLOSED |
| R-005 | Real-time sync conflicts | Medium | Medium | 4 | CRDT implementation, conflict UI | Bob | ACTIVE |

## Risk Matrix

```
        │ Low    Medium   High
────────┼──────────────────────
High    │  3      6        9
Medium  │  2      4        6
Low     │  1      2        3
        └─────────────────────
          Impact →
```

## Mitigation Details

### R-001: Timeline Risk

**Current Status**: ACTIVE

**Actions**:
1. [x] Identified MVP feature set (core task CRUD only)
2. [x] Parallelized frontend/backend development
3. [ ] Daily standups to identify blockers early
4. [ ] Weekly scope review with sponsor

### R-002: Redis Expertise

**Current Status**: MITIGATING

**Actions**:
1. [x] Carol enrolled in Redis University course
2. [x] Selected Redis Cloud (managed) over self-hosted
3. [ ] Pair programming sessions with Dan (Redis experience)
