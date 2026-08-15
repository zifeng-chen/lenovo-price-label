import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import Database from 'better-sqlite3'

const DEFAULT_CATEGORIES = [
  '背包',
  '键鼠',
  '耳机',
  '充电器',
  '支架',
  '电脑配件',
  '音响',
  '打印机',
]

const serverDirectory = path.dirname(fileURLToPath(import.meta.url))
const dataDirectory = path.resolve(serverDirectory, '../data')
fs.mkdirSync(dataDirectory, { recursive: true })

const database = new Database(path.join(dataDirectory, 'database.db'))
database.pragma('journal_mode = WAL')
database.pragma('foreign_keys = ON')

database.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    sort_order INTEGER NOT NULL DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL REFERENCES categories(name) ON UPDATE CASCADE,
    price REAL NOT NULL CHECK(price >= 0),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  CREATE INDEX IF NOT EXISTS idx_products_updated_at ON products(updated_at DESC);
`)

const seedCategories = database.transaction((categories) => {
  const insert = database.prepare(`
    INSERT OR IGNORE INTO categories (name, sort_order)
    VALUES (?, ?)
  `)

  categories.forEach((name, index) => insert.run(name, index + 1))
})

seedCategories(DEFAULT_CATEGORIES)

export default database
