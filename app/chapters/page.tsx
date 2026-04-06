'use client';
import { useEffect, useState, useCallback } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import type { Chapter, Section, ChapterStatus } from '@/lib/types';
import StatusBadge from '@/components/StatusBadge';

const STATUSES: ChapterStatus[] = ['Not Started', 'Drafting', 'In Review', 'Complete'];

function WordBar({ current, target }: { current: number; target: number }) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  return (
    <div className="flex items-center gap-2 text-xs text-neutral-400 dark:text-neutral-500">
      <div className="flex-1 h-1.5 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
        <div className="h-full bg-blue-400 dark:bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span>{current.toLocaleString()} / {target.toLocaleString()} w</span>
    </div>
  );
}

interface EditForm {
  title: string;
  status: ChapterStatus;
  target_word_count: number;
  current_word_count: number;
  notes: string;
}

function SectionRow({
  section,
  onUpdate,
  onDelete,
}: {
  section: Section;
  onUpdate: (id: number, data: Partial<Section>) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    title: section.title,
    status: section.status,
    target_word_count: section.target_word_count,
    current_word_count: section.current_word_count,
    notes: section.notes,
  });

  const save = () => {
    onUpdate(section.id, form);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="ml-4 sm:ml-8 p-3 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-900 space-y-2">
        <input className="input text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="Section title" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <select className="input text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ChapterStatus }))}>
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>
          <div className="flex gap-2">
            <input type="number" className="input text-sm" value={form.target_word_count} onChange={e => setForm(f => ({ ...f, target_word_count: +e.target.value }))} placeholder="Target w" />
            <input type="number" className="input text-sm" value={form.current_word_count} onChange={e => setForm(f => ({ ...f, current_word_count: +e.target.value }))} placeholder="Current w" />
          </div>
        </div>
        <textarea className="input text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" />
        <div className="flex gap-2">
          <button className="btn-primary text-xs" onClick={save}>Save</button>
          <button className="btn-secondary text-xs" onClick={() => setEditing(false)}>Cancel</button>
          <button className="btn-danger text-xs ml-auto" onClick={() => onDelete(section.id)}>Delete</button>
        </div>
      </div>
    );
  }

  return (
    <div className="ml-4 sm:ml-8 flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-50 dark:hover:bg-neutral-800/50 group">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm text-neutral-700 dark:text-neutral-300 truncate">{section.title}</span>
          <StatusBadge status={section.status} size="xs" />
        </div>
        {section.target_word_count > 0 && (
          <WordBar current={section.current_word_count} target={section.target_word_count} />
        )}
      </div>
      <button
        onClick={() => setEditing(true)}
        className="opacity-100 sm:opacity-0 sm:group-hover:opacity-100 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-opacity shrink-0"
      >
        Edit
      </button>
    </div>
  );
}

interface ChapterCardProps {
  chapter: Chapter;
  index: number;
  onUpdate: (id: number, data: Partial<Chapter>) => void;
  onDelete: (id: number) => void;
  onAddSection: (chapterId: number) => void;
  onUpdateSection: (id: number, data: Partial<Section>) => void;
  onDeleteSection: (id: number, chapterId: number) => void;
}

function ChapterCard({ chapter, index, onUpdate, onDelete, onAddSection, onUpdateSection, onDeleteSection }: ChapterCardProps) {
  const [expanded, setExpanded] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EditForm>({
    title: chapter.title,
    status: chapter.status,
    target_word_count: chapter.target_word_count,
    current_word_count: chapter.current_word_count,
    notes: chapter.notes,
  });

  const save = () => {
    onUpdate(chapter.id, form);
    setEditing(false);
  };

  return (
    <Draggable draggableId={`ch-${chapter.id}`} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`card mb-3 ${snapshot.isDragging ? 'shadow-lg ring-1 ring-neutral-300 dark:ring-neutral-600' : ''}`}
        >
          <div className="flex items-start gap-2">
            <span
              {...provided.dragHandleProps}
              className="drag-handle mt-1 text-neutral-300 dark:text-neutral-600 hover:text-neutral-500 select-none px-0.5"
            >⠿</span>
            <div className="flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input className="input font-semibold" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select className="input text-sm" value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as ChapterStatus }))}>
                      {STATUSES.map(s => <option key={s}>{s}</option>)}
                    </select>
                    <div className="flex gap-2">
                      <input type="number" className="input text-sm" value={form.target_word_count} onChange={e => setForm(f => ({ ...f, target_word_count: +e.target.value }))} placeholder="Target w" />
                      <input type="number" className="input text-sm" value={form.current_word_count} onChange={e => setForm(f => ({ ...f, current_word_count: +e.target.value }))} placeholder="Current w" />
                    </div>
                  </div>
                  <textarea className="input text-sm resize-none" rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Notes…" />
                  <div className="flex gap-2">
                    <button className="btn-primary text-xs" onClick={save}>Save</button>
                    <button className="btn-secondary text-xs" onClick={() => setEditing(false)}>Cancel</button>
                    <button className="btn-danger text-xs ml-auto" onClick={() => onDelete(chapter.id)}>Delete chapter</button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => setExpanded(e => !e)}
                      className="text-xs text-neutral-400 dark:text-neutral-600 w-4"
                    >{expanded ? '▾' : '▸'}</button>
                    <h3 className="font-semibold text-neutral-800 dark:text-neutral-100 text-sm">
                      Chapter {chapter.order_index + 1}: {chapter.title}
                    </h3>
                    <StatusBadge status={chapter.status} />
                    <div className="ml-auto flex gap-2">
                      <button onClick={() => setEditing(true)} className="text-xs text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200">Edit</button>
                    </div>
                  </div>
                  {chapter.target_word_count > 0 && (
                    <div className="mt-1.5 ml-6">
                      <WordBar current={chapter.current_word_count} target={chapter.target_word_count} />
                    </div>
                  )}
                  {chapter.notes && (
                    <p className="text-xs text-neutral-400 dark:text-neutral-500 mt-1 ml-6">{chapter.notes}</p>
                  )}
                </>
              )}
            </div>
          </div>

          {expanded && !editing && (
            <div className="mt-3 space-y-1">
              {(chapter.sections ?? []).map(sec => (
                <SectionRow
                  key={sec.id}
                  section={sec}
                  onUpdate={onUpdateSection}
                  onDelete={id => onDeleteSection(id, chapter.id)}
                />
              ))}
              <button
                onClick={() => onAddSection(chapter.id)}
                className="ml-4 sm:ml-8 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 flex items-center gap-1 mt-1"
              >
                + Add section
              </button>
            </div>
          )}
        </div>
      )}
    </Draggable>
  );
}

