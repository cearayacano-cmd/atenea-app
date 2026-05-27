import Database from 'better-sqlite3';
const db = new Database('database.db');

// List tables
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('Tables:', tables.map(t => t.name).join(', '));

// Check schedule table
const schemaKeys = tables.map(t => t.name);
if (schemaKeys.includes('JornadaBase')) {
  const jornada = db.prepare('PRAGMA table_info(JornadaBase)').all();
  console.log('JornadaBase cols:', jornada.map(c => c.name).join(', '));
  const jornadaData = db.prepare('SELECT * FROM JornadaBase LIMIT 5').all();
  console.log('JornadaBase sample:', JSON.stringify(jornadaData));
}

// Check tareas for user 16
const tareas16 = db.prepare('SELECT COUNT(*) as cnt FROM Tareas WHERE user_id = 16').get();
console.log('Tareas user 16:', tareas16.cnt);

// Copy tasks from user 1 to user 16 if needed
if (tareas16.cnt === 0) {
  const tareas1 = db.prepare('SELECT * FROM Tareas WHERE user_id = 1').all();
  console.log('Tareas user 1 to copy:', tareas1.length);
  const tareasSchema = db.prepare('PRAGMA table_info(Tareas)').all();
  console.log('Tareas cols:', tareasSchema.map(c => c.name).join(', '));
}

// Check incidencias for user 16
const inc16 = db.prepare('SELECT COUNT(*) as cnt FROM Incidencias WHERE user_id = 16').get();
console.log('Incidencias user 16:', inc16.cnt);

db.close();
