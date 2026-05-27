import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
  const users = db.prepare("SELECT * FROM Usuarios").all();
  console.log("All Users:", users);
} catch (e) {
  console.log("Error querying Users:", e.message);
}
db.close();
