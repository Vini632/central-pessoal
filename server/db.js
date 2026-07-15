const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'central.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    content TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS todos (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL DEFAULT '',
    done INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    url TEXT NOT NULL DEFAULT ''
  );
  DROP TABLE IF EXISTS events;
  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL DEFAULT '',
    startTime TEXT NOT NULL DEFAULT '',
    endTime TEXT NOT NULL DEFAULT '',
    location TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    reminder INTEGER NOT NULL DEFAULT 0,
    reminderTime TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS habits (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL DEFAULT '',
    icon TEXT NOT NULL DEFAULT '○',
    color TEXT NOT NULL DEFAULT '#ffffff',
    sortOrder INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS habit_logs (
    habitId TEXT NOT NULL,
    date TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (habitId, date)
  );
  CREATE TABLE IF NOT EXISTS leitura (
    id TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    title TEXT DEFAULT '',
    description TEXT DEFAULT '',
    icon TEXT DEFAULT '',
    read INTEGER DEFAULT 0,
    added INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
`);

function dbAll(table) {
  return db.prepare(`SELECT * FROM ${table}`).all();
}

function dbDeleteAll(table) {
  db.prepare(`DELETE FROM ${table}`).run();
}

function dbInsert(table, row) {
  const keys = Object.keys(row);
  const vals = Object.values(row);
  const placeholders = keys.map(() => '?').join(',');
  db.prepare(`INSERT OR REPLACE INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`).run(...vals);
}

const TABLES = {
  central_notes: 'notes',
  central_todo: 'todos',
  central_links: 'links',
  central_events: 'events',
  central_habits: 'habits',
  central_habit_logs: 'habit_logs',
  central_leitura: 'leitura',
};

const SENSITIVE_KEYS = ['youtubeApiKey', 'driveToken'];

module.exports = { db, dbAll, dbDeleteAll, dbInsert, TABLES, SENSITIVE_KEYS, DB_PATH };
