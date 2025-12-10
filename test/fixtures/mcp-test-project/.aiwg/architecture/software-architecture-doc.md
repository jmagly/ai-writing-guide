# Software Architecture Document

## Project: TaskFlow Pro

**Version**: 1.0
**Status**: BASELINED
**Date**: 2025-01-20

## 1. Overview

TaskFlow Pro is a cloud-native task management application designed for distributed teams.

## 2. Architecture Goals

| Goal | Priority | Approach |
|------|----------|----------|
| Scalability | High | Horizontal scaling, microservices |
| Performance | High | Redis caching, CDN |
| Security | High | OAuth 2.0, encryption at rest |
| Maintainability | Medium | Clean architecture, DDD |

## 3. System Context

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Browser   │────▶│  TaskFlow   │────▶│  PostgreSQL │
│   (React)   │     │   API       │     │  Database   │
└─────────────┘     └──────┬──────┘     └─────────────┘
                          │
                    ┌─────┴─────┐
                    ▼           ▼
              ┌─────────┐ ┌─────────┐
              │  Redis  │ │  Bull   │
              │  Cache  │ │  Queue  │
              └─────────┘ └─────────┘
```

## 4. Component Architecture

### 4.1 Frontend (React + TypeScript)

- **UI Components**: Shadcn/ui component library
- **State Management**: Zustand
- **API Client**: TanStack Query
- **Real-time**: Socket.io client

### 4.2 Backend (Node.js + Express)

- **API Layer**: RESTful + WebSocket
- **Business Logic**: Domain services
- **Data Access**: Prisma ORM
- **Background Jobs**: Bull queues

### 4.3 Data Layer

- **Primary DB**: PostgreSQL 15
- **Cache**: Redis 7
- **Search**: PostgreSQL full-text (future: Elasticsearch)

## 5. Security Architecture

- Authentication: Okta SSO (SAML 2.0)
- Authorization: RBAC with workspace-scoped permissions
- Data: AES-256 encryption at rest, TLS 1.3 in transit
- Secrets: HashiCorp Vault

## 6. Deployment Architecture

- **Platform**: AWS EKS
- **CI/CD**: GitHub Actions
- **Monitoring**: Datadog
- **Logging**: CloudWatch + Loki

## 7. Key Decisions

See ADR directory for detailed decision records:
- ADR-001: PostgreSQL over MongoDB
- ADR-002: Bull over AWS SQS
- ADR-003: Zustand over Redux
