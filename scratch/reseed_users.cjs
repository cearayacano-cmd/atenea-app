const Database = require('better-sqlite3');
const db = new Database('database.db');

db.transaction(() => {
  // Clear old users, backlog assignments, and user team relations to avoid integrity issues
  db.prepare("DELETE FROM UsuariosEquipos").run();
  db.prepare("DELETE FROM BacklogAsignaciones").run();
  db.prepare("DELETE FROM LogsTareas").run();
  db.prepare("DELETE FROM Tareas").run();
  db.prepare("DELETE FROM PlanesDiarios").run();
  db.prepare("DELETE FROM Usuarios").run();

  const stmt = db.prepare("INSERT INTO Usuarios (email, nombre, initials, role, rol_ejecutante) VALUES (?, ?, ?, ?, ?)");
  
  // 1. Carlos E. Araya (supervisor with access to everything)
  stmt.run('carlose.araya@latam.com', 'Carlos E. Araya', 'CA', 'supervisor', 'Calidad Fabrica');

  // 2. Calidad Fabrica Operators
  stmt.run('FABcalidad01@latam.com', 'FAB Calidad 01', 'F1', 'operador', 'Calidad Fabrica');
  stmt.run('FABcalidad02@latam.com', 'FAB Calidad 02', 'F2', 'operador', 'Calidad Fabrica');
  stmt.run('FABcalidad03@latam.com', 'FAB Calidad 03', 'F3', 'operador', 'Calidad Fabrica');

  // 3. Calidad LATAM Operators
  stmt.run('LATAMcalidad01@latam.com', 'LATAM Calidad 01', 'L1', 'operador', 'Calidad LATAM');
  stmt.run('LATAMcalidad02@latam.com', 'LATAM Calidad 02', 'L2', 'operador', 'Calidad LATAM');
  stmt.run('LATAMcalidad03@latam.com', 'LATAM Calidad 03', 'L3', 'operador', 'Calidad LATAM');
})();

console.log("Database successfully reseeded with new users.");
