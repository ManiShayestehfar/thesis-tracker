'use client';
import { useEffect, useState, useCallback } from 'react';
import type { Reference, ReadStatus, Chapter, Proof } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

const READ_STATUSES: ReadStatus[] = ['Unread', 'Skimmed', 'Read', 'Studied'];

interface RefFormData {
  citation_key: string;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string;
  url: string;
  notes: string;
  read_status: ReadStatus;
  chapter_ids: number[];
  proof_ids: number[];
}

function RefModal({
  ref: initialRef,
  chapters,
  proofs,
  onClose,
  onSave,
}: {
  ref: Partial<Reference> | null;
  chapters: Pick<Chapter, 'id' | 'title'>[];
  proofs: Pick<Proof, 'id' | 'label'>[];
  onClose: () => void;
  onSave: (data: RefFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<RefFormData>({
    citation_key: initialRef?.citation_key ?? '',
    title: initialRef?.title ?? '',
    authors: initialRef?.authors ?? '',
    year: initialRef?.year ?? null,
    journal: initialRef?.journal ?? '',
    doi: initialRef?.doi ?? '',
    url: initialRef?.url ?? '',
    notes: initialRef?.notes ?? '',
    read_status: initialRef?.read_status ?? 'Unread',
    chapter_ids: initialRef?.linked_chapters?.map(c => c.id) ?? [],
    proof_ids: initialRef?.linked_proofs?.map(p => p.id) ?? [],
  });
  const [saving, setSaving] = useState(false);

  const toggleChapter = (id: number) =>
    setForm(f => ({ ...f, chapter_ids: f.chapter_ids.includes(id) ? f.chapter_ids.filter(x => x !== id) : [...f.chapter_ids, id] }));
  const toggleProof = (id: number) =>
    setForm(f => ({ ...f, proof_ids: f.proof_ids.includes(id) ? f.proof_ids.filter(x => x !== id) : [...f.proof_ids, id] }));

  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-xl sm:shadow-2xl sm:max-w-2xl sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{initialRef?.id ? 'Edit Reference' : 'New Reference'}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Citation Key</label>
              <input className="input mt-1 text-sm font-mono" value={form.citation_key} onChange={e => setForm(f => ({ ...f, citation_key: e.target.value }))} placeholder="e.g. Hatcher2002" />
            </div>
            <div>
              <label className="label">Read Status</label>
              <select className="input mt-1 text-sm" value={form.read_status} onChange={e => setForm(f => ({ ...f, read_status: e.target.value as ReadStatus }))}>
                {READ_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Title</label>
            <input className="input mt-1 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Full title" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Authors</label>
              <input className="input mt-1 text-sm" value={form.authors} onChange={e => setForm(f => ({ ...f, authors: e.target.value }))} placeholder="Author names" />
            </div>
            <div>
              <label className="label">Year</label>
              <input type="number" className="input mt-1 text-sm" value={form.year ?? ''} onChange={e => setForm(f => ({ ...f, year: e.target.value ? +e.target.value : null }))} placeholder="e.g. 2002" />
            </div>
          </div>
          <div>
            <label className="label">Journal / Publisher</label>
            <input className="input mt-1 text-sm" value={form.journal} onChange={e => setForm(f => ({ ...f, journal: e.target.value }))} placeholder="Journal or publisher" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">DOI</label>
              <input className="input mt-1 text-sm font-mono" value={form.doi} onChange={e => setForm(f => ({ ...f, doi: e.target.value }))} placeholder="10.xxxx/…" />
            </div>
            <div>
              <label className="label">URL</label>
              <input className="input mt-1 text-sm" value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} placeholder="https://…" />
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <textarea className="input mt-1 text-sm resize-none" rows={3} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Personal notes…" />
          </div>
          {(chapters.length > 0 || proofs.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {chapters.length > 0 && (
                <div>
                  <label className="label">Linked Chapters</label>
                  <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
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
                  <div className="mt-1 space-y-1 max-h-28 overflow-y-auto">
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
        </div>
        <div className="flex gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ReferencesPage() {
  const [refs, setRefs] = useState<Reference[]>([]);
  const [chapters, setChapters] = useState<Pick<Chapter, 'id' | 'title'>[]>([]);
  const [proofs, setProofs] = useState<Pick<Proof, 'id' | 'label'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState<Reference | null | 'new'>(null);
  const [sortKey, setSortKey] = useState<'year' | 'authors' | 'read_status'>('year');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (search) params.set('q', search);
    setLoading(true);
    fetch(`/api/references?${params}`)
      .then(r => r.json())
      .then(j => { if (!j.error) setRefs(j.data as Reference[]); })
      .finally(() => setLoading(false));
  }, [filterStatus, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/chapters').then(r => r.json()).then(j => setChapters(j.data ?? []));
    fetch('/api/proofs').then(r => r.json()).then(j => setProofs(j.data ?? []));
  }, []);

  const saveRef = async (data: RefFormData) => {
    if (modal === 'new') {
      const r = await fetch('/api/references', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setRefs(prev => [j.data as Reference, ...prev]); setModal(null); }
    } else if (modal && typeof modal !== 'string') {
      const r = await fetch(`/api/references/${modal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setRefs(prev => prev.map(r => r.id === (modal as Reference).id ? j.data as Reference : r)); setModal(null); }
    }
  };

  const deleteRef = async (id: number) => {
    if (!confirm('Delete this reference?')) return;
    await fetch(`/api/references/${id}`, { method: 'DELETE' });
    setRefs(prev => prev.filter(r => r.id !== id));
  };

  const sorted = [...refs].sort((a, b) => {
    const av: string | number = sortKey === 'year' ? (a.year ?? 0) : sortKey === 'read_status' ? READ_STATUSES.indexOf(a.read_status) : a.authors;
    const bv: string | number = sortKey === 'year' ? (b.year ?? 0) : sortKey === 'read_status' ? READ_STATUSES.indexOf(b.read_status) : b.authors;
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (key: typeof sortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 md:mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">References</h2>
        <button className="btn-primary" onClick={() => setModal('new')}>+ Add</button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <input
          className="input text-sm flex-1 min-w-0"
          placeholder="Search title, authors, key…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select className="input text-sm w-36 shrink-0" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {READ_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>
      ) : sorted.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-12">No references found.</div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden md:block card overflow-hidden p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs">Key / Title</th>
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 select-none" onClick={() => toggleSort('authors')}>
                    Authors {sortKey === 'authors' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 select-none" onClick={() => toggleSort('year')}>
                    Year {sortKey === 'year' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="text-left p-3 font-medium text-neutral-500 dark:text-neutral-400 text-xs cursor-pointer hover:text-neutral-700 dark:hover:text-neutral-200 select-none" onClick={() => toggleSort('read_status')}>
                    Status {sortKey === 'read_status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                  </th>
                  <th className="p-3 w-16" />
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800">
                {sorted.map(ref => (
                  <tr key={ref.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group">
                    <td className="p-3">
                      <p className="font-mono text-xs text-neutral-500 dark:text-neutral-400">{ref.citation_key}</p>
                      <p className="font-medium text-neutral-800 dark:text-neutral-200">{ref.title}</p>
                      {ref.journal && <p className="text-xs text-neutral-400 dark:text-neutral-500">{ref.journal}</p>}
                      {(ref.doi || ref.url) && (
                        <div className="flex gap-2 mt-0.5">
                          {ref.doi && <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">DOI</a>}
                          {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline">URL</a>}
                        </div>
                      )}
                      <RefLinks ref={ref} />
                    </td>
                    <td className="p-3 text-xs text-neutral-600 dark:text-neutral-400 max-w-[140px]">{ref.authors}</td>
                    <td className="p-3 text-xs text-neutral-500 dark:text-neutral-400 whitespace-nowrap">{ref.year ?? '—'}</td>
                    <td className="p-3"><StatusBadge status={ref.read_status} size="xs" /></td>
                    <td className="p-3">
                      <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => setModal(ref)}>Edit</button>
                        <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteRef(ref.id)}>✕</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="md:hidden space-y-3">
            {sorted.map(ref => (
              <div key={ref.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-mono text-xs text-neutral-400 dark:text-neutral-500">{ref.citation_key}</span>
                      <StatusBadge status={ref.read_status} size="xs" />
                    </div>
                    <p className="font-medium text-sm text-neutral-800 dark:text-neutral-200 leading-snug">{ref.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{ref.authors}{ref.year ? ` (${ref.year})` : ''}</p>
                    {ref.journal && <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-0.5">{ref.journal}</p>}
                    {(ref.doi || ref.url) && (
                      <div className="flex gap-3 mt-1">
                        {ref.doi && <a href={`https://doi.org/${ref.doi}`} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">DOI ↗</a>}
                        {ref.url && <a href={ref.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">URL ↗</a>}
                      </div>
                    )}
                    <RefLinks ref={ref} />
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => setModal(ref)}>Edit</button>
                    <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteRef(ref.id)}>Delete</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {modal !== null && (
        <RefModal
          ref={modal === 'new' ? null : modal}
          chapters={chapters}
          proofs={proofs}
          onClose={() => setModal(null)}
          onSave={saveRef}
        />
      )}
    </div>
  );
}

function RefLinks({ ref }: { ref: Reference }) {
  if (!ref.linked_chapters?.length && !ref.linked_proofs?.length) return null;
  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {ref.linked_chapters?.map(c => (
        <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400">§ {c.title}</span>
      ))}
      {ref.linked_proofs?.map(p => (
        <span key={p.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 font-mono">{p.label}</span>
      ))}
    </div>
  );
}
