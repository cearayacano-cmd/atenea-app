import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.db");

// Initialize database with requested schema
db.exec(`
  CREATE TABLE IF NOT EXISTS Configuracion (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    hora_inicio TEXT DEFAULT '08:00',
    hora_fin TEXT DEFAULT '17:00',
    horas_efectivas REAL DEFAULT 6.0
  );

  CREATE TABLE IF NOT EXISTS PlanesDiarios (
    date TEXT PRIMARY KEY,
    hora_inicio TEXT,
    hora_fin TEXT,
    horas_efectivas REAL,
    es_ajuste_manual INTEGER DEFAULT 0,
    estado_cierre INTEGER DEFAULT 0,
    ejecucion_iniciada INTEGER DEFAULT 0,
    hora_inicio_ejecucion TEXT
  );

  CREATE TABLE IF NOT EXISTS Tareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    actividad TEXT,
    prioridad INTEGER,
    completada INTEGER DEFAULT 0,
    estado_ejecucion TEXT DEFAULT NULL,
    hallazgos TEXT,
    justificacion TEXT,
    hora_inicio_plan TEXT,
    hora_fin_plan TEXT,
    tiempo_asignado_minutos INTEGER,
    minutos_remanentes INTEGER DEFAULT 0,
    fecha_origen_remanente TEXT,
    backlog_id INTEGER,
    evidencia TEXT,
    area TEXT,
    tiempo_invertido_minutos INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS Incidencias (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    descripcion TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    tipo TEXT
  );

  CREATE TABLE IF NOT EXISTS BloquesNoDisponibles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fecha TEXT,
    hora_inicio TEXT,
    hora_fin TEXT,
    tipo TEXT,
    descripcion TEXT,
    dia_semana TEXT
  );

  CREATE TABLE IF NOT EXISTS Backlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividad TEXT,
    prioridad INTEGER DEFAULT 4,
    status TEXT DEFAULT 'pendiente',
    area TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS LogsTareas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tarea_id INTEGER,
    estado_anterior TEXT,
    estado_nuevo TEXT,
    fecha_hora DATETIME DEFAULT CURRENT_TIMESTAMP,
    comentario TEXT,
    FOREIGN KEY(tarea_id) REFERENCES Tareas(id)
  );

  INSERT OR IGNORE INTO Configuracion (id, hora_inicio, hora_fin, horas_efectivas) VALUES (1, '08:00', '17:00', 6.0);

`);

// Migration: Add columns if they don't exist (for existing databases)
const tableInfo = db.prepare("PRAGMA table_info(Tareas)").all();
const columns = tableInfo.map((c: any) => c.name);
if (!columns.includes("hora_inicio_plan")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN hora_inicio_plan TEXT");
}
if (!columns.includes("hora_fin_plan")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN hora_fin_plan TEXT");
}
if (!columns.includes("tiempo_assigned_minutos") && !columns.includes("tiempo_asignado_minutos")) {
  if (!columns.includes("tiempo_asignado_minutos")) {
    db.exec("ALTER TABLE Tareas ADD COLUMN tiempo_asignado_minutos INTEGER");
  }
}
if (!columns.includes("minutos_remanentes")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN minutos_remanentes INTEGER DEFAULT 0");
}
if (!columns.includes("fecha_origen_remanente")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN fecha_origen_remanente TEXT");
}
if (!columns.includes("backlog_id")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN backlog_id INTEGER");
}
if (!columns.includes("area")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN area TEXT");
}

const backlogInfo = db.prepare("PRAGMA table_info(Backlog)").all();
const backlogColumns = backlogInfo.map((c: any) => c.name);
if (!backlogColumns.includes("area")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN area TEXT");
}
if (!backlogColumns.includes("created_at")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
}
if (!columns.includes("estado_ejecucion")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN estado_ejecucion TEXT DEFAULT NULL");
}
if (!columns.includes("evidencia")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN evidencia TEXT");
}
if (!columns.includes("tiempo_invertido_minutos")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN tiempo_invertido_minutos INTEGER DEFAULT 0");
}

