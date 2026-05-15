import { existsSync, readFileSync } from 'node:fs';

export const CANONICAL_AFFECTED_PACKAGES_CSV = '/mnt/ops/users/roctinam/Downloads/22-packages.csv';
const REQUIRED_HEADERS = ['Ecosystem', 'Namespace', 'Name', 'Version', 'Published', 'Detected'];

export function resolveAffectedPackagesSource(cliValue, envValue) {
  if (cliValue) return cliValue;
  if (envValue) return envValue;
  return existsSync(CANONICAL_AFFECTED_PACKAGES_CSV) ? CANONICAL_AFFECTED_PACKAGES_CSV : null;
}

export function isUrlSource(source) {
  return /^https?:\/\//.test(source);
}

export async function loadAffectedPackagesCsv(source, fetchImpl = globalThis.fetch) {
  if (!source) {
    throw new Error('No affected-package CSV source configured');
  }

  if (isUrlSource(source)) {
    if (typeof fetchImpl !== 'function') {
      throw new Error(`CSV source ${source} is a URL, but fetch() is unavailable`);
    }
    const response = await fetchImpl(source);
    if (!response.ok) {
      throw new Error(`Failed to fetch affected-package CSV ${source}: HTTP ${response.status}`);
    }
    return { sourceLabel: source, text: await response.text() };
  }

  if (!existsSync(source)) {
    throw new Error(`Affected-package CSV not found: ${source}`);
  }

  return { sourceLabel: source, text: readFileSync(source, 'utf8') };
}

export function parseCsvLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      fields.push(current);
      current = '';
      continue;
    }
    current += char;
  }

  if (inQuotes) {
    throw new Error('unterminated quoted field');
  }

  fields.push(current);
  return fields;
}

export function normalizeNpmPackageName(namespace, name) {
  const trimmedName = String(name || '').trim();
  const trimmedNamespace = String(namespace || '').trim();

  if (!trimmedName) {
    throw new Error('missing Name');
  }
  if (!trimmedNamespace) return trimmedName;

  const scope = trimmedNamespace.startsWith('@') ? trimmedNamespace : `@${trimmedNamespace}`;
  return `${scope}/${trimmedName}`;
}

function isoMin(a, b) {
  return a < b ? a : b;
}

function isoMax(a, b) {
  return a > b ? a : b;
}

export function parseAffectedPackagesCsv(text, sourceLabel = 'inline') {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) {
    throw new Error(`Affected-package CSV ${sourceLabel} is empty`);
  }

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missingHeaders = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    throw new Error(`Affected-package CSV ${sourceLabel} is missing header(s): ${missingHeaders.join(', ')}`);
  }

  const headerIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
  const records = new Map();
  const skippedEcosystems = new Map();
  let duplicateRows = 0;

  for (let i = 1; i < lines.length; i++) {
    const lineNumber = i + 1;
    const row = parseCsvLine(lines[i]);
    if (row.length !== headers.length) {
      throw new Error(
        `Affected-package CSV ${sourceLabel} row ${lineNumber} has ${row.length} column(s); expected ${headers.length}`,
      );
    }

    const ecosystem = row[headerIndex.Ecosystem].trim().toLowerCase();
    const namespace = row[headerIndex.Namespace].trim();
    const name = row[headerIndex.Name].trim();
    const version = row[headerIndex.Version].trim();
    const published = row[headerIndex.Published].trim();
    const detected = row[headerIndex.Detected].trim();

    if (ecosystem !== 'npm') {
      if (!ecosystem) {
        throw new Error(`Affected-package CSV ${sourceLabel} row ${lineNumber} is missing Ecosystem`);
      }
      skippedEcosystems.set(ecosystem, (skippedEcosystems.get(ecosystem) || 0) + 1);
      continue;
    }

    if (!name || !version || !published || !detected) {
      throw new Error(`Affected-package CSV ${sourceLabel} row ${lineNumber} is missing a required npm value`);
    }

    const normalizedName = normalizeNpmPackageName(namespace, name);
    const key = `${ecosystem}|${normalizedName}|${version}`;
    const existing = records.get(key);
    if (existing) {
      duplicateRows++;
      existing.occurrences += 1;
      existing.firstPublished = isoMin(existing.firstPublished, published);
      existing.lastPublished = isoMax(existing.lastPublished, published);
      existing.firstDetected = isoMin(existing.firstDetected, detected);
      existing.lastDetected = isoMax(existing.lastDetected, detected);
      existing.rowNumbers.push(lineNumber);
      continue;
    }

    records.set(key, {
      ecosystem,
      normalizedName,
      version,
      firstPublished: published,
      lastPublished: published,
      firstDetected: detected,
      lastDetected: detected,
      occurrences: 1,
      rowNumbers: [lineNumber],
    });
  }

  return {
    headers,
    records,
    duplicateRows,
    skippedEcosystems,
    totalDataRows: lines.length - 1,
    npmRows: Array.from(records.values()).reduce((sum, row) => sum + row.occurrences, 0),
    sourceLabel,
  };
}

