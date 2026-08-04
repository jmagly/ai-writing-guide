export const JOB_API_VERSION = 'jobs.aiwg.io/v1' as const;
export const JOB_KIND = 'ExternalJob' as const;

export interface ExternalJobFlow {
  apiVersion: typeof JOB_API_VERSION;
  kind: typeof JOB_KIND;
  metadata: {
    name: string;
    revision: string;
  };
  spec: {
    trigger: {
      type: 'external';
    };
    executor: {
      provider: 'codex';
      mode: 'exec';
      workspace: string;
      prompt: string;
      resultSchema: string;
      binary: string;
    };
    workItem: {
      provider: 'gitea';
      baseUrl: string;
      repository: string;
      tokenFile: string;
      eligibleLabels: string[];
      claimTtlSeconds?: number;
      claimSettleMs?: number;
    };
    approval?: {
      required?: boolean;
      label?: string;
    };
    security: {
      allowedOrigins: string[];
      allowedAccounts: string[];
      approvedAttachmentRoots: string[];
      sensitiveValueFiles?: string[];
    };
    completion: {
      require: Array<'external-result-url' | 'issue-comment' | 'idempotency-key' | 'verification'>;
    };
  };
}

export interface JobIssue {
  number: number;
  title: string;
  body: string;
  labels: string[];
}

export interface JobComment {
  id: number;
  author: string;
  body: string;
  createdAt: string;
}

export interface JobResult {
  status: 'completed' | 'no-eligible-work' | 'already-completed' | 'claim-lost' | 'failed-verification';
  issue?: number;
  idempotencyKey?: string;
  externalResultUrl?: string;
  account?: string;
  verification?: string;
  attachmentPaths?: string[];
  message?: string;
}

export interface ExecutorResult {
  exitCode: number;
  stdout: string;
  stderr: string;
  finalMessage: string;
}

export interface JobExecutor {
  execute(input: {
    flow: ExternalJobFlow;
    prompt: string;
    issue: JobIssue;
    idempotencyKey: string;
    runDirectory: string;
    signal?: AbortSignal;
  }): Promise<ExecutorResult>;
}

export interface WorkItemClient {
  currentUser(signal?: AbortSignal): Promise<string>;
  listOpenIssues(labels: string[], signal?: AbortSignal): Promise<JobIssue[]>;
  listComments(issue: number, signal?: AbortSignal): Promise<JobComment[]>;
  addComment(issue: number, body: string, signal?: AbortSignal): Promise<JobComment>;
}
