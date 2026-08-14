/**
 * Memory Panel — fortemi-react integration.
 *
 * Embeds the fortemi-react knowledge layer for browser-native memory:
 * - Note list + search (semantic + keyword)
 * - Auto-creates notes from completed missions (via telemetry events)
 * - SKOS concept tagging for session trend analysis
 * - MCP tool bridge: exposes fortemi tools to running agents via aiwg serve
 *
 * Package approach: dynamic import of @fortemi/react and @fortemi/core.
 * When the packages are not installed, renders a friendly install prompt.
 *
 * @issue #717
 * @see #716 — telemetry events (source for auto-notes)
 * @see #712 — MCP bridge for agent memory access
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './MemoryPanel.module.css';

// ─────────────────────────────────────────────
// Minimal Note type (fortemi-compatible schema)
// ─────────────────────────────────────────────

export interface Note {
  id: string;
  title: string;
  body: string;
  tags: string[];
  createdAt: string;
  sessionId?: string;
  missionId?: string;
}

// ─────────────────────────────────────────────
// NoteStore interface — abstraction over local
// and fortemi-react backends
// ─────────────────────────────────────────────

interface NoteStore {
  add(note: Note): Promise<void> | void;
  search(query: string): Promise<Note[]> | Note[];
  delete(id: string): Promise<void> | void;
  getAll(): Promise<Note[]> | Note[];
}

// ─────────────────────────────────────────────
// In-memory note store (fallback when fortemi
// packages are not installed)
// ─────────────────────────────────────────────

class LocalNoteStore implements NoteStore {
  private notes: Note[] = [];

  add(note: Note): void {
    this.notes.unshift(note);
  }

  search(query: string): Note[] {
    const q = query.toLowerCase();
    if (!q) return [...this.notes];
    return this.notes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.body.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  delete(id: string): void {
    this.notes = this.notes.filter((n) => n.id !== id);
  }

  getAll(): Note[] {
    return [...this.notes];
  }
}

// ─────────────────────────────────────────────
// Fortemi-backed note store (when @fortemi/react
// is installed — uses IndexedDB + semantic search)
// ─────────────────────────────────────────────

class FortemiNoteStore implements NoteStore {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private fortemi: any;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(fortemiModule: any) {
    this.fortemi = fortemiModule;
  }

  async add(note: Note): Promise<void> {
    await this.fortemi.createNote({
      title: note.title,
      content: note.body,
      tags: note.tags,
      metadata: {
        sessionId: note.sessionId,
        missionId: note.missionId,
        createdAt: note.createdAt,
      },
    });
  }

  async search(query: string): Promise<Note[]> {
    const results = await this.fortemi.searchNotes(query || '*', { limit: 100 });
    return results.map(this.toNote);
  }

  async delete(id: string): Promise<void> {
    await this.fortemi.deleteNote(id);
  }

  async getAll(): Promise<Note[]> {
    const results = await this.fortemi.listNotes({ limit: 100 });
    return results.map(this.toNote);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toNote(r: any): Note {
    return {
      id: r.id,
      title: r.title ?? '',
      body: r.content ?? r.body ?? '',
      tags: r.tags ?? [],
      createdAt: r.metadata?.createdAt ?? r.createdAt ?? new Date().toISOString(),
      sessionId: r.metadata?.sessionId,
      missionId: r.metadata?.missionId,
    };
  }
}

// ─────────────────────────────────────────────
// Store initialization — prefer fortemi, fall
// back to local
// ─────────────────────────────────────────────

async function initStore(): Promise<{ store: NoteStore; isFortemi: boolean }> {
  try {
    // Keep Fortemi optional while using the platform-native module loader.
    // Vite must leave this runtime specifier unresolved for deployments that
    // provide the integration through an import map or equivalent host setup.
    const fortemiReactSpecifier = '@fortemi/react';
    const mod = await import(/* @vite-ignore */ fortemiReactSpecifier);
    return { store: new FortemiNoteStore(mod), isFortemi: true };
  } catch {
    return { store: new LocalNoteStore(), isFortemi: false };
  }
}

// ─────────────────────────────────────────────
// Auto-note creation from telemetry events
// ─────────────────────────────────────────────

export function createMissionNote(opts: {
  missionId: string;
  sessionId: string;
  task: string;
  gateResult: 'pass' | 'fail' | 'pending';
  iterations: number;
  scopeDone: number;
  scopeTotal: number;
}): Note {
  const outcome = opts.gateResult === 'pass' ? '✓ Gate passed' : opts.gateResult === 'fail' ? '✗ Gate failed' : 'In progress';
  return {
    id: `note-${Date.now()}-${opts.missionId}`,
    title: opts.task.slice(0, 80),
    body: [
      `**Session**: ${opts.sessionId}`,
      `**Mission**: ${opts.missionId}`,
      `**Gate**: ${outcome}`,
      `**Passes**: ${opts.iterations}`,
      opts.scopeTotal > 0 ? `**Scope**: ${opts.scopeDone}/${opts.scopeTotal} units` : '',
    ].filter(Boolean).join('\n'),
    tags: ['mission', opts.gateResult, opts.sessionId],
    createdAt: new Date().toISOString(),
    sessionId: opts.sessionId,
    missionId: opts.missionId,
  };
}

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────

