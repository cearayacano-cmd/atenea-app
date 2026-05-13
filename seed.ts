import Database from "better-sqlite3";
import path from "path";

const db = new Database("database.db");
const today = "2026-05-11";

function seed() {
  console.log("Seeding data for Atenea...");

  // 1. Clear some tables to avoid duplicates (optional, but let's just add)
  
  // 2. Add Backlog Items
  const backlogItems = [
    { actividad: "Revisión de Estrategia Trimestral Q3", prioridad: 10, status: "pendiente", area: "Estrategia" },
    { actividad: "Actualización de Dashboard de KPIs", prioridad: 7, status: "en curso", area: "Análisis" },
    { actividad: "Capacitación Equipo de Ventas - Nuevas Funciones", prioridad: 4, status: "en estudio", area: "Ventas" },
    { actividad: "Optimización de Base de Datos Clientes", prioridad: 7, status: "pendiente", area: "Tecnología" },
    { actividad: "Redacción de Newsletter Mensual", prioridad: 2, status: "en espera", area: "Marketing" },
    { actividad: "Sincronización con Creadora de Atenea", prioridad: 10, status: "pendiente", area: "Producto" }
  ];

  const insertBacklog = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, ?, ?)");
  backlogItems.forEach(item => {
    insertBacklog.run(item.actividad, item.prioridad, item.status, item.area);
  });

  // 3. Add Daily Plan for Today
  db.prepare("INSERT OR REPLACE INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, estado_cierre, ejecucion_iniciada) VALUES (?, ?, ?, ?, ?, ?)")
    .run(today, "08:30", "18:00", 7.5, 0, 0);

  // 4. Add Tasks for Today
  const todayTasks = [
    { actividad: "Reunión de Sincronización Matutina", prioridad: 7, area: "Operaciones", tiempo: 60, hora_ini: '["08:30"]', hora_fin: '["09:30"]' },
    { actividad: "Análisis de Fugas de Conversión", prioridad: 10, area: "Growth", tiempo: 120, hora_ini: '["10:00"]', hora_fin: '["12:00"]' },
    { actividad: "Revisión de Contratos Legales", prioridad: 4, area: "Legal", tiempo: 45, hora_ini: '["14:00"]', hora_fin: '["14:45"]' }
  ];

  const insertTask = db.prepare(`
    INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, hora_inicio_plan, hora_fin_plan, completada) 
    VALUES (?, ?, ?, ?, ?, ?, ?, 0)
  `);
  
  todayTasks.forEach(t => {
    insertTask.run(today, t.actividad, t.prioridad, t.area, t.tiempo, t.hora_ini, t.hora_fin);
  });

  // 5. Add an Incident
  db.prepare("INSERT INTO Incidencias (fecha, descripcion, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?, ?)")
    .run(today, "Llamada de urgencia - Cliente Platinum", "12:15", "13:00", "urgencia");

  // 6. Add a Blocked Time Slot
  db.prepare("INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?)")
    .run(today, "13:00", "14:00", "almuerzo");

  console.log("Seed complete! 'Information X' has been added.");
}

try {
  seed();
} catch (e) {
  console.error("Error seeding data:", e);
} finally {
  db.close();
}
