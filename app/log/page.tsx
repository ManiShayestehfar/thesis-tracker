'use client';
import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import type { LogEntry, Tag, Chapter, Proof } from '@/lib/types';
import MarkdownRenderer from '@/components/MarkdownRenderer';

function formatDate(d: string) {
  try { return format(parseISO(d), 'EEEE, dd MMMM yyyy'); } catch { return d; }
}

interface EntryFormData {
  date: string;
  body: string;
  tags: string[];
  proof_ids: number[];
  chapter_ids: number[];
}

function EntryForm({
  initial,
  proofs,
  chapters,
  allTags,
  onSave,
  onCancel,
}: {
  initial?: Partial<LogEntry>;
  proofs: Pick<Proof, 'id' | 'label'>[];
  chapters: Pick<Chapter, 'id' | 'title'>[];
  allTags: Tag[];
  onSave: (data: EntryFormData) => Promise<void>;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<EntryFormData>({
    date: initial?.date ?? new Date().toISOString().split('T')[0],
    body: initial?.body ?? '',
    tags: initial?.tags?.map(t => t.name) ?? [],
    proof_ids: initial?.linked_proofs?.map(p => p.id) ?? [],
    chapter_ids: initial?.linked_chapters?.map(c => c.id) ?? [],
  });
  const [tagInput, setTagInput] = useState('');
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) setForm(f => ({ ...f, tags: [...f.tags, t] }));
    setTagInput('');
  };

  const toggleProof = (id: number) =>
    setForm(f => ({ ...f, proof_ids: f.proof_ids.includes(id) ? f.proof_ids.filter(x => x !== id) : [...f.proof_ids, id] }));

  const toggleChapter = (id: number) =>
    setForm(f => ({ ...f, chapter_ids: f.chapter_ids.includes(id) ? f.chapter_ids.filter(x => x !== id) : [...f.chapter_ids, id] }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="card space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <label className="label">Date</label>
          <input type="date" className="input mt-1 text-sm" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
        </div>
        <button onClick={() => setPreview(p => !p)} className="btn-secondary text-xs mt-5">{preview ? 'Edit' : 'Preview'}</button>
      </div>

      {preview ? (
        <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 min-h-[200px]">
          <MarkdownRenderer content={form.body} />
        </div>
      ) : (
        <textarea
          className="input font-mono text-sm resize-none"
          rows={10}
          value={form.body}
          onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
          placeholder="Write your log entry here. Supports Markdown and $\LaTeX$ math."
        />
      )}

      <div>
        <label className="label">Tags</label>
        <div className="flex flex-wrap gap-1 mt-1">
          {form.tags.map(t => (
            <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
              {t}
              <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="text-neutral-400 hover:text-red-500">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 mt-1">
          <input className="input text-sm flex-1" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} placeholder="Add tag…" />
          <button className="btn-secondary text-xs" onClick={addTag}>Add</button>
        </div>
        {allTags.filter(t => !form.tags.includes(t.name)).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {allTags.filter(t => !form.tags.includes(t.name)).map(t => (
              <button key={t.id} onClick={() => setForm(f => ({ ...f, tags: [...f.tags, t.name] }))} className="text-[10px] px-2 py-0.5 rounded-full border border-neutral-200 dark:border-neutral-700 text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-colors">{t.name}</button>
            ))}
          </div>
        )}
      </div>

      {(chapters.length > 0 || proofs.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {chapters.length > 0 && (
            <div>
              <label className="label">Linked Chapters</label>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {chapters.map(c => (
                  <label key={c.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={form.chapter_ids.includes(c.id)} onChange={() => toggleChapter(c.id)} className="rounded" />
                    <span className="text-neutral-700 dark:text-neutral-300">{c.title}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {proofs.length > 0 && (
            <div>
              <label className="label">Linked Proofs</label>
              <div className="mt-1 space-y-1 max-h-32 overflow-y-auto">
                {proofs.map(p => (
                  <label key={p.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="checkbox" checked={form.proof_ids.includes(p.id)} onChange={() => toggleProof(p.id)} className="rounded" />
                    <span className="font-mono text-neutral-700 dark:text-neutral-300">{p.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Entry'}</button>
        {onCancel && <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={onCancel}>Cancel</button>}
      </div>
    </div>
  );
}

export default function LogPage() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [proofs, setProofs] = useState<Pick<Proof, 'id' | 'label'>[]>([]);
  const [chapters, setChapters] = useState<Pick<Chapter, 'id' | 'title'>[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<LogEntry | null>(null);
  const [filterTag, setFilterTag] = useState('');
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterTag) params.set('tag', filterTag);
    if (filterFrom) params.set('from', filterFrom);
    if (filterTo) params.set('to', filterTo);
    setLoading(true);
    fetch(`/api/log?${params}`)
      .then(r => r.json())
      .then(j => { if (!j.error) setEntries(j.data as LogEntry[]); })
      .finally(() => setLoading(false));
  }, [filterTag, filterFrom, filterTo]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/tags').then(r => r.json()).then(j => setAllTags(j.data ?? []));
    fetch('/api/proofs').then(r => r.json()).then(j => setProofs((j.data ?? []) as Proof[]));
    fetch('/api/chapters').then(r => r.json()).then(j => setChapters((j.data ?? []) as Chapter[]));
  }, []);

  const saveEntry = async (data: EntryFormData) => {
    if (editing) {
      const r = await fetch(`/api/log/${editing.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setEntries(prev => prev.map(e => e.id === editing.id ? j.data as LogEntry : e)); setEditing(null); }
    } else {
      const r = await fetch('/api/log', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setEntries(prev => [j.data as LogEntry, ...prev]); setShowForm(false); }
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this log entry?')) return;
    await fetch(`/api/log/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Research Log</h2>
        <button className="btn-primary" onClick={() => { setShowForm(s => !s); setEditing(null); }}>
          {showForm ? 'Hide form' : '+ New Entry'}
        </button>
      </div>

      {showForm && !editing && (
        <div className="mb-6">
          <EntryForm
            proofs={proofs}
            chapters={chapters}
            allTags={allTags}
            onSave={saveEntry}
            onCancel={() => setShowForm(false)}
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-5">
        <select className="input text-sm w-full sm:w-36" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">All tags</option>
          {allTags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <div className="flex items-center gap-2 flex-1 sm:flex-none">
          <input type="date" className="input text-sm flex-1 sm:w-36" value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
          <span className="text-neutral-400 text-xs shrink-0">to</span>
          <input type="date" className="input text-sm flex-1 sm:w-36" value={filterTo} onChange={e => setFilterTo(e.target.value)} />
        </div>
        {(filterTag || filterFrom || filterTo) && (
          <button className="btn-secondary text-xs self-start" onClick={() => { setFilterTag(''); setFilterFrom(''); setFilterTo(''); }}>Clear</button>
        )}
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-12">No entries found.</div>
      ) : (
        <div className="space-y-4">
          {entries.map(entry => (
            <div key={entry.id}>
              {editing?.id === entry.id ? (
                <EntryForm
                  initial={editing}
                  proofs={proofs}
                  chapters={chapters}
                  allTags={allTags}
                  onSave={saveEntry}
                  onCancel={() => setEditing(null)}
                />
              ) : (
                <div className="card group">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{formatDate(entry.date)}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {entry.tags?.map(t => (
                          <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">{t.name}</span>
                        ))}
                        {entry.linked_chapters?.map(c => (
                          <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">§ {c.title}</span>
                        ))}
                        {entry.linked_proofs?.map(p => (
                          <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-mono">{p.label}</span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => { setEditing(entry); setShowForm(false); }}>Edit</button>
                      <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteEntry(entry.id)}>Delete</button>
                    </div>
                  </div>
                  <MarkdownRenderer content={entry.body} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
