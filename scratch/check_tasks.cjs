const Database = require('better-sqlite3');
const db = new Database('database.db');

const tasks = db.prepare("SELECT id, fecha, actividad, prioridad, user_id FROM Tareas WHERE fecha = '2026-05-27'").all();
console.log("Tasks for 2026-05-27:", tasks);
