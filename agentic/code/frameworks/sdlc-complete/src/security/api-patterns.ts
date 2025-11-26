/**
 * API Call Detection Patterns
 *
 * Patterns for detecting external HTTP/HTTPS API calls in code.
 * Enforces offline-first operation requirement (NFR-SEC-001).
 */

export interface APIPattern {
  name: string;
  description: string;
  regex: RegExp;
  method: 'fetch' | 'axios' | 'http' | 'https' | 'XMLHttpRequest';
}

/**
 * Whitelisted URLs that are allowed for documentation/testing
 */
export const WHITELISTED_URLS: RegExp[] = [
  // Localhost
  /^https?:\/\/localhost/,
  /^https?:\/\/127\.0\.0\.1/,
  /^https?:\/\/0\.0\.0\.0/,

  // Local network
  /^https?:\/\/192\.168\./,
  /^https?:\/\/10\./,
  /^https?:\/\/172\.(1[6-9]|2[0-9]|3[01])\./,

  // Documentation (read-only, acceptable for doc fetching)
  /^https:\/\/docs\.claude\.com/,
  /^https:\/\/github\.com.*\.md$/,
  /^https:\/\/raw\.githubusercontent\.com.*\.md$/,
];

/**
 * Check if URL is whitelisted
 *
 * @param url - URL to check
 * @returns True if URL is whitelisted
 */
export function isWhitelisted(url: string): boolean {
  return WHITELISTED_URLS.some(pattern => pattern.test(url));
}

/**
 * Extract URLs from code string
 *
 * @param code - Code string to analyze
 * @returns Array of extracted URLs
 */
export function extractURLs(code: string): string[] {
  const urlRegex = /(https?:\/\/[^\s"'`\)]+)/g;
  const matches = code.matchAll(urlRegex);
  return Array.from(matches).map(m => m[1]);
}

/**
 * Fetch API patterns
 */
export const FETCH_PATTERNS: APIPattern[] = [
  {
    name: 'Fetch Call',
    description: 'fetch() API call',
    regex: /fetch\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'fetch',
  },
  {
    name: 'Fetch Template',
    description: 'fetch() with template literal',
    regex: /fetch\s*\(\s*`([^`]+)`/g,
    method: 'fetch',
  },
  {
    name: 'Fetch Variable',
    description: 'fetch() with URL variable',
    regex: /fetch\s*\(\s*([a-zA-Z_$][a-zA-Z0-9_$]*)/g,
    method: 'fetch',
  },
];

/**
 * Axios patterns
 */
export const AXIOS_PATTERNS: APIPattern[] = [
  {
    name: 'Axios Get',
    description: 'axios.get() call',
    regex: /axios\.get\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
  {
    name: 'Axios Post',
    description: 'axios.post() call',
    regex: /axios\.post\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
  {
    name: 'Axios Put',
    description: 'axios.put() call',
    regex: /axios\.put\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
  {
    name: 'Axios Delete',
    description: 'axios.delete() call',
    regex: /axios\.delete\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
  {
    name: 'Axios Request',
    description: 'axios.request() call',
    regex: /axios\.request\s*\(\s*\{[^}]*url\s*:\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
  {
    name: 'Axios Default',
    description: 'axios() default call',
    regex: /axios\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'axios',
  },
];

/**
 * Node.js http/https module patterns
 */
export const HTTP_MODULE_PATTERNS: APIPattern[] = [
  {
    name: 'HTTP Get',
    description: 'http.get() call',
    regex: /http\.get\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'http',
  },
  {
    name: 'HTTP Request',
    description: 'http.request() call',
    regex: /http\.request\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'http',
  },
  {
    name: 'HTTPS Get',
    description: 'https.get() call',
    regex: /https\.get\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'https',
  },
  {
    name: 'HTTPS Request',
    description: 'https.request() call',
    regex: /https\.request\s*\(\s*["'`]([^"'`]+)["'`]/g,
    method: 'https',
  },
];

/**
 * XMLHttpRequest patterns
 */
export const XHR_PATTERNS: APIPattern[] = [
  {
    name: 'XHR Open',
    description: 'XMLHttpRequest.open() call',
    regex: /\.open\s*\(\s*["'](GET|POST|PUT|DELETE|PATCH)["']\s*,\s*["'`]([^"'`]+)["'`]/g,
    method: 'XMLHttpRequest',
  },
];

/**
 * All API call patterns combined
 */
export const ALL_API_PATTERNS: APIPattern[] = [
  ...FETCH_PATTERNS,
  ...AXIOS_PATTERNS,
  ...HTTP_MODULE_PATTERNS,
  ...XHR_PATTERNS,
];
