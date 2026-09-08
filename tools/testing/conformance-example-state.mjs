import fs from 'node:fs/promises';

/** Observe recovery without overwriting drift or hiding a failed transaction. */
export async function inspectRestoration(file, before, controlRestored = true) {
  if (!before) return { sourceRestored: true, diagnostics: [] };
  const diagnostics = [];
  if (!controlRestored) diagnostics.push('Control receipt does not confirm complete restoration.');
  try {
    const stat = await fs.lstat(file);
    if (!stat.isFile() || stat.isSymbolicLink()) diagnostics.push('Source is no longer a regular file.');
    else {
      if ((stat.mode & 0o777) !== before.mode) diagnostics.push('Source permissions differ from the baseline.');
      if (await fs.readFile(file, 'utf8') !== before.content) diagnostics.push('Source bytes differ from the baseline.');
    }
  } catch (error) { diagnostics.push(`Source restoration cannot be observed: ${error.code ?? error.message}`); }
  return { sourceRestored: diagnostics.length === 0, diagnostics };
}