export function MemoryPanel() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [query, setQuery] = useState('');
  const [fortemiAvailable, setFortemiAvailable] = useState<boolean | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTags, setNewTags] = useState('');
  const storeRef = useRef<NoteStore | null>(null);
  const seenMissionsRef = useRef(new Set<string>());

  // Initialize store — prefer fortemi, fall back to local
  useEffect(() => {
    let active = true;
    initStore().then(({ store, isFortemi }) => {
      if (!active) return;
      storeRef.current = store;
      setFortemiAvailable(isFortemi);
    });
    return () => { active = false; };
  }, []);

  const refresh = useCallback(async () => {
    const store = storeRef.current;
    if (!store) return;
    const results = await store.search(query);
    setNotes(results);
  }, [query]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll telemetry for mission.complete events → auto-create notes
  useEffect(() => {
    let active = true;

    async function pollMissions() {
      const store = storeRef.current;
      if (!store) return;
      try {
        const res = await fetch('/api/telemetry');
        if (!res.ok || !active) return;
        const data = await res.json() as { events?: Array<{ type: string; payload: Record<string, unknown>; sessionId: string; missionId?: string }> };
        const events = data.events ?? [];

        for (const e of events) {
          if (e.type !== 'mission.complete' || !e.missionId) continue;
          if (seenMissionsRef.current.has(e.missionId)) continue;
          seenMissionsRef.current.add(e.missionId);

          const p = e.payload as {
            task?: string;
            gateResult?: 'pass' | 'fail' | 'pending';
            iterations?: number;
            scopeDone?: number;
            scopeTotal?: number;
          };

          const note = createMissionNote({
            missionId: e.missionId,
            sessionId: e.sessionId,
            task: p.task ?? e.missionId,
            gateResult: p.gateResult ?? 'pending',
            iterations: p.iterations ?? 0,
            scopeDone: p.scopeDone ?? 0,
            scopeTotal: p.scopeTotal ?? 0,
          });
          await store.add(note);
        }
        if (active) refresh();
      } catch {
        // server not ready or no telemetry endpoint
      }
    }

    pollMissions();
    const id = setInterval(pollMissions, 5000);
    return () => { active = false; clearInterval(id); };
  }, [refresh]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleAdd = useCallback(async () => {
    const store = storeRef.current;
    if (!store || !newTitle.trim()) return;
    const note: Note = {
      id: `note-${Date.now()}`,
      title: newTitle.trim(),
      body: newBody.trim(),
      tags: newTags.split(',').map((t) => t.trim()).filter(Boolean),
      createdAt: new Date().toISOString(),
    };
    await store.add(note);
    setNewTitle('');
    setNewBody('');
    setNewTags('');
    refresh();
  }, [newTitle, newBody, newTags, refresh]);

  const handleDelete = useCallback(async (id: string) => {
    const store = storeRef.current;
    if (!store) return;
    await store.delete(id);
    refresh();
  }, [refresh]);

  return (
    <div className={styles.panel}>
      <header className={styles.header}>
        <h2>Memory</h2>
        {fortemiAvailable === false && (
          <div className={styles.installPrompt} role="note">
            <strong>fortemi-react</strong> not installed — using in-memory store.
            Install for semantic search + IndexedDB persistence:
            <code> pnpm add @fortemi/core @fortemi/react</code>
          </div>
        )}
        {fortemiAvailable === true && (
          <span className={styles.badge} style={{ color: '#00ff88' }}>
            fortemi-react active
          </span>
        )}
      </header>

      {/* Search */}
      <div className={styles.searchRow}>
        <label htmlFor="memory-search" className={styles.srOnly}>Search notes</label>
        <input
          id="memory-search"
          type="search"
          value={query}
          onChange={handleSearch}
          placeholder="Search by keyword or topic…"
          aria-label="Search memory notes"
          className={styles.searchInput}
        />
      </div>

      {/* New note form */}
      <section className={styles.newNote} aria-label="Add note">
        <h3>Add Note</h3>
        <label htmlFor="note-title">Title</label>
        <input
          id="note-title"
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Note title"
          aria-required="true"
        />
        <label htmlFor="note-body">Body</label>
        <textarea
          id="note-body"
          value={newBody}
          onChange={(e) => setNewBody(e.target.value)}
          placeholder="Note content (Markdown)"
          rows={3}
        />
        <label htmlFor="note-tags">Tags (comma-separated)</label>
        <input
          id="note-tags"
          type="text"
          value={newTags}
          onChange={(e) => setNewTags(e.target.value)}
          placeholder="auth, migration, bug"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          aria-label="Save note"
        >
          Save Note
        </button>
      </section>

      {/* Note list */}
      <section className={styles.noteList} aria-label="Memory notes">
        <h3>Notes ({notes.length})</h3>
        {notes.length === 0 ? (
          <p className={styles.empty}>
            {query ? `No notes matching "${query}"` : 'No notes yet. Completed missions auto-create notes.'}
          </p>
        ) : (
          <ul>
            {notes.map((note) => (
              <li key={note.id} className={styles.noteCard}>
                <header className={styles.noteHeader}>
                  <h4 className={styles.noteTitle}>{note.title}</h4>
                  <button
                    type="button"
                    onClick={() => handleDelete(note.id)}
                    aria-label={`Delete note: ${note.title}`}
                    className={styles.deleteBtn}
                  >
                    ✕
                  </button>
                </header>
                {note.body && <p className={styles.noteBody}>{note.body}</p>}
                <footer className={styles.noteMeta}>
                  <time dateTime={note.createdAt}>
                    {new Date(note.createdAt).toLocaleDateString()}
                  </time>
                  {note.tags.length > 0 && (
                    <ul className={styles.tagList} aria-label="Tags">
                      {note.tags.map((tag) => (
                        <li key={tag} className={styles.tag}>{tag}</li>
                      ))}
                    </ul>
                  )}
                </footer>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
