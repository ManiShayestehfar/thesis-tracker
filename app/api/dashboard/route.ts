export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { rows, row, run } from '@/lib/db';
import { requireUserId } from '@/lib/auth';
import type { ThesisMeta, Chapter, Proof, LogEntry, Milestone, DashboardData, ChapterStatus, ProofStatus, Tag } from '@/lib/types';

export async function GET() {
  try {
    const userId = await requireUserId();
    const today = new Date().toISOString().split('T')[0];
    const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    // Auto-update overdue milestones
    await run(`UPDATE milestones SET status = 'Overdue' WHERE due_date < ? AND status = 'Pending' AND user_id = ?`, [today, userId]);

    const [thesis, chapters, proofCounts] = await Promise.all([
      row<ThesisMeta>('SELECT * FROM thesis WHERE user_id = ?', [userId]),
      rows<Chapter>('SELECT * FROM chapters WHERE user_id = ?', [userId]),
      rows<{ status: ProofStatus; count: number }>('SELECT status, COUNT(*) as count FROM proofs WHERE user_id = ? GROUP BY status', [userId]),
    ]);

    // Chapter stats grouped by status
    const statuses: ChapterStatus[] = ['Not Started', 'Drafting', 'In Review', 'Complete'];
    const chapterStats = statuses.map(status => {
      const filtered = (chapters ?? []).filter(c => c.status === status);
      return {
        status,
        count: filtered.length,
        wordCount: filtered.reduce((s, c) => s + (c.current_word_count || 0), 0),
        targetWordCount: filtered.reduce((s, c) => s + (c.target_word_count || 0), 0),
      };
    });

    const proofStats = (['Conjecture', 'In Progress', 'Draft Complete', 'Verified'] as ProofStatus[]).map(status => ({
      status,
      count: proofCounts.find(p => p.status === status)?.count ?? 0,
    }));

    const totalTarget = (chapters ?? []).reduce((s, c) => s + (c.target_word_count || 0), 0);
    const completedWords = (chapters ?? []).reduce((s, c) => {
      if (c.status === 'Complete') return s + (c.target_word_count || 0);
      return s + Math.min(c.current_word_count || 0, c.target_word_count || 0);
    }, 0);
    const completionPercentage = totalTarget > 0 ? Math.round((completedWords / totalTarget) * 100) : 0;

    // Upcoming milestones (next 30 days + overdue)
    const upcomingMilestones = await rows<Milestone>(`
      SELECT * FROM milestones
      WHERE user_id = ?
      AND (due_date BETWEEN ? AND ? OR status = 'Overdue')
      AND status != 'Complete'
      ORDER BY due_date ASC
      LIMIT 10
    `, [userId, today, in30]);

    if (upcomingMilestones.length > 0) {
      const msIds = upcomingMilestones.map(m => m.id);
      const ph = msIds.map(() => '?').join(',');
      const msChapters = await rows<{ milestone_id: number; id: number; title: string }>(
        `SELECT mc.milestone_id, c.id, c.title FROM milestone_chapters mc JOIN chapters c ON c.id = mc.chapter_id WHERE mc.milestone_id IN (${ph})`,
        msIds
      );
      upcomingMilestones.forEach(m => {
        m.linked_chapters = msChapters.filter(c => c.milestone_id === m.id).map(c => ({ id: c.id, title: c.title }));
      });
    }

    // Recent log entries
    const recentLog = await rows<LogEntry>('SELECT * FROM log_entries WHERE user_id = ? ORDER BY date DESC, created_at DESC LIMIT 5', [userId]);

    if (recentLog.length > 0) {
      const logIds = recentLog.map(e => e.id);
      const ph = logIds.map(() => '?').join(',');
      const logTags = await rows<{ entry_id: number; id: number; name: string }>(
        `SELECT lt.entry_id, t.id, t.name FROM log_tags lt JOIN tags t ON t.id = lt.tag_id WHERE lt.entry_id IN (${ph})`,
        logIds
      );
      recentLog.forEach(e => {
        e.tags = logTags.filter(t => t.entry_id === e.id).map(t => ({ id: t.id, name: t.name }) as Tag);
      });
    }

    if (!thesis) {
      return NextResponse.json({ error: 'Thesis not found' }, { status: 404 });
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
    const msg = String(e);
    return NextResponse.json({ error: msg }, { status: msg.includes('Unauthorized') ? 401 : 500 });
  }
}
