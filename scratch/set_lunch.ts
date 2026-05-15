import Database from 'better-sqlite3';

async function setLunchForAll() {
    const db = new Database('./database.db');

    console.log("🍱 Configurando Almuerzo (13:00 - 14:00) masivamente...");
    
    const businessDays = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];

    // Limpiar almuerzos previos para evitar duplicados
    db.prepare("DELETE FROM BloquesNoDisponibles WHERE tipo = 'Almuerzo'").run();

    const insertBlock = db.prepare(`
        INSERT INTO BloquesNoDisponibles (tipo, hora_inicio, hora_fin, dia_semana) 
        VALUES (?, ?, ?, ?)
    `);

    for (const day of businessDays) {
        insertBlock.run('Almuerzo', '13:00', '14:00', day);
        console.log(`✅ Almuerzo configurado para: ${day}`);
    }

    console.log("🚀 ¡Configuración masiva completada!");
    db.close();
}

setLunchForAll().catch(console.error);
