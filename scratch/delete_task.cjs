const Database = require('better-sqlite3');
const db = new Database('database.db');

const result = db.prepare("DELETE FROM Tareas WHERE id = 814").run();
console.log("Delete result:", result);
