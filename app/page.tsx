'use client';
import { useEffect, useState } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import type { DashboardData, ThesisMeta, ChapterStatus, ProofStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';
import MarkdownRenderer from '@/components/MarkdownRenderer';

const CHAPTER_COLOURS: Record<ChapterStatus, string> = {
  'Complete': '#10b981',
  'In Review': '#f59e0b',
  'Drafting': '#3b82f6',
  'Not Started': '#d1d5db',
};

const PROOF_COLOURS: Record<ProofStatus, string> = {
  'Verified': '#10b981',
  'Draft Complete': '#f59e0b',
  'In Progress': '#3b82f6',
  'Conjecture': '#a855f7',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  try { return format(parseISO(dateStr), 'dd/MM/yyyy'); } catch { return dateStr; }
}

function daysUntil(dateStr: string) {
  try {
    const d = differenceInDays(parseISO(dateStr), new Date());
    if (d < 0) return `${Math.abs(d)}d overdue`;
    if (d === 0) return 'Due today';
    return `in ${d}d`;
  } catch { return ''; }
}

interface ThesisFormData {
  title: string;
  supervisor: string;
  university: string;
  degree: string;
  expected_submission: string;
  abstract: string;
}

function ThesisSetupBanner({ thesis, onSaved }: { thesis: ThesisMeta; onSaved: (t: ThesisMeta) => void }) {
  const isEmpty = !thesis.title.trim();
  const [open, setOpen] = useState(isEmpty);
  const [form, setForm] = useState<ThesisFormData>({
    title: thesis.title,
    supervisor: thesis.supervisor,
    university: thesis.university,
    degree: thesis.degree,
    expected_submission: thesis.expected_submission,
    abstract: thesis.abstract,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    const r = await fetch('/api/thesis', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (j.data) { onSaved(j.data as ThesisMeta); setOpen(false); }
    setSaving(false);
  };

  if (!open) {
    return (
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-neutral-800 dark:text-neutral-100">
            {thesis.title || 'Untitled Thesis'}
          </h2>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            {[thesis.degree, thesis.university, thesis.supervisor && `Supervisor: ${thesis.supervisor}`, thesis.expected_submission && `Submission: ${formatDate(thesis.expected_submission)}`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <button className="btn-secondary text-xs shrink-0" onClick={() => setOpen(true)}>Edit details</button>
      </div>
    );
  }

  return (
    <div className="card border-2 border-neutral-300 dark:border-neutral-700">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-neutral-800 dark:text-neutral-100">
          {isEmpty ? 'Set up your thesis' : 'Edit thesis details'}
        </h3>
        {!isEmpty && (
          <button onClick={() => setOpen(false)} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200">✕</button>
        )}
      </div>
      <div className="space-y-3">
        <div>
          <label className="label">Thesis Title</label>
          <input
            className="input mt-1"
            value={form.title}
            onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Cohomological Methods in Algebraic Topology"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Degree</label>
            <input
              className="input mt-1 text-sm"
              value={form.degree}
              onChange={e => setForm(f => ({ ...f, degree: e.target.value }))}
              placeholder="e.g. Master of Philosophy"
            />
          </div>
          <div>
            <label className="label">University</label>
            <input
              className="input mt-1 text-sm"
              value={form.university}
              onChange={e => setForm(f => ({ ...f, university: e.target.value }))}
              placeholder="e.g. University of Melbourne"
            />
          </div>
          <div>
            <label className="label">Supervisor</label>
            <input
              className="input mt-1 text-sm"
              value={form.supervisor}
              onChange={e => setForm(f => ({ ...f, supervisor: e.target.value }))}
              placeholder="e.g. Prof. Jane Smith"
            />
          </div>
          <div>
            <label className="label">Expected Submission</label>
            <input
              type="date"
              className="input mt-1 text-sm"
              value={form.expected_submission}
              onChange={e => setForm(f => ({ ...f, expected_submission: e.target.value }))}
            />
          </div>
        </div>
        <div>
          <label className="label">Abstract / Summary</label>
          <textarea
            className="input mt-1 text-sm resize-none"
            rows={4}
            value={form.abstract}
            onChange={e => setForm(f => ({ ...f, abstract: e.target.value }))}
            placeholder="Brief summary of your thesis. Supports $\LaTeX$ math."
          />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <button className="btn-primary flex-1 sm:flex-none justify-center" onClick={save} disabled={saving || !form.title.trim()}>
          {saving ? 'Saving…' : isEmpty ? 'Get started' : 'Save'}
        </button>
        {!isEmpty && (
          <button className="btn-secondary flex-1 sm:flex-none justify-center" onClick={() => setOpen(false)}>Cancel</button>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error);
        else setData(j.data as DashboardData);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-sm text-neutral-400 animate-pulse">Loading…</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;
  if (!data) return null;

  const { thesis, chapterStats, proofStats, upcomingMilestones, recentLogEntries, completionPercentage } = data;
  const totalChapters = chapterStats.reduce((s, c) => s + c.count, 0);
  const totalTarget = chapterStats.reduce((s, c) => s + c.targetWordCount, 0);
  const totalWords = chapterStats.reduce((s, c) => s + c.wordCount, 0);
  const hasChapters = totalChapters > 0;
  const hasProofs = proofStats.some(p => p.count > 0);

  const proofPieData = proofStats.filter(p => p.count > 0).map(p => ({
    name: p.status,
    value: p.count,
    colour: PROOF_COLOURS[p.status],
  }));

  return (
    <div className="space-y-6">
      {/* Thesis header + setup */}
      <ThesisSetupBanner
        thesis={thesis}
        onSaved={updated => setData(d => d ? { ...d, thesis: updated } : d)}
      />

      {/* Progress bar — only if there are chapters */}
      {hasChapters && (
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Overall Progress</h3>
            <span className="text-2xl font-bold text-neutral-800 dark:text-neutral-100">{completionPercentage}%</span>
          </div>
          <div className="w-full h-4 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 flex">
            {(['Complete', 'In Review', 'Drafting', 'Not Started'] as ChapterStatus[]).map(status => {
              const stat = chapterStats.find(c => c.status === status);
              const pct = totalTarget > 0 && stat
                ? (status === 'Complete' ? stat.targetWordCount : Math.min(stat.wordCount, stat.targetWordCount)) / totalTarget * 100
                : 0;
              if (pct < 0.5) return null;
              return (
                <div
                  key={status}
                  style={{ width: `${pct}%`, backgroundColor: CHAPTER_COLOURS[status] }}
                  title={`${status}: ${pct.toFixed(1)}%`}
                  className="transition-all"
                />
              );
            })}
          </div>
          <div className="flex flex-wrap gap-3 mt-3">
            {(['Complete', 'In Review', 'Drafting', 'Not Started'] as ChapterStatus[]).map(status => {
              const stat = chapterStats.find(c => c.status === status);
              return (
                <div key={status} className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: CHAPTER_COLOURS[status] }} />
                  {status} ({stat?.count ?? 0})
                </div>
              );
            })}
          </div>
          {totalTarget > 0 && (
            <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-2">
              {totalWords.toLocaleString()} / {totalTarget.toLocaleString()} words written
            </p>
          )}
        </div>
      )}

      {/* Empty state prompt */}
      {!hasChapters && thesis.title && (
        <div className="card border border-dashed border-neutral-300 dark:border-neutral-700 text-center py-8">
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mb-2">No chapters yet.</p>
          <a href="/chapters" className="btn-primary inline-flex">Go to Chapters →</a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Proof stats */}
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Proofs</h3>
          {!hasProofs ? (
            <p className="text-sm text-neutral-400">No proofs yet. <a href="/proofs" className="underline">Add one →</a></p>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={130} height={130}>
                <PieChart>
                  <Pie data={proofPieData} dataKey="value" innerRadius={35} outerRadius={60} paddingAngle={2}>
                    {proofPieData.map((entry, i) => (
                      <Cell key={i} fill={entry.colour} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => [v, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5">
                {proofStats.map(p => (
                  <div key={p.status} className="flex items-center gap-2 text-xs">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: PROOF_COLOURS[p.status] }} />
                    <span className="text-neutral-600 dark:text-neutral-400">{p.status}</span>
                    <span className="font-semibold text-neutral-800 dark:text-neutral-200 ml-auto">{p.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Upcoming milestones */}
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Upcoming Milestones</h3>
          {upcomingMilestones.length === 0 ? (
            <p className="text-sm text-neutral-400">No upcoming milestones. <a href="/milestones" className="underline">Add one →</a></p>
          ) : (
            <div className="space-y-2">
              {upcomingMilestones.map(ms => {
                const overdue = ms.status === 'Overdue';
                return (
                  <div key={ms.id} className={`flex items-start justify-between gap-2 p-2 rounded-lg ${overdue ? 'bg-red-50 dark:bg-red-950/30' : 'bg-neutral-50 dark:bg-neutral-800/50'}`}>
                    <div>
                      <p className={`text-sm font-medium ${overdue ? 'text-red-700 dark:text-red-400' : 'text-neutral-800 dark:text-neutral-200'}`}>{ms.title}</p>
                      <p className={`text-xs mt-0.5 ${overdue ? 'text-red-500' : 'text-neutral-400'}`}>
                        {formatDate(ms.due_date)} · {daysUntil(ms.due_date)}
                      </p>
                    </div>
                    <StatusBadge status={ms.status} size="xs" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Recent log entries */}
      <div className="card">
        <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-3">Recent Log Entries</h3>
        {recentLogEntries.length === 0 ? (
          <p className="text-sm text-neutral-400">No log entries yet. <a href="/log" className="underline">Start your research log →</a></p>
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {recentLogEntries.map(entry => (
              <div key={entry.id} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{formatDate(entry.date)}</span>
                  {entry.tags?.map(t => (
                    <span key={t.id} className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400">{t.name}</span>
                  ))}
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
                  <MarkdownRenderer content={entry.body} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Abstract */}
      {thesis.abstract && (
        <div className="card">
          <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300 mb-2">Abstract</h3>
          <MarkdownRenderer content={thesis.abstract} className="text-neutral-600 dark:text-neutral-400" />
        </div>
      )}
    </div>
  );
}