export function scanAffectedManifest(manifestPath, feed) {
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const pkg = JSON.parse(readFileSync(manifestPath, 'utf8'));
  const buckets = [
    ['dependencies', pkg.dependencies],
    ['devDependencies', pkg.devDependencies],
    ['optionalDependencies', pkg.optionalDependencies],
    ['peerDependencies', pkg.peerDependencies],
  ];

  const matches = [];
  let scanned = 0;
  for (const [bucketName, deps] of buckets) {
    if (!deps || typeof deps !== 'object') continue;
    for (const [name, spec] of Object.entries(deps)) {
      scanned++;
      if (typeof spec !== 'string') continue;
      const record = feed.records.get(`npm|${name}|${spec}`);
      if (!record) continue;
      matches.push({
        name,
        version: spec,
        location: `${manifestPath} > ${bucketName} > "${name}"`,
        sourceType: 'manifest',
        record,
      });
    }
  }

  return { matches, scanned };
}

export function scanAffectedLockfile(lockfilePath, feed) {
  if (!existsSync(lockfilePath)) {
    return { matches: [], scanned: 0, present: false };
  }

  const lockfile = JSON.parse(readFileSync(lockfilePath, 'utf8'));
  if (lockfile.packages && typeof lockfile.packages === 'object') {
    return scanPackagesObject(lockfilePath, lockfile.packages, feed);
  }
  if (lockfile.dependencies && typeof lockfile.dependencies === 'object') {
    return scanLegacyDependencies(lockfilePath, lockfile.dependencies, feed);
  }

  return { matches: [], scanned: 0, present: true };
}

function scanPackagesObject(lockfilePath, packages, feed) {
  const matches = [];
  let scanned = 0;

  for (const [path, entry] of Object.entries(packages)) {
    if (path === '' || !entry || typeof entry !== 'object' || !entry.version) continue;
    scanned++;
    const name = entry.name || extractPackageName(path);
    const record = feed.records.get(`npm|${name}|${entry.version}`);
    if (!record) continue;
    matches.push({
      name,
      version: entry.version,
      location: `${lockfilePath} > ${path}`,
      sourceType: 'lockfile',
      record,
    });
  }

  return { matches, scanned, present: true };
}

function scanLegacyDependencies(lockfilePath, dependencies, feed) {
  const matches = [];
  let scanned = 0;

  function visit(tree, pathParts) {
    for (const [name, entry] of Object.entries(tree)) {
      if (!entry || typeof entry !== 'object' || !entry.version) continue;
      scanned++;
      const record = feed.records.get(`npm|${name}|${entry.version}`);
      const locationPath = [...pathParts, name].join(' > ');
      if (record) {
        matches.push({
          name,
          version: entry.version,
          location: `${lockfilePath} > ${locationPath}`,
          sourceType: 'lockfile',
          record,
        });
      }
      if (entry.dependencies && typeof entry.dependencies === 'object') {
        visit(entry.dependencies, [...pathParts, name]);
      }
    }
  }

  visit(dependencies, ['dependencies']);
  return { matches, scanned, present: true };
}

function extractPackageName(path) {
  const marker = 'node_modules/';
  const idx = path.lastIndexOf(marker);
  return idx === -1 ? path : path.slice(idx + marker.length);
}
