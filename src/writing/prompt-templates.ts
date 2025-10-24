/**
 * Prompt Template Library
 *
 * Pre-optimized prompt templates that incorporate AI Writing Guide principles.
 * Templates are designed to produce authentic, human-like output by including
 * specific constraints, examples, and voice guidance.
 */

export interface PromptTemplate {
  id: string;
  name: string;
  category: 'technical' | 'academic' | 'executive' | 'creative';
  template: string;
  variables: string[];
  example: string;
  principles: string[];
}

export interface TemplateVariables {
  [key: string]: string;
}

/**
 * Prompt Template Library
 */
export class PromptTemplateLibrary {
  private templates: Map<string, PromptTemplate>;

  constructor() {
    this.templates = new Map();
    this.loadBuiltInTemplates();
  }

  /**
   * Get template by ID
   */
  getTemplate(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * List templates by category
   */
  listByCategory(category: string): PromptTemplate[] {
    return Array.from(this.templates.values())
      .filter(t => t.category === category);
  }

  /**
   * Search templates by keyword
   */
  search(query: string): PromptTemplate[] {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.templates.values())
      .filter(t =>
        t.name.toLowerCase().includes(lowerQuery) ||
        t.template.toLowerCase().includes(lowerQuery) ||
        t.id.toLowerCase().includes(lowerQuery)
      );
  }

  /**
   * Instantiate template with values
   */
  instantiate(templateId: string, values: TemplateVariables): string {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    let result = template.template;

    // Replace variables
    for (const [key, value] of Object.entries(values)) {
      const placeholder = `{${key}}`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    }

    // Check for unreplaced variables
    const unreplaced = result.match(/\{[^}]+\}/g);
    if (unreplaced) {
      throw new Error(`Missing template variables: ${unreplaced.join(', ')}`);
    }

