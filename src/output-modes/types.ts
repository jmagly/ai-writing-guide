export type OutputModeKind = 'voice' | 'controlled-language' | 'structure' | 'presentation';
export type OutputModeStage = 'semantic' | 'voice' | 'controlled-language' | 'structure' | 'presentation';
export type OutputModeScope = 'invocation' | 'session' | 'project';
export type ValidationLevel = 'advisory' | 'validated' | 'conformance';

export interface OutputModeProfile {
  id: string;
  version: string;
  description: string;
  kind: OutputModeKind;
  stage: OutputModeStage;
  order?: number;
  instructions: string;
  provenance: { source: string; license: string };
  validation: { level: ValidationLevel; hook?: string; standardVersion?: string };
  compatible?: string[];
  conflicts?: string[];
  requires?: string[];
  supersedes?: string[];
  protectedContent?: string[];
  contextCost?: number;
  mergeStrategy?: 'weighted-voice';
}

export interface ResolvedOutputMode extends OutputModeProfile {
  source: 'project' | 'user' | 'builtin' | 'voice-adapter';
  sourcePath?: string;
  scope?: OutputModeScope;
}

export interface OutputModeState {
  version: 1;
  modes: string[];
}
