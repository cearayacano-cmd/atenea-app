import Database from "better-sqlite3";
import path from "path";

const db = new Database("database.db");

function massSeed() {
  console.log("🚀 Iniciando Carga Masiva de Datos Pro (LATAM Style)...");

  // Limpiar tablas para evitar basura
  db.prepare("DELETE FROM Tareas").run();
  db.prepare("DELETE FROM PlanesDiarios").run();
  db.prepare("DELETE FROM Incidencias").run();
  db.prepare("DELETE FROM Backlog").run();

  const areas = ["Estrategia", "Growth", "Operaciones", "Legal", "Producto", "Análisis"];
  const actividadesEstrategicas = [
    "Monitoreo de KPIs de Puntualidad",
    "Análisis de Capacidad Operativa",
    "Sincronización con Torre de Control",
    "Revisión de Procesos de Check-in",
    "Auditoría de Seguridad Operacional",
    "Planificación de Mantenimiento Preventivo"
  ];

  const hallazgosEjemplos = [
    "Se detectó una mejora del 15% en el tiempo de respuesta.",
    "Cuello de botella identificado en el proceso de embarque.",
    "Fuga de eficiencia en el cambio de turno resuelta.",
    "Evidencia enviada al departamento de Calidad.",
    "Sincronización exitosa con los sistemas centrales."
  ];

  // Generar fechas desde el 1 de mayo hasta hoy (14 de mayo)
  for (let i = 1; i <= 14; i++) {
    const day = i < 10 ? `0${i}` : `${i}`;
    const date = `2026-05-${day}`;
    const isToday = i === 14;

    // 1. Crear Plan Diario
    const estadoCierre = isToday ? 0 : 1;
    db.prepare("INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, estado_cierre, ejecucion_iniciada) VALUES (?, ?, ?, ?, ?, ?)")
      .run(date, "08:00", "17:00", 9, estadoCierre, 1);

    // 2. Crear Tareas
    actividadesEstrategicas.forEach((act, idx) => {
      const prioridad = idx < 2 ? 10 : idx < 4 ? 7 : 4;
      const area = areas[idx % areas.length];
      
      // Hoy está al 50%, otros días al 100%
      let completada = 1;
      let estado = 'terminada';
      if (isToday && idx >= 3) {
        completada = 0;
        estado = 'en espera';
      }

      const hallazgo = !isToday || completada === 1 ? hallazgosEjemplos[idx % hallazgosEjemplos.length] : "";
      const evidencia = completada === 1 ? "https://latam.sharepoint.com/reporte-" + day : "";

      db.prepare(`
        INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, hora_inicio_plan, hora_fin_plan, completada, estado_ejecucion, hallazgos, evidencia) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        date, 
        act, 
        prioridad, 
        area, 
        60, 
        JSON.stringify([`${8 + idx}:00`]), 
        JSON.stringify([`${9 + idx}:00`]), 
        completada, 
        estado,
        hallazgo,
        evidencia
      );
    });

    // 3. Crear Incidencias (algunas sí, otras no)
    if (i % 2 === 0) {
      db.prepare("INSERT INTO Incidencias (fecha, descripcion, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?, ?)")
        .run(date, "Reunión extraordinaria de coordinación", "11:30", "12:15", "Interrupción");
    }
  }

  // 4. Poblar Backlog
  const backlog = [
    { act: "Migración a Sistema Atenea Pro v2", prio: 10, area: "Sistemas" },
    { act: "Optimización de Algoritmo de Turnos", prio: 7, area: "Operaciones" },
    { act: "Revisión de Políticas de Equipaje", prio: 4, area: "Legal" }
  ];

  const insertBacklog = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, ?, ?)");
  backlog.forEach(item => {
    insertBacklog.run(item.act, item.prio, "pendiente", item.area);
  });

  console.log("✅ Carga Masiva Completada. Sistema Pro listo para Demo.");
}

try {
  massSeed();
} catch (e) {
  console.error("❌ Error en carga masiva:", e);
} finally {
  db.close();
}
