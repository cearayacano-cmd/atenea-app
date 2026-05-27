import Database from "better-sqlite3";

const db = new Database("database.db");

function populate() {
  console.log("Checking and updating Tareas table schema...");
  
  // Get current columns in Tareas
  const info = db.prepare("PRAGMA table_info(Tareas)").all() as any[];
  const columns = info.map(c => c.name);
  console.log("Current Tareas columns:", columns);
  
  if (!columns.includes("created_at")) {
    console.log("Adding created_at column...");
    db.exec("ALTER TABLE Tareas ADD COLUMN created_at TEXT");
  }
  if (!columns.includes("assigned_at")) {
    console.log("Adding assigned_at column...");
    db.exec("ALTER TABLE Tareas ADD COLUMN assigned_at TEXT");
  }
  if (!columns.includes("closed_at")) {
    console.log("Adding closed_at column...");
    db.exec("ALTER TABLE Tareas ADD COLUMN closed_at TEXT");
  }
  
  console.log("Updating Tareas table with timestamps...");
  const tasks = db.prepare("SELECT * FROM Tareas").all() as any[];
  
  const stmt = db.prepare(`
    UPDATE Tareas 
    SET created_at = ?, assigned_at = ?, closed_at = ?
    WHERE id = ?
  `);
  
  db.transaction(() => {
    let updatedCount = 0;
    for (const task of tasks) {
      const fecha = task.fecha;
      // Default created_at to fecha + 08:00:00
      const created_at = task.created_at || `${fecha}T08:00:00.000Z`;
      
      // Default assigned_at to fecha + 08:30:00
      const assigned_at = task.assigned_at || `${fecha}T08:30:00.000Z`;
      
      // Calculate closed_at
      let closed_at = task.closed_at;
      if (!closed_at) {
        const closedStatuses = ['resuelto', 'terminada', 'fallo', 'fallido', 'despriorizado', 'despriorizada', 'no realizado'];
        const isClosed = task.estado_ejecucion && closedStatuses.includes(task.estado_ejecucion.toLowerCase());
        
        if (isClosed) {
          const minutesToAdd = task.tiempo_invertido_minutos || task.tiempo_asignado_minutos || 60;
          const assignedDate = new Date(assigned_at);
          const closedDate = new Date(assignedDate.getTime() + minutesToAdd * 60 * 1000);
          closed_at = closedDate.toISOString();
        } else {
          closed_at = null;
        }
      }
      
      stmt.run(created_at, assigned_at, closed_at, task.id);
      updatedCount++;
    }
    console.log(`Successfully updated ${updatedCount} tasks.`);
  })();
}

try {
  populate();
} catch (e) {
  console.error("Error populating timestamps:", e);
} finally {
  db.close();
}
