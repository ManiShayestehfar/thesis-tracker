export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export type ChapterStatus = 'Not Started' | 'Drafting' | 'In Review' | 'Complete';
export type ProofStatus = 'Conjecture' | 'In Progress' | 'Draft Complete' | 'Verified';
export type ReadStatus = 'Unread' | 'Skimmed' | 'Read' | 'Studied';
export type MilestoneStatus = 'Pending' | 'Complete' | 'Overdue';

export interface ThesisMeta {
  id: number;
  title: string;
  supervisor: string;
  university: string;
  degree: string;
  expected_submission: string;
  abstract: string;
}

export interface Chapter {
  id: number;
  title: string;
  status: ChapterStatus;
  order_index: number;
  target_word_count: number;
  current_word_count: number;
  notes: string;
  sections?: Section[];
}

export interface Section {
  id: number;
  chapter_id: number;
  title: string;
  status: ChapterStatus;
  order_index: number;
  target_word_count: number;
  current_word_count: number;
  notes: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Proof {
  id: number;
  label: string;
  statement: string;
  status: ProofStatus;
  chapter_id: number | null;
  section_id: number | null;
  proof_sketch: string;
  date_created: string;
  date_completed: string | null;
  difficulty: number;
  tags?: Tag[];
  chapter_title?: string;
}

export interface LogEntry {
  id: number;
  date: string;
  body: string;
  created_at: string;
  tags?: Tag[];
  linked_proofs?: Pick<Proof, 'id' | 'label'>[];
  linked_chapters?: Pick<Chapter, 'id' | 'title'>[];
}

export interface Reference {
  id: number;
  citation_key: string;
  title: string;
  authors: string;
  year: number | null;
  journal: string;
  doi: string;
  url: string;
  notes: string;
  read_status: ReadStatus;
  linked_chapters?: Pick<Chapter, 'id' | 'title'>[];
  linked_proofs?: Pick<Proof, 'id' | 'label'>[];
}

export interface Milestone {
  id: number;
  title: string;
  description: string;
  due_date: string;
  status: MilestoneStatus;
  linked_chapters?: Pick<Chapter, 'id' | 'title'>[];
}

export interface NotationEntry {
  id: number;
  symbol: string;
  latex: string;
  definition: string;
  first_used_chapter_id: number | null;
  chapter_title?: string;
}

export interface DashboardData {
  thesis: ThesisMeta;
  chapterStats: { status: ChapterStatus; count: number; wordCount: number; targetWordCount: number }[];
  proofStats: { status: ProofStatus; count: number }[];
  upcomingMilestones: Milestone[];
  recentLogEntries: LogEntry[];
  completionPercentage: number;
}

export type ApiSuccess<T> = { data: T };
export type ApiError = { error: string };
export type ApiResponse<T> = ApiSuccess<T> | ApiError;
