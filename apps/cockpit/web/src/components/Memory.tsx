import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { fmtId } from '../util';
import type { MissionProjection, MissionsResponse } from '../types';

interface MemoryNote {
  id: string;
  title: string;
  body: string;
  tags: string[];
  created_at: string;
  mission_id?: string;
  source: 'operator' | 'mission';
}

const STORAGE_KEY = 'aiwg.cockpit.memory.notes.v1';

export function Memory({ refreshTick = 0 }: { refreshTick?: number }) {
  const [notes, setNotes] = useState<MemoryNote[]>(() => readNotes());
  const [missions, setMissions] = useState<MissionProjection[]>([]);
  const [query, setQuery] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [err, setErr] = useState('');

  const persist = useCallback((next: MemoryNote[]) => {
    setNotes(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  useEffect(() => {
    api<MissionsResponse>('/api/missions').then((data) => {
      setMissions(data.missions);
      setErr('');
      const next = mergeMissionNotes(notes, data.missions);
      if (next !== notes) persist(next);
    }).catch((e) => setErr((e as Error).message));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTick]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return notes;
    return notes.filter((note) => [
      note.title,
      note.body,
      note.source,
      note.mission_id ?? '',
      ...note.tags,
    ].some((v) => v.toLowerCase().includes(q)));
  }, [notes, query]);

  const add = () => {
    if (!title.trim()) return;
    persist([{
      id: `note-${Date.now()}`,
      title: title.trim(),
      body: body.trim(),
      tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      created_at: new Date().toISOString(),
      source: 'operator',
    }, ...notes]);
    setTitle('');
    setBody('');
    setTags('');
  };

  const remove = (id: string) => persist(notes.filter((note) => note.id !== id));

  return (
    <>
      <p className="hint">
        Operator memory for Cockpit: local notes plus automatic Mission completion notes from durable
        Mission Control state. Notes stay in this browser profile; AIWG source files are not modified.
      </p>
      {err && <p className="err">Mission memory sync failed: {err}</p>}
      <section className="memory-layout">
        <form className="memory-form" onSubmit={(e) => { e.preventDefault(); add(); }} aria-label="Add memory note">
          <h2>Add Note</h2>
          <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Note title" /></label>
          <label>Body<textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="What should future you remember?" rows={4} /></label>
          <label>Tags<input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="cockpit, release, risk" /></label>
          <button type="submit" disabled={!title.trim()}>Save Note</button>
        </form>
        <section className="memory-list" aria-label="Memory notes">
          <div className="section-toolbar">
            <div>
              <h2>Notes</h2>
              <p className="hint">{notes.length} saved · {missions.filter((m) => m.terminal).length} terminal mission(s) observed</p>
            </div>
            <input aria-label="Search memory notes" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes" />
          </div>
          {!filtered.length ? <p className="empty">{query ? 'No notes match your search.' : 'No notes yet.'}</p> : (
            <div className="note-grid">
              {filtered.map((note) => (
                <article className="note-card" key={note.id}>
                  <header>
                    <h3>{note.title}</h3>
                    <button aria-label={`Delete note ${note.title}`} onClick={() => remove(note.id)}>Remove</button>
                  </header>
                  {note.body && <p>{note.body}</p>}
                  <footer>
                    <time dateTime={note.created_at}>{new Date(note.created_at).toLocaleString()}</time>
                    {note.mission_id && <code>{fmtId(note.mission_id)}</code>}
                    {note.tags.map((tag) => <span className="tag" key={tag}>{tag}</span>)}
                  </footer>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </>
  );
}

function readNotes(): MemoryNote[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function mergeMissionNotes(notes: MemoryNote[], missions: MissionProjection[]) {
  const existing = new Set(notes.map((note) => note.mission_id).filter(Boolean));
  const additions = missions
    .filter((mission) => mission.terminal && !existing.has(mission.id))
    .map((mission): MemoryNote => ({
      id: `mission-note-${mission.id}`,
      title: mission.title.slice(0, 96),
      body: [
        `Status: ${mission.status}`,
        mission.completion ? `Completion: ${mission.completion}` : '',
        mission.error ? `Error: ${mission.error}` : '',
      ].filter(Boolean).join('\n'),
      tags: ['mission', mission.status, mission.source].filter(Boolean),
      created_at: mission.completed_at ?? new Date().toISOString(),
      mission_id: mission.id,
      source: 'mission',
    }));
  return additions.length ? [...additions, ...notes] : notes;
}
