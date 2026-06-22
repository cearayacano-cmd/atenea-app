import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";
import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

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
    hora_inicio_ejecucion TEXT,
    justificacion_reapertura TEXT
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
    tiempo_invertido_minutos INTEGER DEFAULT 0,
    antiguedad INTEGER DEFAULT 0
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
    status TEXT DEFAULT 'nuevo',
    area TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    antiguedad INTEGER DEFAULT 0
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

  CREATE TABLE IF NOT EXISTS Usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT,
    email TEXT UNIQUE,
    initials TEXT,
    role TEXT DEFAULT 'operador',
    rol_ejecutante TEXT DEFAULT 'Calidad Fabrica'
  );

  CREATE TABLE IF NOT EXISTS Equipos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT
  );

  CREATE TABLE IF NOT EXISTS UsuariosEquipos (
    usuario_id INTEGER,
    equipo_id INTEGER,
    FOREIGN KEY(usuario_id) REFERENCES Usuarios(id),
    FOREIGN KEY(equipo_id) REFERENCES Equipos(id),
    PRIMARY KEY (usuario_id, equipo_id)
  );

  CREATE TABLE IF NOT EXISTS BacklogAsignaciones (
    backlog_id INTEGER,
    user_id INTEGER,
    FOREIGN KEY(backlog_id) REFERENCES Backlog(id),
    FOREIGN KEY(user_id) REFERENCES Usuarios(id),
    PRIMARY KEY (backlog_id, user_id)
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
if (!columns.includes("user_id")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN user_id INTEGER DEFAULT 1");
}
if (!columns.includes("created_at")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN created_at TEXT");
}
if (!columns.includes("assigned_at")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN assigned_at TEXT");
}
if (!columns.includes("closed_at")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN closed_at TEXT");
}
if (!columns.includes("updated_at")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN updated_at TEXT");
}


const backlogInfo = db.prepare("PRAGMA table_info(Backlog)").all();
const backlogColumns = backlogInfo.map((c: any) => c.name);
if (!backlogColumns.includes("area")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN area TEXT");
}
if (!backlogColumns.includes("created_at")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP");
}
if (!backlogColumns.includes("is_collaborative")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN is_collaborative INTEGER DEFAULT 0");
}
if (!backlogColumns.includes("owner_id")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN owner_id INTEGER DEFAULT 1");
}
if (!backlogColumns.includes("complejidad")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN complejidad INTEGER DEFAULT 2");
}
if (!backlogColumns.includes("tiempo_estimado")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN tiempo_estimado INTEGER DEFAULT 60");
}
if (!backlogColumns.includes("rol_ejecutante")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN rol_ejecutante TEXT DEFAULT 'Calidad Fabrica'");
}
if (!backlogColumns.includes("justificacion")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN justificacion TEXT");
}

const userTableInfo = db.prepare("PRAGMA table_info(Usuarios)").all();
const userColumns = userTableInfo.map((c: any) => c.name);
if (!userColumns.includes("role")) {
  db.exec("ALTER TABLE Usuarios ADD COLUMN role TEXT DEFAULT 'operador'");
}
if (!userColumns.includes("rol_ejecutante")) {
  db.exec("ALTER TABLE Usuarios ADD COLUMN rol_ejecutante TEXT DEFAULT 'Calidad Fabrica'");
}

if (!columns.includes("complejidad")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN complejidad INTEGER DEFAULT 2");
}

// Asegurar que existan los usuarios solicitados
const stmtInitUser = db.prepare("INSERT OR IGNORE INTO Usuarios (email, nombre, initials, role, rol_ejecutante) VALUES (?, ?, ?, ?, ?)");
stmtInitUser.run('carlose.araya@latam.com', 'Carlos E. Araya', 'CA', 'supervisor', 'Calidad Fabrica');
db.prepare("UPDATE Usuarios SET role = 'supervisor' WHERE email = 'carlose.araya@latam.com'").run();

stmtInitUser.run('FABcalidad01@latam.com', 'FAB Calidad 01', 'F1', 'operador', 'Calidad Fabrica');
stmtInitUser.run('FABcalidad02@latam.com', 'FAB Calidad 02', 'F2', 'operador', 'Calidad Fabrica');
stmtInitUser.run('FABcalidad03@latam.com', 'FAB Calidad 03', 'F3', 'operador', 'Calidad Fabrica');

stmtInitUser.run('LATAMcalidad01@latam.com', 'LATAM Calidad 01', 'L1', 'operador', 'Calidad LATAM');
stmtInitUser.run('LATAMcalidad02@latam.com', 'LATAM Calidad 02', 'L2', 'operador', 'Calidad LATAM');
stmtInitUser.run('LATAMcalidad03@latam.com', 'LATAM Calidad 03', 'L3', 'operador', 'Calidad LATAM');

if (!columns.includes("estado_ejecucion")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN estado_ejecucion TEXT DEFAULT NULL");
}
if (!columns.includes("evidencia")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN evidencia TEXT");
}
if (!columns.includes("tiempo_invertido_minutos")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN tiempo_invertido_minutos INTEGER DEFAULT 0");
}
if (!columns.includes("antiguedad")) {
  db.exec("ALTER TABLE Tareas ADD COLUMN antiguedad INTEGER DEFAULT 0");
}

if (!backlogColumns.includes("antiguedad")) {
  db.exec("ALTER TABLE Backlog ADD COLUMN antiguedad INTEGER DEFAULT 0");
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
if (!planColumns.includes("user_id")) {
  db.exec("ALTER TABLE PlanesDiarios ADD COLUMN user_id INTEGER DEFAULT 1");
}
if (!planColumns.includes("justificacion_reapertura")) {
  db.exec("ALTER TABLE PlanesDiarios ADD COLUMN justificacion_reapertura TEXT");
}

const bloquesInfo = db.prepare("PRAGMA table_info(BloquesNoDisponibles)").all();
const bloquesColumns = bloquesInfo.map((c: any) => c.name);
if (!bloquesColumns.includes("descripcion")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN descripcion TEXT");
}
if (!bloquesColumns.includes("dia_semana")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN dia_semana TEXT");
}
if (!bloquesColumns.includes("user_id")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN user_id INTEGER DEFAULT 1");
}

const incidenciasInfo = db.prepare("PRAGMA table_info(Incidencias)").all();
const incidenciasColumns = incidenciasInfo.map((c: any) => c.name);
if (!incidenciasColumns.includes("user_id")) {
  db.exec("ALTER TABLE Incidencias ADD COLUMN user_id INTEGER DEFAULT 1");
}

const blockInfo = db.prepare("PRAGMA table_info(BloquesNoDisponibles)").all();
const blockColumns = blockInfo.map((c: any) => c.name);
if (!blockColumns.includes("dia_semana")) {
  db.exec("ALTER TABLE BloquesNoDisponibles ADD COLUMN dia_semana TEXT");
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3005;

  app.set("trust proxy", true);
  app.use(express.json());

  // Interceptor para inyectar userId desde el header a query/body
  app.use((req, res, next) => {
    const headerUserId = req.headers['x-user-id'];
    if (headerUserId) {
      // Validate user exists in DB, fallback to user 1 if not
      const parsedId = parseInt(headerUserId as string);
      const validUser = parsedId ? db.prepare("SELECT id FROM Usuarios WHERE id = ?").get(parsedId) : null;
      const resolvedId = (validUser ? parsedId : 1).toString();
      if (req.method === 'GET' || req.method === 'DELETE') {
        req.query.userId = resolvedId;
      } else {
        req.body.userId = resolvedId;
      }
    }
    next();
  });

  app.get("/api/me", (req, res) => {
    const uid = parseInt(req.query.userId as string) || getDefaultUserId();
    const user = db.prepare("SELECT * FROM Usuarios WHERE id = ?").get(uid);
    if (user) {
      return res.json({
        email: user.email,
        name: user.nombre,
        initials: user.initials,
        id: user.id,
        role: user.role,
        rol_ejecutante: user.rol_ejecutante || 'Calidad Fabrica'
      });
    }
    res.json({
      email: 'carlos@latam.com',
      name: 'Carlos',
      initials: 'C',
      id: 1,
      role: 'operador',
      rol_ejecutante: 'Calidad Fabrica'
    });
  });

  app.get("/api/usuarios", (req, res) => {
    const usuarios = db.prepare("SELECT * FROM Usuarios").all();
    
    // Buscar tareas críticas activas en Backlog
    const criticalTasks = db.prepare(`
      SELECT b.id, b.actividad, ba.user_id 
      FROM Backlog b
      JOIN BacklogAsignaciones ba ON b.id = ba.backlog_id
      WHERE b.prioridad = 10 AND b.status IN ('nuevo', 'abierto', 'progreso', 'en progreso')
    `).all() as any[];

    // Buscar tareas críticas activas individuales
    const activeCriticalTasks = db.prepare(`
      SELECT id, actividad, user_id
      FROM Tareas
      WHERE prioridad = 10 AND completada = 0 AND estado_ejecucion IN ('nuevo', 'abierto', 'progreso', 'en progreso')
    `).all() as any[];

    const usuariosEnriquecidos = usuarios.map((u: any) => {
      const lockedByBacklog = criticalTasks.find(t => t.user_id === u.id);
      const lockedByDaily = activeCriticalTasks.find(t => t.user_id === u.id);
      const lockedTaskName = lockedByBacklog ? lockedByBacklog.actividad : (lockedByDaily ? lockedByDaily.actividad : null);
      
      return {
        ...u,
        isLocked: !!lockedTaskName,
        lockedTaskName
      };
    });

    res.json(usuariosEnriquecidos);
  });

  // Health check for GCP/Cosmos
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Endpoint de Productividad Global
  app.get("/api/productividad", (req, res) => {
    const { fecha } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });
    
    const usuarios = db.prepare("SELECT id, nombre, email, role FROM Usuarios WHERE role = 'operador'").all();
    
    const tareas = db.prepare(`
      SELECT T.*, U.nombre as user_name 
      FROM Tareas T 
      JOIN Usuarios U ON T.user_id = U.id 
      WHERE T.fecha = ?
    `).all(fecha);

    const userStats = usuarios.map((u: any) => {
      const userTasks = tareas.filter((t: any) => t.user_id === u.id);
      const completadas = userTasks.filter((t: any) => t.estado_ejecucion === 'completado' || t.estado_ejecucion === 'resuelto').length;
      const pendientes = userTasks.length - completadas;
      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        total_tareas: userTasks.length,
        completadas,
        pendientes,
        tareas: userTasks
      };
    });

    res.json({ stats: userStats });
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

  app.get("/api/tareas", (req, res) => {
    const { fecha, userId } = req.query;
    if (!fecha) return res.status(400).json({ error: "Fecha requerida" });
    const uid = parseInt(userId as string) || getDefaultUserId();

    const tasks = db.prepare(`
      SELECT T.*, B.is_collaborative 
      FROM Tareas T 
      LEFT JOIN Backlog B ON T.backlog_id = B.id 
      WHERE T.fecha = ? AND T.user_id = ?
    `).all(fecha, uid);

    // Also fetch/calculate the daily plan for this date to support the frontend logic
    let plan = db.prepare("SELECT * FROM PlanesDiarios WHERE date = ?").get(fecha) as any;
    if (!plan) {
      const config = db.prepare("SELECT * FROM Configuracion WHERE id = 1").get();
      plan = {
        date: fecha,
        user_id: uid,
        hora_inicio: config.hora_inicio,
        hora_fin: config.hora_fin,
        horas_efectivas: config.horas_efectivas,
        estado_cierre: 0,
        ejecucion_iniciada: 0,
        hora_inicio_ejecucion: null
      };
    } else {
      plan.user_id = uid;
    }

    res.json({ tasks, plan });
  });

  app.get("/api/audit-tiempos", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas WHERE estado_ejecucion = 'resuelto' ORDER BY fecha DESC LIMIT 100").all();
    res.json({ tasks });
  });

  app.post("/api/tareas", (req, res) => {
    const { fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area, assignedUsers, userId, complejidad } = req.body;
    
    const uid = parseInt(userId as string) || getDefaultUserId();
    const todayStr = new Date().toLocaleDateString('sv-SE');

    // Block if assigning to today or future, and there is an unclosed past workday
    if (fecha >= todayStr) {
      const unclosedPastDay = db.prepare(`
        SELECT DISTINCT T.fecha 
        FROM Tareas T
        LEFT JOIN PlanesDiarios P ON T.fecha = P.date
        WHERE T.fecha < ? AND T.user_id = ? AND (P.estado_cierre IS NULL OR P.estado_cierre = 0)
        ORDER BY T.fecha ASC
        LIMIT 1
      `).get(todayStr, uid) as { fecha: string } | undefined;

      if (unclosedPastDay) {
        return res.status(400).json({ 
          error: "Días anteriores pendientes de cierre", 
          unclosedDate: unclosedPastDay.fecha,
          message: `Bloqueo de Planificación: Tienes un día anterior sin cerrar (${unclosedPastDay.fecha}). Por favor, justifica sus tareas y cierra la jornada de ese día antes de planificar o iniciar nuevas actividades para hoy.`
        });
      }
    }
    
    let usersToAssign = (assignedUsers && assignedUsers.length > 0) ? assignedUsers : [uid];
    
    if (backlog_id && (!assignedUsers || assignedUsers.length === 0)) {
      const dbAssignments = db.prepare("SELECT user_id FROM BacklogAsignaciones WHERE backlog_id = ?").all(backlog_id) as any[];
      if (dbAssignments.length > 0) {
        usersToAssign = dbAssignments.map(a => a.user_id);
      }
    }
    
    if (Number(prioridad) === 10) {
      if (usersToAssign.includes(uid)) {
        const existing = db.prepare(`
          SELECT id FROM Tareas 
          WHERE fecha = ? AND user_id = ? AND prioridad = 10 
            AND LOWER(COALESCE(estado_ejecucion, 'nuevo')) NOT IN ('resuelto', 'terminada', 'fallo', 'fallido', 'despriorizado', 'despriorizada', 'no realizado')
        `).get(fecha, uid);
        if (existing) {
          return res.status(400).json({ error: "Límite superado: solo se permite una tarea crítica por día para tu usuario." });
        }
      }
    }
    
    let backlogCreatedAt: string | null = null;
    if (backlog_id) {
      const bg = db.prepare("SELECT created_at FROM Backlog WHERE id = ?").get(backlog_id) as { created_at: string } | undefined;
      if (bg && bg.created_at) {
        backlogCreatedAt = bg.created_at;
      }
    }
    const nowStr = new Date().toISOString();
    const finalCreatedAt = backlogCreatedAt || nowStr;
    const finalAssignedAt = nowStr;

    db.transaction(() => {
      let currentBacklogId = backlog_id;
      if (!currentBacklogId) {
        const bgRes = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area, created_at) VALUES (?, ?, ?, ?, ?)").run(actividad, prioridad, 'abierto', area || 'Operativo', finalCreatedAt);
        currentBacklogId = bgRes.lastInsertRowid;
      } else {
        db.prepare("UPDATE Backlog SET status = 'abierto' WHERE id = ?").run(currentBacklogId);
      }

      const stmt = db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, tiempo_asignado_minutos, fecha_origen_remanente, backlog_id, estado_ejecucion, evidencia, area, user_id, complejidad, created_at, assigned_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
      for(const uid of usersToAssign) {
        const valTiempo = (tiempo_asignado_minutos !== undefined && tiempo_asignado_minutos !== null) ? tiempo_asignado_minutos : null;
        stmt.run(fecha, actividad, prioridad, valTiempo, fecha_origen_remanente || null, currentBacklogId, estado_ejecucion || null, evidencia || null, area || null, uid, complejidad || 2, finalCreatedAt, finalAssignedAt, nowStr);
      }
    })();
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

    updates.push("updated_at = ?");
    params.push(new Date().toISOString());

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
      
      const closedStatuses = ['resuelto', 'terminada', 'fallo', 'fallido', 'despriorizado', 'despriorizada', 'no realizado'];
      if (closedStatuses.includes(estado_ejecucion.toLowerCase())) {
        updates.push("closed_at = ?");
        params.push(new Date().toISOString());
      } else {
        updates.push("closed_at = NULL");
      }
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
      const tasks = db.prepare("SELECT id, backlog_id FROM Tareas WHERE fecha = ?").all(fecha) as any[];
      for (const t of tasks) {
        if (t.backlog_id) {
          db.prepare("UPDATE Backlog SET status = 'pendiente' WHERE id = ?").run(t.backlog_id);
        }
        db.prepare("DELETE FROM LogsTareas WHERE tarea_id = ?").run(t.id);
      }
      db.prepare("DELETE FROM Tareas WHERE fecha = ?").run(fecha);
    })();
    
    res.json({ success: true });
  });

  app.post("/api/tareas/:id/arrastrar", (req, res) => {
    const { id } = req.params;
    const { hallazgos } = req.body;
    db.transaction(() => {
      const task = db.prepare("SELECT * FROM Tareas WHERE id = ?").get(id) as any;
      if (!task) return;
      
      // Update task in Tareas to be 'arrastrada'
      db.prepare(`
        UPDATE Tareas 
        SET estado_ejecucion = 'arrastrada', 
            antiguedad = antiguedad + 1,
            hallazgos = ?,
            updated_at = ?
        WHERE id = ?
      `).run(hallazgos || '', new Date().toISOString(), id);

      // If it has a backlog reference, return it to backlog and update its antiguedad
      if (task.backlog_id) {
        db.prepare(`
          UPDATE Backlog 
          SET status = 'pendiente',
              antiguedad = antiguedad + 1
          WHERE id = ?
        `).run(task.backlog_id);
      }
    })();
    res.json({ success: true });
  });

  app.delete("/api/tareas/:id", (req, res) => {
    const { id } = req.params;
    db.transaction(() => {
      const task = db.prepare("SELECT backlog_id FROM Tareas WHERE id = ?").get(id) as { backlog_id: number | null } | undefined;
      if (task && task.backlog_id) {
        db.prepare("UPDATE Backlog SET status = 'pendiente' WHERE id = ?").run(task.backlog_id);
      }
      db.prepare("DELETE FROM LogsTareas WHERE tarea_id = ?").run(id);
      db.prepare("DELETE FROM Tareas WHERE id = ?").run(id);
    })();
    res.json({ success: true });
  });

  // Internal endpoint for daily plan adjustments (to support the "inheritance" requirement)
  app.post("/api/plan-diario", (req, res) => {
    const { date, hora_inicio, hora_fin, horas_efectivas, estado_cierre, justificacion_reapertura } = req.body;

    // Get existing plan to preserve values if not provided
    const existing = db.prepare("SELECT * FROM PlanesDiarios WHERE date = ?").get(date);

    const h_inicio = hora_inicio !== undefined ? hora_inicio : (existing?.hora_inicio || '08:00');
    const h_fin = hora_fin !== undefined ? hora_fin : (existing?.hora_fin || '17:00');
    const h_efectivas = horas_efectivas !== undefined ? horas_efectivas : (existing?.horas_efectivas || 6.0);
    const e_cierre = estado_cierre !== undefined ? (estado_cierre ? 1 : 0) : (existing?.estado_cierre || 0);
    const j_reapertura = justificacion_reapertura !== undefined ? justificacion_reapertura : (existing?.justificacion_reapertura || null);

    db.prepare(`
      INSERT INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas, estado_cierre, justificacion_reapertura)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        hora_inicio = excluded.hora_inicio,
        hora_fin = excluded.hora_fin,
        horas_efectivas = excluded.horas_efectivas,
        estado_cierre = excluded.estado_cierre,
        justificacion_reapertura = excluded.justificacion_reapertura
    `).run(date, h_inicio, h_fin, h_efectivas, e_cierre, j_reapertura);

    // Backlog Sync on closure
    if (e_cierre === 1) {
      const tasksToSync = db.prepare(`
        SELECT id, backlog_id, estado_ejecucion 
        FROM Tareas 
        WHERE fecha = ? AND backlog_id IS NOT NULL
      `).all(date);

      const nowStr = new Date().toISOString();

      for (const task of tasksToSync) {
        const estado = (task.estado_ejecucion || '').toLowerCase();
        
        if (estado === 'resuelto' || estado === 'terminada') {
          db.prepare("UPDATE Backlog SET status = 'resuelto' WHERE id = ?").run(task.backlog_id);
        } else if (estado === 'en espera' || estado === 'espera') {
          db.prepare("UPDATE Tareas SET updated_at = ? WHERE id = ?").run(nowStr, task.id);
          db.prepare("UPDATE Backlog SET status = 'en espera' WHERE id = ?").run(task.backlog_id);
        } else if (estado === 'despriorizada' || estado === 'despriorizado') {
          db.prepare("UPDATE Tareas SET updated_at = ? WHERE id = ?").run(nowStr, task.id);
          db.prepare("UPDATE Backlog SET status = 'despriorizado' WHERE id = ?").run(task.backlog_id);
        } else if (estado === 'fallo' || estado === 'fallido') {
          db.prepare("UPDATE Tareas SET updated_at = ? WHERE id = ?").run(nowStr, task.id);
          db.prepare("UPDATE Backlog SET status = 'fallo' WHERE id = ?").run(task.backlog_id);
        } else {
          // Reasignamos al backlog y marcamos como rezagado
          db.prepare("UPDATE Tareas SET estado_ejecucion = 'rezagado', updated_at = ? WHERE id = ?").run(nowStr, task.id);
          db.prepare("UPDATE Backlog SET status = 'pendiente' WHERE id = ?").run(task.backlog_id);
        }
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
    const { fecha, fechaInicio, fechaFin } = req.query;
    const userId = parseInt(req.query.userId as string) || getDefaultUserId();
    if (fechaInicio && fechaFin) {
      const incidents = db.prepare("SELECT * FROM Incidencias WHERE fecha >= ? AND fecha <= ? AND user_id = ?").all(fechaInicio, fechaFin, userId);
      return res.json(incidents);
    }
    if (!fecha) return res.status(400).json({ error: "Fecha o rango de fechas requerido" });
    const incidents = db.prepare("SELECT * FROM Incidencias WHERE fecha = ? AND user_id = ?").all(fecha, userId);
    res.json(incidents);
  });

  app.post("/api/incidencias", (req, res) => {
    const { fecha, descripcion, hora_inicio, hora_fin, tipo, userId } = req.body;
    const uid = parseInt(userId as string) || getDefaultUserId();
    db.prepare("INSERT INTO Incidencias (fecha, descripcion, hora_inicio, hora_fin, tipo, user_id) VALUES (?, ?, ?, ?, ?, ?)")
      .run(fecha, descripcion, hora_inicio, hora_fin, tipo, uid);
    db.prepare("INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(fecha, hora_inicio, hora_fin, tipo, null, "Incidencia: " + descripcion, uid);
    res.json({ success: true });
  });

  app.delete("/api/incidencias/:id", (req, res) => {
    const { id } = req.params;
    const incident = db.prepare("SELECT * FROM Incidencias WHERE id = ?").get(id) as any;
    if (incident) {
      db.prepare("DELETE FROM Incidencias WHERE id = ?").run(id);
      db.prepare("DELETE FROM BloquesNoDisponibles WHERE fecha = ? AND hora_inicio = ? AND hora_fin = ? AND tipo = ? AND descripcion = ? AND user_id = ?")
        .run(incident.fecha, incident.hora_inicio, incident.hora_fin, incident.tipo, "Incidencia: " + incident.descripcion, incident.user_id);
    }
    res.json({ success: true });
  });

  // 4. Bloques No Disponibles
  app.get("/api/bloques", (req, res) => {
    const { fecha } = req.query;
    const userId = parseInt(req.query.userId as string) || getDefaultUserId();
    if (fecha) {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE (fecha = ? OR dia_semana IS NOT NULL) AND user_id = ?").all(fecha, userId);
      res.json(blocks);
    } else {
      const blocks = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE user_id = ?").all(userId);
      res.json(blocks);
    }
  });

  app.post("/api/bloques", (req, res) => {
    const { fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion, userId } = req.body;
    const uid = parseInt(userId as string) || getDefaultUserId();
    db.prepare("INSERT INTO BloquesNoDisponibles (fecha, hora_inicio, hora_fin, tipo, dia_semana, descripcion, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(fecha || null, hora_inicio, hora_fin, tipo, dia_semana || null, descripcion || null, uid);
    res.json({ success: true });
  });

  app.delete("/api/bloques/:id", (req, res) => {
    const { id } = req.params;
    const block = db.prepare("SELECT * FROM BloquesNoDisponibles WHERE id = ?").get(id) as any;
    if (block) {
      db.prepare("DELETE FROM BloquesNoDisponibles WHERE id = ?").run(id);
      if (block.descripcion && block.descripcion.startsWith("Incidencia: ")) {
        const desc = block.descripcion.replace("Incidencia: ", "");
        db.prepare("DELETE FROM Incidencias WHERE fecha = ? AND hora_inicio = ? AND hora_fin = ? AND tipo = ? AND descripcion = ? AND user_id = ?")
          .run(block.fecha, block.hora_inicio, block.hora_fin, block.tipo, desc, block.user_id);
      }
    }
    res.json({ success: true });
  });

  // 5. Backlog
  app.get("/api/backlog", (req, res) => {
    const uid = parseInt(req.query.userId as string) || getDefaultUserId();
    
    // Self-healing: Reset status to 'nuevo' for tasks that are 'progreso' but have no scheduled daily tasks
    db.prepare(`
      UPDATE Backlog 
      SET status = 'nuevo' 
      WHERE status = 'progreso' 
        AND id NOT IN (SELECT DISTINCT backlog_id FROM Tareas WHERE backlog_id IS NOT NULL)
    `).run();

    const backlog = db.prepare(`
      SELECT DISTINCT b.*, 
             t.fecha as scheduled_date, 
             t.estado_ejecucion as execution_status
      FROM Backlog b
      LEFT JOIN Tareas t ON b.id = t.backlog_id 
        AND t.fecha = (SELECT MAX(fecha) FROM Tareas WHERE backlog_id = b.id)
      LEFT JOIN BacklogAsignaciones ba ON b.id = ba.backlog_id
      WHERE b.owner_id = ? OR (b.is_collaborative = 1 AND ba.user_id = ?)
      ORDER BY 
        CASE 
          WHEN b.status IN ('nuevo', 'abierto', 'pendiente') THEN 0 
          ELSE 1 
        END ASC,
        b.created_at ASC
    `).all(uid, uid);
    const assignments = db.prepare("SELECT backlog_id, user_id FROM BacklogAsignaciones").all();
    
    const assignmentsMap: Record<number, number[]> = {};
    assignments.forEach((a: any) => {
      if (!assignmentsMap[a.backlog_id]) {
        assignmentsMap[a.backlog_id] = [];
      }
      assignmentsMap[a.backlog_id].push(a.user_id);
    });

    const result = backlog.map((item: any) => ({
      ...item,
      is_collaborative: item.is_collaborative === 1,
      assignedUsers: assignmentsMap[item.id] || []
    }));
    res.json(result);
  });

  app.get("/api/backlog/recommend", (req, res) => {
    const { lastArea } = req.query;
    const uid = parseInt(req.query.userId as string) || getDefaultUserId();
    
    // Fetch all pending backlog items visible to the user
    const items = db.prepare(`
      SELECT DISTINCT b.* 
      FROM Backlog b
      LEFT JOIN BacklogAsignaciones ba ON b.id = ba.backlog_id
      WHERE b.status = 'pendiente' AND (b.owner_id = ? OR (b.is_collaborative = 1 AND ba.user_id = ?))
    `).all(uid, uid);
    const assignments = db.prepare("SELECT backlog_id, user_id FROM BacklogAsignaciones").all();
    
    const assignmentsMap: Record<number, number[]> = {};
    assignments.forEach((a: any) => {
      if (!assignmentsMap[a.backlog_id]) {
        assignmentsMap[a.backlog_id] = [];
      }
      assignmentsMap[a.backlog_id].push(a.user_id);
    });

    const now = new Date();
    
    const recommended = items.map((item: any) => {
      // 1. Urgencia (U) based on age in backlog (days since created_at)
      const createdDate = item.created_at ? new Date(item.created_at + ' UTC') : now;
      const diffTime = Math.abs(now.getTime() - createdDate.getTime());
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      // Urgencia scale: older tasks are more urgent, maxing at 10.0 after 7 days
      const U = Math.min(10.0, diffDays * 1.5 + 2.0); // starts at 2.0, grows by 1.5 per day
      
      // 2. Impacto (I) based on priority
      const I = item.prioridad; // 10, 7, 4, 2
      
      // 3. Dependencia (D): heuristic based on task id for variance
      const D = (item.id % 3) * 3; // gives 0, 3, or 6
      
      // 4. Contexto (C): boost of 10 if same area
      const C = (lastArea && item.area && lastArea.toString().toLowerCase() === item.area.toLowerCase()) ? 10.0 : 0.0;
      
      // Weights
      const Wu = 0.35;
      const Wi = 0.30;
      const Wd = 0.20;
      const Wc = 0.15;
      
      const score = (Wu * U) + (Wi * I) + (Wd * D) + (Wc * C);
      
      return {
        ...item,
        is_collaborative: item.is_collaborative === 1,
        assignedUsers: assignmentsMap[item.id] || [],
        urgencia: parseFloat(U.toFixed(1)),
        impacto: I,
        dependencia: D,
        contexto: C,
        score: parseFloat(score.toFixed(2))
      };
    });
    
    // Sort by score descending
    recommended.sort((a: any, b: any) => b.score - a.score);
    
    res.json(recommended);
  });

  app.post("/api/backlog", (req, res) => {
    const { actividad, prioridad, status, area, is_collaborative, assignedUsers, userId, complejidad, tiempo_estimado, rol_ejecutante } = req.body;
    const uid = userId || getDefaultUserId();
    const isCollab = is_collaborative ? 1 : 0;
    
    const result = db.prepare("INSERT INTO Backlog (actividad, prioridad, status, area, is_collaborative, owner_id, complejidad, tiempo_estimado, rol_ejecutante) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(actividad, prioridad || 4, status || 'nuevo', area || null, isCollab, uid, complejidad || 2, tiempo_estimado || 60, rol_ejecutante || 'Calidad Fabrica');
      
    const newId = result.lastInsertRowid;
    if (isCollab && assignedUsers && Array.isArray(assignedUsers)) {
       const stmt = db.prepare("INSERT INTO BacklogAsignaciones (backlog_id, user_id) VALUES (?, ?)");
       // Add the owner and the assigned users
       const allUsers = Array.from(new Set([uid, ...assignedUsers]));
       allUsers.forEach(u => stmt.run(newId, u));
    }
    
    res.json({ id: newId, success: true });
  });

  app.put("/api/backlog/:id", (req, res) => {
    const { id } = req.params;
    const { actividad, prioridad, status, area, is_collaborative, assignedUsers, userId, complejidad, tiempo_estimado, rol_ejecutante, justificacion } = req.body;
    const updates = [];
    const params = [];
    if (actividad !== undefined) { updates.push("actividad = ?"); params.push(actividad); }
    if (prioridad !== undefined) { updates.push("prioridad = ?"); params.push(prioridad); }
    if (status !== undefined) { updates.push("status = ?"); params.push(status); }
    if (area !== undefined) { updates.push("area = ?"); params.push(area); }
    if (complejidad !== undefined) { updates.push("complejidad = ?"); params.push(complejidad); }
    if (tiempo_estimado !== undefined) { updates.push("tiempo_estimado = ?"); params.push(tiempo_estimado); }
    if (rol_ejecutante !== undefined) { updates.push("rol_ejecutante = ?"); params.push(rol_ejecutante); }
    if (justificacion !== undefined) { updates.push("justificacion = ?"); params.push(justificacion); }
    if (is_collaborative !== undefined) { 
      updates.push("is_collaborative = ?"); 
      params.push(is_collaborative ? 1 : 0); 
    }
    if (updates.length > 0) {
      params.push(id);
      db.prepare(`UPDATE Backlog SET ${updates.join(", ")} WHERE id = ?`).run(...params);
    }

    if (is_collaborative !== undefined || assignedUsers !== undefined) {
      const task = db.prepare("SELECT is_collaborative, owner_id FROM Backlog WHERE id = ?").get(id) as any;
      const isCollab = is_collaborative !== undefined ? (is_collaborative ? 1 : 0) : (task?.is_collaborative || 0);
      const ownerId = task?.owner_id || userId || getDefaultUserId();

      if (isCollab === 1) {
        let usersToAssign = [];
        if (assignedUsers !== undefined) {
          usersToAssign = Array.isArray(assignedUsers) ? assignedUsers : [];
        } else {
          const existing = db.prepare("SELECT user_id FROM BacklogAsignaciones WHERE backlog_id = ?").all(id) as any[];
          usersToAssign = existing.map(e => e.user_id);
        }
        
        db.prepare("DELETE FROM BacklogAsignaciones WHERE backlog_id = ?").run(id);
        const stmt = db.prepare("INSERT INTO BacklogAsignaciones (backlog_id, user_id) VALUES (?, ?)");
        const allUsers = Array.from(new Set([ownerId, ...usersToAssign])).map(u => parseInt(u as string)).filter(u => !isNaN(u));
        allUsers.forEach(u => stmt.run(id, u));
      } else {
        db.prepare("DELETE FROM BacklogAsignaciones WHERE backlog_id = ?").run(id);
      }
    }

    res.json({ success: true });
  });

  app.delete("/api/backlog/:id", (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM BacklogAsignaciones WHERE backlog_id = ?").run(id);
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
          tiempo_asignado_minutos = NULL,
          updated_at = ?
      WHERE fecha = ?
    `).run(new Date().toISOString(), fecha);
    res.json({ success: true });
  });


  app.get("/api/planes-diarios", (req, res) => {
    const plans = db.prepare(`
      SELECT P.*, (SELECT COUNT(*) FROM Tareas T WHERE T.fecha = P.date AND T.user_id = P.user_id) as task_count
      FROM PlanesDiarios P
    `).all();
    res.json(plans);
  });

  app.get("/api/tareas/todas", (req, res) => {
    const tasks = db.prepare("SELECT * FROM Tareas ORDER BY fecha DESC, prioridad DESC").all();
    res.json(tasks);
  });

  app.get("/api/reporte-tiempos", (req, res) => {
    const { userId, fechaInicio, fechaFin } = req.query;
    
    let query = `
      SELECT T.*, U.nombre as user_name, U.email as user_email
      FROM Tareas T
      JOIN Usuarios U ON T.user_id = U.id
      WHERE 1=1
    `;
    const params: any[] = [];
    
    if (userId && userId !== 'all') {
      query += " AND T.user_id = ?";
      params.push(parseInt(userId as string));
    }
    if (fechaInicio) {
      query += " AND T.fecha >= ?";
      params.push(fechaInicio);
    }
    if (fechaFin) {
      query += " AND T.fecha <= ?";
      params.push(fechaFin);
    }
    
    query += " ORDER BY T.fecha DESC, T.id DESC";
    
    try {
      const tasks = db.prepare(query).all(...params);
      res.json({ success: true, tasks });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
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
          logs: [],
          tiempos: []
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
      if (task.tiempo_invertido_minutos !== undefined && task.tiempo_invertido_minutos > 0) {
        grouped[key].tiempos.push({ fecha: task.fecha, minutos: task.tiempo_invertido_minutos });
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
      db.prepare("DELETE FROM LogsTareas").run();
      db.prepare("DELETE FROM BacklogAsignaciones").run();
      db.prepare("DELETE FROM Tareas").run();
      db.prepare("DELETE FROM PlanesDiarios").run();
      db.prepare("DELETE FROM Incidencias").run();
      db.prepare("DELETE FROM BloquesNoDisponibles").run();
      db.prepare("DELETE FROM Backlog").run();
      db.prepare("DELETE FROM UsuariosEquipos").run();
      db.prepare("DELETE FROM Equipos").run();
      db.prepare("DELETE FROM Usuarios").run();
      db.prepare("UPDATE Configuracion SET hora_inicio = '08:00', hora_fin = '17:00', horas_efectivas = 6.0 WHERE id = 1").run();
    })();
    res.json({ success: true, message: "Base de datos reiniciada correctamente" });
  });

  app.post("/api/seed-data", (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const currentDayName = dayNames[new Date().getDay()];

    db.transaction(() => {
      // 0. Usuarios Mock
      const stmtUser = db.prepare("INSERT OR IGNORE INTO Usuarios (nombre, email, initials, role, rol_ejecutante) VALUES (?, ?, ?, ?, ?)");
      stmtUser.run('Carlos E. Araya', 'carlose.araya@latam.com', 'CA', 'supervisor', 'Calidad Fabrica');
      stmtUser.run('FAB Calidad 01', 'FABcalidad01@latam.com', 'F1', 'operador', 'Calidad Fabrica');
      stmtUser.run('FAB Calidad 02', 'FABcalidad02@latam.com', 'F2', 'operador', 'Calidad Fabrica');
      stmtUser.run('FAB Calidad 03', 'FABcalidad03@latam.com', 'F3', 'operador', 'Calidad Fabrica');
      stmtUser.run('LATAM Calidad 01', 'LATAMcalidad01@latam.com', 'L1', 'operador', 'Calidad LATAM');
      stmtUser.run('LATAM Calidad 02', 'LATAMcalidad02@latam.com', 'L2', 'operador', 'Calidad LATAM');
      stmtUser.run('LATAM Calidad 03', 'LATAMcalidad03@latam.com', 'L3', 'operador', 'Calidad LATAM');

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
      const prompt = `Analiza el texto libre y conviértelo en una actividad clara y profesional para un backlog operativo.
      
REGLA MUY IMPORTANTE: NO dividas ni desgloses el texto en múltiples tareas. Devuelve SIEMPRE 1 sola actividad.

TU OBJETIVO PRINCIPAL:
1. CORRECCIÓN Y PROFESIONALISMO: DEBES corregir la ortografía y mejorar la redacción del texto ingresado por el usuario. La propiedad "actividad" de tu respuesta JSON DEBE contener el texto YA CORREGIDO y profesional, conservando la idea original.
   Ejemplo 1: "voyu a revisar cosas en radar" -> "actividad": "Revisar indicadores en Radar"
   Ejemplo 2: "tengo que validacion de hipotesis de concta cente para aduitoria" -> "actividad": "Validación de hipótesis de Contact Center para auditoría"

2. MAPEO INTELIGENTE AL CATÁLOGO: Evalúa la intención del usuario para encontrar su similitud lógica con el siguiente CATÁLOGO OFICIAL. Por ejemplo, si menciona "validacion de hipotesis", mapealo a la tarea de Validación de hipótesis para heredar sus atributos.
3. El catálogo oficial sirve ÚNICAMENTE para extraer y asignar "complejidad", "tiempo_estimado" y "rol_ejecutante" según esa similitud lógica. Si no hay similitud evidente, asume complejidad 2, tiempo 60 y rol "Calidad Fabrica".

[CATÁLOGO - Calidad Fabrica]
- "Revisión de indicadores entregados por RADAR" (complejidad: 1, tiempo: 60)
- "Hipótesis: planteamiento + contexto operacional (en plataforma)" (complejidad: 2, tiempo: 75)
- "Escuchas y validacion de hipotesis (en plataforma)" (complejidad: 2, tiempo: 165)
- "Validación hipótesis en conjunto con LCoach" (complejidad: 1, tiempo: 60)
- "Análisis con IA: descarga LEA + armado para análisis IA" (complejidad: 3, tiempo: 60)
- "Armar slide y plan de acción para seguimiento" (complejidad: 2, tiempo: 60)
- "Seguimiento de focos (en plataforma)" (complejidad: 2, tiempo: 60)

[CATÁLOGO - Calidad LATAM]
- "Análisis profundo IA + escuchas" (complejidad: 3, tiempo: 240)
- "Auditorias BOT" (complejidad: 1, tiempo: 180)
- "Auditorias PCA/PTA" (complejidad: 2, tiempo: 240)
- "Revisión levantamientos Operación" (complejidad: 1, tiempo: 30)
- "Calibraciones" (complejidad: 1, tiempo: 60)

4. REGLA DE ARRASTRE: Si en el texto el usuario menciona que es una tarea "retrasada", "pendiente de ayer", o que lleva días "arrastrándose", suma +1 a la complejidad.
5. Asigna una "prioridad" lógica (10 crítica, 7 alta, 4 media, 2 baja). REGLA CRÍTICA: Si la complejidad asignada es 1, la prioridad NO puede ser alta o crítica (no puede ser 7 ni 10).
6. Asigna el "area" más lógica ("Operativo", "Monitoreo", "Tendencias", "Escuelita", "Calidad").

El formato de salida debe ser ESTRICTAMENTE un JSON array de objetos con:
"actividad" (string), "prioridad" (number), "area" (string), "complejidad" (number), "tiempo_estimado" (number), "rol_ejecutante" (string).

REGLA CRÍTICA: SOLO DEBES RESPONDER CON EL JSON ARRAY y absolutamente nada de texto adicional. Solo el JSON.

Texto a analizar: "${text}"`;

      const response = await model.generateContent(prompt);
      let jsonText = response.response.text() || "[]";
      jsonText = jsonText.replace(/```json\n?|```/g, "");
      res.json(JSON.parse(jsonText));
    } catch (error) {
      console.error("AI Backlog Error Detail:", error);
      res.status(500).json({ error: error.message || "Unknown AI error" });
    }
  });


  // ─── ADMIN: Live Monitor (Tiempo Real) ───────────────────────────────────────
  app.get("/api/admin/live", (req, res) => {
    try {
      // 1. Todos los agentes (operadores y supervisores)
      const agentes = db.prepare("SELECT id, nombre, email, initials, role, rol_ejecutante FROM Usuarios").all() as any[];
      
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santiago' }); // or use generic ISO
      const isoToday = new Date().toISOString().split('T')[0];

      // 2. Todas las tareas no terminadas de hoy para estado activo
      const tareasHoyNoTerminadas = db.prepare(`
        SELECT T.*, COALESCE(B.status, 'nuevo') as backlog_status, COALESCE(B.is_collaborative, 0) as is_collaborative, COALESCE(B.antiguedad, 0) as backlog_antiguedad
        FROM Tareas T
        LEFT JOIN Backlog B ON T.backlog_id = B.id
        WHERE T.fecha = ? AND (T.estado_ejecucion IS NULL OR LOWER(T.estado_ejecucion) NOT IN ('terminada', 'resuelto', 'cancelada', 'despriorizada'))
      `).all(isoToday) as any[];

      // 3. Todas las tareas de hoy (incluyendo terminadas y con is_collaborative de Backlog)
      const tareasHoyTotal = db.prepare(`
        SELECT T.*, COALESCE(B.status, 'nuevo') as backlog_status, COALESCE(B.is_collaborative, 0) as is_collaborative
        FROM Tareas T
        LEFT JOIN Backlog B ON T.backlog_id = B.id
        WHERE T.fecha = ?
      `).all(isoToday) as any[];

      // 4. Incidencias activas en este momento
      const now = new Date();
      // Format as HH:mm
      const nowHHMM = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
      
      const incidenciasHoy = db.prepare(`
        SELECT I.* 
        FROM Incidencias I
        WHERE I.fecha = ?
      `).all(isoToday) as any[];

      // 5. Horas efectivas para calcular factor de ocupación
      const planHoy = db.prepare("SELECT horas_efectivas FROM PlanesDiarios WHERE date = ?").get(isoToday) as { horas_efectivas: number } | undefined;
      const config = db.prepare("SELECT horas_efectivas FROM Configuracion WHERE id = 1").get() as { horas_efectivas: number };
      const horasEfectivas = planHoy?.horas_efectivas || config?.horas_efectivas || 6.0;
      const minutosCapacidad = horasEfectivas * 60;

      const result = agentes.map(ag => {
        // Find incidence
        const incidenciaActiva = incidenciasHoy.find(i => {
          if (i.user_id !== ag.id) return false;
          if (!i.hora_inicio || !i.hora_fin) return false;
          return nowHHMM >= i.hora_inicio && nowHHMM <= i.hora_fin;
        });

        // Find tasks
        const tareasAgenteActivas = tareasHoyNoTerminadas.filter(t => t.user_id === ag.id);
        
        // Find if they are actively working on one
        const tareaEnProgreso = tareasAgenteActivas.find(t => {
          const st = (t.estado_ejecucion || '').toLowerCase();
          return st === 'progreso' || st === 'en progreso' || st === 'en curso' || st === 'en estudio';
        });

        // If not, just find any pending task
        const tareaPendiente = tareasAgenteActivas.find(t => {
          const st = (t.estado_ejecucion || '').toLowerCase();
          return st === 'nuevo' || st === 'abierto' || st === 'en espera' || st === 'pendiente';
        });

        const tareaActiva = tareaEnProgreso || tareaPendiente;

        let estado = 'disponible';
        let detalle = 'Sin asignación actual';

        if (incidenciaActiva) {
          estado = 'incidencia';
          detalle = incidenciaActiva.descripcion || incidenciaActiva.tipo || 'Incidencia no especificada';
        } else if (tareaEnProgreso) {
          estado = 'trabajando';
          detalle = tareaEnProgreso.actividad;
        } else if (tareaPendiente) {
          estado = 'asignada';
          detalle = tareaPendiente.actividad;
        }

        // Tareas del agente para el día
        const tareasAgenteTotal = tareasHoyTotal.filter(t => t.user_id === ag.id);
        const minutosOcupados = tareasAgenteTotal.reduce((sum, t) => sum + (t.tiempo_asignado_minutos || 0), 0);
        const porcentajeOcupacion = minutosCapacidad > 0 ? Math.round((minutosOcupados / minutosCapacidad) * 100) : 0;

        return {
          ...ag,
          estado,
          detalle,
          tarea: tareaActiva || null,
          incidencia: incidenciaActiva || null,
          totalTareas: tareasAgenteTotal.length,
          porcentajeOcupacion,
          minutosOcupados,
          minutosCapacidad,
          tareas: tareasAgenteTotal
        };
      });

      res.json(result);
    } catch (e) {
      res.status(500).json({ error: e.message });
    }
  });

  // ─── ADMIN: Resumen Global del Equipo ───────────────────────────────────────
  app.get("/api/admin/resumen", (req, res) => {
    const { fechaInicio, fechaFin } = req.query;
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: "Se requiere fechaInicio y fechaFin" });
    }

    // 1. Todos los agentes (operadores + supervisores)
    const agentes = db.prepare("SELECT id, nombre, email, initials, role, rol_ejecutante FROM Usuarios").all() as any[];

    // 2. Tareas en el rango
    const tareas = db.prepare(`
      SELECT T.*, U.nombre as user_name, U.initials as user_initials, U.rol_ejecutante
      FROM Tareas T
      JOIN Usuarios U ON T.user_id = U.id
      WHERE T.fecha >= ? AND T.fecha <= ?
    `).all(fechaInicio, fechaFin) as any[];

    // 3. Incidencias en el rango (excluir almuerzo para fuga)
    const incidencias = db.prepare(`
      SELECT I.*, U.nombre as user_name
      FROM Incidencias I
      JOIN Usuarios U ON I.user_id = U.id
      WHERE I.fecha >= ? AND I.fecha <= ?
    `).all(fechaInicio, fechaFin) as any[];

    // 4. Jornadas cerradas en el rango
    const planesCount = db.prepare(`
      SELECT COUNT(*) as total, SUM(CASE WHEN estado_cierre = 1 THEN 1 ELSE 0 END) as cerrados
      FROM PlanesDiarios
      WHERE date >= ? AND date <= ?
    `).get(fechaInicio, fechaFin) as any;

    // 5. Métricas globales
    const RESOLVED = ['resuelto', 'terminada'];
    const totalTareas = tareas.length;
    const completadas = tareas.filter((t: any) => RESOLVED.includes((t.estado_ejecucion || '').toLowerCase())).length;
    const tasaCumplimiento = totalTareas > 0 ? Math.round((completadas / totalTareas) * 100) : 0;

    const criticas = tareas.filter((t: any) => t.prioridad === 10);
    const criticasCompletadas = criticas.filter((t: any) => RESOLVED.includes((t.estado_ejecucion || '').toLowerCase())).length;
    const tasaCriticas = criticas.length > 0 ? Math.round((criticasCompletadas / criticas.length) * 100) : 0;

    const altas = tareas.filter((t: any) => t.prioridad >= 7);
    const altasCompletadas = altas.filter((t: any) => RESOLVED.includes((t.estado_ejecucion || '').toLowerCase())).length;
    const tasaAltas = altas.length > 0 ? Math.round((altasCompletadas / altas.length) * 100) : 0;

    const reprogramadas = tareas.filter((t: any) => !RESOLVED.includes((t.estado_ejecucion || '').toLowerCase()) && (t.estado_ejecucion || '').toLowerCase() !== 'arrastrada').length;
    
    const arrastradasList = tareas.filter((t: any) => (t.estado_ejecucion || '').toLowerCase() === 'arrastrada');
    const arrastradas = arrastradasList.length;
    const antiguedadPromedio = arrastradas > 0 ? +(arrastradasList.reduce((acc: number, t: any) => acc + (t.antiguedad || 0), 0) / arrastradas).toFixed(1) : 0;

    const backlogItems = db.prepare("SELECT created_at FROM Backlog WHERE status NOT IN ('terminada', 'despriorizado')").all() as any[];
    const nowTemp = new Date();
    let backlogAcumuladoDias = 0;
    backlogItems.forEach((item: any) => {
      if (item.created_at) {
        const created = new Date(item.created_at.replace(" ", "T")); // handle SQL space vs ISO T format safely
        const diffTime = Math.max(0, nowTemp.getTime() - created.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        backlogAcumuladoDias += diffDays;
      }
    });
    const backlogCount = backlogItems.length || 1;
    const backlogPromedioDias = Math.round(backlogAcumuladoDias / backlogCount);

    // Horas invertidas (tiempo_invertido_minutos)
    const totalMinutosInvertidos = tareas.reduce((acc: number, t: any) => acc + (t.tiempo_invertido_minutos || 0), 0);
    const horasInvertidas = +(totalMinutosInvertidos / 60).toFixed(1);

    // Horas planeadas (tiempo_asignado_minutos)
    const totalMinutosPlaneados = tareas.reduce((acc: number, t: any) => acc + (t.tiempo_asignado_minutos || 0), 0);
    const horasPlaneadas = +(totalMinutosPlaneados / 60).toFixed(1);

    // Fuga operativa (incidencias no-almuerzo)
    const minutosLeakGlobal = incidencias.reduce((acc: number, inc: any) => {
      if (inc.tipo === 'Almuerzo') return acc;
      if (!inc.hora_inicio || !inc.hora_fin) return acc;
      const [h1, m1] = inc.hora_inicio.split(':').map(Number);
      const [h2, m2] = inc.hora_fin.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      return acc + (diff > 0 ? diff : 0);
    }, 0);
    const horasLeak = +(minutosLeakGlobal / 60).toFixed(1);

    // 6. Por-agente breakdown
    const porAgente = agentes.map((u: any) => {
      const ut = tareas.filter((t: any) => t.user_id === u.id);
      const uc = ut.filter((t: any) => RESOLVED.includes((t.estado_ejecucion || '').toLowerCase()));
      const ui = incidencias.filter((i: any) => i.user_id === u.id && i.tipo !== 'Almuerzo');

      const minsInv = ut.reduce((a: number, t: any) => a + (t.tiempo_invertido_minutos || 0), 0);
      const minsPlan = ut.reduce((a: number, t: any) => a + (t.tiempo_asignado_minutos || 0), 0);
      const minsLeak = ui.reduce((a: number, inc: any) => {
        if (!inc.hora_inicio || !inc.hora_fin) return a;
        const [h1, m1] = inc.hora_inicio.split(':').map(Number);
        const [h2, m2] = inc.hora_fin.split(':').map(Number);
        const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
        return a + (diff > 0 ? diff : 0);
      }, 0);

      const tRate = ut.length > 0 ? Math.round((uc.length / ut.length) * 100) : 0;
      const criticas = ut.filter((t: any) => t.prioridad === 10).length;
      const criticasOk = ut.filter((t: any) => t.prioridad === 10 && RESOLVED.includes((t.estado_ejecucion || '').toLowerCase())).length;

      // Carga cognitiva promedio diaria
      const weights: Record<number, number> = { 10: 2.0, 7: 1.5, 4: 1.0, 2: 0.5 };
      const totalCognitiveLoad = uc.reduce((acc: number, t: any) => {
        const priority = t.prioridad || 4;
        return acc + (weights[priority] || 1.0);
      }, 0);
      const uniqueDates = new Set(ut.map((t: any) => t.fecha));
      const diasActivos = uniqueDates.size || 1;
      const cargaCognitiva = +(totalCognitiveLoad / diasActivos).toFixed(1);

      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        initials: u.initials,
        role: u.role,
        rol_ejecutante: u.rol_ejecutante,
        totalTareas: ut.length,
        completadas: uc.length,
        tasaCumplimiento: tRate,
        horasInvertidas: +(minsInv / 60).toFixed(1),
        horasPlaneadas: +(minsPlan / 60).toFixed(1),
        horasLeak: +(minsLeak / 60).toFixed(1),
        incidencias: ui.length,
        criticas,
        criticasCompletadas: criticasOk,
        tasaCriticas: criticas > 0 ? Math.round((criticasOk / criticas) * 100) : 0,
        cargaCognitiva,
      };
    });

    // 7. Tendencia diaria (tareas completadas por fecha)
    const tendenciaDiaria: Record<string, { total: number; completadas: number }> = {};
    tareas.forEach((t: any) => {
      if (!tendenciaDiaria[t.fecha]) tendenciaDiaria[t.fecha] = { total: 0, completadas: 0 };
      tendenciaDiaria[t.fecha].total++;
      if (RESOLVED.includes((t.estado_ejecucion || '').toLowerCase())) {
        tendenciaDiaria[t.fecha].completadas++;
      }
    });

    // 8. Distribución por área
    const distribucionArea: Record<string, number> = {};
    tareas.forEach((t: any) => {
      const a = t.area || 'Operativo';
      distribucionArea[a] = (distribucionArea[a] || 0) + 1;
    });

    // 9. Distribución por prioridad
    const distribucionPrioridad = {
      critica: tareas.filter((t: any) => t.prioridad === 10).length,
      alta: tareas.filter((t: any) => t.prioridad === 7).length,
      media: tareas.filter((t: any) => t.prioridad === 4).length,
      baja: tareas.filter((t: any) => t.prioridad <= 2).length,
    };

    // 10. Tipos de incidencias
    const tiposIncidencia: Record<string, number> = {};
    incidencias.forEach((i: any) => {
      if (i.tipo === 'Almuerzo') return;
      tiposIncidencia[i.tipo] = (tiposIncidencia[i.tipo] || 0) + 1;
    });

    res.json({
      resumenGlobal: {
        totalTareas,
        completadas,
        tasaCumplimiento,
        horasInvertidas,
        horasPlaneadas,
        horasLeak,
        criticas: criticas.length,
        criticasCompletadas,
        tasaCriticas,
        tasaAltas,
        jornadas: planesCount,
        reprogramadas,
        arrastradas,
        antiguedadPromedio,
        backlogAcumuladoDias,
        backlogPromedioDias,
      },
      porAgente,
      tendenciaDiaria: Object.entries(tendenciaDiaria)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([fecha, v]) => ({
          fecha,
          total: v.total,
          completadas: v.completadas,
          tasa: v.total > 0 ? Math.round((v.completadas / v.total) * 100) : 0,
        })),
      distribucionArea,
      distribucionPrioridad,
      tiposIncidencia,
    });
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
