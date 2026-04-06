export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import type { ThesisMeta, Chapter, Proof, LogEntry, Milestone, DashboardData, ChapterStatus, ProofStatus, Tag } from '@/lib/types';

export async function GET() {
  try {
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Auto-update overdue milestones
    db.prepare(`UPDATE milestones SET status = 'Overdue' WHERE due_date < ? AND status = 'Pending'`).run(today);

    const thesis = db.prepare('SELECT * FROM thesis WHERE id = 1').get() as ThesisMeta;
    const chapters = db.prepare('SELECT * FROM chapters').all() as Chapter[];
    const proofs = db.prepare('SELECT status, COUNT(*) as count FROM proofs GROUP BY status').all() as { status: ProofStatus; count: number }[];

    // Chapter stats grouped by status
    const statuses: ChapterStatus[] = ['Not Started', 'Drafting', 'In Review', 'Complete'];
    const chapterStats = statuses.map(status => {
      const rows = chapters.filter(c => c.status === status);
      return {
        status,
        count: rows.length,
        wordCount: rows.reduce((s, c) => s + (c.current_word_count || 0), 0),
        targetWordCount: rows.reduce((s, c) => s + (c.target_word_count || 0), 0),
      };
    });

    const proofStats = (['Conjecture', 'In Progress', 'Draft Complete', 'Verified'] as ProofStatus[]).map(status => ({
      status,
      count: proofs.find(p => p.status === status)?.count ?? 0,
    }));

    // Completion %: weight by target_word_count, complete chapters count fully, others by current/target
    const totalTarget = chapters.reduce((s, c) => s + (c.target_word_count || 0), 0);
    const completedWords = chapters.reduce((s, c) => {
      if (c.status === 'Complete') return s + (c.target_word_count || 0);
      return s + Math.min(c.current_word_count || 0, c.target_word_count || 0);
    }, 0);
    const completionPercentage = totalTarget > 0 ? Math.round((completedWords / totalTarget) * 100) : 0;

    // Upcoming milestones (next 30 days + overdue)
    const upcomingMilestones = db.prepare(`
      SELECT * FROM milestones
      WHERE (due_date BETWEEN ? AND ? OR status = 'Overdue')
      AND status != 'Complete'
      ORDER BY due_date ASC
      LIMIT 10
    `).all(today, in30) as Milestone[];

    const msIds = upcomingMilestones.map(m => m.id);
    if (msIds.length > 0) {
      const msChapters = db.prepare(
        `SELECT mc.milestone_id, c.id, c.title FROM milestone_chapters mc JOIN chapters c ON c.id = mc.chapter_id WHERE mc.milestone_id IN (${msIds.map(() => '?').join(',')})`
      ).all(...msIds) as { milestone_id: number; id: number; title: string }[];
      upcomingMilestones.forEach(m => {
        m.linked_chapters = msChapters.filter(c => c.milestone_id === m.id).map(c => ({ id: c.id, title: c.title }));
      });
    }

    // Recent log entries
    const recentLog = db.prepare(
      'SELECT * FROM log_entries ORDER BY date DESC, created_at DESC LIMIT 5'
    ).all() as LogEntry[];

    if (recentLog.length > 0) {
      const logIds = recentLog.map(e => e.id);
      const ph = logIds.map(() => '?').join(',');
      const logTags = db.prepare(
        `SELECT lt.entry_id, t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id IN (${ph})`
      ).all(...logIds) as { entry_id: number; id: number; name: string }[];
      recentLog.forEach(e => {
        e.tags = logTags.filter(t => t.entry_id === e.id).map(t => ({ id: t.id, name: t.name }) as Tag);
      });
    }

    const data: DashboardData = {
      thesis,
      chapterStats,
      proofStats,
      upcomingMilestones,
      recentLogEntries: recentLog,
      completionPercentage,
    };

    return NextResponse.json({ data });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
