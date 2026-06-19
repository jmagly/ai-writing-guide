# API Documenter — Worked Examples

Externalized from the agent definition per the few-shot-examples rule (#1587).

## 1. API Specification (OpenAPI 3.0)

Create comprehensive, accurate OpenAPI specs:

```yaml
openapi: 3.0.3
info:
  title: User Management API
  description: Comprehensive user management system API
  version: 2.1.0
  contact:
    name: API Support
    email: api@example.com
    url: https://example.com/support
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.example.com/v2
    description: Production server
  - url: https://api-staging.example.com/v2
    description: Staging server

tags:
  - name: Users
    description: User management operations
  - name: Authentication
    description: Authentication and authorization

paths:
  /users:
    get:
      summary: List users
      description: Retrieve a paginated list of users with optional filtering
      operationId: listUsers
      tags:
        - Users
      parameters:
        - name: page
          in: query
          description: Page number (starts at 1)
          required: false
          schema:
            type: integer
            minimum: 1
            default: 1
        - name: limit
          in: query
          description: Items per page
          required: false
          schema:
            type: integer
            minimum: 1
            maximum: 100
            default: 20
        - name: role
          in: query
          description: Filter by role
          required: false
          schema:
            type: string
            enum: [admin, user, guest]
      responses:
        '200':
          description: Successful response
          content:
            application/json:
              schema:
                type: object
                properties:
                  data:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'
                  pagination:
                    $ref: '#/components/schemas/Pagination'
              examples:
                success:
                  summary: Successful user list response
                  value:
                    data:
                      - id: "123"
                        email: "user@example.com"
                        role: "user"
                        createdAt: "2024-01-15T10:30:00Z"
                    pagination:
                      page: 1
                      limit: 20
                      total: 42
                      hasNext: true
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
      security:
        - bearerAuth: []

    post:
      summary: Create user
      description: Create a new user account
      operationId: createUser
      tags:
        - Users
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateUserRequest'
            examples:
              newUser:
                summary: Create standard user
                value:
                  email: "newuser@example.com"
                  password: "SecureP@ssw0rd"
                  role: "user"
      responses:
        '201':
          description: User created successfully
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/User'
        '400':
          $ref: '#/components/responses/BadRequest'
        '409':
          description: User already exists
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Error'
      security:
        - bearerAuth: []

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
        - role
        - createdAt
      properties:
        id:
          type: string
          format: uuid
          description: Unique user identifier
        email:
          type: string
          format: email
          description: User email address
        role:
          type: string
          enum: [admin, user, guest]
          description: User role
        createdAt:
          type: string
          format: date-time
          description: User creation timestamp
        lastLoginAt:
          type: string
          format: date-time
          description: Last login timestamp (optional)
          nullable: true

    CreateUserRequest:
      type: object
      required:
        - email
        - password
      properties:
        email:
          type: string
          format: email
        password:
          type: string
          format: password
          minLength: 8
        role:
          type: string
          enum: [admin, user, guest]
          default: user

    Pagination:
      type: object
      properties:
        page:
          type: integer
          description: Current page number
        limit:
          type: integer
          description: Items per page
        total:
          type: integer
          description: Total number of items
        hasNext:
          type: boolean
          description: Whether there are more pages

    Error:
      type: object
      required:
        - code
        - message
      properties:
        code:
          type: string
          description: Error code
        message:
          type: string
          description: Human-readable error message
        details:
          type: object
          description: Additional error details
          additionalProperties: true

  responses:
    Unauthorized:
      description: Authentication required
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "UNAUTHORIZED"
            message: "Authentication required"

    Forbidden:
      description: Insufficient permissions
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "FORBIDDEN"
            message: "Insufficient permissions"

    BadRequest:
      description: Invalid request
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/Error'
          example:
            code: "VALIDATION_ERROR"
            message: "Invalid input"
            details:
              email: "Invalid email format"

  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
      description: JWT token obtained from /auth/login
```

## 2. Code Examples (Multiple Languages)

```javascript
// JavaScript/Node.js Example
const axios = require('axios');

// Authentication
const login = async (email, password) => {
  const response = await axios.post('https://api.example.com/v2/auth/login', {
    email,
    password
  });
  return response.data.token;
};

// List users
const listUsers = async (token, options = {}) => {
  const { page = 1, limit = 20, role } = options;
  const params = new URLSearchParams({ page, limit });
  if (role) params.append('role', role);

  const response = await axios.get(`https://api.example.com/v2/users?${params}`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  return response.data;
};

// Create user
const createUser = async (token, userData) => {
  const response = await axios.post('https://api.example.com/v2/users', userData, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });
  return response.data;
};

