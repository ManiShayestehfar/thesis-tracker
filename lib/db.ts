import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL ?? '');

type SqlParam = string | number | boolean | null | undefined;

/** Convert SQLite ? placeholders to Postgres $1, $2, … */
function p(query: string): string {
  let i = 0;
  return query.replace(/\?/g, () => `$${++i}`);
}

let schemaReady: Promise<void> | null = null;

function ensureSchema(): Promise<void> {
  if (!schemaReady) schemaReady = createSchema();
  return schemaReady;
}

async function createSchema(): Promise<void> {
  const stmts = [
    `CREATE TABLE IF NOT EXISTS thesis (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      supervisor TEXT NOT NULL DEFAULT '',
      university TEXT NOT NULL DEFAULT '',
      degree TEXT NOT NULL DEFAULT '',
      expected_submission TEXT NOT NULL DEFAULT '',
      abstract TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS chapters (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      order_index INTEGER NOT NULL DEFAULT 0,
      target_word_count INTEGER NOT NULL DEFAULT 0,
      current_word_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS sections (
      id SERIAL PRIMARY KEY,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      order_index INTEGER NOT NULL DEFAULT 0,
      target_word_count INTEGER NOT NULL DEFAULT 0,
      current_word_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS tags (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    )`,
    `CREATE TABLE IF NOT EXISTS proofs (
      id SERIAL PRIMARY KEY,
      label TEXT NOT NULL,
      statement TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Conjecture',
      chapter_id INTEGER,
      section_id INTEGER,
      proof_sketch TEXT NOT NULL DEFAULT '',
      date_created TEXT NOT NULL,
      date_completed TEXT,
      difficulty INTEGER NOT NULL DEFAULT 3,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE SET NULL,
      FOREIGN KEY (section_id) REFERENCES sections(id) ON DELETE SET NULL
    )`,
    `CREATE TABLE IF NOT EXISTS proof_tags (
      proof_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (proof_id, tag_id),
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS log_entries (
      id SERIAL PRIMARY KEY,
      date TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS log_tags (
      entry_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS log_proofs (
      entry_id INTEGER NOT NULL,
      proof_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, proof_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS log_chapters (
      entry_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, chapter_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS refs (
      id SERIAL PRIMARY KEY,
      citation_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      authors TEXT NOT NULL DEFAULT '',
      year INTEGER,
      journal TEXT NOT NULL DEFAULT '',
      doi TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      read_status TEXT NOT NULL DEFAULT 'Unread'
    )`,
    `CREATE TABLE IF NOT EXISTS ref_chapters (
      ref_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (ref_id, chapter_id),
      FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS ref_proofs (
      ref_id INTEGER NOT NULL,
      proof_id INTEGER NOT NULL,
      PRIMARY KEY (ref_id, proof_id),
      FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE,
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS milestones (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
    )`,
    `CREATE TABLE IF NOT EXISTS milestone_chapters (
      milestone_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (milestone_id, chapter_id),
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS notation (
      id SERIAL PRIMARY KEY,
      symbol TEXT NOT NULL,
      latex TEXT NOT NULL,
      definition TEXT NOT NULL DEFAULT '',
      first_used_chapter_id INTEGER,
      FOREIGN KEY (first_used_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    )`,
    `INSERT INTO thesis (id, title, supervisor, university, degree, expected_submission, abstract)
     VALUES (1, '', '', '', '', '', '')
     ON CONFLICT (id) DO NOTHING`,
  ];
  for (const stmt of stmts) {
    await sql(stmt);
  }
}

export async function rows<T>(query: string, args: SqlParam[] = []): Promise<T[]> {
  await ensureSchema();
  const result = await sql(p(query), args as unknown[]);
  return result as T[];
}

export async function row<T>(query: string, args: SqlParam[] = []): Promise<T | undefined> {
  const r = await rows<T>(query, args);
  return r[0];
}

export async function run(query: string, args: SqlParam[] = []): Promise<void> {
  await ensureSchema();
  await sql(p(query), args as unknown[]);
}

export async function insert(query: string, args: SqlParam[] = []): Promise<number> {
  await ensureSchema();
  const result = await sql(p(query) + ' RETURNING id', args as unknown[]);
  return (result[0] as { id: number }).id;
}
