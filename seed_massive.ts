import Database from 'better-sqlite3';
const db = new Database('database.db');

console.log("🚀 Iniciando Seeding Masivo de Alta Densidad para la rama de trabajo...");

// Limpiar base de datos para asegurar un estado limpio y comparativo
db.transaction(() => {
  db.prepare("DELETE FROM Tareas").run();
  db.prepare("DELETE FROM PlanesDiarios").run();
  db.prepare("DELETE FROM Incidencias").run();
  db.prepare("DELETE FROM BloquesNoDisponibles").run();
  db.prepare("DELETE FROM Backlog").run();
})();

const areas = ['OPERACIONES', 'MONITOREO', 'ESTRATEGIA', 'SEGURIDAD', 'CALIDAD', 'INFRAESTRUCTURA'];
const statusList = ['nuevo', 'abierto', 'pendiente', 'en espera', 'resuelto', 'fallo', 'despriorizado'];
const priorities = [10, 7, 4, 2];

// Generar data para los últimos 30 días
for (let i = 0; i < 30; i++) {
  const d = new Date();
  d.setDate(d.getDate() - i);
  const dateStr = d.toISOString().split('T')[0];
  const isWeekend = d.getDay() === 0 || d.getDay() === 6;

  if (isWeekend) continue; // No trabajamos fines de semana

  // Tareas diarias
  const taskCount = 4 + Math.floor(Math.random() * 5);
  
  // Agregar plan diario
  db.prepare(`
    INSERT OR REPLACE INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, estado_cierre, ejecucion_iniciada)
    VALUES (?, '08:00', '17:00', 6.0, 1, 1)
  `).run(dateStr);

  for (let j = 0; j < taskCount; j++) {
    const prioridad = priorities[Math.floor(Math.random() * priorities.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const status = statusList[Math.floor(Math.random() * statusList.length)];
    const completada = ['resuelto', 'terminada'].includes(status) ? 1 : 0;
    
    // Insertar en Tareas
    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, area, estado_ejecucion, tiempo_asignado_minutos, tiempo_invertido_minutos, hallazgos, completada)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dateStr,
      `Tarea operativa ${j + 1} - Módulo ${area}`,
      prioridad,
      area,
      status,
      60,
      status === 'resuelto' ? 45 + Math.floor(Math.random() * 30) : 0,
      status === 'resuelto' ? 'Ejecución completada según protocolo estándar.' : null,
      completada
    );

    // Insertar en Backlog también
    db.prepare(`
      INSERT INTO Backlog (actividad, prioridad, area, status, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      `Ítem de Backlog #${Math.floor(Math.random() * 1000)}`,
      prioridad,
      area,
      status === 'resuelto' ? 'resuelto' : 'pendiente',
      dateStr
    );
  }

  // Bloque almuerzo
  db.prepare(`
    INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo)
    VALUES (?, '13:00', '14:00', 'Almuerzo')
  `).run(dateStr);
}

console.log("✅ Seeding completado con éxito. 30 días de historia generados.");
db.close();
