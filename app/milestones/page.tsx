'use client';
import { useEffect, useState, useCallback } from 'react';
import { format, parseISO, differenceInDays, startOfMonth, endOfMonth, addMonths, eachMonthOfInterval } from 'date-fns';
import type { Milestone, MilestoneStatus, Chapter } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

const STATUSES: MilestoneStatus[] = ['Pending', 'Complete', 'Overdue'];

function formatDate(d: string) {
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function dueBadge(ms: Milestone) {
  if (ms.status === 'Complete') return null;
  try {
    const days = differenceInDays(parseISO(ms.due_date), new Date());
    if (days < 0) return <span className="text-xs font-medium text-red-600 dark:text-red-400">{Math.abs(days)}d overdue</span>;
    if (days === 0) return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">Due today</span>;
    if (days <= 7) return <span className="text-xs font-medium text-amber-600 dark:text-amber-400">in {days}d</span>;
    return <span className="text-xs text-neutral-400 dark:text-neutral-500">in {days}d</span>;
  } catch { return null; }
}

interface MsFormData {
  title: string;
  description: string;
  due_date: string;
  status: MilestoneStatus;
  chapter_ids: number[];
}

function MsModal({
  ms,
  chapters,
  onClose,
  onSave,
}: {
  ms: Partial<Milestone> | null;
  chapters: Pick<Chapter, 'id' | 'title'>[];
  onClose: () => void;
  onSave: (data: MsFormData) => Promise<void>;
}) {
  const [form, setForm] = useState<MsFormData>({
    title: ms?.title ?? '',
    description: ms?.description ?? '',
    due_date: ms?.due_date ?? new Date().toISOString().split('T')[0],
    status: ms?.status ?? 'Pending',
    chapter_ids: ms?.linked_chapters?.map(c => c.id) ?? [],
  });
  const [saving, setSaving] = useState(false);

  const toggleChapter = (id: number) =>
    setForm(f => ({ ...f, chapter_ids: f.chapter_ids.includes(id) ? f.chapter_ids.filter(x => x !== id) : [...f.chapter_ids, id] }));

  const handleSave = async () => { setSaving(true); await onSave(form); setSaving(false); };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 w-full sm:rounded-xl sm:shadow-2xl sm:max-w-lg sm:mx-4 max-h-[92dvh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl">
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-800 sticky top-0 bg-white dark:bg-neutral-900 z-10">
          <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">{ms?.id ? 'Edit Milestone' : 'New Milestone'}</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-lg leading-none">✕</button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input mt-1" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Milestone title" />
          </div>
          <div>
            <label className="label">Description</label>
            <textarea className="input mt-1 text-sm resize-none" rows={3} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Description…" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label">Due Date</label>
              <input type="date" className="input mt-1 text-sm" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input mt-1 text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as MilestoneStatus }))}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
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
        </div>
        <div className="flex gap-2 p-4 border-t border-neutral-200 dark:border-neutral-800 sticky bottom-0 bg-white dark:bg-neutral-900">
          <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
          <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function GanttChart({ milestones }: { milestones: Milestone[] }) {
  const [tooltip, setTooltip] = useState<{ ms: Milestone; x: number; y: number } | null>(null);

  if (milestones.length === 0) {
    return <div className="text-sm text-neutral-400 text-center py-8">No milestones to display.</div>;
  }

  const today = new Date();
  const dates = milestones.map(m => parseISO(m.due_date));
  const minDate = new Date(Math.min(today.getTime(), ...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(today.getTime(), ...dates.map(d => d.getTime())));
  // Expand to full months
  const start = startOfMonth(minDate);
  const end = endOfMonth(addMonths(maxDate, 0));
  const totalMs = end.getTime() - start.getTime();

  const months = eachMonthOfInterval({ start, end });

  const pct = (d: Date) => Math.max(0, Math.min(100, ((d.getTime() - start.getTime()) / totalMs) * 100));

  const statusColor = (ms: Milestone) => {
    if (ms.status === 'Complete') return 'bg-emerald-500 dark:bg-emerald-400 border-emerald-500 dark:border-emerald-400';
    if (ms.status === 'Overdue') return 'bg-red-500 dark:bg-red-400 border-red-500 dark:border-red-400';
    const days = differenceInDays(parseISO(ms.due_date), today);
    if (days <= 7) return 'bg-amber-500 dark:bg-amber-400 border-amber-500 dark:border-amber-400';
    return 'bg-blue-500 dark:bg-blue-400 border-blue-500 dark:border-blue-400';
  };

  const todayPct = pct(today);

  return (
    <div className="relative select-none">
      {/* Month labels */}
      <div className="relative h-6 mb-1">
        {months.map((m, i) => {
          const left = pct(m);
          return (
            <span
              key={i}
              className="absolute text-[10px] text-neutral-400 dark:text-neutral-500 whitespace-nowrap"
              style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
            >
              {format(m, 'MMM yyyy')}
            </span>
          );
        })}
      </div>

      {/* Timeline track */}
      <div className="relative h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-3">
        {/* Month gridlines */}
        {months.slice(1).map((m, i) => (
          <div
            key={i}
            className="absolute top-0 bottom-0 w-px bg-neutral-200 dark:bg-neutral-700"
            style={{ left: `${pct(m)}%` }}
          />
        ))}
        {/* Today line */}
        <div
          className="absolute top-[-4px] bottom-[-4px] w-0.5 bg-neutral-500 dark:bg-neutral-400 rounded z-10"
          style={{ left: `${todayPct}%` }}
        />
      </div>

      {/* Milestone rows */}
      <div className="space-y-2">
        {milestones.map(ms => {
          const left = pct(parseISO(ms.due_date));
          return (
            <div key={ms.id} className="relative h-7 flex items-center">
              {/* Connector line from left edge to marker */}
              <div
                className="absolute top-1/2 h-px bg-neutral-200 dark:bg-neutral-700"
                style={{ left: 0, width: `${left}%` }}
              />
              {/* Marker */}
              <button
                className={`absolute w-3.5 h-3.5 rounded-full border-2 z-10 transition-transform hover:scale-125 ${statusColor(ms)}`}
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
                onMouseEnter={e => {
                  const rect = (e.target as HTMLElement).getBoundingClientRect();
                  setTooltip({ ms, x: rect.left + rect.width / 2, y: rect.top });
                }}
                onMouseLeave={() => setTooltip(null)}
                aria-label={ms.title}
              />
              {/* Label */}
              <span
                className="absolute text-[11px] text-neutral-600 dark:text-neutral-400 whitespace-nowrap overflow-hidden max-w-[180px] text-ellipsis pl-1"
                style={{ left: `${Math.min(left + 1.5, 75)}%` }}
              >
                {ms.title}
              </span>
            </div>
          );
        })}
      </div>

      {/* Today label */}
      <div className="relative h-5 mt-1">
        <span
          className="absolute text-[10px] text-neutral-500 dark:text-neutral-400 whitespace-nowrap"
          style={{ left: `${todayPct}%`, transform: 'translateX(-50%)' }}
        >
          Today
        </span>
      </div>

      {/* Tooltip (fixed position) */}
      {tooltip && (
        <div
          className="fixed z-50 px-2.5 py-1.5 rounded-lg bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 text-xs shadow-xl pointer-events-none max-w-xs"
          style={{ left: tooltip.x, top: tooltip.y - 8, transform: 'translate(-50%, -100%)' }}
        >
          <p className="font-semibold">{tooltip.ms.title}</p>
          <p className="text-neutral-400 dark:text-neutral-500">{format(parseISO(tooltip.ms.due_date), 'dd MMM yyyy')} · {tooltip.ms.status}</p>
          {tooltip.ms.description && <p className="mt-0.5 text-neutral-300 dark:text-neutral-600">{tooltip.ms.description}</p>}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-neutral-100 dark:border-neutral-800">
        {[
          { color: 'bg-emerald-500', label: 'Complete' },
          { color: 'bg-red-500', label: 'Overdue' },
          { color: 'bg-amber-500', label: 'Due soon' },
          { color: 'bg-blue-500', label: 'Pending' },
          { color: 'bg-neutral-500', label: 'Today' },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
            <span className="text-[10px] text-neutral-500 dark:text-neutral-400">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function MilestonesPage() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [chapters, setChapters] = useState<Pick<Chapter, 'id' | 'title'>[]>([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Milestone | null | 'new'>(null);
  const [view, setView] = useState<'list' | 'gantt'>('list');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/milestones')
      .then(r => r.json())
      .then(j => { if (!j.error) setMilestones(j.data as Milestone[]); })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    fetch('/api/chapters').then(r => r.json()).then(j => setChapters(j.data ?? []));
  }, []);

  const saveMs = async (data: MsFormData) => {
    if (modal === 'new') {
      const r = await fetch('/api/milestones', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setMilestones(prev => [...prev, j.data as Milestone].sort((a, b) => a.due_date.localeCompare(b.due_date))); setModal(null); }
    } else if (modal && typeof modal !== 'string') {
      const r = await fetch(`/api/milestones/${modal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const j = await r.json();
      if (j.data) { setMilestones(prev => prev.map(m => m.id === (modal as Milestone).id ? j.data as Milestone : m)); setModal(null); }
    }
  };

  const markComplete = async (ms: Milestone) => {
    const r = await fetch(`/api/milestones/${ms.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'Complete' }) });
    const j = await r.json();
    if (j.data) setMilestones(prev => prev.map(m => m.id === ms.id ? j.data as Milestone : m));
  };

  const deleteMs = async (id: number) => {
    if (!confirm('Delete this milestone?')) return;
    await fetch(`/api/milestones/${id}`, { method: 'DELETE' });
    setMilestones(prev => prev.filter(m => m.id !== id));
  };

  const cardStyle = (ms: Milestone) => {
    if (ms.status === 'Complete') return 'border-l-4 border-emerald-400 dark:border-emerald-600';
    if (ms.status === 'Overdue') return 'border-l-4 border-red-400 dark:border-red-600 bg-red-50/50 dark:bg-red-950/20';
    const days = (() => { try { return differenceInDays(parseISO(ms.due_date), new Date()); } catch { return 999; } })();
    if (days <= 7) return 'border-l-4 border-amber-400 dark:border-amber-500';
    return 'border-l-4 border-neutral-200 dark:border-neutral-700';
  };

  if (loading) return <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>;

  const overdue = milestones.filter(m => m.status === 'Overdue');
  const pending = milestones.filter(m => m.status === 'Pending');
  const complete = milestones.filter(m => m.status === 'Complete');

  const MsCard = ({ ms }: { ms: Milestone }) => (
    <div className={`card group ${cardStyle(ms)}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">{ms.title}</h3>
            <StatusBadge status={ms.status} size="xs" />
            {dueBadge(ms)}
          </div>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{formatDate(ms.due_date)}</p>
          {ms.description && <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{ms.description}</p>}
          {ms.linked_chapters && ms.linked_chapters.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {ms.linked_chapters.map(c => (
                <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">§ {c.title}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {ms.status !== 'Complete' && (
            <button className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700" onClick={() => markComplete(ms)}>✓ Done</button>
          )}
          <button className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200" onClick={() => setModal(ms)}>Edit</button>
          <button className="text-xs text-red-400 hover:text-red-600" onClick={() => deleteMs(ms.id)}>✕</button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Milestones</h2>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-700 overflow-hidden text-xs">
            <button
              className={`px-3 py-1.5 transition-colors ${view === 'list' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              onClick={() => setView('list')}
            >List</button>
            <button
              className={`px-3 py-1.5 transition-colors ${view === 'gantt' ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900' : 'text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800'}`}
              onClick={() => setView('gantt')}
            >Timeline</button>
          </div>
          <button className="btn-primary" onClick={() => setModal('new')}>+ New</button>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="text-sm text-neutral-400 text-center py-12">No milestones yet.</div>
      ) : view === 'gantt' ? (
        <div className="card overflow-x-auto">
          <GanttChart milestones={[...milestones].sort((a, b) => a.due_date.localeCompare(b.due_date))} />
        </div>
      ) : (
        <div className="space-y-6">
          {overdue.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-red-500 dark:text-red-400 mb-3">Overdue</h3>
              <div className="space-y-3">{overdue.map(ms => <MsCard key={ms.id} ms={ms} />)}</div>
            </section>
          )}
          {pending.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-3">Pending</h3>
              <div className="space-y-3">{pending.map(ms => <MsCard key={ms.id} ms={ms} />)}</div>
            </section>
          )}
          {complete.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-emerald-600 dark:text-emerald-500 mb-3">Complete</h3>
              <div className="space-y-3 opacity-70">{complete.map(ms => <MsCard key={ms.id} ms={ms} />)}</div>
            </section>
          )}
        </div>
      )}

      {modal !== null && (
        <MsModal
          ms={modal === 'new' ? null : modal}
          chapters={chapters}
          onClose={() => setModal(null)}
          onSave={saveMs}
        />
      )}
    </div>
  );
}
