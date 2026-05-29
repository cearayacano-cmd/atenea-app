import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'database.db');
const db = new Database(dbPath);

const backlog = db.prepare("SELECT * FROM Backlog").all();
console.log("BACKLOG ITEMS:");
backlog.forEach((b: any) => {
  console.log(`ID ${b.id}: status=${b.status}, area=${b.area}, complejidad=${b.complejidad}, tiempo_estimado=${b.tiempo_estimado}, actividad="${b.actividad}"`);
});
