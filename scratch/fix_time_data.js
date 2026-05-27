import Database from 'better-sqlite3';
const db = new Database('database.db');

db.transaction(() => {
  db.prepare("UPDATE Tareas SET tiempo_asignado_minutos = 90 WHERE fecha = '2026-05-22' AND actividad = 'Auditoría Interna de Procesos'").run();
  db.prepare("UPDATE Tareas SET tiempo_asignado_minutos = 90 WHERE fecha = '2026-05-22' AND actividad = 'Revisar alarmas en RADAR'").run();
  db.prepare("UPDATE Tareas SET tiempo_asignado_minutos = 60 WHERE fecha = '2026-05-22' AND actividad = 'Revisar correos de monitoreo'").run();
  db.prepare("UPDATE Tareas SET tiempo_asignado_minutos = 30 WHERE fecha = '2026-05-22' AND actividad = 'Reunión de Sincronización diaria'").run();
  db.prepare("UPDATE Tareas SET tiempo_asignado_minutos = 120 WHERE fecha = '2026-05-22' AND actividad = 'Capacitación de Calidad'").run();
})();

console.log("Database updated successfully for 2026-05-22 tasks!");
db.close();
