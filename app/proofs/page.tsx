'use client';
import { useEffect, useState, useCallback } from 'react';
import { format, parseISO } from 'date-fns';
import type { Proof, ProofStatus, Chapter, Tag } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import KaTeXRenderer from '@/components/KaTeXRenderer';

const STATUSES: ProofStatus[] = ['Conjecture', 'In Progress', 'Draft Complete', 'Verified'];
const DIFFICULTIES = [1, 2, 3, 4, 5];

function formatDate(d: string | null) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function DifficultyDots({ value }: { value: number }) {
  return (
    <span className="flex gap-0.5">
      {DIFFICULTIES.map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-full ${i <= value ? 'bg-amber-400' : 'bg-neutral-200 dark:bg-neutral-700'}`} />
      ))}
    </span>
  );
}

interface ProofFormData {
  label: string;
  statement: string;
  status: ProofStatus;
  chapter_id: number | null;
  section_id: null;
  proof_sketch: string;
  date_created: string;
  date_completed: string | null;
  difficulty: number;
  tags: string[];
}

function ProofModal({
  proof,
  chapters,
  onClose,
  onSave,
}: {
  proof: Partial<Proof> | null;
  chapters: Pick<Chapter, 'id' | 'title'>[];
  onClose: () => void;
  onSave: (data: ProofFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<ProofFormData>({
    label: proof?.label ?? '',
    statement: proof?.statement ?? '',
    status: proof?.status ?? 'Conjecture',
    chapter_id: proof?.chapter_id ?? null,
    section_id: null,
    proof_sketch: proof?.proof_sketch ?? '',
    date_created: proof?.date_created ?? new Date().toISOString().split('T')[0],
    date_completed: proof?.date_completed ?? null,
    difficulty: proof?.difficulty ?? 3,
    tags: proof?.tags?.map(t => t.name) ?? [],
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);

  const addTag = () => {
    const t = tagInput.trim().toLowerCase();
    if (t && !form.tags.includes(t)) {
      setForm(f => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput('');
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-xl sm:shadow-2xl sm:max-w-2xl sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{proof?.id ? 'Edit Proof' : 'New Proof'}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none">✕</button>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Label</label>
              <input className="input mt-1" value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Theorem 3.2.1" />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input mt-1" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ProofStatus }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="label">Statement (LaTeX)</label>
              <button onClick={() => setPreview(p => !p)} className="text-xs text-neutral-400 hover:text-neutral-600">{preview ? 'Edit' : 'Preview'}</button>
            </div>
            {preview ? (
              <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 min-h-[60px]">
                <KaTeXRenderer latex={form.statement} displayMode className="text-sm" />
              </div>
            ) : (
              <textarea
                className="input font-mono text-sm resize-none"
                rows={3}
                value={form.statement}
                onChange={e => setForm(f => ({ ...f, statement: e.target.value }))}
                placeholder="LaTeX statement…"
              />
            )}
          </div>

          <div>
            <label className="label">Proof Sketch (LaTeX / text)</label>
            <textarea
              className="input font-mono text-sm resize-none mt-1"
              rows={5}
              value={form.proof_sketch}
              onChange={e => setForm(f => ({ ...f, proof_sketch: e.target.value }))}
              placeholder="Proof sketch…"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Linked Chapter</label>
              <select
                className="input mt-1 text-sm"
                value={form.chapter_id ?? ''}
                onChange={e => setForm(f => ({ ...f, chapter_id: e.target.value ? parseInt(e.target.value, 10) : null }))}
              >
                <option value="">None</option>
                {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Difficulty (1–5)</label>
              <div className="flex gap-1 mt-2">
                {DIFFICULTIES.map(d => (
                  <button
                    key={d}
                    onClick={() => setForm(f => ({ ...f, difficulty: d }))}
                    className={`w-8 h-8 rounded text-xs font-medium transition-colors ${form.difficulty === d ? 'bg-amber-400 text-white' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:bg-amber-100'}`}
                  >{d}</button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Date Created</label>
              <input type="date" className="input mt-1 text-sm" value={form.date_created} onChange={e => setForm(f => ({ ...f, date_created: e.target.value }))} />
            </div>
            <div>
              <label className="label">Date Completed</label>
              <input type="date" className="input mt-1 text-sm" value={form.date_completed ?? ''} onChange={e => setForm(f => ({ ...f, date_completed: e.target.value || null }))} />
            </div>
          </div>

          <div>
            <label className="label">Tags</label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {form.tags.map(t => (
                <span key={t} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                  {t}
                  <button onClick={() => setForm(f => ({ ...f, tags: f.tags.filter(x => x !== t) }))} className="text-neutral-400 hover:text-red-500">✕</button>
                </span>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <input
                className="input text-sm flex-1"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder="Add tag…"
              />
              <button className="btn-secondary text-xs" onClick={addTag}>Add</button>
            </div>
          </div>
        </div>
        <div className="flex gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

export default function ProofsPage() {
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [chapters, setChapters] = useState<Pick<Chapter, 'id' | 'title'>[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [filterChapter, setFilterChapter] = useState('');
  const [filterDifficulty, setFilterDifficulty] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [modal, setModal] = useState<Proof | null | 'new'>(null);

  const load = useCallback(() => {
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (filterTag) params.set('tag', filterTag);
    if (filterChapter) params.set('chapter_id', filterChapter);
    if (filterDifficulty) params.set('difficulty', filterDifficulty);
    setLoading(true);
    fetch(`/api/proofs?${params}`)
      .then(r => r.json())
      .then(j => { if (!j.error) setProofs(j.data as Proof[]); else setError(j.error); })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, [filterStatus, filterTag, filterChapter, filterDifficulty]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/chapters').then(r => r.json()).then(j => setChapters((j.data ?? []) as Chapter[]));
    fetch('/api/tags').then(r => r.json()).then(j => setTags((j.data ?? []) as Tag[]));
  }, []);

  const saveProof = async (data: ReturnType<typeof Object.assign>) => {
    if (modal === 'new') {
      const r = await fetch('/api/proofs', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setProofs(prev => [j.data as Proof, ...prev]); setModal(null); }
    } else if (modal && typeof modal !== 'string') {
      const r = await fetch(`/api/proofs/${modal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setProofs(prev => prev.map(p => p.id === (modal as Proof).id ? j.data as Proof : p)); setModal(null); }
    }
  };

  const deleteProof = async (id: number) => {
    if (!confirm('Delete this proof?')) return;
    await fetch(`/api/proofs/${id}`, { method: 'DELETE' });
    setProofs(prev => prev.filter(p => p.id !== id));
    setExpanded(null);
  };

  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Proofs</h2>
        <button className="btn-primary" onClick={() => setModal('new')}>+ New Proof</button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 mb-4">
        <select className="input text-sm" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="input text-sm" value={filterTag} onChange={e => setFilterTag(e.target.value)}>
          <option value="">All tags</option>
          {tags.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
        </select>
        <select className="input text-sm" value={filterChapter} onChange={e => setFilterChapter(e.target.value)}>
          <option value="">All chapters</option>
          {chapters.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        <select className="input text-sm" value={filterDifficulty} onChange={e => setFilterDifficulty(e.target.value)}>
          <option value="">Any difficulty</option>
          {DIFFICULTIES.map(d => <option key={d} value={d}>{d} star{d > 1 ? 's' : ''}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>
      ) : proofs.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-12">No proofs match the current filters.</div>
      ) : (
        <div className="space-y-2">
          {proofs.map(proof => (
            <div key={proof.id} className="card">
              <div
                className="flex items-center gap-3 cursor-pointer"
                onClick={() => setExpanded(expanded === proof.id ? null : proof.id)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-semibold text-neutral-700 dark:text-neutral-300">{proof.label}</span>
                    <StatusBadge status={proof.status} />
                    <DifficultyDots value={proof.difficulty} />
                    {proof.chapter_title && (
                      <span className="text-xs text-neutral-400 dark:text-neutral-500">{proof.chapter_title}</span>
                    )}
                    {proof.tags?.map(t => (
                      <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500">{t.name}</span>
                    ))}
                  </div>
                  <div className="mt-1 text-sm text-neutral-600 dark:text-neutral-400 overflow-hidden">
                    <KaTeXRenderer latex={proof.statement} />
                  </div>
                </div>
                <span className="text-neutral-300 dark:text-neutral-600 text-xs">{expanded === proof.id ? '▴' : '▾'}</span>
              </div>

              {expanded === proof.id && (
                <div className="mt-4 border-t border-neutral-100 dark:border-neutral-800 pt-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                    <div>Created: {formatDate(proof.date_created)}</div>
                    <div>Completed: {formatDate(proof.date_completed)}</div>
                  </div>
                  {proof.proof_sketch && (
                    <div>
                      <p className="label mb-2">Proof Sketch</p>
                      <div className="p-3 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-sm font-mono text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                        {proof.proof_sketch}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <button className="btn-secondary text-xs" onClick={() => setModal(proof)}>Edit</button>
                    <button className="btn-danger text-xs" onClick={() => deleteProof(proof.id)}>Delete</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modal !== null && (
        <ProofModal
          proof={modal === 'new' ? null : modal}
          chapters={chapters}
          onClose={() => setModal(null)}
          onSave={saveProof}
        />
      )}
    </div>
  );
}
