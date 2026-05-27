const Database = require('better-sqlite3');
const db = new Database('database.db');

const tasks = db.prepare('SELECT * FROM Tareas WHERE backlog_id IS NULL').all();
console.log(`Found ${tasks.length} tasks without backlog_id`);

db.transaction(() => {
  for (const t of tasks) {
    const res = db.prepare('INSERT INTO Backlog (actividad, prioridad, status, area, created_at) VALUES (?, ?, ?, ?, ?)').run(
      t.actividad, t.prioridad, t.estado_ejecucion || 'nuevo', t.area || 'Operativo', t.created_at || new Date().toISOString()
    );
    const newBacklogId = res.lastInsertRowid;
    db.prepare('UPDATE Tareas SET backlog_id = ? WHERE id = ?').run(newBacklogId, t.id);
  }
})();
console.log('Done fixing backlog.');
