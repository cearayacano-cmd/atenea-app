import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
  const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles").all();
  console.log("All BloquesNoDisponibles rows:", blocks);
} catch (e) {
  console.log("Error querying BloquesNoDisponibles:", e.message);
}
db.close();