export default function ChaptersPage() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/chapters')
      .then(r => r.json())
      .then(j => {
        if (j.error) setError(j.error);
        else setChapters(j.data as Chapter[]);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const addChapter = async () => {
    const r = await fetch('/api/chapters', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: 'New Chapter' }) });
    const j = await r.json();
    if (j.data) setChapters(prev => [...prev, { ...j.data, sections: [] }]);
  };

  const updateChapter = async (id: number, data: Partial<Chapter>) => {
    const r = await fetch(`/api/chapters/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json();
    if (j.data) setChapters(prev => prev.map(c => c.id === id ? { ...j.data, sections: c.sections } : c));
  };

  const deleteChapter = async (id: number) => {
    if (!confirm('Delete this chapter and all its sections?')) return;
    await fetch(`/api/chapters/${id}`, { method: 'DELETE' });
    setChapters(prev => prev.filter(c => c.id !== id));
  };

  const addSection = async (chapterId: number) => {
    const r = await fetch('/api/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ chapter_id: chapterId, title: 'New Section' }) });
    const j = await r.json();
    if (j.data) {
      setChapters(prev => prev.map(c =>
        c.id === chapterId ? { ...c, sections: [...(c.sections ?? []), j.data as Section] } : c
      ));
    }
  };

  const updateSection = async (id: number, data: Partial<Section>) => {
    const r = await fetch(`/api/sections/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const j = await r.json();
    if (j.data) {
      setChapters(prev => prev.map(c => ({
        ...c,
        sections: (c.sections ?? []).map(s => s.id === id ? j.data as Section : s),
      })));
    }
  };

  const deleteSection = async (id: number, chapterId: number) => {
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
    setChapters(prev => prev.map(c =>
      c.id === chapterId ? { ...c, sections: (c.sections ?? []).filter(s => s.id !== id) } : c
    ));
  };

  const onDragEnd = async (result: DropResult) => {
    if (!result.destination || result.destination.index === result.source.index) return;
    const reordered = Array.from(chapters);
    const [moved] = reordered.splice(result.source.index, 1);
    reordered.splice(result.destination.index, 0, moved);
    setChapters(reordered);
    await fetch('/api/chapters/reorder', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: reordered.map(c => c.id) }),
    });
  };

  if (loading) return <div className="text-sm text-neutral-400 animate-pulse">Loading chapters…</div>;
  if (error) return <div className="text-sm text-red-500">Error: {error}</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-neutral-800 dark:text-neutral-100">Chapters</h2>
        <button onClick={addChapter} className="btn-primary">+ Add Chapter</button>
      </div>

      {chapters.length === 0 && (
        <div className="text-sm text-neutral-400 text-center py-12">No chapters yet. Add one to get started.</div>
      )}

      <DragDropContext onDragEnd={onDragEnd}>
        <Droppable droppableId="chapters">
          {provided => (
            <div ref={provided.innerRef} {...provided.droppableProps}>
              {chapters.map((ch, idx) => (
                <ChapterCard
                  key={ch.id}
                  chapter={ch}
                  index={idx}
                  onUpdate={updateChapter}
                  onDelete={deleteChapter}
                  onAddSection={addSection}
                  onUpdateSection={updateSection}
                  onDeleteSection={deleteSection}
                />
              ))}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </div>
  );
}
