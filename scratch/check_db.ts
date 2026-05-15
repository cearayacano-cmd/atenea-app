import Database from 'better-sqlite3';
const db = new Database('database.db');

const rows = db.prepare('SELECT fecha, COUNT(*) as count FROM Tareas GROUP BY fecha ORDER BY fecha DESC LIMIT 10').all();
console.log(JSON.stringify(rows, null, 2));
