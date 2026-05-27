import Database from 'better-sqlite3';
const db = new Database('database.db');

const testUserIds = [1, 37, 38, 39, 40];

testUserIds.forEach(uid => {
  console.log(`--- TESTING FOR USER ID: ${uid} ---`);
  
  // Test Backlog query
  try {
    const backlog = db.prepare(`
      SELECT DISTINCT b.*, 
             t.fecha as scheduled_date, 
             t.estado_ejecucion as execution_status
      FROM Backlog b
      LEFT JOIN Tareas t ON b.id = t.backlog_id 
        AND t.fecha = (SELECT MAX(fecha) FROM Tareas WHERE backlog_id = b.id)
      LEFT JOIN BacklogAsignaciones ba ON b.id = ba.backlog_id
      WHERE b.owner_id = ? OR (b.is_collaborative = 1 AND ba.user_id = ?)
    `).all(uid, uid);
    console.log(`Backlog count for ${uid}:`, backlog.length);
  } catch (e) {
    console.log("Backlog query error:", e.message);
  }

  // Test Exceptions query
  try {
    const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE user_id = ?").all(uid);
    console.log(`Blocks count for ${uid}:`, blocks.length);
  } catch (e) {
    console.log("Blocks query error:", e.message);
  }
});

db.close();
