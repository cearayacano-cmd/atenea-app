import Database from 'better-sqlite3';

async function seed() {
    const db = new Database('./database.db');

    console.log("🚀 Iniciando carga de datos realistas para Atenea (Better-SQLite3)...");
    
    // Limpiar tablas
    try {
        db.prepare("DELETE FROM Backlog").run();
        db.prepare("DELETE FROM Tareas").run();
        db.prepare("DELETE FROM BloquesNoDisponibles").run();
        db.prepare("DELETE FROM PlanesDiarios").run();
        db.prepare("DELETE FROM Incidencias").run();
    } catch (e) {
        console.warn("⚠️ Algunos errores al limpiar tablas (tal vez no existen):", e.message);
    }

    const todayObj = new Date();
    const today = todayObj.toISOString().split('T')[0];

    // 1. BACKLOG ESTRATÉGICO (Tareas en cola)
    const backlogItems = [
        ['Auditoría de Seguridad Nivel 4 - Infraestructura', 10, 'SEGURIDAD'],
        ['Análisis de Patrones de Fraude Q2', 10, 'ESTRATEGIA'],
        ['Monitoreo de Canales VIP Latam', 7, 'MONITOREO'],
        ['Optimización de Querys en Producción', 7, 'OPERACIONES'],
        ['Escuelita: Capacitación en React 19', 4, 'ESCUELITA'],
        ['Actualización de Políticas de Acceso', 4, 'CALIDAD'],
        ['Limpieza de Logs Históricos', 2, 'OPERACIONES'],
        ['Revisión de Tickets de Soporte N3', 7, 'OPERACIONES'],
        ['Documentación de Nueva API de Incidencias', 4, 'DOCUMENTACION'],
        ['Planificación de Backup Mensual', 10, 'SEGURIDAD']
    ];

    const insertBacklog = db.prepare("INSERT INTO Backlog (actividad, prioridad, area, status) VALUES (?, ?, ?, 'pendiente')");
    for (const [act, prio, area] of backlogItems) {
        insertBacklog.run(act, prio, area);
    }

    // 2. HISTÓRICO DE LOS ÚLTIMOS 7 DÍAS (Para los gráficos del Dashboard)
    const areas = ['OPERACIONES', 'MONITOREO', 'SEGURIDAD', 'TENDENCIAS', 'ESCUELITA'];
    const statuses = ['resuelto', 'resuelto', 'resuelto', 'fallido', 'en espera']; 

    const insertTarea = db.prepare("INSERT INTO Tareas (fecha, actividad, prioridad, area, estado_ejecucion, tiempo_invertido_minutos) VALUES (?, ?, ?, ?, ?, ?)");
    const insertIncidencia = db.prepare("INSERT INTO Incidencias (descripcion, hora_inicio, hora_fin, tipo, fecha) VALUES (?, ?, ?, ?, ?)");

    for (let i = 7; i >= 1; i--) {
        const dateObj = new Date();
        dateObj.setDate(todayObj.getDate() - i);
        const dateStr = dateObj.toISOString().split('T')[0];
        
        const numTasks = Math.floor(Math.random() * 3) + 4;
        for (let j = 0; j < numTasks; j++) {
            const isYesterday = i === 1;
            let status = statuses[Math.floor(Math.random() * statuses.length)];
            if (isYesterday && j > 2) {
                status = 'no realizado';
            }

            insertTarea.run(
                dateStr, 
                `Tarea operativa ${j+1} - Día ${dateStr}`, 
                [2, 4, 7, 10][Math.floor(Math.random() * 4)], 
                areas[Math.floor(Math.random() * areas.length)], 
                status,
                status === 'resuelto' ? Math.floor(Math.random() * 60) + 30 : 0
            );
        }

        if (Math.random() > 0.3) {
            insertIncidencia.run('Caída de servicio menor - ' + dateStr, '10:00', '11:15', 'Técnico', dateStr);
        }
    }

    // 3. EXCEPCIONES Y PLANES (Jornada)
    db.prepare("INSERT OR REPLACE INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas) VALUES (?, '08:00', '17:00', 8)").run(today);
    
    const yesterdayObj = new Date();
    yesterdayObj.setDate(todayObj.getDate() - 1);
    const yesterdayStr = yesterdayObj.toISOString().split('T')[0];
    db.prepare("INSERT OR REPLACE INTO PlanesDiarios (date, hora_inicio, hora_fin, horas_efectivas) VALUES (?, '09:00', '18:00', 8)").run(yesterdayStr);

    console.log("✅ Datos cargados correctamente en database.db.");
    console.log(`📅 Hoy: ${today}`);
    console.log(`📅 Ayer (con pendientes): ${yesterdayStr}`);
    
    db.close();
}

seed().catch(console.error);
