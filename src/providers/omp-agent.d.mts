export interface OmpAgentOptions {
  diagnostics?: string[];
  quiet?: boolean;
  modelsConfig?: Record<string, any>;
  modelConfig?: Record<string, any>;
}
export function transformAgent(src: string, content: string, opts?: OmpAgentOptions): string;
export function mapModel(model: string | undefined, config?: Record<string, any>): string | undefined;
