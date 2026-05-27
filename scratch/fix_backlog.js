import Database from 'better-sqlite3';
const db = new Database('database.db');

db.transaction(() => {
  // 1. Ensure user 1 exists in Usuarios table to satisfy foreign key constraints
  db.prepare(`
    INSERT OR IGNORE INTO Usuarios (id, nombre, email, initials, role, rol_ejecutante)
    VALUES (1, 'Carlos', 'carlos@latam.com', 'C', 'operador', 'Calidad Fabrica')
  `).run();

  // 2. Update existing backlog items to be collaborative
  db.prepare("UPDATE Backlog SET is_collaborative = 1").run();

  // 3. Fetch all backlog item IDs
  const backlogItems = db.prepare("SELECT id FROM Backlog").all();

  // 4. Clear existing assignments to avoid duplicates
  db.prepare("DELETE FROM BacklogAsignaciones").run();

  // 5. Assign all backlog items to all active users (1, 37, 38, 39, 40)
  const users = [1, 37, 38, 39, 40];
  const stmt = db.prepare("INSERT INTO BacklogAsignaciones (backlog_id, user_id) VALUES (?, ?)");

  backlogItems.forEach(item => {
    users.forEach(userId => {
      stmt.run(item.id, userId);
    });
  });
})();

console.log("Backlog items successfully fixed and assigned!");
db.close();
