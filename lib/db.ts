import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DB_DIR, 'thesis.db');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initSchema(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS thesis (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL DEFAULT '',
      supervisor TEXT NOT NULL DEFAULT '',
      university TEXT NOT NULL DEFAULT '',
      degree TEXT NOT NULL DEFAULT '',
      expected_submission TEXT NOT NULL DEFAULT '',
      abstract TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      order_index INTEGER NOT NULL DEFAULT 0,
      target_word_count INTEGER NOT NULL DEFAULT 0,
      current_word_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chapter_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Not Started',
      order_index INTEGER NOT NULL DEFAULT 0,
      target_word_count INTEGER NOT NULL DEFAULT 0,
      current_word_count INTEGER NOT NULL DEFAULT 0,
      notes TEXT NOT NULL DEFAULT '',
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS proofs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
    );

    CREATE TABLE IF NOT EXISTS proof_tags (
      proof_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (proof_id, tag_id),
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS log_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      body TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS log_tags (
      entry_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, tag_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS log_proofs (
      entry_id INTEGER NOT NULL,
      proof_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, proof_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS log_chapters (
      entry_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (entry_id, chapter_id),
      FOREIGN KEY (entry_id) REFERENCES log_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS refs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      citation_key TEXT NOT NULL UNIQUE,
      title TEXT NOT NULL DEFAULT '',
      authors TEXT NOT NULL DEFAULT '',
      year INTEGER,
      journal TEXT NOT NULL DEFAULT '',
      doi TEXT NOT NULL DEFAULT '',
      url TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      read_status TEXT NOT NULL DEFAULT 'Unread'
    );

    CREATE TABLE IF NOT EXISTS ref_chapters (
      ref_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (ref_id, chapter_id),
      FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS ref_proofs (
      ref_id INTEGER NOT NULL,
      proof_id INTEGER NOT NULL,
      PRIMARY KEY (ref_id, proof_id),
      FOREIGN KEY (ref_id) REFERENCES refs(id) ON DELETE CASCADE,
      FOREIGN KEY (proof_id) REFERENCES proofs(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS milestones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      due_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Pending'
    );

    CREATE TABLE IF NOT EXISTS milestone_chapters (
      milestone_id INTEGER NOT NULL,
      chapter_id INTEGER NOT NULL,
      PRIMARY KEY (milestone_id, chapter_id),
      FOREIGN KEY (milestone_id) REFERENCES milestones(id) ON DELETE CASCADE,
      FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS notation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      symbol TEXT NOT NULL,
      latex TEXT NOT NULL,
      definition TEXT NOT NULL DEFAULT '',
      first_used_chapter_id INTEGER,
      FOREIGN KEY (first_used_chapter_id) REFERENCES chapters(id) ON DELETE SET NULL
    );
  `);

  // Ensure a thesis row always exists for editing
  db.prepare(`
    INSERT OR IGNORE INTO thesis (id, title, supervisor, university, degree, expected_submission, abstract)
    VALUES (1, '', '', '', '', '', '')
  `).run();
}

initSchema();

export default db;
