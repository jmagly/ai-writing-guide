import 'vitest';
declare module 'vitest' {
  export interface ProvidedContext {
    basePackageManifest: { name: string; version: string; files: Array<{ path: string }> };
  }
}
