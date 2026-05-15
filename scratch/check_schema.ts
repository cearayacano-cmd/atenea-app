import Database from 'better-sqlite3';
const db = new Database('./database.db');
const tableInfo = db.prepare("PRAGMA table_info(BloquesNoDisponibles)").all();
console.log(tableInfo);
db.close();
