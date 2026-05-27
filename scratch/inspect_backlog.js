import Database from 'better-sqlite3';
const db = new Database('database.db');
try {
  const backlog = db.prepare("SELECT * FROM Backlog").all();
  console.log("Backlog items:", backlog);
} catch (e) {
  console.log("Error querying Backlog:", e.message);
}
try {
  const assignments = db.prepare("SELECT * FROM BacklogAsignaciones").all();
  console.log("Backlog assignments:", assignments);
} catch (e) {
  console.log("Error querying BacklogAsignaciones:", e.message);
}
db.close();
