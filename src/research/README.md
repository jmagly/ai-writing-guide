# Research Framework Foundation Infrastructure

This module provides the foundation infrastructure for the Research Framework, enabling automated retrieval and caching of academic papers from multiple sources.

## Components

### API Clients

All clients are built on a common `BaseClient` foundation that provides:
- Token bucket rate limiting
- Exponential backoff retry logic
- Configurable timeouts
- Type-safe responses

#### Semantic Scholar Client

```typescript
import { SemanticScholarClient } from './research';

const client = new SemanticScholarClient();

// Get paper by DOI
const paper = await client.getPaperByDoi('10.1234/example.2024');

// Get paper by arXiv ID
const paper = await client.getPaperByArxivId('2024.12345');

// Search papers
const results = await client.search('machine learning', {
  limit: 10,
  offset: 0,
});
```

**Rate Limits**: 1 request/second (polite pool)

#### CrossRef Client

```typescript
import { CrossRefClient } from './research';

const client = new CrossRefClient();

// Get paper by DOI
const paper = await client.getPaperByDoi('10.1234/example.2024');

// Search papers
const results = await client.search('neural networks');
```

**Rate Limits**: 1 request/second (polite pool)

#### arXiv Client

```typescript
import { ArxivClient } from './research';

const client = new ArxivClient();

// Get paper by arXiv ID
const paper = await client.getPaperById('2024.12345');

// Search papers
const results = await client.search('deep learning');
```

**Rate Limits**: 1 request per 3 seconds (arXiv requirement)

#### Unpaywall Client

```typescript
import { UnpaywallClient } from './research';

const client = new UnpaywallClient({
  email: 'your-email@example.com', // Required by Unpaywall
});

// Get paper with open access PDF
const paper = await client.getPaperByDoi('10.1234/example.2024');

// Check if open access PDF is available
const pdfUrl = await client.checkOpenAccess('10.1234/example.2024');
```

**Rate Limits**: 10 requests/second

### Cache Manager

File-based caching with configurable TTL:

```typescript
import { CacheManager } from './research';

const cache = new CacheManager({
  cacheDir: '.aiwg/research/cache',
  defaultTtl: 86400, // 24 hours
  ttlByEndpoint: {
    'semantic-scholar': 604800, // 7 days
    'arxiv': 2592000, // 30 days
  },
});

// Generate cache key
const key = cache.generateKey('semantic-scholar', { doi: '10.1234/test' });

// Set cache
await cache.set(key, paperData, 'semantic-scholar');

// Get from cache
const cached = await cache.get(key);

// Clear expired entries
const cleared = await cache.clearExpired();

// Get statistics
const stats = await cache.getStats();
```

### Type System

All clients return a unified `ResearchPaper` type:

```typescript
interface ResearchPaper {
  id: string;
  title: string;
  authors: Author[];
  year: number;
  abstract?: string;
  doi?: string;
  arxivId?: string;
  venue?: string;
  citationCount?: number;
  pdfUrl?: string;
  type?: 'journal' | 'conference' | 'preprint' | 'book' | 'thesis' | 'other';
  source: 'semantic-scholar' | 'crossref' | 'arxiv' | 'unpaywall';
  retrievedAt: string;
}
```

### Error Handling

Comprehensive error codes for debugging:

```typescript
enum ResearchErrorCode {
  // RF-1xx: Client errors
  RF_100 = 'RF-100: Invalid request parameters',
  RF_101 = 'RF-101: Missing required parameter',
  RF_102 = 'RF-102: Invalid API key',
  RF_103 = 'RF-103: Rate limit exceeded',
  RF_104 = 'RF-104: Request timeout',

  // RF-2xx: Server errors
  RF_200 = 'RF-200: API server error',
  RF_201 = 'RF-201: Service unavailable',
  RF_202 = 'RF-202: Gateway timeout',

  // RF-3xx: Data errors
  RF_300 = 'RF-300: Resource not found',
  RF_301 = 'RF-301: Invalid response format',
  RF_302 = 'RF-302: Missing required field',

  // RF-4xx: Cache errors
  RF_400 = 'RF-400: Cache read error',
  RF_401 = 'RF-401: Cache write error',
  RF_402 = 'RF-402: Cache invalidation error',

  // RF-5xx: Network errors
  RF_500 = 'RF-500: Network error',
  RF_501 = 'RF-501: Connection refused',
  RF_502 = 'RF-502: DNS resolution failed',
}
```

## Usage Example

```typescript
import {
  SemanticScholarClient,
  CacheManager,
  ResearchPaper,
} from './research';

async function getPaper(doi: string): Promise<ResearchPaper> {
  const client = new SemanticScholarClient();
  const cache = new CacheManager();

  // Generate cache key
  const key = cache.generateKey('semantic-scholar', { doi });

  // Check cache first
  const cached = await cache.get<ResearchPaper>(key);
  if (cached) {
    return cached;
  }

  // Fetch from API
  const paper = await client.getPaperByDoi(doi);

  // Cache for future requests
  await cache.set(key, paper, 'semantic-scholar');

  return paper;
}
```

## Configuration

### Rate Limiting

Each client can be configured with custom rate limits:

```typescript
const client = new SemanticScholarClient({
  rateLimit: {
    maxTokens: 100,
    refillRate: 1, // tokens per second
    currentTokens: 100,
    lastRefill: Date.now(),
  },
});
```

### Retry Logic

Customize retry behavior:

```typescript
const client = new CrossRefClient({
  retry: {
    maxRetries: 3,
    initialDelay: 1000, // ms
    maxDelay: 10000, // ms
    backoffMultiplier: 2,
  },
});
```

### Timeout

Set custom timeout:

```typescript
const client = new ArxivClient({
  timeout: 30000, // 30 seconds
});
```

## Testing

The module includes comprehensive unit and integration tests:

```bash
npm test -- test/unit/research/
```

### Test Coverage

- Base client: Rate limiting, retry logic, error handling
- Cache manager: Set/get, expiration, statistics
- All API clients: Paper retrieval, search, error handling
- Integration: Cross-client compatibility, type safety

## Implementation Status

- [x] Base client with rate limiting and retry
- [x] Semantic Scholar client
- [x] CrossRef client
- [x] arXiv client
- [x] Unpaywall client
- [x] Cache manager with TTL
- [x] Unified type system
- [x] Error codes (RF-1xx through RF-5xx)
- [x] Comprehensive tests (90%+ coverage)
- [x] TypeScript type safety

## Next Steps

Future enhancements (not part of #86):
- Integration with AIWG research corpus
- Batch retrieval optimization
- Citation graph traversal
- Metadata validation
- PDF download and extraction
