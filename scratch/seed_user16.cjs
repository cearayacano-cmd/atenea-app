const Database = require('better-sqlite3');
const db = new Database('database.db');

// Copy tasks from user 1 to user 16
const tareas1 = db.prepare('SELECT * FROM Tareas WHERE user_id = 1').all();
console.log('Tareas user 1 to copy:', tareas1.length);

const insertTarea = db.prepare(`
  INSERT OR IGNORE INTO Tareas 
  (fecha, actividad, prioridad, completada, estado_ejecucion, hallazgos, justificacion, 
   hora_inicio_plan, hora_fin_plan, tiempo_asignado_minutos, minutos_remanentes, 
   fecha_origen_remanente, backlog_id, evidencia, area, tiempo_invertido_minutos, 
   user_id, complejidad, created_at, assigned_at, closed_at)
  VALUES 
  (?, ?, ?, ?, ?, ?, ?,
   ?, ?, ?, ?,
   ?, ?, ?, ?, ?,
   ?, ?, ?, ?, ?)
`);

tareas1.forEach(t => {
  insertTarea.run(
    t.fecha, t.actividad, t.prioridad, t.completada, t.estado_ejecucion, t.hallazgos, t.justificacion,
    t.hora_inicio_plan, t.hora_fin_plan, t.tiempo_asignado_minutos, t.minutos_remanentes,
    t.fecha_origen_remanente, t.backlog_id, t.evidencia, t.area, t.tiempo_invertido_minutos,
    16, t.complejidad, t.created_at, t.assigned_at, t.closed_at
  );
});

// Copy incidencias from user 1 to user 16
const incSchema = db.prepare('PRAGMA table_info(Incidencias)').all();
console.log('Incidencias cols:', incSchema.map(c => c.name).join(', '));

const incidencias1 = db.prepare('SELECT * FROM Incidencias WHERE user_id = 1').all();
console.log('Incidencias user 1 to copy:', incidencias1.length);

incidencias1.forEach(inc => {
  try {
    db.prepare('INSERT OR IGNORE INTO Incidencias (fecha, hora_inicio, hora_fin, tipo, descripcion, user_id) VALUES (?, ?, ?, ?, ?, ?)').run(
      inc.fecha, inc.hora_inicio, inc.hora_fin, inc.tipo, inc.descripcion, 16
    );
  } catch(e) {
    console.log('Error inserting incidencia:', e.message);
  }
});

const tareasU16 = db.prepare('SELECT COUNT(*) as cnt FROM Tareas WHERE user_id = 16').get();
const incU16 = db.prepare('SELECT COUNT(*) as cnt FROM Incidencias WHERE user_id = 16').get();
console.log('Final - Tareas user 16:', tareasU16.cnt, 'Incidencias user 16:', incU16.cnt);

db.close();
