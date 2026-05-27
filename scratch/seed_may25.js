import Database from 'better-sqlite3';
const db = new Database('database.db');

const targetDate = '2026-05-25';

db.transaction(() => {
  // 1. Delete existing data for 2026-05-25 to prevent duplicates
  db.prepare("DELETE FROM Tareas WHERE fecha = ?").run(targetDate);
  db.prepare("DELETE FROM PlanesDiarios WHERE date = ?").run(targetDate);
  db.prepare("DELETE FROM BloquesNoDisponibles WHERE fecha = ?").run(targetDate);
  db.prepare("DELETE FROM Incidencias WHERE fecha = ?").run(targetDate);

  // 2. Insert single Plan Diario (since date is PRIMARY KEY)
  db.prepare(`
    INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, es_ajuste_manual, estado_cierre, ejecucion_iniciada, hora_inicio_ejecucion, user_id)
    VALUES (?, '08:00', '17:00', 6.0, 0, 0, 1, '08:00', 1)
  `).run(targetDate);

  const users = [1, 37, 38, 39, 40];

  users.forEach(userId => {
    // 3. Insert Almuerzo exception block
    db.prepare(`
      INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion, user_id)
      VALUES (?, '13:00', '14:00', 'Almuerzo', null, 'Almuerzo programado', ?)
    `).run(targetDate, userId);

    // 4. Determine role (1, 37, 40 are Calidad Fabrica; 38, 39 are Calidad LATAM)
    if (userId === 38 || userId === 39) {
      // Calidad LATAM
      const latamTasks = [
        {
          actividad: "Análisis profundo IA + escuchas",
          prioridad: 10,
          area: "Calidad",
          tiempo: 240,
          hora_ini: '["08:00"]',
          hora_fin: '["12:00"]',
          complejidad: 3
        },
        {
          actividad: "Auditorias BOT",
          prioridad: 4,
          area: "Monitoreo",
          tiempo: 180,
          hora_ini: '["12:00","14:00"]',
          hora_fin: '["13:00","16:00"]',
          complejidad: 1
        }
      ];

      latamTasks.forEach(t => {
        db.prepare(`
          INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, hora_inicio_plan, hora_fin_plan, completada, estado_ejecucion, user_id, complejidad) 
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'nuevo', ?, ?)
        `).run(targetDate, t.actividad, t.prioridad, t.area, t.tiempo, t.hora_ini, t.hora_fin, userId, t.complejidad);
      });
    } else {
      // Calidad Fabrica
      const fabricaTasks = [
        {
          actividad: "Revisión de indicadores entregados por RADAR",
          prioridad: 4,
          area: "Monitoreo",
          tiempo: 60,
          hora_ini: '["08:00"]',
          hora_fin: '["09:00"]',
          complejidad: 1
        },
        {
          actividad: "Hipótesis: planteamiento + contexto operacional (en plataforma)",
          prioridad: 4,
          area: "Calidad",
          tiempo: 75,
          hora_ini: '["09:00"]',
          hora_fin: '["10:15"]',
          complejidad: 2
        },
        {
          actividad: "Escuchas y validacion de hipotesis (en plataforma)",
          prioridad: 7,
          area: "Calidad",
          tiempo: 165,
          hora_ini: '["10:15"]',
          hora_fin: '["13:00"]',
          complejidad: 2
        },
        {
          actividad: "Validación hipótesis en conjunto con LCoach",
          prioridad: 4,
          area: "Calidad",
          tiempo: 60,
          hora_ini: '["14:00"]',
          hora_fin: '["15:00"]',
          complejidad: 1
        },
        {
          actividad: "Análisis con IA: descarga LEA + armado para análisis IA",
          prioridad: 10,
          area: "Tecnología",
          tiempo: 60,
          hora_ini: '["15:00"]',
          hora_fin: '["16:00"]',
          complejidad: 3
        },
        {
          actividad: "Armar slide y plan de acción para seguimiento",
          prioridad: 7,
          area: "Estrategia",
          tiempo: 60,
          hora_ini: '["16:00"]',
          hora_fin: '["17:00"]',
          complejidad: 2
        }
      ];

      fabricaTasks.forEach(t => {
        db.prepare(`
          INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, hora_inicio_plan, hora_fin_plan, completada, estado_ejecucion, user_id, complejidad) 
          VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'nuevo', ?, ?)
        `).run(targetDate, t.actividad, t.prioridad, t.area, t.tiempo, t.hora_ini, t.hora_fin, userId, t.complejidad);
      });
    }
  });
})();

console.log("Seeding for 2026-05-25 complete!");
db.close();
