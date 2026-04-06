import type { ChapterStatus, ProofStatus, ReadStatus, MilestoneStatus } from '@/lib/types';

type AnyStatus = ChapterStatus | ProofStatus | ReadStatus | MilestoneStatus;

const colours: Record<string, string> = {
  // Chapter
  'Not Started': 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  'Drafting': 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'In Review': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'Complete': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  // Proof
  'Conjecture': 'bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300',
  'In Progress': 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Draft Complete': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'Verified': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  // Read
  'Unread': 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  'Skimmed': 'bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300',
  'Read': 'bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
  'Studied': 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  // Milestone
  'Pending': 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
  'Overdue': 'bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
};

interface Props {
  status: AnyStatus;
  size?: 'sm' | 'xs';
}

export default function StatusBadge({ status, size = 'sm' }: Props) {
  const cls = colours[status] ?? 'bg-neutral-100 text-neutral-500';
  const pad = size === 'xs' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs';
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${pad} ${cls}`}>
      {status}
    </span>
  );
}