const planInfo = db.prepare("PRAGMA table_info(PlanesDiarios)").all();
const planColumns = planInfo.map((c: any) => c.name);
if (!planColumns.includes("estado_cierre")) {
  db.exec("ALTER TABLE PlanesDiarios ADD COLUMN estado_cierre INTEGER DEFAULT 0");
}
if (!planColumns.includes("ejecucion_iniciada")) {
  db.exec("ALTER TABLE PlanesDiarios ADD COLUMN ejecucion_iniciada INTEGER DEFAULT 0");
}
if (!planColumns.includes("hora_inicio_ejecucion")) {
  db.exec("ALTER TABLE PlanesDiarios ADD COLUMN hora_inicio_ejecucion TEXT");
}

const bloquesInfo = db.prepare("PRAGMA table_info(BloquesNoDisponibles)").all();
const bloquesColumns = bloquesInfo.map((c: any) => c.name);
if (!bloquesColumns.includes("descripcion")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN descripcion TEXT");
}
if (!bloquesColumns.includes("dia_semana")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN dia_semana TEXT");
}

const blockInfo = db.prepare("PRAGMA table_info(BloquesNoDisponibles)").all();
const blockColumns = blockInfo.map((c: any) => c.name);
if (!blockColumns.includes("dia_semana")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN dia_semana TEXT");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.set("trust proxy", true);
  app.use(express.json());

  // User Identity from IAP
  app.get("/api/me", (req, res) => {
    const rawEmail = req.header('x-goog-authenticated-user-email');
    const rawId = req.header('x-goog-authenticated-user-id');
    
    if (rawEmail) {
      const email = rawEmail.split(':').pop() || '';
      const namePart = email.split('@')[0];
      const name = namePart.charAt(0).toUpperCase() + namePart.slice(1).replace(/[._]/g, ' ');
      
      return res.json({
        email,
        name,
        initials: name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
        id: rawId
      });
    }

    res.json({
      email: 'carlos@latam.com',
      name: 'Carlos',
      initials: 'C',
      id: 'dev-user'
    });
  });

  // Health check for GCP/Cosmos
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // 1. Configuracion
  app.get("/api/configuracion", (req, res) => {
    const config = db.prepare("SELECT * FROM Configuracion WHERE id = 1").get();
    res.json(config);
  });

  app.post("/api/configuracion", (req, res) => {
    const { hora_inicio, hora_fin, horas_efectivas } = req.body;
    db.prepare("UPDATE Configuracion SET hora_inicio = ?, hora_fin = ?, horas_efectivas = ? WHERE id = 1")
      .run(hora_inicio, hora_fin, horas_efectivas);
    res.json({ success: true });
  });

  // 2. Tareas
  app.get("/api/tareas", (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });

    const tasks = db.prepare("SELECT * FROM Tareas WHERE fecha = ?").all(fecha);

    // Also fetch/calculate the daily plan for this date to support the frontend logic
    let plan = db.prepare("SELECT * FROM PlanesDiarios WHERE date = ?").get(fecha);
    if (!plan) {
      const config = db.prepare("SELECT * FROM Configuracion WHERE id = 1").get();
      plan = {
        date: fecha,
        hora_inicio: config.hora_inicio,
        hora_fin: config.hora_fin,
        horas_efectivas: config.horas_efectivas,
        estado_cierre: 0,
        ejecucion_iniciada: 0,
        hora_inicio_ejecucion: null
      };
    }

    res.json({ tasks, plan });
  });

  app.get("/api/audit-tiempos", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas WHERE estado_ejecucion = 'resuelto' ORDER BY fecha DESC LIMIT 100").all();
    res.json({ tasks });
  });

  app.post("/api/tareas", (req, res) => {
    const { fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area } = req.body;
    db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(fecha, actividad, prioridad, tiempo_asignado_minutos || null, fecha_origen_remanente || null, backlog_id || null, estado_ejecucion || null, evidencia || null, area || null);
    res.json({ success: true });
  });

  app.put("/api/tareas/:id", (req, res) => {
    const { id } = req.params;
    const { actividad, prioridad, completada, estado_ejecucion, hallazgos, justificacion, evidencia, hora_inicio_plan, hora_fin_plan, tiempo_asignado_minutos, tiempo_invertido_minutos, area } = req.body;

    // Fetch current state for logging
    const currentTask = db.prepare("SELECT estado_ejecucion FROM Tareas WHERE id = ?").get(id);

    console.log(`Updating task ${id}:`, req.body);

    // Si hay un cambio de estado, lo registramos en LogsTareas
    if (estado_ejecucion !== undefined && currentTask && currentTask.estado_ejecucion !== estado_ejecucion) {
      const now = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
      db.prepare("INSERT INTO LogsTareas (tarea_id, estado_anterior, estado_nuevo, comentario) VALUES (?, ?, ?, ?)")
        .run(id, currentTask.estado_ejecucion || 'NUEVO', estado_ejecucion, `Cambio de estado a las ${now}`);
    }


    const updates = [];
    const params = [];

    if (actividad !== undefined) { updates.push("actividad = ?"); params.push(actividad); }
    if (prioridad !== undefined) { updates.push("prioridad = ?"); params.push(prioridad); }
    if (area !== undefined) { updates.push("area = ?"); params.push(area); }

    // Rule: Si estado_ejecucion = "terminada" → completada = 1
    // En cualquier otro caso → completada = 0
    let finalCompletada = completada;
    if (estado_ejecucion !== undefined) {
      updates.push("estado_ejecucion = ?");
      params.push(estado_ejecucion);
      finalCompletada = (['terminada', 'resuelto'].includes(estado_ejecucion) ? 1 : 0);
    }

    if (finalCompletada !== undefined) {
      updates.push("completada = ?");
      params.push(finalCompletada ? 1 : 0);
    }

    if (hallazgos !== undefined) { updates.push("hallazgos = ?"); params.push(hallazgos); }
    if (justificacion !== undefined || req.body.justification !== undefined) {
      updates.push("justificacion = ?");
      params.push(justificacion || req.body.justification);
    }
    if (evidencia !== undefined) { updates.push("evidencia = ?"); params.push(evidencia); }
    if (hora_inicio_plan !== undefined) { updates.push("hora_inicio_plan = ?"); params.push(hora_inicio_plan); }
    if (hora_fin_plan !== undefined) { updates.push("hora_fin_plan = ?"); params.push(hora_fin_plan); }
    if (tiempo_asignado_minutos !== undefined) { updates.push("tiempo_asignado_minutos = ?"); params.push(tiempo_asignado_minutos); }
    if (tiempo_invertido_minutos !== undefined) { updates.push("tiempo_invertido_minutos = ?"); params.push(tiempo_invertido_minutos); }
    if (req.body.minutos_remanentes !== undefined) { updates.push("minutos_remanentes = ?"); params.push(req.body.minutos_remanentes); }
    if (req.body.fecha_origen_remanente !== undefined) { updates.push("fecha_origen_remanente = ?"); params.push(req.body.fecha_origen_remanente); }

    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE Tareas SET ${updates.join(", ")} WHERE id = ?`).run(...params);

      // Detect first execution of the day
      if (estado_ejecucion !== undefined) {
        const task = db.prepare("SELECT fecha FROM Tareas WHERE id = ?").get(id);
        if (task) {
          const plan = db.prepare("SELECT ejecucion_iniciada FROM PlanesDiarios WHERE date = ?").get(task.fecha);
          if (plan && plan.ejecucion_iniciada === 0) {
            const now = new Date().toISOString();
            db.prepare("UPDATE PlanesDiarios SET ejecucion_iniciada = 1, hora_inicio_ejecucion = ? WHERE date = ?")
              .run(now, task.fecha);
          } else if (!plan) {
            const now = new Date().toISOString();
            db.prepare("INSERT INTO PlanesDiarios (date, ejecucion_iniciada, hora_inicio_ejecucion) VALUES (?, 1, ?)")
              .run(task.fecha, now);
          }
        }
      }
    }

    res.json({ success: true });
  });

  app.get("/api/tareas/:id/logs", (req, res) => {
    const { id } = req.params;
    const logs = db.prepare("SELECT * FROM LogsTareas WHERE tarea_id = ? ORDER BY id DESC").all(id);
    res.json({ logs });
  });

  app.delete("/api/tareas/clear", (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });
    
    db.transaction(() => {
      const tasksWithBacklog = db.prepare("SELECT backlog_id FROM Tareas WHERE fecha = ? AND backlog_id IS NOT NULL").all(fecha);
      for (const t of tasksWithBacklog) {
        db.prepare("UPDATE Backlog SET status = 'pendiente' WHERE id = ?").run(t.backlog_id);
      }
      db.prepare("DELETE FROM Tareas WHERE fecha = ?").run(fecha);
    })();
    
    res.json({ success: true });
  });

  app.delete("/api/tareas/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM Tareas WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Internal endpoint for daily plan adjustments (to support the "inheritance" requirement)
  app.post("/api/plan-diario", (req, res) => {
    const { date, hora_inicio, hora_fin, horas_efectivas, estado_cierre } = req.body;

    // Get existing plan to preserve values if not provided
    const existing = db.prepare("SELECT * FROM PlanesDiarios WHERE date = ?").get(date);

    const h_inicio = hora_inicio !== undefined ? hora_inicio : (existing?.hora_inicio || '08:00');
    const h_fin = hora_fin !== undefined ? hora_fin : (existing?.hora_fin || '17:00');
    const h_efectivas = horas_efectivas !== undefined ? horas_efectivas : (existing?.horas_efectivas || 6.0);
    const e_cierre = estado_cierre !== undefined ? (estado_cierre ? 1 : 0) : (existing?.estado_cierre || 0);

    db.prepare(`
      INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, estado_cierre)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        hora_inicio = excluded.hora_inicio,
        hora_fin = excluded.hora_fin,
        horas_efectivas = excluded.horas_efectivas,
        estado_cierre = excluded.estado_cierre
    `).run(date, h_inicio, h_fin, h_efectivas, e_cierre);

    // Backlog Sync on closure
    if (e_cierre === 1) {
      const tasksToSync = db.prepare(`
        SELECT backlog_id, estado_ejecucion 
        FROM Tareas 
        WHERE fecha = ? AND backlog_id IS NOT NULL AND estado_ejecucion != 'no realizado'
      `).all(date);

      for (const task of tasksToSync) {
        let backlogStatus = task.estado_ejecucion;
        if (backlogStatus === 'despriorizada') backlogStatus = 'despriorizado';
        db.prepare("UPDATE Backlog SET status = ? WHERE id = ?").run(backlogStatus, task.backlog_id);
      }
    }

    res.json({ success: true });
  });

  app.get("/api/dashboard", (req, res) => {
    const stats = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN completada = 1 THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN completada = 0 THEN 1 ELSE 0 END) as pending
      FROM Tareas
      WHERE fecha = date('now')
    `).get();
    res.json(stats);
  });

  // 3. Incidencias
  app.get("/api/incidencias", (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });
    const incidents = db.prepare("SELECT * FROM Incidencias WHERE fecha = ?").all(fecha);
    res.json(incidents);
  });

  app.post("/api/incidencias", (req, res) => {
    const { fecha, descripcion, hora_inicio, hora_fin, tipo } = req.body;
    db.prepare("INSERT INTO Incidencias (fecha, descripcion, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?, ?)")
      .run(fecha, descripcion, hora_inicio, hora_fin, tipo);
    res.json({ success: true });
  });

  // 4. Bloques No Disponibles
  app.get("/api/bloques", (req, res) => {
    const { fecha } = req.query;
    if (fecha) {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE fecha = ? OR dia_semana IS NOT NULL").all(fecha);
      res.json(blocks);
    } else {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles").all();
      res.json(blocks);
    }
  });

  app.post("/api/bloques", (req, res) => {
    const { fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion } = req.body;
    db.prepare("INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion) VALUES (?, ?, ?, ?, ?, ?)")
      .run(fecha || null, hora_inicio, hora_fin, tipo, dia_semana || null, descripcion || null);
    res.json({ success: true });
  });

  app.delete("/api/bloques/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM BloquesNoDisponibles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // 5. Backlog
  app.get("/api/backlog", (req, res) => {
    const backlog = db.prepare("SELECT * FROM Backlog ORDER BY created_at DESC").all();
    res.json(backlog);
  });

  app.post("/api/backlog", (req, res) => {
    const { actividad, prioridad, status, area } = req.body;
    const result = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, ?, ?)")
      .run(actividad, prioridad || 4, status || 'pendiente', area || null);
    res.json({ id: result.lastInsertRowid, success: true });
  });

  app.put("/api/backlog/:id", (req, res) => {
    const { id } = req.params;
    const { actividad, prioridad, status, area } = req.body;
    const updates = [];
    const params = [];
    if (actividad !== undefined) { updates.push("actividad = ?"); params.push(actividad); }
    if (prioridad !== undefined) { updates.push("prioridad = ?"); params.push(prioridad); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (area !== undefined) { updates.push("area = ?"); params.push(area); }
    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE Backlog SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }
    res.json({ success: true });
  });

  app.delete("/api/backlog/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM Backlog WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // 6. Reabrir Planificación (Clear time blocks)
  app.post("/api/reabrir-planificacion", (req, res) => {
    const { fecha } = req.body;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });

    db.prepare(`
      UPDATE Tareas 
      SET hora_inicio_plan = NULL, 
          hora_fin_plan = NULL, 
          tiempo_asignado_minutos = NULL 
      WHERE fecha = ?
    `).run(fecha);
    res.json({ success: true });
  });


  app.get("/api/planes-diarios", (req, res) => {
    const plans = db.prepare("SELECT * FROM PlanesDiarios").all();
    res.json(plans);
  });

  app.get("/api/tareas/todas", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas ORDER BY fecha DESC, prioridad DESC").all();
    res.json(tasks);
  });

  app.get("/api/history/accumulated", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas ORDER BY fecha DESC").all();
    const backlog = db.prepare("SELECT * FROM Backlog").all();

    // Group by activity name + area
    const grouped: Record<string, any> = {};

    tasks.forEach((task: any) => {
      const key = `${task.actividad}|${task.area || ''}`;
      if (!grouped[key]) {
        const backlogItem = backlog.find(b => b.actividad === task.actividad && (b.area || '') === (task.area || ''));
        grouped[key] = {
          actividad: task.actividad,
          area: task.area,
          prioridad: task.prioridad,
          backlog_status: backlogItem ? backlogItem.status : 'desconocido',
          hallazgos: [],
          justificaciones: [],
          evidencias: [],
          fechas: new Set(),
          completada: task.estado_ejecucion === 'terminada',
          logs: []
        };
      }

      // Fetch logs for this specific task instance and add to the aggregate
      const taskLogs = db.prepare("SELECT * FROM LogsTareas WHERE tarea_id = ? ORDER BY id ASC").all(task.id);
      taskLogs.forEach((log: any) => {
        grouped[key].logs.push({
          fecha: task.fecha,
          hora: log.fecha_hora, // O el comentario que ya tiene la hora formateada
          estado_anterior: log.estado_anterior,
          estado_nuevo: log.estado_nuevo,
          comentario: log.comentario
        });
      });


      if (task.hallazgos && task.hallazgos.trim()) grouped[key].hallazgos.push({ fecha: task.fecha, text: task.hallazgos });
      if (task.justificacion && task.justificacion.trim()) grouped[key].justificaciones.push({ fecha: task.fecha, text: task.justificacion });
      if (task.evidencia) {
        try {
          const parsed = JSON.parse(task.evidencia);
          if (Array.isArray(parsed)) {
            parsed.forEach(e => {
              if (e && e.trim()) grouped[key].evidencias.push({ fecha: task.fecha, text: e });
            });
          } else if (task.evidencia.trim()) {
            grouped[key].evidencias.push({ fecha: task.fecha, text: task.evidencia });
          }
        } catch (e) {
          if (task.evidencia.trim()) {
            grouped[key].evidencias.push({ fecha: task.fecha, text: task.evidencia });
          }
        }
      }
      grouped[key].fechas.add(task.fecha);
      if (task.estado_ejecucion === 'terminada') grouped[key].completada = true;
    });

    const result = Object.values(grouped).map(g => ({
      ...g,
      fechas: Array.from(g.fechas).sort().reverse()
    }));

    res.json(result);
  });

  app.post("/api/reset-database", (req, res) => {
    db.transaction(() => {
      db.prepare("DELETE FROM Tareas").run();
      db.prepare("DELETE FROM PlanesDiarios").run();
      db.prepare("DELETE FROM Incidencias").run();
      db.prepare("DELETE FROM BloquesNoDisponibles").run();
      db.prepare("DELETE FROM Backlog").run();
      db.prepare("UPDATE Configuracion SET hora_inicio = '08:00', hora_fin = '17:00', horas_efectivas = 6.0 WHERE id = 1").run();
    })();
    res.json({ success: true, message: "Base de datos reiniciada correctamente" });
  });

  app.post("/api/seed-data", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayNames[new Date().getDay()];

    db.transaction(() => {
      // 1. Backlog
      const backlogItems = [
        ['Monitoreo de Llamadas - Campaña A', 10, 'pendiente', 'Monitoreo'],
        ['Feedback Individual - Juan Perez', 7, 'pendiente', 'Feedback'],
        ['Análisis de Tendencias Semanal', 4, 'pendiente', 'Tendencias'],
        ['Revisión de Alertas Críticas', 10, 'pendiente', 'Alertas'],
        ['Capacitación Escuelita - Módulo 2', 4, 'pendiente', 'Escuelita'],
        ['Actualización de Dashboard de Calidad', 2, 'pendiente', 'General']
      ];
      const stmtBacklog = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, ?, ?)");
      backlogItems.forEach(item => stmtBacklog.run(...item));

      // 2. Bloques (Almuerzo recurrente para todos los días L-V)
      const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
      const stmtBloque = db.prepare("INSERT INTO BloquesNoDisponibles (dia_semana, hora_inicio, hora_fin, tipo) VALUES (?, '13:00', '14:00', 'Almuerzo')");
      dias.forEach(d => stmtBloque.run(d));

      // 3. Tareas planeadas para hoy (ejemplo)
      db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, estado_ejecucion) VALUES (?, 'Reunión de Sincronización', 10, 'General', 30, 'pendiente')").run(today);
      db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, area, tiempo_asignado_minutos, estado_ejecucion) VALUES (?, 'Monitoreo Preventivo', 7, 'Monitoreo', 60, 'pendiente')").run(today);

    })();
    res.json({ success: true, message: "Datos ficticios cargados correctamente" });
  });

  // 7. AI Proxy Endpoints
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  app.post("/api/ai/generate-report", async (req, res) => {
    try {
      const { prompt } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      const response = await model.generateContent(prompt);
      res.json({ text: response.response.text() });
    } catch (error) {
      console.error("AI Report Error:", error);
      res.status(500).json({ error: "Failed to generate AI report" });
    }
  });

  app.post("/api/ia/procesar-backlog", async (req, res) => {
    const { text } = req.body;
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      const result = await model.generateContent(`Eres Atenea, una IA experta en Inteligencia Operativa.
            Analiza el siguiente texto y extrae una lista de tareas para el backlog.
            Categoriza cada tarea por área (Monitoreo, Feedback, Tendencias, Alertas, General) y asigna una prioridad (10: Crítica, 7: Alta, 4: Media, 2: Baja).
            Estima la duración en minutos (ej. 15, 30, 45, 60, 120).
            Devuelve UNICAMENTE un JSON array de objetos con: "actividad", "prioridad", "area", "estimated_minutes".
            Texto: "${text}"`);

      const response = await result.response;
      let jsonText = response.text() || "[]";
      jsonText = jsonText.replace(/```json\n?|```/g, "").trim();
      let items = [];
      try {
        items = JSON.parse(jsonText);
      } catch (e) {
        console.error("Failed to parse AI JSON, using local fallback regex");
        // Simple local fallback: split by lines or commas
        items = [{ actividad: text.slice(0, 100), prioridad: 7, area: 'General', estimated_minutes: 60 }];
      }

      if (Array.isArray(items)) {
        for (const item of items) {
          db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, 'pendiente', ?)")
            .run(item.actividad, item.prioridad || 4, item.area || 'General');
        }
      }
      res.json({ success: true, count: items.length });
    } catch (error) {
      console.error("AI Error:", error);
      // Final fallback: Create one item from raw text
      db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, 'pendiente', ?)")
        .run(text.slice(0, 255), 7, 'General');
      res.json({ success: true, count: 1, fallback: true });
    }
  });

  app.post("/api/ai/analyze-backlog", async (req, res) => {
    try {
      const { text } = req.body;
      const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
      const response = await model.generateContent(`Analiza el siguiente texto libre y extrae una lista de actividades concretas para un backlog. 
        Para cada actividad:
        1. Asigna una prioridad basada en el contexto (10 para crítica, 7 para alta, 4 para media, 2 para baja).
        
        El formato de salida debe ser un JSON array de objetos con las propiedades "actividad" y "prioridad".
        
        Texto: "${text}"`);

      let jsonText = response.response.text() || "[]";
      jsonText = jsonText.replace(/```json\n?|```/g, "");
      res.json(JSON.parse(jsonText));
    } catch (error) {
      console.error("AI Backlog Error Detail:", error);
      res.status(500).json({ error: error.message || "Unknown AI error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
