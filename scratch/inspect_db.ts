import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

console.log("LAST 10 BACKLOG ITEMS:");
const backlog = db.prepare("SELECT * FROM Backlog ORDER BY id DESC LIMIT 10").all();
console.log(JSON.stringify(backlog, null, 2));

console.log("\nLAST 10 TAREAS ITEMS:");
const tareas = db.prepare("SELECT * FROM Tareas ORDER BY id DESC LIMIT 10").all();
console.log(JSON.stringify(tareas, null, 2));
