/**
 * Secret Detection Patterns
 *
 * Comprehensive patterns for detecting API keys, passwords, tokens, and other secrets
 * in code and configuration files. Uses entropy analysis and pattern matching.
 */

export interface SecretPattern {
  name: string;
  description: string;
  regex: RegExp;
  entropy?: number; // Minimum entropy threshold (bits per character)
  confidence: number; // Base confidence score (0-1)
}

/**
 * Calculate Shannon entropy of a string
 * Higher entropy indicates more random/secret-like data
 *
 * @param str - String to analyze
 * @returns Entropy in bits per character
 */
export function calculateEntropy(str: string): number {
  if (str.length === 0) return 0;

  const frequency: Record<string, number> = {};
  for (const char of str) {
    frequency[char] = (frequency[char] || 0) + 1;
  }

  let entropy = 0;
  const len = str.length;

  for (const count of Object.values(frequency)) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Check if a value looks like a placeholder
 *
 * @param value - Value to check
 * @returns True if value is a placeholder
 */
export function isPlaceholder(value: string): boolean {
  const placeholders = [
    /your[_-]?api[_-]?key/i,
    /your[_-]?token/i,
    /your[_-]?password/i,
    /replace[_-]?with/i,
    /example/i,
    /dummy/i,
    /placeholder/i,
    /xxxxx+/i,
    /\*\*\*+/,
    /\.\.\.+/,
    /^<.*>$/,
    /^\[.*\]$/,
    /^test[_-]?/i,
    /^fake[_-]?/i,
    /^mock[_-]?/i,
    /^sample[_-]?/i,
  ];

  return placeholders.some(pattern => pattern.test(value));
}

/**
 * Check if file should be excluded from secret scanning
 *
 * @param filePath - File path to check
 * @returns True if file should be excluded
 */
export function shouldExcludeFile(filePath: string): boolean {
  const excludePatterns = [
    // Test files
    /\.test\.(ts|js|tsx|jsx)$/,
    /\.spec\.(ts|js|tsx|jsx)$/,
    /__tests__\//,
    /test\/fixtures\//,
    /test\/mocks\//,

    // Documentation
    /\.example$/,
    /\.sample$/,
    /README\.md$/i,
    /EXAMPLE\.md$/i,

    // Build artifacts
    /node_modules\//,
    /dist\//,
    /build\//,
    /\.min\.(js|css)$/,

    // Version control
    /\.git\//,

    // Binary files
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/,

    // Lock files
    /package-lock\.json$/,
    /yarn\.lock$/,
    /pnpm-lock\.yaml$/,
  ];

  return excludePatterns.some(pattern => pattern.test(filePath));
}

/**
 * API Key patterns - various formats from common services
 */
export const API_KEY_PATTERNS: SecretPattern[] = [
  {
    name: 'OpenAI API Key',
    description: 'OpenAI API key (sk-...)',
    regex: /\b(sk-[a-zA-Z0-9]{20,})\b/g,
    entropy: 3.5,
    confidence: 0.95,
  },
  {
    name: 'Anthropic API Key',
    description: 'Anthropic/Claude API key (sk-ant-...)',
    regex: /\b(sk-ant-[a-zA-Z0-9-]{20,})\b/g,
    entropy: 4.5,
    confidence: 0.95,
  },
  {
    name: 'Google API Key',
    description: 'Google Cloud API key (AIzaSy...)',
    regex: /\b(AIzaSy[a-zA-Z0-9_-]{25,})\b/g,
    confidence: 0.9,
  },
  {
    name: 'AWS Access Key',
    description: 'AWS access key ID (AKIA...)',
    regex: /\b(AKIA[0-9A-Z]{14,})\b/g,
    confidence: 0.9,
  },
  {
    name: 'AWS Secret Key',
    description: 'AWS secret access key',
    regex: /aws[_-]?secret[_-]?access[_-]?key["\s:=]+([a-zA-Z0-9/+=]{40})/gi,
    entropy: 5.0,
    confidence: 0.85,
  },
  {
    name: 'Stripe API Key',
    description: 'Stripe publishable/secret key',
    regex: /\b((?:pk|sk)_(?:live|test)_[a-zA-Z0-9]{24,})\b/g,
    confidence: 0.9,
  },
  {
    name: 'GitHub Token',
    description: 'GitHub personal access token',
    regex: /\b(gh[pousr]_[a-zA-Z0-9]{36,})\b/g,
    confidence: 0.95,
  },
  {
    name: 'Generic API Key',
    description: 'Generic API key pattern',
    regex: /api[_-]?key["\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    entropy: 4.5,
    confidence: 0.7,
  },
  {
    name: 'Generic Secret Key',
    description: 'Generic secret key pattern',
    regex: /secret[_-]?key["\s:=]+["']?([a-zA-Z0-9_\-]{20,})["']?/gi,
    entropy: 4.5,
    confidence: 0.7,
  },
];

/**
 * Password patterns
 */
export const PASSWORD_PATTERNS: SecretPattern[] = [
  {
    name: 'Password Assignment',
    description: 'Password variable assignment',
    regex: /password["\s:=]+["']([^"'\s]{8,})["']/gi,
    entropy: 3.5,
    confidence: 0.75,
  },
  {
    name: 'Pass Assignment',
    description: 'Pass/pwd variable assignment',
    regex: /(?:pass|pwd)["\s:=]+["']([^"'\s]{8,})["']/gi,
    entropy: 3.5,
    confidence: 0.7,
  },
  {
    name: 'Database Password',
    description: 'Database password in connection string',
    regex: /(?:db|database)[_-]?(?:pass|password|pwd)["\s:=]+["']?([^"'\s;]{8,})["']?/gi,
    entropy: 3.5,
    confidence: 0.8,
  },
];

/**
 * Token patterns (JWT, OAuth, etc.)
 */
export const TOKEN_PATTERNS: SecretPattern[] = [
  {
    name: 'JWT Token',
    description: 'JSON Web Token',
    regex: /\b(eyJ[a-zA-Z0-9_-]{10,}\.eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,})\b/g,
    confidence: 0.9,
  },
  {
    name: 'Bearer Token',
    description: 'Bearer token authorization',
    regex: /bearer\s+([a-zA-Z0-9_\-\.]{20,})/gi,
    entropy: 4.5,
    confidence: 0.85,
  },
  {
    name: 'OAuth Token',
    description: 'OAuth access/refresh token',
    regex: /(?:access|refresh)[_-]?token["\s:=]+["']?([a-zA-Z0-9_\-\.]{20,})["']?/gi,
    entropy: 4.5,
    confidence: 0.8,
  },
  {
    name: 'Generic Token',
    description: 'Generic token pattern',
    regex: /token["\s:=]+["']?([a-zA-Z0-9_\-\.]{20,})["']?/gi,
    entropy: 4.5,
    confidence: 0.65,
  },
];

/**
 * Private key patterns
 */
export const PRIVATE_KEY_PATTERNS: SecretPattern[] = [
  {
    name: 'RSA Private Key',
    description: 'RSA private key (PEM format)',
    regex: /-----BEGIN RSA PRIVATE KEY-----[\s\S]*?-----END RSA PRIVATE KEY-----/g,
    confidence: 1.0,
  },
  {
    name: 'Private Key',
    description: 'Generic private key (PEM format)',
    regex: /-----BEGIN PRIVATE KEY-----[\s\S]*?-----END PRIVATE KEY-----/g,
    confidence: 1.0,
  },
  {
    name: 'EC Private Key',
    description: 'Elliptic curve private key',
    regex: /-----BEGIN EC PRIVATE KEY-----[\s\S]*?-----END EC PRIVATE KEY-----/g,
    confidence: 1.0,
  },
  {
    name: 'OpenSSH Private Key',
    description: 'OpenSSH private key',
    regex: /-----BEGIN OPENSSH PRIVATE KEY-----[\s\S]*?-----END OPENSSH PRIVATE KEY-----/g,
    confidence: 1.0,
  },
];

/**
 * Database connection patterns
 */
export const DATABASE_PATTERNS: SecretPattern[] = [
  {
    name: 'Database URL',
    description: 'Database connection URL with credentials',
    regex: /\b(?:postgres|mysql|mongodb|redis):\/\/([a-zA-Z0-9_-]+):([^@\s]+)@/g,
    confidence: 0.9,
  },
  {
    name: 'Connection String',
    description: 'Generic connection string with password',
    regex: /(?:connection[_-]?string|database[_-]?url)["\s:=]+["']?[^"'\s]*password=([^;"'\s&]+)/gi,
    entropy: 3.5,
    confidence: 0.85,
  },
];

/**
 * All secret patterns combined
 */
export const ALL_SECRET_PATTERNS: SecretPattern[] = [
  ...API_KEY_PATTERNS,
  ...PASSWORD_PATTERNS,
  ...TOKEN_PATTERNS,
  ...PRIVATE_KEY_PATTERNS,
  ...DATABASE_PATTERNS,
];

/**
 * Analyze a value for secret-like characteristics
 *
 * @param value - Value to analyze
 * @returns Analysis result with entropy and confidence
 */
export interface SecretAnalysis {
  isSecret: boolean;
  entropy: number;
  confidence: number;
  reason: string;
}

export function analyzeValue(value: string): SecretAnalysis {
  // Check if placeholder
  if (isPlaceholder(value)) {
    return {
      isSecret: false,
      entropy: 0,
      confidence: 0,
      reason: 'Placeholder value',
    };
  }

  // Calculate entropy
  const entropy = calculateEntropy(value);

  // Short values are unlikely to be secrets
  if (value.length < 8) {
    return {
      isSecret: false,
      entropy,
      confidence: 0,
      reason: 'Value too short',
    };
  }

  // High entropy suggests secret
  if (entropy > 4.5 && value.length >= 20) {
    return {
      isSecret: true,
      entropy,
      confidence: 0.9,
      reason: 'High entropy random value',
    };
  }

  // Medium entropy with sufficient length
  if (entropy > 3.5 && value.length >= 16) {
    return {
      isSecret: true,
      entropy,
      confidence: 0.7,
      reason: 'Medium entropy possible secret',
    };
  }

  return {
    isSecret: false,
    entropy,
    confidence: 0,
    reason: 'Low entropy or insufficient length',
  };
}
