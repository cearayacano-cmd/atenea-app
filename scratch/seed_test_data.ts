import sqlite3 from 'sqlite3';
import { open } from 'sqlite';
import path from 'path';

async function seed() {
    const db = await open({
        filename: './athenea.db',
        driver: sqlite3.Database
    });

    console.log("Limpiando base de datos para escenario de prueba...");
    await db.run("DELETE FROM Backlog");
    await db.run("DELETE FROM Tareas");
    await db.run("DELETE FROM BloquesNoDisponibles");

    const today = new Date().toISOString().split('T')[0];
    const yesterdayObj = new Date();
    yesterdayObj.setDate(yesterdayObj.getDate() - 1);
    const yesterday = yesterdayObj.toISOString().split('T')[0];

    console.log(`Configurando ayer (${yesterday}) y hoy (${today})...`);

    // 1. BACKLOG DISPONIBLE (Tareas Estratégicas)
    const backlogItems = [
        ['Revisión de Alertas de Seguridad Nivel 3', 10, 'ALERTAS'],
        ['Monitoreo de Canales Críticos Latam', 10, 'MONITOREO'],
        ['Análisis de Tendencias de Tráfico Semanal', 7, 'TENDENCIAS'],
        ['Escuelita: Feedback a nuevos analistas', 5, 'ESCUELITA'],
        ['Actualización de Dashboard de Operaciones', 5, 'GENERAL'],
        ['Reporte de Disponibilidad de Servicios', 7, 'MONITOREO'],
        ['Reunión de Sincronización con QA', 3, 'GENERAL'],
        ['Limpieza de Logs y Optimización de DB', 3, 'GENERAL'],
        ['Auditoría de Accesos no autorizados', 10, 'ALERTAS'],
        ['Preparación de Presentación para Gerencia', 7, 'TENDENCIAS']
    ];

    for (const [act, prio, area] of backlogItems) {
        await db.run("INSERT INTO Backlog (actividad, prioridad, area, status) VALUES (?, ?, ?, 'pendiente')", [act, prio, area]);
    }

    // 2. TAREAS NO REALIZADAS AYER (Para disparar sugerencias)
    const yesterdayTasks = [
        [yesterday, 'Revisión de Alertas Críticas (Pendiente)', 10, 'ALERTAS', 'no realizado'],
        [yesterday, 'Monitoreo de Llamadas - Campaña A', 7, 'MONITOREO', 'no realizado'],
        [yesterday, 'Actualización de Documentación de Turno', 3, 'GENERAL', 'no realizado']
    ];

    for (const [fecha, act, prio, area, estado] of yesterdayTasks) {
        await db.run("INSERT INTO Tareas (fecha, actividad, prioridad, area, estado_ejecucion) VALUES (?, ?, ?, ?, ?)", [fecha, act, prio, area, estado]);
    }

    // 3. EXCEPCIONES PARA HOY (Para probar capacidad efectiva)
    const exceptions = [
        [today, 'Almuerzo', '13:00', '14:00', 'Almuerzo'],
        [today, 'Daily Meeting', '08:30', '09:15', 'Reunión'],
        [today, 'Capacitación Técnica IARA', '15:00', '16:00', 'Capacitación']
    ];

    for (const [fecha, tipo, inicio, fin, t] of exceptions) {
        await db.run("INSERT INTO BloquesNoDisponibles (fecha, tipo, hora_inicio, hora_fin) VALUES (?, ?, ?, ?)", [fecha, tipo, inicio, fin]);
    }

    console.log("¡Escenario de prueba cargado con éxito!");
    await db.close();
}

seed().catch(console.error);
