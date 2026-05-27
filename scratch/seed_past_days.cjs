const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('database.db');
const db = new Database(dbPath);

console.log('Seeding past days at:', dbPath);

db.transaction(() => {
  // Clear any existing tasks and plans first to start fresh
  db.prepare('DELETE FROM Tareas').run();
  db.prepare('DELETE FROM PlanesDiarios').run();
  db.prepare('DELETE FROM Incidencias').run();
  db.prepare('DELETE FROM BloquesNoDisponibles').run();
  db.prepare('DELETE FROM Backlog').run();
  db.prepare('DELETE FROM BacklogAsignaciones').run();

  const userIds = [1, 34, 35, 36]; // Seed for main test users

  // Seed Backlog Items
  const stmtBacklog = db.prepare(`
    INSERT INTO Backlog (id, actividad, prioridad, status, area, complejidad, tiempo_estimado, rol_ejecutante, owner_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  stmtBacklog.run(101, 'Revisión levantamientos Operación', 2, 'nuevo', 'Operativo', 1, 30, 'Calidad LATAM', 34);
  stmtBacklog.run(102, 'Armar slide y plan de acción para seguimiento', 4, 'nuevo', 'Tendencias', 2, 60, 'Calidad Fabrica', 36);
  stmtBacklog.run(103, 'Revisión de indicadores entregados por RADAR', 4, 'nuevo', 'Calidad', 1, 60, 'Calidad Fabrica', 36);
  stmtBacklog.run(104, 'Análisis profundo IA + escuchas', 7, 'nuevo', 'Escuelita', 3, 240, 'Calidad LATAM', 34);

  // 1. Friday May 22, 2026 (CLOSED) - Insert global plan
  db.prepare(`
    INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, es_ajuste_manual, estado_cierre, ejecucion_iniciada, user_id)
    VALUES ('2026-05-22', '08:00', '17:00', 6.0, 0, 1, 1, 1)
  `).run();

  // 2. Monday May 25, 2026 (OPEN) - Insert global plan
  db.prepare(`
    INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, es_ajuste_manual, estado_cierre, ejecucion_iniciada, user_id)
    VALUES ('2026-05-25', '08:00', '17:00', 6.0, 0, 0, 1, 1)
  `).run();

  userIds.forEach(uid => {
    // Friday tasks (all completed/resuelto)
    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, completada, estado_ejecucion, tiempo_asignado_minutos, complejidad, area, user_id)
      VALUES ('2026-05-22', 'Auditorias PCA/PTA', 7, 1, 'resuelto', 240, 2, 'Calidad', ?)
    `).run(uid);

    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, completada, estado_ejecucion, tiempo_asignado_minutos, complejidad, area, user_id)
      VALUES ('2026-05-22', 'Calibraciones', 4, 1, 'resuelto', 60, 1, 'Operativo', ?)
    `).run(uid);

    // Monday tasks (pending/en curso)
    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, completada, estado_ejecucion, tiempo_asignado_minutos, complejidad, area, user_id)
      VALUES ('2026-05-25', 'Auditorias BOT', 4, 0, 'pendiente', 180, 1, 'Monitoreo', ?)
    `).run(uid);

    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, completada, estado_ejecucion, tiempo_asignado_minutos, complejidad, area, user_id)
      VALUES ('2026-05-25', 'Análisis profundo IA + escuchas', 7, 0, 'progreso', 240, 3, 'Escuelita', ?)
    `).run(uid);

    // Almuerzo exception block for both days
    db.prepare(`
      INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, descripcion, user_id)
      VALUES ('2026-05-22', '13:00', '14:00', 'Almuerzo', 'Almuerzo diario', ?)
    `).run(uid);
    db.prepare(`
      INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, descripcion, user_id)
      VALUES ('2026-05-25', '13:00', '14:00', 'Almuerzo', 'Almuerzo diario', ?)
    `).run(uid);
  });
})();

console.log('Seeding completed successfully!');
