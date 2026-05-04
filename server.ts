import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenAI, Type } from "@google/genai";

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
    area TEXT
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
    tipo TEXT
  );

  CREATE TABLE IF NOT EXISTS Backlog (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actividad TEXT,
    prioridad INTEGER DEFAULT 4,
    status TEXT DEFAULT 'pendiente',
    area TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
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

  // Health check for GCP/Cosmos
  app.get("/health", (req, res) => {
    res.json({ status: "UP", timestamp: new Date().toISOString() });
  });

  // API Endpoints as requested

  // 1. Configuracion
  app.get("/configuracion", (req, res) => {
    const config = db.prepare("SELECT * FROM Configuracion WHERE id = 1").get();
    res.json(config);
  });

  app.post("/configuracion", (req, res) => {
    const { hora_inicio, hora_fin, horas_efectivas } = req.body;
    db.prepare("UPDATE Configuracion SET hora_inicio = ?, hora_fin = ?, horas_efectivas = ? WHERE id = 1")
      .run(hora_inicio, hora_fin, horas_efectivas);
    res.json({ success: true });
  });

  // 2. Tareas
  app.get("/tareas", (req, res) => {
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

  app.post("/tareas", (req, res) => {
    const { fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area } = req.body;
    db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(fecha, actividad, prioridad, tiempo_asignado_minutos || null, fecha_origen_remanente || null, backlog_id || null, estado_ejecucion || null, evidencia || null, area || null);
    res.json({ success: true });
  });

  app.put("/tareas/:id", (req, res) => {
    const { id } = req.params;
    const { actividad, prioridad, completada, estado_ejecucion, hallazgos, justificacion, evidencia, hora_inicio_plan, hora_fin_plan, tiempo_asignado_minutos, area } = req.body;

    console.log(`Updating task ${id}:`, req.body);

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
      finalCompletada = (estado_ejecucion === 'terminada' ? 1 : 0);
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

  app.delete("/tareas/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM Tareas WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // Internal endpoint for daily plan adjustments (to support the "inheritance" requirement)
  app.post("/plan-diario", (req, res) => {
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

  app.get("/dashboard", (req, res) => {
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
  app.get("/incidencias", (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });
    const incidents = db.prepare("SELECT * FROM Incidencias WHERE fecha = ?").all(fecha);
    res.json(incidents);
  });

  app.post("/incidencias", (req, res) => {
    const { fecha, descripcion, hora_inicio, hora_fin, tipo } = req.body;
    db.prepare("INSERT INTO Incidencias (fecha, descripcion, hora_inicio, hora_fin, tipo) VALUES (?, ?, ?, ?, ?)")
      .run(fecha, descripcion, hora_inicio, hora_fin, tipo);
    res.json({ success: true });
  });

  // 4. Bloques No Disponibles
  app.get("/bloques", (req, res) => {
    const { fecha } = req.query;
    if (fecha) {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE fecha = ? OR dia_semana IS NOT NULL").all(fecha);
      res.json(blocks);
    } else {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles").all();
      res.json(blocks);
    }
  });

  app.post("/bloques", (req, res) => {
    const { fecha, hora_inicio, hora_fin, tipo, dia_semana } = req.body;
    db.prepare("INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, dia_semana) VALUES (?, ?, ?, ?, ?)")
      .run(fecha || null, hora_inicio, hora_fin, tipo, dia_semana || null);
    res.json({ success: true });
  });

  app.delete("/bloques/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM BloquesNoDisponibles WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // 5. Backlog
  app.get("/backlog", (req, res) => {
    const backlog = db.prepare("SELECT * FROM Backlog ORDER BY created_at DESC").all();
    res.json(backlog);
  });

  app.post("/backlog", (req, res) => {
    const { actividad, prioridad, status, area } = req.body;
    const result = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area) VALUES (?, ?, ?, ?)")
      .run(actividad, prioridad || 4, status || 'pendiente', area || null);
    res.json({ id: result.lastInsertRowid, success: true });
  });

  app.put("/backlog/:id", (req, res) => {
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

  app.delete("/backlog/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM Backlog WHERE id = ?").run(id);
    res.json({ success: true });
  });

  // 6. Reabrir Planificación (Clear time blocks)
  app.post("/reabrir-planificacion", (req, res) => {
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


  app.get("/tareas/todas", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas ORDER BY fecha DESC, prioridad DESC").all();
    res.json(tasks);
  });

  app.get("/history/accumulated", (req, res) => {
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
          completada: task.estado_ejecucion === 'terminada'
        };
      }

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

  app.post("/reset-database", (req, res) => {
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

  // 7. AI Proxy Endpoints
  const genAI = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
  });

  app.post("/api/ai/generate-report", async (req, res) => {
    try {
      const { prompt } = req.body;
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      res.json({ text: response.text });
    } catch (error) {
      console.error("AI Report Error:", error);
      res.status(500).json({ error: "Failed to generate AI report" });
    }
  });

  app.post("/api/ai/analyze-backlog", async (req, res) => {
    try {
      const { text } = req.body;
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{
          role: 'user', parts: [{
            text: `Analiza el siguiente texto libre y extrae una lista de actividades concretas para un backlog. 
        Para cada actividad:
        1. Asigna una prioridad basada en el contexto (10 para crítica, 7 para alta, 4 para media, 2 para baja).
        
        El formato de salida debe ser un JSON array de objetos con las propiedades "actividad" y "prioridad".
        
        Texto: "${text}"`
          }]
        }],
      });

      let jsonText = response.text || "[]";
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
