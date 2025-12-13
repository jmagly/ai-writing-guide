/**
 * MCPsmith - MCP Server Generator
 *
 * Generates MCP (Model Context Protocol) servers from:
 * - CLI tools (--help parsing)
 * - REST APIs (OpenAPI specs)
 * - Tool catalogs (YAML/JSON)
 * - Natural language descriptions
 *
 * @module smiths/mcpsmith
 * @architecture @.aiwg/architecture/mcpsmith-architecture.md
 * @implements @.aiwg/architecture/decisions/ADR-014-mcpsmith-mcp-server-generator.md
 */

export * from './types.js';
export * from './analyzers/cli-analyzer.js';
export * from './generator.js';