    return result;
  }

  /**
   * List all templates
   */
  listAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Add custom template
   */
  addTemplate(template: PromptTemplate): void {
    this.templates.set(template.id, template);
  }

  /**
   * Remove template
   */
  removeTemplate(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Load built-in templates
   */
  private loadBuiltInTemplates(): void {
    // Technical templates
    this.templates.set('technical-deep-dive', {
      id: 'technical-deep-dive',
      name: 'Technical Deep Dive Article',
      category: 'technical',
      template: `Write a {word_count}-word technical article about {topic} for {audience}.

Requirements:
1. Avoid AI detection patterns:
   - No "delve into", "it's important to note", "seamlessly", "comprehensive", "robust"
   - No "Moreover," or "Furthermore," transitions
   - Avoid three-item lists
2. Include specifics:
   - Exact metrics and performance numbers
   - Specific technologies and version numbers
   - Code examples with actual implementation details
3. Demonstrate expertise:
   - Acknowledge trade-offs and edge cases
   - Reference real-world implementation challenges
   - Include opinions based on experience
   - Mention what failed or was difficult
4. Writing style:
   - Vary sentence structure (mix short and long)
   - Use technical precision appropriate to senior developers
   - Write like a tired developer explaining at 4pm Friday, not an AI trying to impress

Example structure:
{example_structure}`,
      variables: ['word_count', 'topic', 'audience', 'example_structure'],
      example: 'OAuth 2.0 authentication for mobile apps targeting senior backend developers',
      principles: [
        'Technical precision over marketing speak',
        'Specific examples with code',
        'Acknowledge real-world challenges',
        'Avoid AI pattern phrases'
      ]
    });

    this.templates.set('technical-tutorial', {
      id: 'technical-tutorial',
      name: 'Step-by-Step Technical Tutorial',
      category: 'technical',
      template: `Create a technical tutorial showing how to {task} for {audience}.

Requirements:
1. No AI patterns:
   - Skip "comprehensive guide" - just call it a tutorial
   - No "seamlessly integrates" - things break, show how to fix them
   - Avoid "cutting-edge" - just name the technology and version
2. Real-world approach:
   - Show what goes wrong and how to debug it
   - Include error messages you actually encountered
   - Mention performance issues or limitations
3. Code examples:
   - Full working code, not snippets
   - Include dependencies and versions
   - Show both good and bad approaches
4. Structure:
   - Start with what you're building, not background
   - Each step includes: code, explanation, common errors
   - End with what to do next, not a summary

Prerequisites: {prerequisites}
Technologies: {technologies}`,
      variables: ['task', 'audience', 'prerequisites', 'technologies'],
      example: 'Set up OAuth 2.0 PKCE flow in React Native app for mobile developers',
      principles: [
        'Show failures and debugging',
        'Full working code examples',
        'Real error messages',
        'Skip unnecessary summaries'
      ]
    });

    this.templates.set('architecture-analysis', {
      id: 'architecture-analysis',
      name: 'Architecture Decision Analysis',
      category: 'technical',
      template: `Analyze the architectural decision to {decision} in the context of {context}.

Requirements:
1. No corporate speak:
   - Skip "robust solution" - explain what it actually does
   - No "best-in-class" - compare specific alternatives
   - Avoid "innovative approach" - describe the technique
2. Critical analysis:
   - State clear opinion on whether this was the right choice
   - List specific drawbacks, not just benefits
   - Include numbers: latency, cost, team hours spent
   - Mention what you'd change knowing what you know now
3. Technical depth:
   - Reference specific design patterns or algorithms
   - Compare to at least 2 alternatives with pros/cons
   - Include architecture diagrams or code structure
4. Trade-offs:
   - Performance vs complexity
   - Cost vs features
   - Time to implement vs long-term maintainability

Constraints:
{constraints}

Target audience: {audience}`,
      variables: ['decision', 'context', 'constraints', 'audience'],
      example: 'Use event sourcing for order processing in e-commerce platform',
      principles: [
        'Clear opinions with reasoning',
        'Specific comparisons',
        'Real metrics and costs',
        'Honest about drawbacks'
      ]
    });

    this.templates.set('executive-brief', {
      id: 'executive-brief',
      name: 'Executive Brief',
      category: 'executive',
      template: `Write an executive summary about {topic} for {stakeholders}.

Constraints:
1. Maximum {word_count} words
2. Start with bottom-line impact:
   - Dollar cost or savings
   - Time saved or spent
   - Risk level (quantified)
3. No corporate fluff:
   - Avoid "it's worth considering" - state your recommendation
   - Skip "comprehensive approach" - list specific actions
   - No "transformative" or "game-changing" - use metrics
4. Structure:
   - First paragraph: decision needed and recommendation
   - Second paragraph: financial/time impact with numbers
   - Third paragraph: 2-3 specific next steps
   - No conclusion paragraph - end with action items
5. Voice:
   - Direct statements, no hedging
   - Specific numbers, not ranges
   - Clear accountability (who does what)

Context: {context}
Decision timeline: {timeline}`,
      variables: ['topic', 'stakeholders', 'word_count', 'context', 'timeline'],
      example: 'Cloud migration decision for C-suite executives',
      principles: [
        'Bottom-line first',
        'No hedging',
        'Specific numbers',
        'Clear recommendations'
      ]
    });

    this.templates.set('academic-analysis', {
      id: 'academic-analysis',
      name: 'Academic Research Analysis',
      category: 'academic',
      template: `Analyze {topic} from {theoretical_framework} perspective for {journal} journal.

Requirements:
1. Academic rigor without AI patterns:
   - Skip "it is worth noting" - just state the observation
   - No "Furthermore," transitions - use discipline-specific linking
   - Avoid "comprehensive overview" - be specific about scope
2. Methodology:
   - Cite {num_sources} peer-reviewed sources (specific citations)
   - Use {methodology} methodology
   - Acknowledge limitations of the approach
3. Critical engagement:
   - Present counterarguments from specific scholars
   - Identify gaps in existing research
   - State your position with supporting evidence
4. Writing style:
   - Use discipline-appropriate terminology (not simplified)
   - Vary sentence and paragraph length
   - Complex sentences for complex ideas
   - No generic academic voice - write like an expert in the field
5. Structure:
   - Skip broad introduction - start with specific research question
   - Analysis section varies structure (not topic→evidence→conclusion every time)
   - Conclusion looks forward, not backward

Scope: {scope}
Key concepts: {concepts}`,
      variables: ['topic', 'theoretical_framework', 'journal', 'num_sources', 'methodology', 'scope', 'concepts'],
      example: 'Social media impact on political discourse from media ecology perspective',
      principles: [
        'Discipline-specific vocabulary',
        'Critical engagement',
        'Acknowledge limitations',
        'Complex analysis without AI voice'
      ]
    });

    this.templates.set('performance-report', {
      id: 'performance-report',
      name: 'Performance Optimization Report',
      category: 'technical',
      template: `Document performance optimization work on {system} targeting {metric_goal}.

Requirements:
1. Start with numbers:
   - Baseline: {baseline_metric}
   - Target: {target_metric}
   - Achieved: [to be filled]
2. No marketing language:
   - Skip "dramatically improved" - show the graph
   - Avoid "highly optimized" - list specific techniques
   - No "seamless" - mention what broke during optimization
3. Technical details:
   - Profiling tools used (name and version)
   - Specific optimizations applied (with code changes)
   - Failed approaches and why they didn't work
   - New bottlenecks introduced
4. Measurements:
   - Before/after metrics for each optimization
   - Testing methodology (load characteristics, duration)
   - Variance and edge cases
   - Cost (infrastructure, development time)
5. Honest assessment:
   - What worked better than expected
   - What didn't work at all
   - Remaining issues
   - Whether it was worth the effort

Technologies: {technologies}
Timeline: {timeline}`,
      variables: ['system', 'metric_goal', 'baseline_metric', 'target_metric', 'technologies', 'timeline'],
      example: 'Database query performance from 500ms to <50ms p95 latency',
      principles: [
        'Numbers first',
        'Failed attempts included',
        'Honest cost assessment',
        'New problems introduced'
      ]
    });

    this.templates.set('api-documentation', {
      id: 'api-documentation',
      name: 'API Documentation',
      category: 'technical',
      template: `Document the {api_name} API for {audience}.

Requirements:
1. Skip marketing:
   - No "comprehensive API" - just document it
   - Avoid "robust and scalable" - mention actual rate limits
   - Skip "seamless integration" - show the error cases
2. Essential information first:
   - Authentication method (exact flow)
   - Rate limits (requests per minute/hour)
   - Error codes and what they actually mean
   - Breaking changes from previous version
3. Examples:
   - Full request/response for each endpoint
   - Error scenarios with actual error messages
   - Code examples in {languages}
   - Common mistakes and how to fix them
4. Real-world guidance:
   - Pagination strategy (and why we chose it)
   - Webhook reliability (retry logic, timeouts)
   - What to do when things fail
   - Performance tips based on production usage
5. Structure:
   - Quick start (auth + first successful call)
   - Endpoint reference (grouped by resource)
   - Error handling guide
   - Migration guide if breaking changes

Version: {version}
Base URL: {base_url}`,
      variables: ['api_name', 'audience', 'languages', 'version', 'base_url'],
      example: 'Payment processing REST API for backend developers',
      principles: [
        'Error cases prominent',
        'Real examples',
        'Common mistakes',
        'Production-based guidance'
      ]
    });

    this.templates.set('security-analysis', {
      id: 'security-analysis',
      name: 'Security Threat Analysis',
      category: 'technical',
      template: `Analyze security threats for {system} with focus on {threat_model}.

Requirements:
1. No security theater:
   - Skip "robust security measures" - list actual controls
   - Avoid "industry-leading protection" - cite specific standards (OWASP, NIST)
   - No "comprehensive security" - acknowledge gaps
2. Threat modeling:
   - Use {framework} framework (STRIDE, PASTA, etc.)
   - Identify specific attack vectors
   - Estimate likelihood and impact with reasoning
   - Prioritize by actual risk, not completeness
3. Technical specifics:
   - Exact vulnerabilities (with CVE numbers if applicable)
   - Attack scenarios with step-by-step flow
   - Current mitigations and their limitations
   - Recommended controls with implementation difficulty
4. Honest assessment:
   - What we can't protect against
   - Where we accepted risk and why
   - Cost vs benefit for each mitigation
   - What we'd fix first with unlimited budget vs actual budget
5. Action items:
   - Prioritized list with timeline
   - Owner for each item
   - Success criteria
   - Monitoring/detection approach

Scope: {scope}
Compliance requirements: {compliance}`,
      variables: ['system', 'threat_model', 'framework', 'scope', 'compliance'],
      example: 'E-commerce checkout flow with PCI-DSS compliance',
      principles: [
        'Specific attack vectors',
        'Accepted risks documented',
        'Cost/benefit analysis',
        'Acknowledged gaps'
      ]
    });

    this.templates.set('incident-postmortem', {
      id: 'incident-postmortem',
      name: 'Incident Postmortem',
      category: 'technical',
      template: `Document the incident: {incident_title}

Date/Time: {incident_datetime}
Duration: {duration}
Severity: {severity}

Requirements:
1. Blameless but honest:
   - No "unforeseen circumstances" - we should have seen it
   - Skip "seamless recovery" - describe the chaos
   - Avoid passive voice - say who did what
2. Timeline:
   - Detection time and method
   - Investigation steps (including wrong paths)
   - Resolution actions
   - Communication timeline
   - All times in UTC
3. Impact:
   - Users affected (number and percentage)
   - Revenue impact (estimated)
   - Downstream systems affected
   - Duration of degraded service
4. Root cause:
   - Technical root cause (specific code, config, or architecture issue)
   - Process root cause (what process would have caught this)
   - Contributing factors
   - Why monitoring didn't catch it sooner
5. Action items:
   - Immediate fixes (done)
   - Short-term improvements (this sprint)
   - Long-term improvements (this quarter)
   - What we won't fix and why
   - Owner and deadline for each

Systems involved: {systems}`,
      variables: ['incident_title', 'incident_datetime', 'duration', 'severity', 'systems'],
      example: 'Database deadlock causing checkout failures',
      principles: [
        'Blameless honesty',
        'Wrong paths documented',
        'Real impact numbers',
        'Process improvements'
      ]
    });

    this.templates.set('code-review-guide', {
      id: 'code-review-guide',
      name: 'Code Review Guidelines',
      category: 'technical',
      template: `Create code review guidelines for {team} working on {project_type}.

Requirements:
1. Skip platitudes:
   - No "maintain high code quality" - define what quality means
   - Avoid "follow best practices" - list specific practices
   - Skip "comprehensive review" - give time estimates
2. Specific criteria:
   - Required automated checks (tests, linting, security scans)
   - Manual review focus areas (with examples)
   - When to approve vs request changes
   - Maximum PR size (lines of code)
3. Process:
   - Response time SLA (e.g., 4 business hours)
   - Who reviews what (based on expertise)
   - How to handle disagreements
   - When to skip review (if ever)
4. Common issues:
   - {common_issue_1} - why it matters, how to fix
   - {common_issue_2} - why it matters, how to fix
   - {common_issue_3} - why it matters, how to fix
5. Review tone:
   - Examples of good feedback
   - Examples of unhelpful feedback
   - How to suggest alternatives
   - When to pair instead of commenting

Team size: {team_size}
Tech stack: {tech_stack}`,
      variables: ['team', 'project_type', 'common_issue_1', 'common_issue_2', 'common_issue_3', 'team_size', 'tech_stack'],
      example: 'Backend team working on microservices',
      principles: [
        'Specific, measurable criteria',
        'Time commitments',
        'Real examples',
        'Disagreement resolution'
      ]
    });

    // Add more templates...
    this.addCreativeTemplates();
    this.addExecutiveTemplates();
  }

  private addCreativeTemplates(): void {
    this.templates.set('creative-brief', {
      id: 'creative-brief',
      name: 'Creative Content Brief',
      category: 'creative',
      template: `Create {content_type} about {topic} for {audience}.

Constraints:
1. Avoid AI tells:
   - No "vibrant", "rich", "thriving", "dynamic" without specific examples
   - Skip "journey" and "landscape" metaphors
   - Avoid three-item lists
   - No em-dash epidemic
2. Voice:
   - {tone} but not generic
   - Include specific observations or opinions
   - Vary sentence and paragraph length
   - Some paragraphs can be one sentence
3. Content:
   - {word_count} words
   - Include concrete examples or anecdotes
   - End when done - no "In conclusion"
   - No balanced "on one hand...on the other hand" structure
4. Authenticity markers:
   - Personal observation or opinion
   - Specific detail (not "many people" but "42% of respondents")
   - Acknowledgment of limitations or counterpoints
   - Casual aside or parenthetical comment

Angle: {angle}
Key points: {key_points}`,
      variables: ['content_type', 'topic', 'audience', 'tone', 'word_count', 'angle', 'key_points'],
      example: 'Blog post about remote work for tech workers',
      principles: [
        'Specific over generic',
        'Opinion included',
        'Varied structure',
        'Authentic voice'
      ]
    });
  }

  private addExecutiveTemplates(): void {
    this.templates.set('executive-decision', {
      id: 'executive-decision',
      name: 'Executive Decision Document',
      category: 'executive',
      template: `Decision: {decision}

Recommendation: {recommendation}
Financial impact: {financial_impact}
Timeline: {timeline}

Requirements:
1. No corporate speak:
   - Skip "strategic initiative" - state what we're doing
   - Avoid "leverage synergies" - explain the actual benefit
   - No "transformative" - use specific metrics
2. Structure (max {word_count} words total):
   - Paragraph 1: Decision needed + your recommendation
   - Paragraph 2: Financial impact (dollars, timeline)
   - Paragraph 3: Risk assessment (likelihood × impact)
   - Paragraph 4: 2-3 specific next steps with owners
3. Voice:
   - State clear position (not "we could consider")
   - Use specific numbers (not "significant" or "substantial")
   - Name owners and deadlines
   - One opinion per paragraph
4. What to avoid:
   - Hedging ("may", "might", "could potentially")
   - Passive voice ("it is recommended" → "I recommend")
   - Balanced pros/cons lists (pick a side)
   - Summary paragraphs (end with action)

Stakeholders: {stakeholders}
Context: {context}`,
      variables: ['decision', 'recommendation', 'financial_impact', 'timeline', 'word_count', 'stakeholders', 'context'],
      example: 'Build vs buy decision for CRM system',
      principles: [
        'Clear recommendation',
        'Specific numbers',
        'No hedging',
        'Action-oriented'
      ]
    });
  }
}
