const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.resolve('database.db');
const db = new Database(dbPath);

console.log('Cleaning database at:', dbPath);

db.transaction(() => {
  db.prepare('DELETE FROM LogsTareas').run();
  db.prepare('DELETE FROM BacklogAsignaciones').run();
  db.prepare('DELETE FROM Tareas').run();
  db.prepare('DELETE FROM PlanesDiarios').run();
  db.prepare('DELETE FROM Incidencias').run();
  db.prepare('DELETE FROM BloquesNoDisponibles').run();
  db.prepare('DELETE FROM Backlog').run();
  db.prepare('DELETE FROM UsuariosEquipos').run();
  db.prepare('DELETE FROM Equipos').run();
  db.prepare('DELETE FROM Usuarios').run();
  
  // Re-seed default users
  const stmt = db.prepare('INSERT OR IGNORE INTO Usuarios (email, nombre, initials, role, rol_ejecutante) VALUES (?, ?, ?, ?, ?)');
  stmt.run('carlose.araya@latam.com', 'Carlos E. Araya', 'CA', 'supervisor', 'Calidad Fabrica');
  stmt.run('calidadlatam01@latam.com', 'Calidad LATAM 01', 'LA', 'operador', 'Calidad LATAM');
  stmt.run('calidadlatam02@latam.com', 'Calidad LATAM 02', 'LA', 'operador', 'Calidad LATAM');
  stmt.run('calidadpe01@latam.com', 'Calidad PE 01', 'PE', 'operador', 'Calidad Fabrica');
  
  db.prepare("UPDATE Configuracion SET hora_inicio = '08:00', hora_fin = '17:00', horas_efectivas = 6.0 WHERE id = 1").run();
})();

console.log('Database cleaned and seeded successfully!');
