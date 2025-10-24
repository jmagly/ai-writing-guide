/**
 * Example Templates
 *
 * Pre-defined topic templates for example generation.
 * Provides structured patterns for common technical topics.
 */

export interface TopicTemplate {
  topic: string;
  category: string;
  beforeTemplates: string[];
  afterHints: string[];
}

export const TOPIC_TEMPLATES: TopicTemplate[] = [
  {
    topic: 'caching',
    category: 'performance',
    beforeTemplates: [
      'It is important to note that caching plays a crucial role in modern applications. When delving into caching strategies, one must consider various aspects. At the end of the day, comprehensive caching is absolutely essential.',
    ],
    afterHints: [
      'Add specific cache types (Redis, Memcached)',
      'Include hit/miss ratios and latency improvements',
      'Mention eviction policies (LRU, LFU)',
      'Acknowledge cache invalidation challenges',
    ],
  },
  {
    topic: 'authentication',
    category: 'security',
    beforeTemplates: [
      'Authentication is a comprehensive solution for securing applications. It is worth noting that this cutting-edge approach leverages state-of-the-art techniques. Various aspects should be carefully considered.',
    ],
    afterHints: [
      'Specify OAuth 2.0, JWT, or specific protocols',
      'Mention security trade-offs (session vs stateless)',
      'Include token expiration times',
      'Acknowledge MFA complexity',
    ],
  },
  {
    topic: 'database optimization',
    category: 'performance',
    beforeTemplates: [
      'Database optimization involves several key considerations. Firstly, schema design must be carefully planned. Secondly, indexing requires attention. Thirdly, query optimization is essential. Finally, monitoring should be comprehensive.',
    ],
    afterHints: [
      'Name specific databases (PostgreSQL, MySQL)',
      'Include query execution times',
      'Mention index types (B-tree, GiST)',
      'Acknowledge n+1 query problems',
    ],
  },
  {
    topic: 'microservices',
    category: 'architecture',
    beforeTemplates: [
      'One should consider microservices carefully. It must be noted that proper implementation may help to achieve desired results. The system can serve to improve scalability significantly.',
    ],
    afterHints: [
      'Mention service mesh (Istio, Linkerd)',
      'Include deployment complexity trade-offs',
      'Specify communication patterns (REST, gRPC)',
      'Acknowledge distributed tracing challenges',
    ],
  },
  {
    topic: 'API design',
    category: 'design',
    beforeTemplates: [
      'API design is important. Moreover, it provides benefits. Furthermore, it should be considered. Additionally, proper implementation is crucial.',
    ],
    afterHints: [
      'Specify REST, GraphQL, or gRPC',
      'Include versioning strategies',
      'Mention rate limiting specifics',
      'Acknowledge backward compatibility pain points',
    ],
  },
];

/**
 * Get template by topic name
 */
export function getTemplateByTopic(topic: string): TopicTemplate | undefined {
  return TOPIC_TEMPLATES.find(t => t.topic.toLowerCase() === topic.toLowerCase());
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): TopicTemplate[] {
  return TOPIC_TEMPLATES.filter(t => t.category.toLowerCase() === category.toLowerCase());
}

/**
 * Get all topic names
 */
export function getAllTopics(): string[] {
  return TOPIC_TEMPLATES.map(t => t.topic);
}

/**
 * Get all categories
 */
export function getAllCategories(): string[] {
  const categories = TOPIC_TEMPLATES.map(t => t.category);
  return Array.from(new Set(categories));
}