// Usage
(async () => {
  const token = await login('admin@example.com', 'password');
  const users = await listUsers(token, { role: 'admin' });
  console.log(users);
})();
```

```python
# Python Example
import requests
from typing import Optional, Dict, Any

class APIClient:
    def __init__(self, base_url: str = "https://api.example.com/v2"):
        self.base_url = base_url
        self.token: Optional[str] = None

    def login(self, email: str, password: str) -> str:
        """Authenticate and obtain JWT token"""
        response = requests.post(
            f"{self.base_url}/auth/login",
            json={"email": email, "password": password}
        )
        response.raise_for_status()
        self.token = response.json()["token"]
        return self.token

    def _headers(self) -> Dict[str, str]:
        """Get headers with authentication"""
        if not self.token:
            raise ValueError("Not authenticated. Call login() first")
        return {
            "Authorization": f"Bearer {self.token}",
            "Content-Type": "application/json"
        }

    def list_users(
        self,
        page: int = 1,
        limit: int = 20,
        role: Optional[str] = None
    ) -> Dict[str, Any]:
        """Retrieve paginated list of users"""
        params = {"page": page, "limit": limit}
        if role:
            params["role"] = role

        response = requests.get(
            f"{self.base_url}/users",
            params=params,
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

    def create_user(self, email: str, password: str, role: str = "user") -> Dict[str, Any]:
        """Create a new user"""
        response = requests.post(
            f"{self.base_url}/users",
            json={"email": email, "password": password, "role": role},
            headers=self._headers()
        )
        response.raise_for_status()
        return response.json()

# Usage
client = APIClient()
client.login("admin@example.com", "password")
users = client.list_users(role="admin")
print(users)
```

```bash
# cURL Examples
# Login
curl -X POST https://api.example.com/v2/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'

# Store token
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# List users
curl -X GET "https://api.example.com/v2/users?page=1&limit=20&role=admin" \
  -H "Authorization: Bearer $TOKEN"

# Create user
curl -X POST https://api.example.com/v2/users \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"email":"newuser@example.com","password":"SecureP@ssw0rd","role":"user"}'
```

## 3. Authentication Guide

```markdown
# Authentication Guide

## Overview

Our API uses JWT (JSON Web Tokens) for authentication. You must obtain a token by calling the `/auth/login` endpoint, then include this token in the `Authorization` header for all subsequent requests.

## Obtaining a Token

**Endpoint:** `POST /auth/login`

**Request:**
```json
{
  "email": "your-email@example.com",
  "password": "your-password"
}
```

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresAt": "2024-01-15T12:00:00Z"
}
```

## Using the Token

Include the token in the `Authorization` header:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Token Expiration

Tokens expire after 24 hours. When you receive a `401 Unauthorized` response, obtain a new token by logging in again.

## Best Practices

1. **Secure Storage**: Store tokens securely (never in localStorage for sensitive apps)
2. **HTTPS Only**: Always use HTTPS in production
3. **Token Refresh**: Implement token refresh logic before expiration
4. **Logout**: Clear tokens on logout
```

## 4. Error Handling Documentation

```markdown
# Error Handling

## Error Response Format

All errors follow this format:

```json
{
  "code": "ERROR_CODE",
  "message": "Human-readable error message",
  "details": {
    "field": "Additional context"
  }
}
```

## HTTP Status Codes

| Status | Meaning | When It Occurs |
|--------|---------|----------------|
| 400 | Bad Request | Invalid input, validation errors |
| 401 | Unauthorized | Missing or invalid authentication token |
| 403 | Forbidden | Authenticated but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Resource already exists or state conflict |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Server-side error (contact support) |

## Common Error Codes

### VALIDATION_ERROR
Invalid input data. Check `details` field for specific field errors.

**Example:**
```json
{
  "code": "VALIDATION_ERROR",
  "message": "Invalid input",
  "details": {
    "email": "Invalid email format",
    "password": "Password must be at least 8 characters"
  }
}
```

### UNAUTHORIZED
Authentication required or token expired.

**Resolution:** Obtain a new token via `/auth/login`

### RATE_LIMIT_EXCEEDED
Too many requests in a short time period.

**Resolution:** Wait and retry. Check `Retry-After` header.

## Handling Errors (Code Examples)

```javascript
try {
  const response = await api.createUser(userData);
  console.log('Success:', response);
} catch (error) {
  if (error.response) {
    const { code, message, details } = error.response.data;

    switch (code) {
      case 'VALIDATION_ERROR':
        console.error('Validation errors:', details);
        break;
      case 'UNAUTHORIZED':
        // Re-authenticate
        await login();
        break;
      case 'RATE_LIMIT_EXCEEDED':
        // Retry after delay
        await sleep(5000);
        break;
      default:
        console.error('Error:', message);
    }
  }
}
```
```
