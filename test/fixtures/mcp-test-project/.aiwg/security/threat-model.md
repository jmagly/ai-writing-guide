# Threat Model

## Project: TaskFlow Pro

**Methodology**: STRIDE
**Version**: 1.0
**Status**: DRAFT

## 1. Assets

| Asset | Sensitivity | Location |
|-------|-------------|----------|
| User credentials | Critical | Okta (external) |
| Task data | High | PostgreSQL |
| Session tokens | High | Redis |
| API keys | Critical | Vault |

## 2. Trust Boundaries

```
┌─────────────────────────────────────────┐
│              UNTRUSTED                   │
│   ┌─────────┐                           │
│   │ Browser │                           │
│   └────┬────┘                           │
│        │                                │
├────────┼────────────────────────────────┤
│        │         SEMI-TRUSTED           │
│        ▼                                │
│   ┌─────────┐    ┌─────────┐           │
│   │   CDN   │    │   WAF   │           │
│   └────┬────┘    └────┬────┘           │
│        │              │                 │
├────────┼──────────────┼─────────────────┤
│        │              │    TRUSTED      │
│        ▼              ▼                 │
│   ┌─────────────────────┐              │
│   │     API Server      │              │
│   └──────────┬──────────┘              │
│              │                          │
│        ┌─────┴─────┐                   │
│        ▼           ▼                    │
│   ┌─────────┐ ┌─────────┐             │
│   │   DB    │ │  Redis  │             │
│   └─────────┘ └─────────┘             │
└─────────────────────────────────────────┘
```

## 3. STRIDE Analysis

### Spoofing

| Threat | Risk | Mitigation |
|--------|------|------------|
| Session hijacking | High | Secure cookies, short TTL |
| API key theft | High | Vault rotation, IP allowlist |

### Tampering

| Threat | Risk | Mitigation |
|--------|------|------------|
| Task data modification | Medium | Audit logging, checksums |
| Request tampering | Medium | Request signing |

### Repudiation

| Threat | Risk | Mitigation |
|--------|------|------------|
| Denied actions | Low | Immutable audit log |

### Information Disclosure

| Threat | Risk | Mitigation |
|--------|------|------------|
| Data breach | High | Encryption, access controls |
| Log exposure | Medium | Log sanitization |

### Denial of Service

| Threat | Risk | Mitigation |
|--------|------|------------|
| API flood | High | Rate limiting, WAF |
| Resource exhaustion | Medium | Circuit breakers |

### Elevation of Privilege

| Threat | Risk | Mitigation |
|--------|------|------------|
| RBAC bypass | High | Permission checks at service layer |
| SQL injection | High | Parameterized queries (Prisma) |

## 4. Security Controls

- [ ] WAF rules configured
- [ ] Rate limiting implemented
- [ ] Audit logging enabled
- [ ] Encryption at rest verified
- [ ] Penetration test scheduled
