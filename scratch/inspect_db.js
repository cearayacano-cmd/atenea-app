import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
  const user1 = db.prepare("SELECT * FROM Usuarios WHERE id = 1").get();
  console.log("User 1:", user1);
} catch (e) {
  console.log("Error querying User 1:", e.message);
}
try {
  const plan25 = db.prepare("SELECT * FROM PlanesDiarios WHERE date = '2026-05-25'").get();
  console.log("Plan on 2026-05-25:", plan25);
} catch (e) {
  console.log("Error querying plan:", e.message);
}
db.close();
