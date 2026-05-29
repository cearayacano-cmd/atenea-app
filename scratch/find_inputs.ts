import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log("TABLES:", tables);

for (const table of tables as any[]) {
  const name = table.name;
  const count = db.prepare(`SELECT COUNT(*) as count FROM ${name}`).get() as any;
  console.log(`Table ${name}: ${count.count} rows`);
}
