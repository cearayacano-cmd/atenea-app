import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, AlertCircle, Rocket, Check, X, Calendar as CalendarIcon, Clock, Zap, ListChecks, Play, Search } from 'lucide-react';

interface Task {
  id?: number;
  backlog_id?: number;
  actividad: string;
  prioridad: number;
  hora_inicio_plan?: string | null;
  hora_fin_plan?: string | null;
  tiempo_asignado_minutos?: number;
  completada?: boolean;
  estado_ejecucion?: string | null;
  minutos_remanentes?: number;
  fecha_origen_remanente?: string | null;
  area?: string | null;
}

const PRIORITIES = [
  { label: 'CRÍTICA', value: 10, color: 'bg-accent' },
  { label: 'ALTA', value: 7, color: 'bg-primary' },
  { label: 'MEDIA', value: 4, color: 'bg-[#00A6D4]' },
  { label: 'BAJA', value: 2, color: 'bg-[#B8B8B8]' },
];

const getDurationByPriority = (p: number) => {
  switch (p) {
    case 10: return 120; // CRÍTICA: 2h
    case 7: return 90;   // ALTA: 1.5h
    case 4: return 60;   // MEDIA: 1h
    case 2: return 30;   // BAJA: 0.5h
    default: return 60;
  }
};

interface PlanningViewProps {
  onNavigate?: (view: 'config' | 'planning' | 'agenda' | 'dashboard') => void;
}

