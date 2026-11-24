
import { DatabaseSync } from "node:sqlite";

// One SQLite file holds everything. Back it up by copying this file.
export const db = new DatabaseSync(process.env.DB_PATH ?? "foodbrain.db");

// Create the tables the first time; does nothing if they already exist.
db.exec(`
  PRAGMA foreign_keys = ON;
 
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE COLLATE NOCASE,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
 
  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
 
  CREATE TABLE IF NOT EXISTS profiles (
    user_id INTEGER PRIMARY KEY REFERENCES users(id),
    basics TEXT NOT NULL,  -- JSON list, e.g. ["Oil","Salt","Pepper"]
    diets TEXT NOT NULL,   -- JSON list, e.g. ["Vegetarian"]
    notes TEXT NOT NULL
  );
 
  CREATE TABLE IF NOT EXISTS ingredients (
    user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL COLLATE NOCASE,
    use_count INTEGER NOT NULL DEFAULT 0,
    last_used_at TEXT,
    PRIMARY KEY (user_id, name)
  );

  CREATE TABLE IF NOT EXISTS favourites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    recipe TEXT NOT NULL,       -- the full recipe, as JSON
    ingredients TEXT NOT NULL,  -- JSON: what you had when it was made (for the chat)
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);
