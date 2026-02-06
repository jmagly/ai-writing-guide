export class RuntimeDiscovery {
  basePath: string;
  constructor();
  discover(): Promise<any>;
  verify(): Promise<any>;
  getCatalog(): Promise<any>;
  generateDefinition(): Promise<any>;
  checkTool(toolName: string): Promise<any>;
  getSummary(): Promise<any>;
}