export default function PlanningView({ onNavigate }: PlanningViewProps) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [effectiveHours, setEffectiveHours] = useState<number | string>(0);
  
  const [activity, setActivity] = useState('');
  const [priority, setPriority] = useState(7);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [estadoCierre, setEstadoCierre] = useState(0);
  const [ejecucionIniciada, setEjecucionIniciada] = useState(0);
  const [horaInicioEjecucion, setHoraInicioEjecucion] = useState<string | null>(null);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editActivity, setEditActivity] = useState('');
  const [editPriority, setEditPriority] = useState(7);
  const [editArea, setEditArea] = useState('');
  const [inlineEditingAreaId, setInlineEditingAreaId] = useState<number | null>(null);
  const [tempArea, setTempArea] = useState('');
  const [saturationWarning, setSaturationWarning] = useState<string | null>(null);
  const [historicalTasks, setHistoricalTasks] = useState<any[]>([]);
  const [allBloques, setAllBloques] = useState<any[]>([]);
  const [incidencias, setIncidencias] = useState<any[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<Task[]>([]);
  const [backlogItems, setBacklogItems] = useState<any[]>([]);
  const [contextoAtenea, setContextoAtenea] = useState<any>(null);
  
  const isAgendaGenerated = tasks.some(t => t.hora_inicio_plan != null);
  const totalRequiredMins = tasks.reduce((acc, t) => acc + getDurationByPriority(t.prioridad), 0);
  const totalAvailableMins = Math.round(Number(effectiveHours) * 60);
  const isSaturated = totalRequiredMins > totalAvailableMins;

  useEffect(() => {
    fetchBacklog();
  }, []);

  const fetchBacklog = async () => {
    try {
      const res = await fetch('/api/backlog');
      const data = await res.json();
      setBacklogItems(data.filter((item: any) => item.status !== 'terminada' && item.status !== 'despriorizado'));
    } catch (error) {
      console.error("Error fetching backlog:", error);
    }
  };

  useEffect(() => {
    const data = localStorage.getItem("atenea_recomendacion");
    if (!data) return;

    try {
      const contexto = JSON.parse(data);
      if (!contexto.fecha) {
        setContextoAtenea(null);
        return;
      }

      // Fecha del análisis en el Dashboard
      const fechaContexto = new Date(contexto.fecha + "T00:00:00");
      if (isNaN(fechaContexto.getTime())) {
        setContextoAtenea(null);
        return;
      }
      
      // El mensaje es para el día siguiente al análisis
      fechaContexto.setDate(fechaContexto.getDate() + 1);

      // Fecha que se está planificando actualmente
      const fechaPlanning = new Date(selectedDate + "T00:00:00");
      if (isNaN(fechaPlanning.getTime())) {
        setContextoAtenea(null);
        return;
      }

      // Solo mostramos si coinciden (Dashboard + 1 == Planning)
      if (fechaContexto.toISOString().split('T')[0] === fechaPlanning.toISOString().split('T')[0]) {
        setContextoAtenea(contexto);
      } else {
        setContextoAtenea(null);
      }
    } catch (e) {
      console.error("Error parsing atenea_recomendacion:", e);
      setContextoAtenea(null);
    }
  }, [selectedDate]);

  const fetchTasks = async () => {
    const [planRes, bloquesRes, incidenciasRes] = await Promise.all([
      fetch(`/api/tareas?fecha=${selectedDate}`),
      fetch(`/api/bloques?fecha=${selectedDate}`),
      fetch(`/api/incidencias?fecha=${selectedDate}`)
    ]);
    const data = await planRes.json();
    const bloques = await bloquesRes.json();
    const incs = await incidenciasRes.json();
    
    setAllBloques(bloques.tasks || bloques); // Handle potential different response formats
    setIncidencias(incs.tasks || incs);
    
    setStartTime(data.plan.hora_inicio || '');
    setEndTime(data.plan.hora_fin || '');
    setEffectiveHours(data.plan.horas_efectivas || 0);
    setEstadoCierre(data.plan.estado_cierre || 0);
    setEjecucionIniciada(data.plan.ejecucion_iniciada || 0);
    setHoraInicioEjecucion(data.plan.hora_inicio_ejecucion || null);

    // New Suggested Rescheduling System
    await fetchPendingFromYesterday(selectedDate, data.tasks);
    
    setTasks(data.tasks.map((t: any) => ({
      ...t,
      completada: t.completada === 1
    })));
  };

  const dayStartSuggestion = (() => {
    // Prioridad 1: Tareas que quedaron en "no realizado" o sin estado ayer
    const noRealizadas = pendingSuggestions.filter(t => t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion);
    if (noRealizadas.length > 0) {
      const topTask = [...noRealizadas].sort((a, b) => b.prioridad - a.prioridad)[0];
      return `Prioriza tarea no realizada ayer: "${topTask.actividad}". Es fundamental cerrar ciclos pendientes para mantener el ritmo estratégico.`;
    }

    if (pendingSuggestions.some(t => t.prioridad === 10)) {
      return "Podrías comenzar por la tarea crítica pendiente para asegurar avance desde el inicio.";
    }
    if (contextoAtenea?.causaPrincipal?.includes("tiempo")) {
      return "Podrías iniciar con una tarea clave para asegurar progreso temprano en el día.";
    }
    if (contextoAtenea?.porcentajeEstrategico < 50) {
      return "Podrías priorizar una tarea de alto impacto para mejorar tu enfoque estratégico.";
    }
    return "Por ahora no hay suficiente información para sugerir un inicio concreto. Te recomiendo comenzar por lo que consideres más relevante.";
  })();

  const fetchPendingFromYesterday = async (currentDate: string, currentTasks: any[] = []) => {
    const prevDateObj = new Date(currentDate + 'T00:00:00');
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = prevDateObj.toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/tareas?fecha=${prevDate}`);
      const data = await res.json();
      
      // Rule 1: Only if previous day is closed
      if (data.plan && data.plan.estado_cierre === 1) {
        // Get dismissed tasks for this date from localStorage
        const dismissedKey = `dismissed_suggestions_${currentDate}`;
        const dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

        // Rule 2: Only "no realizado" or not marked
        // Rule 3: Not already in current tasks (by name)
        // Rule 4: Not dismissed
        const pending = data.tasks.filter((t: any) => {
          // Rule 2: Only "no realizado" or not marked
          const isNoRealizada = t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion;
          if (!isNoRealizada) return false;

          // Rule 3: Not already in current tasks (by name)
          const alreadyAdded = currentTasks.some((ct: any) => 
            ct.actividad.trim().toLowerCase() === t.actividad.trim().toLowerCase()
          );
          if (alreadyAdded) return false;

          // Rule 4: Not dismissed
          const isDismissed = dismissedIds.includes(t.id);
          if (isDismissed) return false;

          return true;
        });
        setPendingSuggestions(pending);
      } else {
        // Fallback: If day not closed, still show pending tasks that are "no realizado" or not marked
        const pending = data.tasks.filter((t: any) => 
          (t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion) && t.completada === 0
        );
        setPendingSuggestions(pending);
      }
    } catch (error) {
      console.error("Error fetching pending tasks from yesterday:", error);
      setPendingSuggestions([]);
    }
  };

  const handleAddSuggestion = async (t: Partial<Task> & { backlog_id?: number, newStatus?: string }) => {
    try {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: selectedDate,
          actividad: t.actividad,
          prioridad: t.prioridad,
          tiempo_asignado_minutos: 0, // Reset time for new day
          backlog_id: t.backlog_id,
          area: t.area
        }),
      });

      // If it's from backlog, update its status
      if (t.backlog_id && t.newStatus) {
        await fetch(`/api/backlog/${t.backlog_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: t.newStatus })
        });
        fetchBacklog();
      }

      // Remove from suggestions if it was there
      if (t.id) {
        setPendingSuggestions(prev => prev.filter(p => p.id !== t.id));
      }
      
      // Refresh current tasks
      const res = await fetch(`/api/tareas?fecha=${selectedDate}`);
      const data = await res.json();
      setTasks(data.tasks.map((task: any) => ({
        ...task,
        completada: task.completada === 1
      })));
    } catch (error) {
      console.error("Error adding suggested task:", error);
    }
  };

  const handleDiscardSuggestion = (taskId: number) => {
    const dismissedKey = `dismissed_suggestions_${selectedDate}`;
    const dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
    if (!dismissedIds.includes(taskId)) {
      dismissedIds.push(taskId);
      localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
    }
    setPendingSuggestions(prev => prev.filter(p => p.id !== taskId));
  };

  const fetchHistoricalTasks = async () => {
    const [year, month, day] = selectedDate.split('-').map(Number);
    const baseDate = new Date(year, month - 1, day);
    
    // Get Monday of the current week (calendar week starting Monday)
    const dayOfWeek = baseDate.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = baseDate.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    const monday = new Date(baseDate);
    monday.setDate(diff);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dateStr = `${y}-${m}-${dd}`;
      // Only fetch dates before or equal to selectedDate
      if (dateStr <= selectedDate) {
        dates.push(dateStr);
      }
    }

    try {
      const results = await Promise.all(dates.map(date => fetch(`/api/tareas?fecha=${date}`).then(r => r.json())));
      // Store both tasks and plan for each date
      const allHistorical = results.map(r => ({
        tasks: r.tasks || [],
        plan: r.plan || {},
        date: r.plan?.date
      }));
      setHistoricalTasks(allHistorical);
      console.log("[DEBUG] historicalTasks:", allHistorical);
    } catch (error) {
      console.error("Error fetching historical tasks:", error);
    }
  };

  useEffect(() => {
    fetchTasks();
    fetchHistoricalTasks();
    setSaturationWarning(null);
  }, [selectedDate]);

  useEffect(() => {
    setSaturationWarning(null);
  }, [startTime, endTime]);

  useEffect(() => {
    if (!startTime || !endTime) return;

    const toMins = (time: string) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    const dateObj = new Date(selectedDate + 'T00:00:00');
    const dayOfWeek = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
    const normalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).toLowerCase();
    
    const applicableBlocks = allBloques.filter((b: any) => 
      b.fecha === selectedDate || b.dia_semana === normalizedDay
    );

    const busyIntervals = [
      ...applicableBlocks.map((b: any) => ({ start: b.hora_inicio, end: b.hora_fin })),
      ...incidencias.map((i: any) => ({ start: i.hora_inicio, end: i.hora_fin }))
    ];

    const dayStart = toMins(startTime);
    const dayEnd = toMins(endTime);

    const busyMins = busyIntervals.map(i => ({
      start: toMins(i.start),
      end: toMins(i.end)
    })).sort((a, b) => a.start - b.start);

    const validBusy = busyMins
      .map(b => ({
        start: Math.max(dayStart, b.start),
        end: Math.min(dayEnd, b.end)
      }))
      .filter(b => b.start < b.end)
      .sort((a, b) => a.start - b.start);

    const mergedBusy: {start: number, end: number}[] = [];
    if (validBusy.length > 0) {
      let current = { ...validBusy[0] };
      for (let i = 1; i < validBusy.length; i++) {
        if (validBusy[i].start <= current.end) {
          current.end = Math.max(current.end, validBusy[i].end);
        } else {
          mergedBusy.push(current);
          current = { ...validBusy[i] };
        }
      }
      mergedBusy.push(current);
    }

    const totalBusyMins = mergedBusy.reduce((acc, b) => acc + (b.end - b.start), 0);
    const totalMins = dayEnd - dayStart;
    const effectiveMins = Math.max(0, totalMins - totalBusyMins);
    setEffectiveHours((effectiveMins / 60).toFixed(1));
  }, [startTime, endTime, allBloques, incidencias, selectedDate]);

  const getRescheduleCount = (name: string, prio: number) => {
    if (!name || prio < 7) return 0;
    const normalized = name.trim().toLowerCase();
    
    let count = 0;
    // Rule: same name (case insensitive), fecha in same week, completada = false, estado_cierre = 1
    historicalTasks.forEach(dayData => {
      // Don't count the selected date itself if it's not closed yet (usually it's not)
      if (dayData.date === selectedDate) return;

      if (dayData.plan && dayData.plan.estado_cierre === 1) {
        const match = dayData.tasks.find((t: any) => 
          t.actividad.trim().toLowerCase() === normalized && 
          (t.completada === 0 || t.completada === false)
        );
        if (match) count++;
      }
    });
    
    console.log("[DEBUG] Reprogramaciones detectadas para:", name, "→", count);
    return count;
  };

  const totalConsecutiveDays = getRescheduleCount(activity, priority);
  const editRescheduleCount = editingId ? getRescheduleCount(editActivity, editPriority) : 0;

  const handleManualChange = (field: string, value: any) => {
    if (field === 'startTime') setStartTime(value);
    if (field === 'endTime') setEndTime(value);
  };

  const addTask = async () => {
    if (!activity) return;
    const newTask = { 
      fecha: selectedDate, 
      actividad: activity, 
      prioridad: priority,
      tiempo_asignado_minutos: getDurationByPriority(priority)
    };
    const res = await fetch('/api/tareas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newTask),
    });
    if (res.ok) {
      setActivity('');
      setSaturationWarning(null);
      fetchTasks();
    }
  };

  const deleteTask = async (id: number) => {
    await fetch(`/api/tareas/${id}`, { method: 'DELETE' });
    setTasks(tasks.filter(t => t.id !== id));
    setSaturationWarning(null);
  };

  const saveInlineArea = async (id: number) => {
    const task = tasks.find(t => t.id === id);
    if (!task) return;
    await fetch(`/api/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...task, area: tempArea })
    });
    setInlineEditingAreaId(null);
    fetchTasks();
  };

  const startEditing = (task: Task) => {
    if (task.id) {
      setEditingId(task.id);
      setEditActivity(task.actividad);
      setEditPriority(task.prioridad);
      setEditArea(task.area || '');
    }
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditActivity('');
    setEditPriority(7);
    setEditArea('');
  };

  const saveEdit = async (id: number) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        actividad: editActivity, 
        prioridad: editPriority,
        area: editArea,
        tiempo_asignado_minutos: getDurationByPriority(editPriority)
      }),
    });
    if (res.ok) {
      setEditingId(null);
      setSaturationWarning(null);
      fetchTasks();
    }
  };

  const handleModificarAgenda = () => {
    setTasks(prev => prev.map(t => ({
      ...t,
      hora_inicio_plan: null,
      hora_fin_plan: null,
      tiempo_asignado_minutos: 0
    })));
    setSaturationWarning(null);
  };

  const generateIntelligentAgenda = async () => {
    if (tasks.length === 0) return;
    
    try {
      // 1. Fetch blocks and incidents
      const [bloquesRes, incidenciasRes] = await Promise.all([
        fetch(`/api/bloques?fecha=${selectedDate}`),
        fetch(`/api/incidencias?fecha=${selectedDate}`)
      ]);
      const allBloques = await bloquesRes.json();
      const incidencias = await incidenciasRes.json();

      // 2. Filter blocks for the specific day of week
      const dateObj = new Date(selectedDate + 'T00:00:00');
      const dayOfWeek = dateObj.toLocaleDateString('es-ES', { weekday: 'long' });
      const normalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).toLowerCase();
      
      const applicableBlocks = allBloques.filter((b: any) => 
        b.fecha === selectedDate || b.dia_semana === normalizedDay
      );

      // 3. Combine with incidents
      const busyIntervals = [
        ...applicableBlocks.map((b: any) => ({ start: b.hora_inicio, end: b.hora_fin })),
        ...incidencias.map((i: any) => ({ start: i.hora_inicio, end: i.hora_fin }))
      ];

      const toMins = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        return h * 60 + m;
      };

      const fromMins = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };

      const dayStart = toMins(startTime || '08:00');
      const dayEnd = toMins(endTime || '17:00');

      const busyMins = busyIntervals.map(i => ({
        start: toMins(i.start),
        end: toMins(i.end)
      })).sort((a, b) => a.start - b.start);

      // Merge overlapping busy intervals and clip to day range
      const validBusy = busyMins
        .map(b => ({
          start: Math.max(dayStart, b.start),
          end: Math.min(dayEnd, b.end)
        }))
        .filter(b => b.start < b.end)
        .sort((a, b) => a.start - b.start);

      const mergedBusy: {start: number, end: number}[] = [];
      if (validBusy.length > 0) {
        let current = { ...validBusy[0] };
        for (let i = 1; i < validBusy.length; i++) {
          if (validBusy[i].start <= current.end) {
            current.end = Math.max(current.end, validBusy[i].end);
          } else {
            mergedBusy.push(current);
            current = { ...validBusy[i] };
          }
        }
        mergedBusy.push(current);
      }

      // Calculate available windows
      const windows: {start: number, end: number, duration: number}[] = [];
      let lastEnd = dayStart;
      for (const busy of mergedBusy) {
        if (busy.start > lastEnd) {
          windows.push({ start: lastEnd, end: busy.start, duration: busy.start - lastEnd });
        }
        lastEnd = Math.max(lastEnd, busy.end);
      }
      if (lastEnd < dayEnd) {
        windows.push({ start: lastEnd, end: dayEnd, duration: dayEnd - lastEnd });
      }

      // 4. Strategic Distribution Logic
      const sortedTasks = [...tasks].sort((a, b) => b.prioridad - a.prioridad);
      const totalAvailableMins = windows.reduce((acc, w) => acc + w.duration, 0);

      // Check for saturation before planning
      const totalRequiredMins = tasks.reduce((acc, t) => acc + getDurationByPriority(t.prioridad), 0);
      if (totalRequiredMins > totalAvailableMins) {
        setSaturationWarning("Capacidad del día alcanzada. La planificación actual supera el tiempo disponible.");
        return; // Block generation
      }

      let globalPlannedMins = 0;

      const taskStates = sortedTasks.map(t => ({
        ...t,
        totalToPlan: 0,
        plannedMins: 0,
        blocks: [] as {start: string, end: string}[],
        originalTarget: getDurationByPriority(t.prioridad)
      }));

      // FASE 1: CÁLCULO DE MINUTOS TOTALES (BASE)
      for (const ts of taskStates) {
        const take = Math.min(ts.originalTarget, totalAvailableMins - globalPlannedMins);
        ts.totalToPlan = take;
        globalPlannedMins += take;
      }

      // FASE 2: CÁLCULO DE MINUTOS TOTALES (REFUERZO POR RONDAS)
      const eligibleTasks = taskStates.filter(ts => ts.prioridad >= 4);
      let continueReinforcement = true;
      while (continueReinforcement && globalPlannedMins < totalAvailableMins) {
        let assignedInThisRound = false;
        for (const ts of eligibleTasks) {
          const maxTotal = ts.prioridad === 10 ? 240 : (ts.prioridad === 7 ? 180 : 90);
          if (ts.totalToPlan >= maxTotal) continue;

          const take = Math.min(30, maxTotal - ts.totalToPlan, totalAvailableMins - globalPlannedMins);
          if (take > 0) {
            ts.totalToPlan += take;
            globalPlannedMins += take;
            assignedInThisRound = true;
          }
        }
        if (!assignedInThisRound) continueReinforcement = false;
      }

      // FASE 3: DISTRIBUCIÓN FÍSICA EN VENTANAS (CON LÍMITE DE 2 BLOQUES)
      let windowCapacities = windows.map(w => ({ ...w, remaining: w.duration }));
      
      for (const ts of taskStates) {
        let remainingToAssign = ts.totalToPlan;
        if (remainingToAssign <= 0) continue;

        for (let i = 0; i < windowCapacities.length && remainingToAssign > 0; i++) {
          const ws = windowCapacities[i];
          if (ws.remaining <= 0) continue;

          // Regla: Máximo 2 bloques por tarea
          if (ts.blocks.length >= 2) break;

          const take = Math.min(remainingToAssign, ws.remaining);
          const startMins = ws.start + (ws.duration - ws.remaining);
          
          ts.blocks.push({
            start: fromMins(startMins),
            end: fromMins(startMins + take)
          });
          
          ts.plannedMins += take;
          remainingToAssign -= take;
          ws.remaining -= take;
        }
      }

      // 5. Finalize and Persist
      let partiallyPlannedCount = 0;
      const updatedTasks = taskStates.map(ts => {
        let minutos_remanentes = 0;
        let fecha_origen_remanente = null;

        // Guardar remanente si >= 15 min (solo para tareas Críticas y Altas)
        if (ts.plannedMins < ts.originalTarget && ts.prioridad >= 7) {
          const rem = ts.originalTarget - ts.plannedMins;
          if (rem >= 15) {
            minutos_remanentes = rem;
            fecha_origen_remanente = ts.fecha_origen_remanente || selectedDate;
          }
          partiallyPlannedCount++;
        }

        if (minutos_remanentes > 0) {
          console.log(`[AUDIT] Tarea "${ts.actividad}" (ID: ${ts.id}) calculó remanente: ${minutos_remanentes} min. Prioridad: ${ts.prioridad}`);
        }

        if (ts.blocks.length === 0) {
          return { 
            ...ts, 
            hora_inicio_plan: null, 
            hora_fin_plan: null,
            minutos_remanentes,
            fecha_origen_remanente
          };
        }

        return {
          ...ts,
          // Format as JSON arrays for AgendaView compatibility
          hora_inicio_plan: JSON.stringify(ts.blocks.map(b => b.start)),
          hora_fin_plan: JSON.stringify(ts.blocks.map(b => b.end)),
          tiempo_asignado_minutos: ts.plannedMins,
          minutos_remanentes,
          fecha_origen_remanente
        };
      });

      if (partiallyPlannedCount > 0) {
        setSaturationWarning(`⚠️ Alerta: ${partiallyPlannedCount} tareas quedaron parcialmente planificadas por falta de tiempo disponible.`);
      } else {
        setSaturationWarning(null);
      }

      // Persist
      const planRes = await fetch(`/api/plan-diario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDate, 
          hora_inicio: startTime, 
          hora_fin: endTime, 
          horas_efectivas: effectiveHours
        }),
      });
      if (!planRes.ok) throw new Error("Failed to save daily plan");

      const savePromises = updatedTasks.map(async (t) => {
        if (!t.id) return;
        return fetch(`/api/tareas/${t.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            hora_inicio_plan: t.hora_inicio_plan,
            hora_fin_plan: t.hora_fin_plan,
            tiempo_asignado_minutos: t.tiempo_asignado_minutos,
            minutos_remanentes: t.minutos_remanentes,
            fecha_origen_remanente: t.fecha_origen_remanente
          })
        });
      });
      
      await Promise.all(savePromises);

      if (onNavigate) {
        onNavigate('agenda');
      }
    } catch (error) {
      console.error("Error generating agenda:", error);
      window.alert?.(`Error al generar la agenda: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const savePlan = async () => {
    await fetch(`/api/plan-diario`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        date: selectedDate, 
        hora_inicio: startTime, 
        hora_fin: endTime, 
        horas_efectivas: effectiveHours
      }),
    });
    window.alert?.('Agenda guardada. ¡Listo para procesar!');
  };

  return (
    <div className="space-y-8">
      {/* Date Selector */}
      <div className="latam-card !p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-text-muted">
            <CalendarIcon size={20} className="mr-2" />
            <span className="font-medium">Planificar para:</span>
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary transition-all hover:border-primary/30"
          />
        </div>
      </div>

      {/* Availability Header */}
      <div className="latam-card grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={`p-4 rounded-xl transition-all ${ejecucionIniciada === 1 ? 'bg-bg-main opacity-60' : 'bg-bg-main'}`}>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Hora Inicio</label>
          <input 
            type="time" 
            value={startTime}
            disabled={ejecucionIniciada === 1}
            onChange={(e) => handleManualChange('startTime', e.target.value)}
            className="bg-transparent text-lg font-semibold outline-none w-full disabled:cursor-not-allowed"
          />
        </div>
        <div className={`p-4 rounded-xl transition-all ${ejecucionIniciada === 1 ? 'bg-bg-main opacity-60' : 'bg-bg-main'}`}>
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Hora Fin</label>
          <input 
            type="time" 
            value={endTime}
            disabled={ejecucionIniciada === 1}
            onChange={(e) => handleManualChange('endTime', e.target.value)}
            className="bg-transparent text-lg font-semibold outline-none w-full disabled:cursor-not-allowed"
          />
        </div>
        <div className="p-4 rounded-xl transition-all bg-bg-main flex flex-col justify-center">
          <label className="block text-xs font-bold text-text-muted uppercase mb-1">Jornada efectiva</label>
          <span className="text-sm font-bold text-primary">{effectiveHours} horas disponibles</span>
        </div>
      </div>

      {!isAgendaGenerated && ejecucionIniciada === 0 && (
        <div className="latam-card !bg-[#7DA81A]/5 border border-[#7DA81A]/10 flex items-start gap-4 p-4">
          <div className="p-2 bg-[#7DA81A]/10 rounded-lg text-[#7DA81A]">
            <Zap size={20} fill="currentColor" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#7DA81A] uppercase tracking-wider mb-1 flex items-center gap-2">
              <span>🧠</span> Sugerencia de Inicio del Día
            </h4>
            <p className="text-sm text-text-main font-medium">
              {dayStartSuggestion}
            </p>
          </div>
        </div>
      )}

      {/* Execution Status Message */}
      {ejecucionIniciada === 1 && (
        <div className="latam-card !bg-amber-50 border-2 border-amber-200 flex items-center gap-4 p-6 mb-8">
          <div className="p-3 bg-amber-100 rounded-full text-amber-600 shadow-sm">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-amber-800">Planificación Finalizada</h3>
            <p className="text-sm text-amber-700">
              La agenda del día ya está en ejecución. No es posible agregar o modificar actividades en esta vista.
              Consulta el progreso en la <strong>Agenda del Día</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Backlog Selection Section */}
      {!isAgendaGenerated && ejecucionIniciada === 0 && backlogItems.length > 0 && (
        <div className="latam-card !bg-purple-50 border-2 border-purple-200 mb-6">
          <div className="flex items-center gap-2 mb-4 text-purple-700">
            <ListChecks size={20} />
            <h3 className="text-lg font-bold">📋 Actividades del Backlog</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {backlogItems
              .filter(bi => {
                // No mostrar si ya está en las sugerencias de reprogramación
                const inSuggestions = pendingSuggestions.some(s => 
                  s.actividad.trim().toLowerCase() === bi.actividad.trim().toLowerCase() ||
                  s.backlog_id === bi.id
                );
                if (inSuggestions) return false;

                // No mostrar si ya está en las tareas planificadas de hoy
                return !tasks.some(t => t.actividad.trim().toLowerCase() === bi.actividad.trim().toLowerCase());
              })
              .map((item) => (
                <div key={item.id} className="p-4 bg-white rounded-xl border border-purple-100 shadow-sm flex gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold text-white ${
                        PRIORITIES.find(p => p.value === item.prioridad)?.color || 'bg-gray-400'
                      }`}>
                        {PRIORITIES.find(p => p.value === item.prioridad)?.label}
                      </span>
                      {item.area && (
                        <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-primary/10 text-primary border border-primary/20">
                          {item.area}
                        </span>
                      )}
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">
                        {item.status === 'despriorizado' ? 'DESPRIO' : 
                         item.status === 'en espera' ? 'ESPERA' :
                         item.status === 'en curso' ? 'CURSO' :
                         item.status === 'en estudio' ? 'ESTUDIO' :
                         item.status === 'terminada' ? 'LISTO' : item.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-text-main leading-snug">
                      {item.actividad}
                    </p>
                  </div>
                  <div className="flex items-center">
                    <button 
                      onClick={() => handleAddSuggestion({ 
                        actividad: item.actividad, 
                        prioridad: item.prioridad, 
                        backlog_id: item.id,
                        area: item.area
                      })}
                      className="px-3 py-2 bg-[#1A1A40] text-white text-[10px] font-bold rounded-xl hover:bg-[#1A1A40]/90 transition-all flex items-center gap-1 shadow-sm"
                      title="Agregar a la Agenda"
                    >
                      <Plus size={14} /> AGREGAR
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Suggested Rescheduling Section */}
      {ejecucionIniciada === 0 && pendingSuggestions.length > 0 && (
        <div className="latam-card !bg-primary/5 border-2 border-primary/20">
          <div className="flex items-center gap-2 mb-4 text-primary">
            <Rocket size={20} />
            <h3 className="text-lg font-bold">🔁 Tareas pendientes del día anterior</h3>
          </div>
          <div className="space-y-3">
            {pendingSuggestions.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-4 bg-white rounded-xl border border-primary/10 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${
                    PRIORITIES.find(p => p.value === t.prioridad)?.color || 'bg-gray-400'
                  }`}>
                    {PRIORITIES.find(p => p.value === t.prioridad)?.label}
                  </span>
                  {t.area && (
                    <span className="px-2 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                      {t.area}
                    </span>
                  )}
                  <span className="font-medium text-text-main">{t.actividad}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleAddSuggestion(t)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-all"
                  >
                    <Plus size={14} />
                    AGREGAR A MI DÍA
                  </button>
                  <button 
                    onClick={() => t.id && handleDiscardSuggestion(t.id)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-bg-main text-text-muted text-xs font-bold rounded-lg hover:bg-red-50 hover:text-red-500 transition-all border border-border-soft"
                  >
                    <X size={14} />
                    DESCARTAR
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}


      {/* Task List Section */}
      <div className="latam-card !p-8">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-primary">Actividades Planificadas</h3>
          {isAgendaGenerated && ejecucionIniciada === 0 && (
            <button 
              onClick={handleModificarAgenda}
              className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
            >
              <Edit2 size={14} /> MODIFICAR PLANIFICACIÓN
            </button>
          )}
        </div>

        {isAgendaGenerated && (
          <div className={`mb-6 p-4 rounded-xl flex items-center justify-between border ${
            ejecucionIniciada === 1 
              ? 'bg-primary/5 border-primary/20 text-primary' 
              : 'bg-[#7DA81A]/5 border-[#7DA81A]/20 text-[#7DA81A]'
          }`}>
            <div className="flex items-start font-medium">
              {ejecucionIniciada === 1 ? (
                <>
                  <Clock size={20} className="mr-2 mt-0.5" />
                  <div className="flex flex-col">
                    <span>
                      Agenda en ejecución. Iniciada a las {horaInicioEjecucion && !isNaN(Date.parse(horaInicioEjecucion)) 
                        ? new Date(horaInicioEjecucion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                        : horaInicioEjecucion}.
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <Check size={20} className="mr-2 mt-0.5" />
                  <div className="flex flex-col">
                    <span>Agenda estratégica generada. Lista para iniciar ejecución.</span>
                    <span className="text-xs opacity-80 font-normal mt-0.5">
                      Puedes ajustar tu planificación antes de iniciar la ejecución
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Tasks Table */}
        <div className="overflow-hidden rounded-xl border border-border-soft shadow-sm bg-white">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-main border-b border-border-soft">
                <th className="p-4 text-xs font-bold text-text-muted uppercase">Prioridad</th>
                <th className="p-4 text-xs font-bold text-text-muted uppercase">Actividad</th>
                {!isAgendaGenerated && ejecucionIniciada === 0 && <th className="p-4 text-xs font-bold text-text-muted uppercase text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-text-muted italic">No hay actividades agregadas aún</td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="border-b border-border-soft hover:bg-bg-main transition-colors">
                    {editingId === task.id ? (
                      <>
                        <td className="p-4">
                          <select 
                            value={editPriority}
                            onChange={(e) => setEditPriority(parseInt(e.target.value))}
                            className="w-full p-2 rounded-lg border border-border-soft outline-none bg-white text-xs font-bold"
                          >
                            {PRIORITIES.map(p => (
                              <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="p-4">
                          <div className="space-y-2">
                            <input 
                              type="text" 
                              value={editActivity}
                              onChange={(e) => setEditActivity(e.target.value)}
                              className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary"
                              autoFocus
                            />
                            <input 
                              type="text" 
                              value={editArea}
                              onChange={(e) => setEditArea(e.target.value)}
                              placeholder="Área (opcional)"
                              className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-xs"
                            />
                          </div>
                          {editRescheduleCount >= 2 && (
                            <p className="mt-1 text-[10px] font-bold text-[#FFC700] flex items-center">
                              <AlertCircle size={10} className="mr-1" />
                              Reprogramada {editRescheduleCount} veces esta semana
                            </p>
                          )}
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button 
                            onClick={() => task.id && saveEdit(task.id)}
                            className="p-2 text-[#7DA81A] hover:bg-[#7DA81A]/5 rounded-lg transition-all"
                            title="Guardar"
                          >
                            <Check size={18} />
                          </button>
                          <button 
                            onClick={cancelEditing}
                            className="p-2 text-accent/70 hover:bg-accent/5 rounded-lg transition-all"
                            title="Cancelar"
                          >
                            <X size={18} />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="p-4">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-bold text-white ${PRIORITIES.find(p => p.value === task.prioridad)?.color}`}>
                            {PRIORITIES.find(p => p.value === task.prioridad)?.label}
                          </span>
                          {inlineEditingAreaId === task.id || !task.area ? (
                            <div className="inline-flex items-center gap-1 ml-2">
                              <input
                                type="text"
                                value={inlineEditingAreaId === task.id ? tempArea : ''}
                                onChange={(e) => {
                                  setInlineEditingAreaId(task.id || null);
                                  setTempArea(e.target.value);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && task.id) saveInlineArea(task.id);
                                }}
                                placeholder="Área"
                                className="px-2 py-0.5 rounded-full text-[10px] font-bold border border-border-soft outline-none focus:ring-1 focus:ring-primary w-20"
                              />
                              <button
                                onClick={() => task.id && saveInlineArea(task.id)}
                                className="text-green-600 hover:text-green-700 transition-colors"
                                title="Confirmar área"
                              >
                                <Check size={12} />
                              </button>
                            </div>
                          ) : (
                            <span 
                              onClick={() => {
                                setInlineEditingAreaId(task.id || null);
                                setTempArea(task.area || '');
                              }}
                              className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                              title="Click para editar área"
                            >
                              {task.area}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-medium text-text-strong">
                          {task.actividad}
                          {task.fecha_origen_remanente && task.fecha_origen_remanente !== selectedDate && (
                            <p className="text-[10px] text-primary font-bold mt-1">
                              🔁 Heredada del {task.fecha_origen_remanente}
                            </p>
                          )}
                        </td>
                        {!isAgendaGenerated && ejecucionIniciada === 0 && (
                          <td className="p-4 text-right space-x-2">
                            <button 
                              onClick={() => startEditing(task)}
                              className="p-2 text-text-muted hover:text-primary hover:bg-bg-main rounded-lg transition-all"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button 
                              onClick={() => task.id && deleteTask(task.id)}
                              className="p-2 text-accent/70 hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {(saturationWarning || (isSaturated && !isAgendaGenerated)) && (
          <div className={`mt-6 px-6 py-4 rounded-xl shadow-sm flex items-start border ${
            isSaturated && !isAgendaGenerated 
              ? 'bg-amber-50 border-amber-100 text-amber-700' 
              : 'bg-[#FFC700]/5 border-[#FFC700]/20 text-[#FFC700]'
          }`}>
            <AlertCircle size={20} className="mr-3 mt-0.5 flex-shrink-0" />
            <div className="flex flex-col">
              <span className="font-bold text-sm">
                {isSaturated && !isAgendaGenerated
                  ? (
                    <>
                      Capacidad del día alcanzada.<br />
                      La planificación actual supera el tiempo disponible.<br />
                      Atenea no puede construir una agenda realista con esta carga.
                    </>
                  )
                  : saturationWarning}
              </span>
              {isSaturated && !isAgendaGenerated && (
                <span className="text-xs mt-1 opacity-90">
                  Puedes ajustar la cantidad de actividades o redefinir prioridades para continuar.
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-8 flex justify-end gap-4">
          {/* Acción: Modificar o Generar (Solo si no ha iniciado) */}
          {ejecucionIniciada === 0 && (
            isAgendaGenerated ? (
              <button 
                onClick={handleModificarAgenda}
                className="latam-btn-primary flex items-center bg-[#7DA81A] hover:bg-[#6a8f16]"
              >
                <Edit2 size={20} className="mr-2" />
                MODIFICAR AGENDA
              </button>
            ) : (
              <button 
                onClick={generateIntelligentAgenda}
                disabled={isSaturated}
                className={`latam-btn-primary flex items-center ${
                  isSaturated ? 'opacity-50 cursor-not-allowed grayscale' : ''
                }`}
              >
                <Rocket size={20} className="mr-2" />
                {isSaturated ? "AJUSTA TU PLAN PARA CONTINUAR" : "GENERAR MI AGENDA INTELIGENTE"}
              </button>
            )
          )}

          {/* Estado: Generada o En Ejecución (No clickeable) */}
          {isAgendaGenerated && (
            <div className="flex items-center">
              {ejecucionIniciada === 1 ? (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  <Clock size={14} />
                  Agenda en ejecución
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-accent/10 text-accent border border-accent/20">
                  <Check size={14} />
                  Agenda generada
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
