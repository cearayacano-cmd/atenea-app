import Database from 'better-sqlite3';
const db = new Database('database.db');

console.log("🚀 Iniciando Seeding Masivo de Alta Densidad...");

// Limpiar para evitar duplicados en días clave si es necesario, 
// pero aquí vamos a agregar sobre lo que hay.

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

  // 4-8 tareas por día
  const taskCount = 4 + Math.floor(Math.random() * 5);
  
  for (let j = 0; j < taskCount; j++) {
    const prioridad = priorities[Math.floor(Math.random() * priorities.length)];
    const area = areas[Math.floor(Math.random() * areas.length)];
    const status = statusList[Math.floor(Math.random() * statusList.length)];
    
    // Insertar en Tareas
    db.prepare(`
      INSERT INTO Tareas (fecha, actividad, prioridad, area, estado_ejecucion, tiempo_asignado_minutos, tiempo_invertido_minutos, hallazgos)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      dateStr,
      `Tarea operativa ${j + 1} - Módulo ${area}`,
      prioridad,
      area,
      status,
      60,
      status === 'resuelto' ? 45 + Math.floor(Math.random() * 30) : 0,
      status === 'resuelto' ? 'Ejecución completada según protocolo estándar.' : null
    );

    // Insertar en Backlog también para que el gráfico de backlog tenga volumen
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
}

console.log("✅ Seeding completado con éxito. 30 días de historia generados.");
