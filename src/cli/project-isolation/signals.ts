// Single source of truth for project-signal filenames used by detect.ts.
// Adding a new ecosystem means adding one entry here; nothing else changes (NFR-MAINT-01).

export const PROJECT_SIGNALS = [
  '.git',
  'package.json',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'Gemfile',
  'build.gradle',
] as const;

// .csproj is matched separately via glob in detect.ts because the filename
// varies by project name.
export const CSPROJ_PATTERN = /\.csproj$/i;

export const MAX_PARENT_DEPTH = 3;
