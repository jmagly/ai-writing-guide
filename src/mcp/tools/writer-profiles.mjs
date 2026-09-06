import { access } from 'node:fs/promises';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findProjectRoot } from '../helpers.mjs';

async function builtModule(name) {
  for (const location of [new URL(`../../writing/${name}.js`, import.meta.url), new URL(`../../../dist/src/writing/${name}.js`, import.meta.url)]) {
    try { await access(location); } catch { continue; }
    return import(location.href);
  }
  throw new Error('Writer profile resources require the built CLI package.');
}

/** Scope-bound metadata listing; explicit reads always use the shared export policy. */
export function registerWriterProfileResources(server, options = {}) {
  const projectRoot = () => options.projectRoot ? Promise.resolve(options.projectRoot) : findProjectRoot();
  const api = options.loadApi ?? (async () => ({ ...await builtModule('writer-profile'), ...await builtModule('writer-profile-store') }));
  server.registerResource('writer-profiles', 'aiwg://writer-profiles/catalog', {
    title: 'Writer Profile Catalog', description: 'Scoped writer profile identifiers and revisions; excludes raw samples.', mimeType: 'application/json',
  }, async () => {
    const cwd = await projectRoot(); const { WriterProfileStore, inspectWriterProfile } = await api();
    const profiles = [];
    for (const scope of ['project', 'user']) {
      const store = new WriterProfileStore({ cwd, scope });
      for (const id of await store.list()) {
        const metadata = inspectWriterProfile(await store.read(id));
        profiles.push({ scope, ...metadata, uri: `aiwg://writer-profiles/${scope}/${encodeURIComponent(id)}` });
      }
    }
    return { contents: [{ uri: 'aiwg://writer-profiles/catalog', mimeType: 'application/json', text: JSON.stringify({ profiles, providerInterception: false }) }] };
  });
  server.registerResource('writer-profile', new ResourceTemplate('aiwg://writer-profiles/{scope}/{id}', { list: undefined }), {
    title: 'Shared Writer Profile', description: 'Explicit scoped read using profile sharing approvals; private exports are unavailable through this resource.', mimeType: 'application/json',
  }, async (uri, variables) => {
    const selection = z.object({ scope: z.enum(['project', 'user']), id: z.string().regex(/^[a-z0-9][a-z0-9.-]{0,79}$/) }).strict().parse(variables);
    const cwd = await projectRoot(); const { WriterProfileStore, exportWriterProfile } = await api();
    const profile = await new WriterProfileStore({ cwd, scope: selection.scope }).read(selection.id);
    return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(exportWriterProfile(profile, 'shared')) }] };
  });
}
