'use client';
import { useEffect, useState, useCallback } from 'react';
import type { NotationEntry, Chapter } from '@/lib/types';
import KaTeXRenderer from '@/components/KaTeXRenderer';

interface NotationFormData {
  symbol: string;
  latex: string;
  definition: string;
  first_used_chapter_id: number | null;
}

function NotationModal({
  entry,
  chapters,
  onClose,
  onSave,
}: {
  entry: Partial<NotationEntry> | null;
  chapters: Pick<Chapter, 'id' | 'title'>[];
  onClose: () => void;
  onSave: (data: NotationFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<NotationFormData>({
    symbol: entry?.symbol ?? '',
    latex: entry?.latex ?? '',
    definition: entry?.definition ?? '',
    first_used_chapter_id: entry?.first_used_chapter_id ?? null,
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-xl sm:shadow-2xl sm:max-w-lg sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{entry?.id ? 'Edit Notation' : 'New Notation Entry'}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label">Display Symbol (with $ delimiters)</label>
            <input className="input mt-1 font-mono text-sm" value={form.symbol} onChange={e => setForm(f => ({ ...f, symbol: e.target.value }))} placeholder="e.g. $H^n(X; G)$" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label">LaTeX (raw, no $ delimiters)</label>
              <button onClick={() => setPreview(p => !p)} className="text-xs text-neutral-400 hover:text-neutral-600">{preview ? 'Edit' : 'Preview'}</button>
            </div>
            {preview ? (
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-center min-h-[48px] flex items-center justify-center">
                <KaTeXRenderer latex={form.latex} displayMode />
              </div>
            ) : (
              <input className="input font-mono text-sm mt-1" value={form.latex} onChange={e => setForm(f => ({ ...f, latex: e.target.value }))} placeholder="e.g. H^n(X; G)" />
            )}
          </div>
          <div>
            <label className="label">Definition</label>
            <textarea className="input mt-1 text-sm resize-none" rows={3} value={form.definition} onChange={e => setForm(f => ({ ...f, definition: e.target.value }))} placeholder="Mathematical definition…" />
          </div>
          <div>
            <label className="label">First Used In</label>
            <select className="input mt-1 text-sm" value={form.first_used_chapter_id ?? ''} onChange={e => setForm(f => ({ ...f, first_used_chapter_id: e.target.value ? parseInt(e.target.value, 10) : null }))}>
              <option value="">None</option>
              {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function NotationPage() {
  const [entries, setEntries] = useState<NotationEntry[]>([]);
  const [chapters, setChapters] = useState<Pick<Chapter, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<NotationEntry | null | 'new'>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    setLoading(true);
    fetch(`/api/notation?${params}`)
      .then(r => r.json())
      .then(j => { if (!j.error) setEntries(j.data as NotationEntry[]); })
      .finally(() => setLoading(false));
  }, [search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/chapters').then(r => r.json()).then(j => setChapters(j.data ?? []));
  }, []);

  const saveEntry = async (data: NotationFormData) => {
    if (modal === 'new') {
      const r = await fetch('/api/notation', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setEntries(prev => [...prev, j.data as NotationEntry].sort((a, b) => a.symbol.localeCompare(b.symbol))); setModal(null); }
    } else if (modal && typeof modal !== 'string') {
      const r = await fetch(`/api/notation/${modal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setEntries(prev => prev.map(e => e.id === (modal as NotationEntry).id ? j.data as NotationEntry : e)); setModal(null); }
    }
  };

  const deleteEntry = async (id: number) => {
    if (!confirm('Delete this notation entry?')) return;
    await fetch(`/api/notation/${id}`, { method: 'DELETE' });
    setEntries(prev => prev.filter(e => e.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Notation Glossary</h2>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Add</button>
      </div>

      <div className="mb-4">
        <input
          className="input text-sm w-full sm:w-64"
          placeholder="Search symbols, definitions…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-12">No notation entries found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs w-44">Symbol</th>
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs">Definition</th>
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs w-36">First Used</th>
                  <th className="p-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {entries.map(entry => (
                  <tr key={entry.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group">
                    <td className="p-3">
                      <div className="text-base">
                        {entry.latex ? <KaTeXRenderer latex={entry.latex} /> : <span className="font-mono text-neutral-700 dark:text-neutral-300">{entry.symbol}</span>}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 dark:text-neutral-500 mt-0.5">{entry.latex}</div>
                    </td>
                    <td className="p-3 text-sm text-neutral-700 dark:text-neutral-300">{entry.definition}</td>
                    <td className="p-3 text-xs text-neutral-400 dark:text-neutral-500">{entry.chapter_title ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => setModal(entry)}>Edit</button>
                        <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteEntry(entry.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {entries.map(entry => (
              <div key={entry.id} className="card">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-lg mb-1">
                      {entry.latex ? <KaTeXRenderer latex={entry.latex} /> : <span className="font-mono text-neutral-700 dark:text-neutral-300">{entry.symbol}</span>}
                    </div>
                    {entry.latex && <div className="text-[10px] font-mono text-neutral-400 mb-1">{entry.latex}</div>}
                    <p className="text-sm text-neutral-700 dark:text-neutral-300">{entry.definition}</p>
                    {entry.chapter_title && (
                      <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1">First used: {entry.chapter_title}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => setModal(entry)}>Edit</button>
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteEntry(entry.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal !== null && (
        <NotationModal
          entry={modal === 'new' ? null : modal}
          chapters={chapters}
          onClose={() => setModal(null)}
          onSave={saveEntry}
        />
      )}
    </div>
  );
}
