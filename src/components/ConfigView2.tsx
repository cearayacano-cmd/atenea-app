import { useState, useEffect } from 'react';
import { Save, Calendar, Clock, Trash2, Plus, Wand2, ListChecks, Database, ArrowRight, X, LayoutList, AlertTriangle, Archive, Users, User, ChevronDown, Zap, Bot, Search, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { getStatusColor, getPriorityColor } from '../utils/colors';

interface Bloque {
  id: number;
  fecha: string | null;
  dia_semana: string | null;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

interface BacklogItem {
  id: number;
  actividad: string;
  prioridad: number;
  status: string;
  area?: string;
  created_at: string;
  is_collaborative?: boolean;
  assignedUsers?: number[];
  complejidad?: number;
  tiempo_estimado?: number;
  rol_ejecutante?: string;
  owner_id?: number;
  justificacion?: string;
  scheduled_date?: string;
  execution_status?: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPOS_BLOQUE = ['Almuerzo', 'Reunión', 'Personal', 'Otro'];

const PRIORITIES = [
  { label: 'CRÍTICA', value: 10, color: 'bg-red-600' },
  { label: 'ALTA', value: 7, color: 'bg-orange-500' },
  { label: 'MEDIA', value: 4, color: 'bg-amber-500' },
  { label: 'BAJA', value: 2, color: 'bg-emerald-500' },
];

const MATRIZ_TAREAS: Record<string, { actividad: string; complejidad: number; tiempo_estimado: number; area: string }[]> = {
  'Calidad Fabrica': [
    { actividad: 'Revisión de indicadores entregados por RADAR', complejidad: 1, tiempo_estimado: 60, area: 'Calidad' },
    { actividad: 'Hipótesis: planteamiento + contexto operacional (en plataforma)', complejidad: 2, tiempo_estimado: 75, area: 'Operativo' },
    { actividad: 'Escuchas y validacion de hipotesis (en plataforma)', complejidad: 2, tiempo_estimado: 165, area: 'Monitoreo' },
    { actividad: 'Validación hipótesis en conjunto con LCoach', complejidad: 1, tiempo_estimado: 60, area: 'Operativo' },
    { actividad: 'Análisis con IA: descarga LEA + armado para análisis IA', complejidad: 3, tiempo_estimado: 60, area: 'Tendencias' },
    { actividad: 'Armar slide y plan de acción para seguimiento', complejidad: 2, tiempo_estimado: 60, area: 'Tendencias' },
    { actividad: 'Seguimiento de focos (en plataforma)', complejidad: 2, tiempo_estimado: 60, area: 'Operativo' }
  ],
  'Calidad LATAM': [
    { actividad: 'Análisis profundo IA + escuchas', complejidad: 3, tiempo_estimado: 240, area: 'Escuelita' },
    { actividad: 'Auditorias BOT', complejidad: 1, tiempo_estimado: 180, area: 'Monitoreo' },
    { actividad: 'Auditorias PCA/PTA', complejidad: 2, tiempo_estimado: 240, area: 'Calidad' },
    { actividad: 'Revisión levantamientos Operación', complejidad: 1, tiempo_estimado: 30, area: 'Operativo' },
    { actividad: 'Calibraciones', complejidad: 1, tiempo_estimado: 60, area: 'Operativo' }
  ]
};

const toLocalYYYYMMDD = (d: Date) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getWeekNumber = (d: Date) => {
  const date = new Date(d.getTime());
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  const week1 = new Date(date.getFullYear(), 0, 4);
  return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
};

const getISOWeekString = (d: Date) => {
  const w = getWeekNumber(d);
  const date = new Date(d.getTime());
  date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
  return `${date.getFullYear()}-W${w.toString().padStart(2, '0')}`;
};

const getDateFromWeek = (weekStr: string) => {
  if (!weekStr) return new Date();
  const [yearStr, weekPart] = weekStr.split('-W');
  const y = parseInt(yearStr, 10);
  const w = parseInt(weekPart, 10);
  const simple = new Date(y, 0, 1 + (w - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
      ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
      ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  return ISOweekStart;
};

const getDatesFromWeekRange = (startD: string, endD: string) => {
  const dates = [];
  if (!startD || !endD) return dates;
  let current = new Date(startD + 'T00:00:00');
  const last = new Date(endD + 'T00:00:00');
  
  if (current > last) return dates;

  while (current <= last) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) { // Lunes a Viernes
      dates.push(toLocalYYYYMMDD(new Date(current)));
    }
    current.setDate(current.getDate() + 1);
  }
  return dates;
};

export default function ConfigView2() {
  const [startDate, setStartDate] = useState(toLocalYYYYMMDD(new Date()));
  const [endDate, setEndDate] = useState(toLocalYYYYMMDD(new Date()));
  const [startWeek, setStartWeek] = useState(toLocalYYYYMMDD(new Date()));
  const [endWeek, setEndWeek] = useState(toLocalYYYYMMDD(new Date()));
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Bloques y Jornadas
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [dailyPlans, setDailyPlans] = useState<Record<string, any>>({});
  const [newBlock, setNewBlock] = useState({ isRecurrente: false, dias: [] as string[], fechaInicio: toLocalYYYYMMDD(new Date()), fechaFin: toLocalYYYYMMDD(new Date()), inicio: '13:00', fin: '14:00', tipo: 'Almuerzo', motivo: '' });
  const [isExcepcionGroupMode, setIsExcepcionGroupMode] = useState(false);
  const [jornadaDiasRecurrentes, setJornadaDiasRecurrentes] = useState<string[]>([]);

  // Backlog
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modales y Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJornadaModalOpen, setIsJornadaModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<'header' | 'card'>('header');
  const [isJornadaRecurrente, setIsJornadaRecurrente] = useState(false);
  const [isExcepcionModalOpen, setIsExcepcionModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedPlanningDate, setSelectedPlanningDate] = useState('');
  const [dayTasks, setDayTasks] = useState<any[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<Partial<BacklogItem> | null>(null);
  const [allTasks, setAllTasks] = useState<any[]>([]);

  // Nuevos Estados para la Sincronización y Reglas de Negocio
  const [originalPriority, setOriginalPriority] = useState<number | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [isButtonDropdownOpen, setIsButtonDropdownOpen] = useState(false);
  const [usersList, setUsersList] = useState<any[]>([]);

  // States for custom AI quick task creation
  const [isCustomAiModalOpen, setIsCustomAiModalOpen] = useState(false);
  const [customAiTaskText, setCustomAiTaskText] = useState('');
  const [customAiArea, setCustomAiArea] = useState('Operativo');
  const [customAiIsCollab, setCustomAiIsCollab] = useState(false);
  const [customAiAssignedUsers, setCustomAiAssignedUsers] = useState<number[]>([]);
  const [customAiStep, setCustomAiStep] = useState<'input' | 'preview'>('input');
  const [customAiSelectedOption, setCustomAiSelectedOption] = useState('Revisión de indicadores entregados por RADAR');
  const [customAiPreviewResult, setCustomAiPreviewResult] = useState<any>(null);
  const [customAiMode, setCustomAiMode] = useState<'rayo' | 'bot'>('rayo');

  // Filtros y paginación del Archivo de Backlog
  const [archiveSearch, setArchiveSearch] = useState('');
  const [archiveTimeFilter, setArchiveTimeFilter] = useState('all');
  const [archivePage, setArchivePage] = useState(1);
  const archiveItemsPerPage = 5;

  const [backlogSearch, setBacklogSearch] = useState('');
  const [backlogFilterPriority, setBacklogFilterPriority] = useState<string | number>('Todos');

  useEffect(() => {
    if (isPlanningModalOpen && selectedPlanningDate) {
      fetchPendingFromYesterday(selectedPlanningDate);
    }
  }, [isPlanningModalOpen, selectedPlanningDate]);

  const fetchPendingFromYesterday = async (currentDate: string) => {
    const prevDateObj = new Date(currentDate + 'T00:00:00');
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = toLocalYYYYMMDD(prevDateObj);

    try {
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      const res = await fetch(`/api/tareas?userId=${userId}&fecha=${prevDate}&_t=${Date.now()}`);
      const data = await res.json();
      
      if (data.tasks) {
        const dismissedKey = `dismissed_suggestions_${currentDate}`;
        const dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || '[]');

        const pending = data.tasks.filter((t: any) => {
          const isNoRealizada = t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion;
          if (!isNoRealizada) return false;

          const alreadyAdded = dayTasks.some((ct: any) => 
            ct.actividad.trim().toLowerCase() === t.actividad.trim().toLowerCase()
          );
          if (alreadyAdded) return false;

          const isDismissed = dismissedIds.includes(t.id);
          if (isDismissed) return false;

          return true;
        });
        setPendingSuggestions(pending);
      }
    } catch (error) {
      console.error("Error fetching pending tasks from yesterday:", error);
    }
  };

  const handleDiscardSuggestion = (taskId: number) => {
    const dismissedKey = `dismissed_suggestions_${selectedPlanningDate}`;
    const dismissedIds = JSON.parse(localStorage.getItem(dismissedKey) || '[]');
    if (!dismissedIds.includes(taskId)) {
      dismissedIds.push(taskId);
      localStorage.setItem(dismissedKey, JSON.stringify(dismissedIds));
    }
    setPendingSuggestions(prev => prev.filter(p => p.id !== taskId));
  };

  const fetchDailyTasks = () => {
    if (!selectedPlanningDate) return;
    const userId = Number(localStorage.getItem('atenea_user_id') || 1);
    fetch(`/api/tareas?userId=${userId}&fecha=${selectedPlanningDate}&_t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
         if (Array.isArray(data)) setDayTasks(data);
         else if (data && Array.isArray(data.tasks)) setDayTasks(data.tasks);
         else setDayTasks([]);
      }).catch(() => setDayTasks([]));
  };

  useEffect(() => {
    if (isPlanningModalOpen) {
      fetchDailyTasks();
    }
  }, [isPlanningModalOpen, selectedPlanningDate]);

  // Navegación Semanal
  const [weekOffset, setWeekOffset] = useState(0);
  
  const getWeekDates = (offset: number) => {
    const today = new Date();
    const day = today.getDay(); // 0 (Sun) to 6 (Sat)
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    const startOfWeek = new Date(today.setDate(diff + (offset * 7)));
    
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  };

  const weekDates = getWeekDates(weekOffset);
  
  const currentWeekNumber = getWeekNumber(weekDates[0]);

  useEffect(() => {
    fetchBloques();
    fetchBacklog();
    fetchConfig();
    fetchDailyPlans();
    fetchAllTasks();
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => setUsersList(data))
      .catch(err => console.error("Error fetching users:", err));
  }, []);

  const fetchAllTasks = async () => {
    try {
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      const res = await fetch(`/api/tareas/todas?userId=${userId}&_t=${Date.now()}`);
      const data = await res.json();
      setAllTasks(Array.isArray(data) ? data : []);
    } catch (e) {
      setAllTasks([]);
    }
  };

  const fetchDailyPlans = async () => {
    try {
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      const res = await fetch(`/api/planes-diarios?userId=${userId}`);
      const data = await res.json();
      const plans: Record<string, any> = {};
      if (Array.isArray(data)) {
        data.forEach(d => {
          plans[d.date] = { 
            hora_inicio: d.hora_inicio, 
            hora_fin: d.hora_fin, 
            estado_cierre: d.estado_cierre,
            user_id: d.user_id,
            task_count: d.task_count || 0
          };
        });
      }
      setDailyPlans(plans);
    } catch (e) {}
  };

  const fetchConfig = () => fetch('/api/configuracion').then(res => res.json()).then(data => {
    if (data) {
      if (data.hora_inicio) setStartTime(data.hora_inicio);
      if (data.hora_fin) setEndTime(data.hora_fin);
    }
  }).catch(() => {});

  const dayStartSuggestion = (() => {
    const noRealizadas = pendingSuggestions.filter(t => t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion);
    if (noRealizadas.length > 0) {
      const topTask = [...noRealizadas].sort((a, b) => b.prioridad - a.prioridad)[0];
      return `Prioriza tarea no realizada ayer: "${topTask.actividad}". Es fundamental cerrar ciclos pendientes para mantener el ritmo estratégico.`;
    }

    if (pendingSuggestions.some((t: any) => t.prioridad === 10)) {
      return "Podrías comenzar por la tarea crítica pendiente para asegurar avance desde el inicio.";
    }
    
    return "Por ahora no hay suficiente información para sugerir un inicio concreto. Te recomiendo comenzar por lo que consideres más relevante.";
  })();

  const fetchBloques = () => fetch('/api/bloques').then(res => res.json()).then(data => setBloques(Array.isArray(data) ? data : [])).catch(() => setBloques([]));
  const fetchBacklog = () => fetch(`/api/backlog?_t=${Date.now()}`).then(res => res.json()).then(data => setBacklog(Array.isArray(data) ? data : [])).catch(() => setBacklog([]));

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  // Detectar advertencia por jornadas pasadas sin finalizar (ignorando las más viejas a 3 días)
  const getPastUnclosedDay = (targetDate: string) => {
    const dates = Object.keys(dailyPlans).sort();
    
    const limitDateObj = new Date(targetDate + 'T00:00:00');
    limitDateObj.setDate(limitDateObj.getDate() - 4); // Ignoramos si es más viejo que 4 días
    const limitDateStr = limitDateObj.toISOString().split('T')[0];

    return dates.find(dStr => dStr < targetDate && dStr >= limitDateStr && dailyPlans[dStr]?.estado_cierre === 0 && dailyPlans[dStr]?.task_count > 0);
  };
  const hasPastUnclosedDay = (targetDate: string) => !!getPastUnclosedDay(targetDate);

  const validateCriticalTasksForDay = async (task: any, dateStr: string): Promise<boolean> => {
    if (Number(task.prioridad) !== 10) return true;

    const currentUserId = Number(localStorage.getItem('atenea_user_id') || 1);
    const targetUsers: number[] = (task.is_collaborative && Array.isArray(task.assignedUsers) && task.assignedUsers.length > 0)
      ? task.assignedUsers
      : [currentUserId];

    try {
      const res = await fetch(`/api/reporte-tiempos?fechaInicio=${dateStr}&fechaFin=${dateStr}`);
      const data = await res.json();
      const tasksOnDay = data.tasks || [];
      const closedStates = ['resuelto', 'terminada', 'fallo', 'fallido', 'despriorizado', 'despriorizada', 'no realizado'];

      // Check for active user first (must be a hard block)
      if (targetUsers.includes(currentUserId)) {
        const hasCriticalSelf = tasksOnDay.some((t: any) => 
          t.user_id === currentUserId && 
          Number(t.prioridad) === 10 && 
          !closedStates.includes((t.estado_ejecucion || 'nuevo').toLowerCase())
        );
        if (hasCriticalSelf) {
          alert("❌ LÍMITE DE TAREA CRÍTICA: Solo puedes planificar una tarea crítica por día.");
          return false;
        }
      }

      // Check for colleagues (warning / confirm only)
      for (const uid of targetUsers) {
        if (uid === currentUserId) continue;
        const hasCriticalColleague = tasksOnDay.some((t: any) => 
          t.user_id === uid && 
          Number(t.prioridad) === 10 && 
          !closedStates.includes((t.estado_ejecucion || 'nuevo').toLowerCase())
        );
        if (hasCriticalColleague) {
          const colleagueInfo = usersList.find(u => u.id === uid);
          const name = colleagueInfo ? colleagueInfo.nombre : `Usuario #${uid}`;
          const proceed = window.confirm(`⚠️ AVISO: El compañero "${name}" ya tiene una tarea crítica asignada para este día. ¿Deseas asignársela de todas formas?`);
          if (!proceed) return false;
        }
      }
    } catch (err) {
      console.error("Error validating critical tasks:", err);
    }
    return true;
  };

  const handleDropToDay = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    
    const task = backlog.find(t => t.id === Number(taskId));
    if (!task) return;

    const unclosedDay = getPastUnclosedDay(dateStr);
    if (unclosedDay) {
      console.warn(`⚠️ ADVERTENCIA: El día ${unclosedDay} está sin cerrar.`);
    }

    const isValid = await validateCriticalTasksForDay(task, dateStr);
    if (!isValid) return;

    // Alerta de capacidad pero sin impedir la asignación
    let tasksOnDay = [];
    try {
      const res = await fetch(`/api/reporte-tiempos?fechaInicio=${dateStr}&fechaFin=${dateStr}`);
      const data = await res.json();
      tasksOnDay = data.tasks || [];
    } catch (err) {
      console.error(err);
    }

    const { remainingHours } = calculateTimeInfo(dateStr, tasksOnDay);
    if (remainingHours <= 0) {
       const proceed = window.confirm("⚠️ CAPACIDAD ALCANZADA: La jornada de este día ya está llena. ¿Deseas forzar la carga de esta tarea?");
       if (!proceed) return;
    }

    try {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: dateStr,
          actividad: task.actividad,
          prioridad: task.prioridad,
          estado_ejecucion: 'abierto',
          tiempo_asignado_minutos: task.tiempo_estimado || 0,
          backlog_id: task.id,
          area: task.area,
          complejidad: task.complejidad || 2
        }),
      });
      
      fetchBacklog();
      fetchAllTasks();
      fetchDailyTasks();
      
      // Feedback visual
      const el = document.getElementById(`day-col-${dateStr}`);
      if (el) {
        el.classList.add('ring-4', 'ring-emerald-500', 'bg-emerald-50');
        setTimeout(() => el.classList.remove('ring-4', 'ring-emerald-500', 'bg-emerald-50'), 500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const onDrop = async (e: React.DragEvent, newPriority: number) => {
    const taskId = e.dataTransfer.getData('taskId');
    if (!taskId) return;
    
    const task = backlog.find(t => t.id === Number(taskId));
    let justificacion: string | undefined = undefined;

    if (newPriority === 10 && task && task.prioridad !== 10) {
      const justification = window.prompt("Por favor, escribe una justificación para cambiar esta tarea a prioridad CRÍTICA (Requerido):");
      if (justification === null) {
        return; // Cancelled
      }
      if (!justification.trim()) {
        alert("El cambio a prioridad CRÍTICA requiere una justificación.");
        return;
      }
      justificacion = justification.trim();
    }
    
    await fetch(`/api/backlog/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        prioridad: newPriority,
        justificacion: justificacion 
      })
    });
    fetchBacklog();
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask?.actividad) return;

    const currentUserId = Number(localStorage.getItem('atenea_user_id') || 1);

    // 1. Validar bloqueo crítico en usuarios asignados (colaborativo o individual)
    const isSavingCritical = Number(editingTask.prioridad) === 10;
    if (isSavingCritical) {
      const isSelfAssigned = !editingTask.is_collaborative || (editingTask.assignedUsers || []).includes(currentUserId);
      if (isSelfAssigned) {
        const currentUserInfo = usersList.find(u => u.id === currentUserId);
        const hasAnotherCritical = currentUserInfo?.isLocked && (!editingTask.id || currentUserInfo.lockedTaskName !== editingTask.actividad);
        if (hasAnotherCritical) {
          alert(`❌ BLOQUEO DE ACTIVIDAD CRÍTICA: Ya tienes una actividad crítica activa ("${currentUserInfo.lockedTaskName}"). No puedes asignarte otra tarea crítica hasta finalizar o despriorizar la anterior.`);
          return;
        }
      }

      // Advertencia para compañeros con tarea crítica activa
      if (editingTask.is_collaborative) {
        const colleagues = (editingTask.assignedUsers || []).filter((id: number) => id !== currentUserId);
        const lockedColleagues = colleagues
          .map((id: number) => usersList.find(u => u.id === id))
          .filter((u: any) => u?.isLocked && (!editingTask.id || u.lockedTaskName !== editingTask.actividad));
        
        if (lockedColleagues.length > 0) {
          const names = lockedColleagues.map((u: any) => `"${u.nombre}" (tiene activa: "${u.lockedTaskName}")`).join(', ');
          const proceed = window.confirm(`⚠️ ADVERTENCIA DE COLABORADOR: Los siguientes compañeros ya tienen tareas críticas activas: ${names}. ¿Deseas agregarlos a esta actividad de todas formas?`);
          if (!proceed) return;
        }
      }
    }

    // 2. Validar justificación de cambio de prioridad (Solo si cambia a CRÍTICA, es decir, valor 10)
    if (editingTask.id && originalPriority !== null && Number(editingTask.prioridad) === 10 && originalPriority !== 10) {
      if (!justificationText.trim()) {
        alert("Por favor, escribe una justificación para el cambio a prioridad CRÍTICA.");
        return;
      }
    }

    // 3. Completar automáticamente complejidad y tiempo si coincide con catálogo de Matriz
    let matchedComplexity = editingTask.complejidad || 2;
    let matchedTime = editingTask.tiempo_estimado || 60;
    const role = editingTask.rol_ejecutante || 'Calidad Fabrica';
    const template = MATRIZ_TAREAS[role]?.find(t => t.actividad === editingTask.actividad);
    if (template) {
      matchedComplexity = template.complejidad;
      matchedTime = template.tiempo_estimado;
    }

    const method = editingTask.id ? 'PUT' : 'POST';
    const url = editingTask.id ? `/api/backlog/${editingTask.id}` : '/api/backlog';

    const payload = {
      ...editingTask,
      created_at: editingTask.id ? editingTask.created_at : new Date().toISOString(),
      status: editingTask.status || 'nuevo',
      area: editingTask.area || 'Operativo',
      complejidad: matchedComplexity,
      tiempo_estimado: matchedTime,
      justificacion: justificationText || undefined,
      rol_ejecutante: role
    };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsModalOpen(false);
    setEditingTask(null);
    setJustificationText('');
    setOriginalPriority(null);
    fetchBacklog();
    fetchDailyTasks();
  };

  const handleSaveConfig = async (pStart?: string, pEnd?: string) => {
    setIsSaving(true);
    const start = pStart || startTime;
    const end = pEnd || endTime;
    try {
      const dates = [];
      if (isJornadaRecurrente) {
        // Generar fechas para las próximas 4 semanas según los días seleccionados
        let current = new Date();
        const endLoop = new Date();
        endLoop.setDate(endLoop.getDate() + 28);
        const diasSemanaMapa: Record<string, number> = { 'Domingo': 0, 'Lunes': 1, 'Martes': 2, 'Miércoles': 3, 'Jueves': 4, 'Viernes': 5, 'Sábado': 6 };
        const allowedDays = jornadaDiasRecurrentes.map(d => diasSemanaMapa[d]);
        while (current <= endLoop) {
          if (allowedDays.includes(current.getDay())) {
            dates.push(toLocalYYYYMMDD(current));
          }
          current.setDate(current.getDate() + 1);
        }
      } else {
        if (modalSource === 'header') {
          dates.push(...getDatesFromWeekRange(startWeek, endWeek));
        } else {
          dates.push(startDate);
        }
      }
      
      if (dates.length > 0) {
        await Promise.all(dates.map(date => 
          fetch('/api/plan-diario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ date, hora_inicio: start, hora_fin: end, horas_efectivas: 6 }),
          })
        ));
      }
      setMessage('Horario actualizado');
      fetchDailyPlans();
      setTimeout(() => setMessage(''), 3000);
    } catch (e) { console.error(e); }
    finally { setIsSaving(false); }
  };

  const addBloque = async () => {
    if (newBlock.isRecurrente && newBlock.dias.length === 0) return;
    if (newBlock.isRecurrente) {
      for (const dia of newBlock.dias) {
        await fetch('/api/bloques', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ dia_semana: dia, hora_inicio: newBlock.inicio, hora_fin: newBlock.fin, tipo: newBlock.tipo, descripcion: newBlock.motivo }),
        });
      }
    } else {
      const datesToProcess = modalSource === 'header' ? getDatesFromWeekRange(startWeek, endWeek) : [newBlock.fechaInicio];
      for (const date of datesToProcess) {
        await fetch('/api/bloques', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fecha: date, hora_inicio: newBlock.inicio, hora_fin: newBlock.fin, tipo: newBlock.tipo, descripcion: newBlock.motivo }),
        });
      }
    }
    setNewBlock({ ...newBlock, dias: [], motivo: '' });
    fetchBloques();
  };

  const deleteBloque = (id: number) => fetch(`/api/bloques/${id}`, { method: 'DELETE' }).then(fetchBloques);

  const handleAiBacklog = async () => {
    if (!freeText.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/analyze-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: freeText })
      });
      const items = await res.json();
      if (Array.isArray(items)) {
         setAiSuggestions(items.map(i => ({
           actividad: i.actividad,
           prioridad: i.prioridad || 4,
           complejidad: i.complejidad || 2,
           tiempo_estimado: i.tiempo_estimado || 60,
           area: i.area || 'Operativo',
           rol_ejecutante: i.rol_ejecutante || 'Calidad Fabrica'
         })));
      }
      setFreeText('');
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);

  const handleSaveAiSuggestions = async () => {
    for (const item of aiSuggestions) {
      await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
           actividad: item.actividad, 
           prioridad: item.prioridad, 
           status: 'nuevo',
           complejidad: item.complejidad,
           tiempo_estimado: item.tiempo_estimado,
           area: item.area,
           rol_ejecutante: item.rol_ejecutante
        })
      });
    }
    setAiSuggestions([]);
    setIsAiModalOpen(false);
    fetchBacklog();
  };

  const handleAnalyzeCustomAiTask = async () => {
    const textToAnalyze = customAiSelectedOption === 'Otro' ? customAiTaskText : customAiSelectedOption;
    if (!textToAnalyze.trim()) return;
    setIsProcessing(true);
    try {
      const res = await fetch('/api/ai/analyze-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToAnalyze })
      });
      const items = await res.json();
      
      let aiPriority = 4;
      let aiComplexity = 2;
      let aiTime = 60;
      let aiActivity = textToAnalyze;
      let aiRole = 'Calidad Fabrica';

      if (Array.isArray(items) && items.length > 0) {
        const suggested = items[0];
        aiPriority = suggested.prioridad || 4;
        aiComplexity = suggested.complejidad || 2;
        aiTime = suggested.tiempo_estimado || 60;
        aiActivity = suggested.actividad || textToAnalyze;
        aiRole = suggested.rol_ejecutante || 'Calidad Fabrica';
      }

      setCustomAiPreviewResult({
        actividad: aiActivity,
        prioridad: aiPriority,
        complejidad: aiComplexity,
        tiempo_estimado: aiTime,
        area: customAiArea,
        is_collaborative: customAiIsCollab,
        assignedUsers: customAiIsCollab ? customAiAssignedUsers : [Number(localStorage.getItem('atenea_user_id') || 1)],
        rol_ejecutante: aiRole,
        status: 'nuevo'
      });

      setCustomAiStep('preview');
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmCustomAiTask = async () => {
    if (!customAiPreviewResult) return;
    setIsProcessing(true);
    try {
      await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customAiPreviewResult)
      });
      setIsCustomAiModalOpen(false);
      setCustomAiStep('input');
      setCustomAiTaskText('');
      setCustomAiPreviewResult(null);
      fetchBacklog();
    } catch (e) {
      console.error(e);
    } finally {
      setIsProcessing(false);
    }
  };

  const getDropdownOptions = () => {
    const currentUserId = Number(localStorage.getItem('atenea_user_id') || 1);
    const currentUser = usersList.find(u => u.id === currentUserId);
    const isAdmin = currentUser?.email === 'carlose.araya@latam.com' || currentUser?.role === 'supervisor';
    const execRole = currentUser?.rol_ejecutante || 'Calidad Fabrica';

    let options: string[] = [];
    if (isAdmin) {
      const fabricaTasks = MATRIZ_TAREAS['Calidad Fabrica']?.map(t => t.actividad) || [];
      const latamTasks = MATRIZ_TAREAS['Calidad LATAM']?.map(t => t.actividad) || [];
      options = [...fabricaTasks, ...latamTasks];
    } else {
      options = MATRIZ_TAREAS[execRole]?.map(t => t.actividad) || [];
    }
    return options;
  };

  const openCustomAiModal = () => {
    const options = getDropdownOptions();
    setCustomAiMode('rayo');
    setCustomAiSelectedOption(options[0] || '');
    setCustomAiTaskText('');
    setCustomAiArea('Operativo');
    setCustomAiIsCollab(false);
    setCustomAiAssignedUsers([Number(localStorage.getItem('atenea_user_id') || 1)]);
    setCustomAiStep('input');
    setCustomAiPreviewResult(null);
    setIsCustomAiModalOpen(true);
  };

  const deleteBacklog = (id: number) => {
    if (!window.confirm("¿Estás seguro de que deseas eliminar este ítem del backlog? Esta acción no se puede deshacer.")) return;
    fetch(`/api/backlog/${id}`, { method: 'DELETE' }).then(fetchBacklog);
  };

  const handleRestoreBacklog = async (id: number) => {
    await fetch(`/api/backlog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pendiente' })
    });
    fetchBacklog();
  };

  const handlePurgeClosedBacklog = async () => {
    if (!window.confirm("¿Estás seguro de que deseas purgar permanentemente todas las tareas archivadas?")) return;
    const completed = backlog.filter(t => ['resuelto', 'terminada', 'despriorizado', 'fallo', 'fallido'].includes(t.status));
    for (const t of completed) {
      await fetch(`/api/backlog/${t.id}`, { method: 'DELETE' });
    }
    fetchBacklog();
  };

  const handleAssignToDayFromModal = async (task: any) => {
    if (!selectedPlanningDate || isSaving) return;

    const unclosedDay = selectedPlanningDate ? getPastUnclosedDay(selectedPlanningDate) : null;
    if (unclosedDay) {
      alert(`🔒 Bloqueo de Planificación: El día ${unclosedDay} está sin cerrar. Por favor finaliza el turno de ese día pendiente en su Agenda Pro antes de planificar nuevas jornadas.`);
      return;
    }

    if (Number(task.prioridad) === 10) {
      const hasCriticalLocal = dayTasks.some((t: any) => Number(t.prioridad) === 10);
      if (hasCriticalLocal) {
        alert("❌ LÍMITE DE TAREA CRÍTICA: Solo puedes planificar una tarea crítica por día.");
        return;
      }
    }

    setIsSaving(true);

    const isValid = await validateCriticalTasksForDay(task, selectedPlanningDate);
    if (!isValid) {
      setIsSaving(false);
      return;
    }
    
    // Check capacity before adding
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    const taskWeight = weights[task.prioridad] || 1;
    const { remainingHours } = calculateTimeInfo();

    if (remainingHours - taskWeight < 0) {
      const proceed = window.confirm("⚠️ CAPACIDAD ALCANZADA: Esta tarea superará tu jornada operativa. ¿Deseas agregarla de todas formas?");
      if (!proceed) {
        setIsSaving(false);
        return;
      }
    }

    try {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: Number(localStorage.getItem('atenea_user_id') || 1),
          fecha: selectedPlanningDate,
          actividad: task.actividad,
          prioridad: task.prioridad,
          tiempo_asignado_minutos: task.tiempo_estimado || 0,
          backlog_id: task.id,
          area: task.area,
          complejidad: task.complejidad || 2,
          estado_ejecucion: 'abierto'
        }),
      });

      setPendingSuggestions(prev => prev.filter(p => p.id !== task.id));
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      const dayTasksRes = await fetch(`/api/tareas?userId=${userId}&fecha=${selectedPlanningDate}&_t=${Date.now()}`);
      if (dayTasksRes.ok) {
         const data = await dayTasksRes.json();
         if (Array.isArray(data)) setDayTasks(data);
         else if (data && Array.isArray(data.tasks)) setDayTasks(data.tasks);
         else setDayTasks([]);
      }
      fetchBacklog();
      fetchAllTasks();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseDay = async () => {
    if (!selectedPlanningDate) return;
    if (!window.confirm("¿Estás seguro de cerrar tu jornada operativa? Las tareas no finalizadas se marcarán como rezagadas y regresarán a tu backlog para otro día.")) return;

    try {
      await fetch('/api/plan-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedPlanningDate,
          estado_cierre: 1
        })
      });

      fetchDailyPlans();
      fetchBacklog();
      fetchAllTasks();
      setIsPlanningModalOpen(false);
      setMessage('Turno cerrado exitosamente.');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
      alert("Error al cerrar la jornada.");
    }
  };

  const handleClearAllTasks = async () => {
    if (!selectedPlanningDate) return;
    const unclosedDay = selectedPlanningDate ? getPastUnclosedDay(selectedPlanningDate) : null;
    if (unclosedDay) {
      alert(`🔒 Bloqueo de Planificación: El día ${unclosedDay} está sin cerrar.`);
      return;
    }
    if (!window.confirm("¿Estás seguro de que deseas limpiar todas las tareas de este día?")) return;
    
    try {
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      await fetch(`/api/tareas/clear?userId=${userId}&fecha=${selectedPlanningDate}`, { method: 'DELETE' });
      setDayTasks([]);
      fetchBacklog();
      fetchAllTasks(); 
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTimeInfo = (targetDate?: string, customTasks?: any[]) => {
    const dateStr = targetDate || selectedPlanningDate;
    const tasks = customTasks || ((dateStr === selectedPlanningDate) ? dayTasks : []);
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    let usedHours = 0;
    tasks.forEach(t => {
      const baseHours = (t.tiempo_asignado_minutos !== undefined && t.tiempo_asignado_minutos !== null && t.tiempo_asignado_minutos > 0)
        ? (t.tiempo_asignado_minutos / 60)
        : (weights[t.prioridad] || 1);
      const status = (t.estado_ejecucion || t.execution_status || 'nuevo').toLowerCase();
      
      if (status === 'nuevo' || status === 'abierto' || status === 'progreso' || status === 'en_curso') {
        usedHours += baseHours; 
      } else if (status === 'en espera' || status === 'espera') {
        usedHours += baseHours * 0.5; 
      } else if (status === 'resuelto' || status === 'terminada') {
        usedHours += t.tiempo_invertido_minutos ? (t.tiempo_invertido_minutos / 60) : 0.5; 
      }
    });

    const safeStart = startTime || '08:00';
    const safeEnd = endTime || '17:00';
    const [startH, startM] = safeStart.split(':').map(Number);
    const [endH, endM] = safeEnd.split(':').map(Number);
    let availableHours = (endH + (endM || 0) / 60) - (startH + (startM || 0) / 60);

    let diaNombre = '';
    if (dateStr) {
      const d = new Date(dateStr + 'T00:00:00');
      const dayIdx = d.getDay();
      const daysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      diaNombre = daysEs[dayIdx];
    }

    const dayBlocks = dateStr 
      ? bloques.filter(b => b.dia_semana === diaNombre || b.fecha === dateStr)
      : [];

    dayBlocks.forEach(b => {
      const [bStartH, bStartM] = b.hora_inicio.split(':').map(Number);
      const [bEndH, bEndM] = b.hora_fin.split(':').map(Number);
      const duration = (bEndH + (bEndM || 0) / 60) - (bStartH + (bStartM || 0) / 60);
      availableHours -= duration;
    });

    if (isNaN(availableHours) || availableHours < 0) availableHours = 8.0;

    return { 
      usedHours, 
      availableHours, 
      remainingHours: availableHours - usedHours 
    };
  };

  const { usedHours, availableHours, remainingHours } = calculateTimeInfo();

  const getCardBadgeInfo = (task: BacklogItem) => {
    if (task.status === 'progreso' || task.status === 'abierto') {
      const todayStr = toLocalYYYYMMDD(new Date());
      const isToday = task.scheduled_date === todayStr;
      const dateLabel = isToday ? 'Hoy' : (task.scheduled_date ? new Date(task.scheduled_date + 'T00:00:00').toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }) : 'Plan');
      
      const exec = task.execution_status || 'agendado';
      let statusKey = 'nuevo';
      let label = `${dateLabel}: Agendado`;
      
      if (exec === 'progreso' || exec === 'en_curso') {
        statusKey = 'nuevo';
        label = `${dateLabel}: En Curso`;
      } else if (exec === 'resuelto' || exec === 'terminada') {
        statusKey = 'resuelto';
        label = `${dateLabel}: Resuelto`;
      } else if (exec === 'fallo' || exec === 'fallido' || exec === 'no realizado') {
        statusKey = 'fallo';
        label = `${dateLabel}: Fallo`;
      } else {
        // ASIGNADO -> Indigo LATAM
        return { label: `ASIGNADO (${dateLabel})`, classes: `bg-[#4257E8] text-white border-[#1B0088]` };
      }
      
      const config = getStatusColor(statusKey);
      return { label, classes: `${config.badge} ${config.badgeBorder}` };
    }

    // SIN ASIGNAR -> Plomo claro / Dashed
    return { label: 'SIN ASIGNAR', classes: `bg-slate-50 text-slate-500 border-slate-300 border-dashed` };
  };

  const getCardBgClass = (task: BacklogItem) => {
    if (task.status === 'progreso' || task.status === 'abierto') {
      const exec = task.execution_status;
      if (exec === 'progreso' || exec === 'en_curso') {
        return 'bg-[#FFE017]/5 border-[#FFE017]/30 shadow-md ring-2 ring-[#FFE017]/20';
      } else if (exec === 'resuelto' || exec === 'terminada') {
        return 'bg-[#858585]/5 border-[#B8B8B8]/30 shadow-sm opacity-80';
      } else if (exec === 'fallo' || exec === 'fallido' || exec === 'no realizado') {
        return 'bg-[#B20F3B]/5 border-[#B20F3B]/30 shadow-md ring-2 ring-[#B20F3B]/20';
      } else {
        return 'bg-slate-100 border-slate-200 shadow-none opacity-60 grayscale-[0.5]';
      }
    }
    
    const config = getStatusColor(task.status);
    return `${config.cardBg} ${config.cardBorder} hover:shadow-md`;
  };

  const getTaskCode = (task: BacklogItem) => {
    const prefix = task.rol_ejecutante === 'Calidad LATAM' ? 'L' : 'F';
    const count = backlog.filter(b => b.rol_ejecutante === task.rol_ejecutante && b.id <= task.id).length;
    return `${prefix}${String(count).padStart(3, '0')}`;
  };

  const unclosedPastDay = selectedPlanningDate ? getPastUnclosedDay(selectedPlanningDate) : null;
  const isPlanningBlocked = false; // Se elimina el bloqueo estricto en el frontend

  return (
    <div className="w-full px-2 py-2 space-y-8 bg-[#F8FAFC]">
      
      {/* MODAL DE TAREA */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-xl overflow-hidden">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">{editingTask?.id ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
                <button onClick={() => { setIsModalOpen(false); setOriginalPriority(null); setJustificationText(''); }} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
              </div>
              <form onSubmit={handleSaveTask} className="p-5 space-y-4">
                
                {/* 1. Área */}
                <div className="grid gap-4">

                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Área / Categoría</label>
                    <select 
                      value={editingTask?.area || 'Operativo'} 
                      onChange={e => setEditingTask({...editingTask, area: e.target.value})}
                      className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="Operativo">Operativo</option>
                      <option value="Monitoreo">Monitoreo</option>
                      <option value="Tendencias">Tendencias</option>
                      <option value="Escuelita">Escuelita</option>
                      <option value="Calidad">Calidad</option>
                    </select>
                  </div>
                </div>

                {/* 2. Actividad (Predefinida o Libre) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                    Actividad {!!editingTask?.id && <span className="lowercase font-normal text-slate-300 tracking-normal ml-1">(no editable)</span>}
                  </label>
                  {!!editingTask?.id ? (
                    <textarea 
                      value={editingTask?.actividad || ''} 
                      disabled
                      className="w-full p-3 rounded-xl bg-slate-100 border border-slate-200 text-[10px] font-bold text-slate-500 outline-none h-16 resize-none cursor-not-allowed"
                    />
                  ) : (
                    <>
                      <select 
                        value={editingTask?.actividad || ''} 
                        onChange={e => {
                          const val = e.target.value;
                          const role = editingTask?.rol_ejecutante || 'Calidad Fabrica';
                          const template = MATRIZ_TAREAS[role]?.find(t => t.actividad === val);
                          if (template) {
                            setEditingTask({
                              ...editingTask,
                              actividad: val,
                              complejidad: template.complejidad,
                              tiempo_estimado: template.tiempo_estimado,
                              area: template.area
                            });
                          } else {
                            setEditingTask({
                              ...editingTask,
                              actividad: val,
                              complejidad: 2,
                              tiempo_estimado: 60
                            });
                          }
                        }}
                        className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-primary mb-1.5"
                      >
                        <option value="">-- Seleccionar Tarea del Catálogo --</option>
                        {(MATRIZ_TAREAS[editingTask?.rol_ejecutante || 'Calidad Fabrica'] || []).map((t, i) => (
                          <option key={i} value={t.actividad}>{t.actividad}</option>
                        ))}
                        <option value="Otro">Otra Actividad (Texto Libre)</option>
                      </select>

                      {editingTask?.actividad === 'Otro' || (editingTask?.actividad && !MATRIZ_TAREAS[editingTask?.rol_ejecutante || 'Calidad Fabrica']?.some(t => t.actividad === editingTask?.actividad)) ? (
                        <textarea 
                          value={editingTask?.actividad === 'Otro' ? '' : editingTask?.actividad} 
                          onChange={e => setEditingTask({...editingTask, actividad: e.target.value})}
                          placeholder="Escribe la descripción de la actividad..."
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-primary h-16 resize-none"
                          required
                        />
                      ) : null}
                    </>
                  )}
                </div>

                {/* 3. Complejidad y Colaborativo en Paralelo */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">
                      Complejidad <span className="lowercase font-normal text-slate-300 tracking-normal ml-1">(no editable)</span>
                    </label>
                    <div className="p-2 bg-slate-100 rounded-xl text-[10px] font-bold text-slate-600 text-center">
                      {editingTask?.complejidad === 1 ? '1 - BAJO' : editingTask?.complejidad === 2 ? '2 - MEDIO' : '3 - ALTO'}
                    </div>
                  </div>

                  <div className="space-y-1 flex flex-col justify-end">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Colaborativo / Grupo</span>
                    <div className="flex items-center justify-between p-2 bg-slate-50 border border-slate-100 rounded-xl h-[33px]">
                      <span className="text-[9px] font-bold text-slate-400 uppercase ml-1">Activar</span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingTask?.is_collaborative || false}
                          onChange={e => setEditingTask({...editingTask, is_collaborative: e.target.checked, assignedUsers: e.target.checked ? [Number(localStorage.getItem('atenea_user_id') || 1)] : []})}
                          className="sr-only peer"
                        />
                        <div className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-primary"></div>
                      </label>
                    </div>
                  </div>
                </div>

                {/* 4. Prioridad (Fila Horizontal Compacta de 4 Columnas) */}
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Prioridad / Gravedad</label>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIORITIES.map(p => (
                      <button 
                        key={p.value} 
                        type="button"
                        onClick={() => {
                          if (originalPriority === null && editingTask?.id) {
                            setOriginalPriority(editingTask.prioridad || 4);
                          }
                          setEditingTask({...editingTask, prioridad: p.value});
                        }}
                        className={`py-2 px-1 rounded-xl border text-[9px] font-black uppercase transition-all flex items-center justify-center gap-1 ${editingTask?.prioridad === p.value ? 'bg-primary text-white border-primary shadow-sm' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getPriorityColor(p.value).hex }} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 5 y 6. Justificación y Selección de Compañeros en Paralelo según Visibilidad */}
                {(() => {
                  const showJustification = editingTask?.id && originalPriority !== null && Number(editingTask.prioridad) === 10 && originalPriority !== 10;
                  const showCollaborative = editingTask?.is_collaborative;
                  if (!showJustification && !showCollaborative) return null;
                  
                  return (
                    <div className={`grid gap-4 pt-3 border-t border-slate-100 ${showJustification && showCollaborative ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {showJustification && (
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <label className="text-[9px] font-black text-rose-500 uppercase tracking-wider">Justificación del Cambio (Requerida)</label>
                          <textarea
                            value={justificationText}
                            onChange={e => setJustificationText(e.target.value)}
                            placeholder="Explica brevemente por qué estás cambiando la prioridad a CRÍTICA..."
                            className="w-full p-2 rounded-xl bg-rose-50/20 border border-rose-200 text-[10px] font-bold text-slate-700 outline-none focus:border-rose-500 h-[80px] resize-none"
                            required
                          />
                        </div>
                      )}
                      {showCollaborative && (
                        <div className="space-y-1 animate-in fade-in duration-300">
                          <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Seleccionar Compañeros</label>
                          <div className="space-y-1.5 max-h-[80px] overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-100 custom-scrollbar">
                            {usersList.map((u: any) => (
                              <label key={u.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                                <input 
                                  type="checkbox"
                                  checked={(editingTask.assignedUsers || []).includes(u.id)}
                                  onChange={e => {
                                    const checked = e.target.checked;
                                    const currentList = editingTask.assignedUsers || [];
                                    const newList = checked ? [...currentList, u.id] : currentList.filter(id => id !== u.id);
                                    setEditingTask({...editingTask, assignedUsers: newList});
                                  }}
                                  className="rounded text-primary focus:ring-primary border-slate-200 h-3 w-3"
                                />
                                <div className="flex-1 flex justify-between items-center text-[9px]">
                                  <span className="font-bold text-slate-700">{u.nombre}</span>
                                  {u.isLocked && (
                                    <span className="text-[6px] bg-red-150 text-red-600 px-1 py-0.2 rounded font-black border border-red-200/50 uppercase">Ocupado</span>
                                  )}
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <button type="submit" className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">
                  {editingTask?.id ? 'Actualizar Tarea' : 'Añadir al Backlog'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE JORNADA BASE */}
      <AnimatePresence>
        {isJornadaModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                    <Clock size={18} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Configurar Jornada</h3>
                </div>
                <button onClick={() => setIsJornadaModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1 mb-4">
                  <button onClick={() => setIsJornadaRecurrente(false)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!isJornadaRecurrente ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>
                    {modalSource === 'card' ? 'Día Único' : 'Por Rango'}
                  </button>
                  <button onClick={() => setIsJornadaRecurrente(true)} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isJornadaRecurrente ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>Recurrente</button>
                </div>

                {!isJornadaRecurrente ? (
                  modalSource === 'card' ? (
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha</label>
                      <input type="date" value={startDate} onChange={e => { setStartDate(e.target.value); setEndDate(e.target.value); }} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Inicio</label>
                        <input type="date" value={startWeek} onChange={e => setStartWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Fin</label>
                        <input type="date" value={endWeek} onChange={e => setEndWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Días de la semana</label>
                    <div className="flex justify-between gap-1.5">
                      {DIAS.map(d => (
                        <button key={d} onClick={() => setJornadaDiasRecurrentes(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d])} className={`flex-1 h-9 rounded-xl text-[11px] font-black border transition-all ${jornadaDiasRecurrentes.includes(d) ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-primary/30'}`}>
                          {d.charAt(0)}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora Entrada</label>
                    <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Hora Salida</label>
                    <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                  </div>
                </div>
                <button 
                  onClick={() => { handleSaveConfig(); setIsJornadaModalOpen(false); }} 
                  disabled={isSaving} 
                  className="w-full py-4 bg-primary text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-soft transition-all shadow-xl shadow-primary/20"
                >
                  {isSaving ? 'Guardando...' : 'Actualizar Jornada Base'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE BLOQUEO */}
      <AnimatePresence>
        {isExcepcionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Plus size={18} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Añadir Bloqueo</h3>
                </div>
                <button onClick={() => setIsExcepcionModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                  <button onClick={() => { setIsExcepcionGroupMode(false); setNewBlock({...newBlock, isRecurrente: false}); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!isExcepcionGroupMode ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>
                    {modalSource === 'card' ? 'Día Único' : 'Por Rango'}
                  </button>
                  <button onClick={() => { setIsExcepcionGroupMode(true); setNewBlock({...newBlock, isRecurrente: true}); }} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${isExcepcionGroupMode ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>Recurrente</button>
                </div>
                
                <div className="space-y-4">
                  {isExcepcionGroupMode ? (
                    <div className="flex justify-between gap-1.5">
                      {DIAS.map(d => (
                        <button key={d} onClick={() => setNewBlock(prev => ({...prev, dias: prev.dias.includes(d) ? prev.dias.filter(x => x !== d) : [...prev.dias, d]}))} className={`flex-1 h-9 rounded-xl text-[11px] font-black border transition-all ${newBlock.dias.includes(d) ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-primary/30'}`}>
                          {d.charAt(0)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    modalSource === 'card' ? (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha</label>
                        <input type="date" value={newBlock.fechaInicio} onChange={e => setNewBlock({...newBlock, fechaInicio: e.target.value, fechaFin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Inicio</label>
                          <input type="date" value={startWeek} onChange={e => setStartWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Fin</label>
                          <input type="date" value={endWeek} onChange={e => setEndWeek(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                        </div>
                      </div>
                    )
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input type="time" value={newBlock.inicio} onChange={e => setNewBlock({...newBlock, inicio: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none" />
                    <input type="time" value={newBlock.fin} onChange={e => setNewBlock({...newBlock, fin: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none" />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Tipo de Actividad</label>
                    <select value={newBlock.tipo} onChange={e => setNewBlock({...newBlock, tipo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none">
                      {TIPOS_BLOQUE.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  {newBlock.tipo === 'Otro' && (
                    <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Especifique el motivo</label>
                      <input 
                        type="text" 
                        placeholder="¿Por qué este bloqueo?"
                        value={newBlock.motivo}
                        onChange={e => setNewBlock({...newBlock, motivo: e.target.value})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-accent"
                        required
                      />
                    </div>
                  )}
                </div>

                  <button 
                  onClick={() => { addBloque(); setIsExcepcionModalOpen(false); }} 
                  className="w-full py-4 bg-accent text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent-hover transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-2"
                >
                  <Plus size={16} /> Confirmar Bloqueo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* NUEVO MODAL DE TAREA IA (DESDE CERO) */}
      <AnimatePresence>
        {isCustomAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-white/20">
              {customAiStep === 'input' && (
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Wand2 size={16} className="text-emerald-600" /> Nueva Tarea IA
                  </h3>
                  <button onClick={() => setIsCustomAiModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                </div>
              )}

              <div className="p-6 space-y-6">
                {customAiStep === 'input' ? (
                  <>
                    {/* 1. Actividad / Descripción */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <span>{customAiMode === 'rayo' ? '⚡' : '🤖'}</span> Actividad / Descripción
                      </label>

                      {/* Selector de modo Rayo / Bot */}
                      <div className="flex bg-slate-100 p-1 rounded-xl gap-1 mb-3">
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAiMode('rayo');
                            const options = getDropdownOptions();
                            setCustomAiSelectedOption(options[0] || '');
                          }}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${customAiMode === 'rayo' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <Zap size={10} className="text-amber-500" /> Tarea Rápida
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setCustomAiMode('bot');
                            setCustomAiSelectedOption('Otro');
                            setCustomAiTaskText('');
                          }}
                          className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all ${customAiMode === 'bot' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          <Bot size={10} className="text-emerald-500" /> Asistente IA
                        </button>
                      </div>

                      {customAiMode === 'rayo' ? (
                        <select
                          value={customAiSelectedOption}
                          onChange={e => setCustomAiSelectedOption(e.target.value)}
                          className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-emerald-600 mb-2 font-sans"
                        >
                          {getDropdownOptions().map(opt => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <textarea 
                          value={customAiTaskText} 
                          onChange={e => setCustomAiTaskText(e.target.value)}
                          placeholder="Describe tu tarea para que la IA la procese (ej: Analizar tendencias de focos por 2 horas)..."
                          className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 outline-none focus:border-emerald-600 h-24 resize-none"
                          required
                        />
                      )}
                    </div>

                    {/* 2. Área / Categoría */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase">Área / Categoría</label>
                      <select 
                        value={customAiArea} 
                        onChange={e => setCustomAiArea(e.target.value)}
                        className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-emerald-600"
                      >
                        <option value="Operativo">Operativo</option>
                        <option value="Monitoreo">Monitoreo</option>
                        <option value="Tendencias">Tendencias</option>
                        <option value="Escuelita">Escuelita</option>
                        <option value="Calidad">Calidad</option>
                      </select>
                    </div>

                    {/* 3. Colaborativo / Grupo */}
                    <div className="space-y-3 pt-3 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black text-slate-500 uppercase">Colaborativo / Grupo</span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={customAiIsCollab}
                            onChange={e => setCustomAiIsCollab(e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-350 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>

                      {customAiIsCollab && (
                        <div className="space-y-2 max-h-32 overflow-y-auto p-3 bg-slate-50 rounded-xl border border-slate-100 custom-scrollbar">
                          <p className="text-[8px] font-bold text-slate-400 uppercase mb-2">Seleccionar Compañeros de Equipo</p>
                          {usersList.map((u: any) => (
                            <label key={u.id} className="flex items-center gap-2 cursor-pointer py-1">
                              <input 
                                type="checkbox"
                                checked={customAiAssignedUsers.includes(u.id)}
                                onChange={() => {
                                  const newList = customAiAssignedUsers.includes(u.id)
                                    ? customAiAssignedUsers.filter(id => id !== u.id)
                                    : [...customAiAssignedUsers, u.id];
                                  setCustomAiAssignedUsers(newList);
                                }}
                                className="rounded border-slate-350 text-emerald-600 focus:ring-emerald-600"
                              />
                              <span className="text-[10px] font-bold text-slate-600">{u.nombre}</span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Botón de Enviar */}
                    <button 
                      onClick={handleAnalyzeCustomAiTask}
                      disabled={isProcessing || (customAiSelectedOption === 'Otro' && !customAiTaskText.trim())}
                      className="w-full py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 hover:scale-105 active:scale-95 transition-all shadow-xl shadow-slate-900/10 flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none"
                    >
                      {isProcessing ? 'Procesando con IA...' : 'Analizar con IA'}
                    </button>
                  </>
                ) : (
                  <>
                    <div className="-mx-6 -mt-6 bg-emerald-600 p-8 text-white relative">
                      <div className="absolute top-0 right-0 p-8 opacity-10">
                        <Wand2 size={120} className="rotate-12" />
                      </div>
                      <div className="flex items-center gap-4 mb-2">
                        <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                          <Wand2 size={24} />
                        </div>
                        <div>
                          <h2 className="text-2xl font-black uppercase tracking-tighter">Asistente IA</h2>
                          <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest opacity-80">Procesamiento inteligente de tareas</p>
                        </div>
                      </div>
                      <button onClick={() => setIsCustomAiModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all text-white">
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4 pt-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Actividades sugeridas por la IA:</p>
                      
                      <div className="bg-[#F8FAFC] p-6 rounded-[28px] border border-slate-100 flex flex-col gap-4 relative shadow-[0_8px_30px_rgb(0,0,0,0.02)]">
                        <div className="flex justify-between items-center">
                          <span className="text-[8px] font-black px-2.5 py-1 rounded-full uppercase text-center bg-emerald-50 text-emerald-600 border border-emerald-100">
                            {customAiPreviewResult?.rol_ejecutante || 'Calidad Fabrica'}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-100/80 px-2.5 py-1 rounded-md">
                            Complejidad: {customAiPreviewResult?.complejidad || 2}
                          </span>
                        </div>

                        <h4 className="text-xs font-black text-slate-800 leading-relaxed pr-6">{customAiPreviewResult?.actividad}</h4>

                        <div className="flex items-center gap-4 pt-3 border-t border-slate-100/50">
                          <span className="text-[8px] font-black text-slate-400 uppercase">
                            Área: {customAiPreviewResult?.area}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 uppercase">
                            Prioridad: {customAiPreviewResult?.prioridad === 10 ? 'Crítica' : customAiPreviewResult?.prioridad === 7 ? 'Alta' : customAiPreviewResult?.prioridad === 4 ? 'Media' : 'Baja'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 pt-4">
                        <button 
                          onClick={() => setCustomAiStep('input')} 
                          className="flex-1 py-4 border border-slate-200 hover:bg-slate-50 text-slate-450 hover:text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all animate-in duration-200"
                        >
                          Reintentar
                        </button>
                        <button 
                          onClick={handleConfirmCustomAiTask}
                          disabled={isProcessing}
                          className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
                        >
                          {isProcessing ? 'Guardando...' : 'Agregar todo al backlog'}
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE ASISTENTE IA */}
      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden border border-white/20">
              <div className="bg-emerald-600 p-8 text-white relative">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Wand2 size={120} className="rotate-12" />
                </div>
                <div className="flex items-center gap-4 mb-2">
                  <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <Wand2 size={24} />
                  </div>
                  <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter">Asistente IA</h2>
                    <p className="text-emerald-100 text-xs font-bold uppercase tracking-widest opacity-80">Procesamiento inteligente de tareas</p>
                  </div>
                </div>
                <button onClick={() => { setIsAiModalOpen(false); setAiSuggestions([]); }} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-10 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
                {aiSuggestions.length === 0 ? (
                  <div className="space-y-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Escribe tus actividades</label>
                    <textarea 
                      autoFocus
                      value={freeText} 
                      onChange={e => setFreeText(e.target.value)} 
                      placeholder="Ej: Revisar indicadores radar, luego auditar BOTs por 3 horas..." 
                      className="w-full h-48 p-6 rounded-[32px] bg-slate-50 border-2 border-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-300 resize-none outline-none focus:border-emerald-500/30 transition-all shadow-inner leading-relaxed"
                    />
                    <div className="flex items-center justify-between px-2">
                      <button onClick={() => setFreeText('')} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors">
                        Limpiar todo
                      </button>
                      <span className="text-[9px] font-bold text-slate-300 uppercase italic">La IA clasificará complejidad y prioridad automáticamente</span>
                    </div>
                    
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setIsAiModalOpen(false)} className="flex-1 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                        Cancelar
                      </button>
                      <button 
                        onClick={handleAiBacklog}
                        disabled={isProcessing || !freeText.trim()}
                        className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
                      >
                        {isProcessing ? 'Procesando...' : <><Wand2 size={18} /> Analizar con IA</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Actividades sugeridas por la IA:</p>
                    <div className="space-y-3">
                      {aiSuggestions.map((item, idx) => (
                        <div key={idx} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col gap-2">
                          <div className="flex justify-between items-center">
                            <span className="text-[8px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded uppercase">{item.rol_ejecutante}</span>
                            <span className="text-[8px] font-black bg-slate-200 text-slate-600 px-2 py-0.5 rounded uppercase">Complejidad: {item.complejidad}</span>
                          </div>
                          <p className="text-xs font-bold text-slate-800">{item.actividad}</p>
                          <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase mt-1">
                            <span>Área: {item.area}</span>
                            <span>Prioridad: {item.prioridad === 7 ? 'ALTA' : item.prioridad === 4 ? 'MEDIA' : 'BAJA'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-4 pt-4">
                      <button onClick={() => setAiSuggestions([])} className="flex-1 py-4 border border-slate-200 rounded-xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all">Reintentar</button>
                      <button onClick={handleSaveAiSuggestions} className="flex-[2] py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-[10px] font-black uppercase transition-all shadow-lg shadow-emerald-600/20">Agregar todo al Backlog</button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE PLANIFICACIÓN DIARIA */}
      <AnimatePresence>
        {isPlanningModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-[95vw] h-[95vh] flex flex-col overflow-hidden border border-white/20">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-primary text-white">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                    <Calendar size={20} />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-widest">Planificación Diaria</h3>
                    <p className="text-[10px] font-bold text-white/70 uppercase mt-0.5">Agenda para {selectedPlanningDate}</p>
                  </div>
                </div>
                <button onClick={() => setIsPlanningModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                  <X size={16} />
                </button>
              </div>

              <div className="flex-1 flex flex-col overflow-hidden bg-slate-50">
                {/* Banner de Advertencia por Jornadas Pasadas Abiertas */}
                {unclosedPastDay && (
                  <div className="bg-amber-500 text-white px-6 py-4 flex items-center gap-3 animate-pulse shadow-md z-20">
                    <AlertTriangle size={20} className="shrink-0" />
                    <span className="text-xs font-black uppercase tracking-wide leading-relaxed">
                      ⚠️ Advertencia: El día {unclosedPastDay} está sin finalizar. Se recomienda finalizar el turno de ese día en la Agenda Pro para mantener tus métricas.
                    </span>
                  </div>
                )}

                {/* Sugerencia de Inicio */}
                {pendingSuggestions.length > 0 && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-4 bg-[#7DA81A]/5 border-b border-[#7DA81A]/10 flex items-start gap-4"
                  >
                    <div className="p-2 bg-[#7DA81A]/10 rounded-lg text-[#7DA81A] animate-pulse">
                      <span className="text-sm">⚡</span>
                    </div>
                    <div>
                      <h4 className="text-[10px] font-black text-[#7DA81A] uppercase tracking-wider mb-0.5 flex items-center gap-2">
                        <span>🧠</span> Sugerencia de Inicio del Día
                      </h4>
                      <p className="text-[11px] text-slate-700 font-bold leading-relaxed">
                        {dayStartSuggestion}
                      </p>
                    </div>
                  </motion.div>
                )}

                <div className="flex-1 flex overflow-hidden">
                {/* 1. Panel Izquierdo: Backlog Disponible (Oculto/Borrado si está bloqueado) */}
                <div className={`w-1/3 flex flex-col border-r border-slate-200 bg-white transition-opacity ${isPlanningBlocked ? 'opacity-30 pointer-events-none' : ''}`}>
                   <div className="p-5 border-b border-slate-100 flex flex-col gap-3">
                     <div>
                       <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                          <Database size={14} className="text-primary" />
                          Backlog Disponible
                       </h4>
                       <p className="text-[9px] font-bold text-slate-400 mt-1">Actividades esperando ser programadas.</p>
                     </div>
                     <div className="relative">
                       <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                       <input 
                         type="text" 
                         placeholder="Buscar tarea..." 
                         value={backlogSearch}
                         onChange={(e) => setBacklogSearch(e.target.value)}
                         className="w-full pl-8 pr-3 py-2 text-[10px] font-bold bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                       />
                     </div>
                     <div className="flex flex-wrap gap-1">
                        <button
                          onClick={() => setBacklogFilterPriority('Todos')}
                          className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${backlogFilterPriority === 'Todos' ? 'bg-primary text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                        >
                          TODOS
                        </button>
                        {PRIORITIES.map(p => (
                          <button
                            key={p.value}
                            onClick={() => setBacklogFilterPriority(p.value)}
                            className={`px-2 py-1 rounded text-[8px] font-black uppercase transition-all ${backlogFilterPriority === p.value ? p.color + ' text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                          >
                            {p.label}
                          </button>
                        ))}
                     </div>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                     {backlog
                       .filter(t => !['resuelto', 'terminada', 'despriorizado', 'fallo', 'fallido'].includes(t.status))
                       .filter(t => !dayTasks.some(dt => dt.backlog_id === t.id))
                       .filter(t => backlogFilterPriority === 'Todos' || t.prioridad === backlogFilterPriority)
                       .filter(t => !backlogSearch || t.actividad.toLowerCase().includes(backlogSearch.toLowerCase()))
                       .sort((a, b) => {
                         const aLeftover = allTasks.some(t => t.backlog_id === a.id && t.fecha < selectedPlanningDate && !['resuelto', 'terminada'].includes((t.estado_ejecucion || '').toLowerCase()));
                         const bLeftover = allTasks.some(t => t.backlog_id === b.id && t.fecha < selectedPlanningDate && !['resuelto', 'terminada'].includes((t.estado_ejecucion || '').toLowerCase()));
                         
                         if (aLeftover && !bLeftover) return -1;
                         if (!aLeftover && bLeftover) return 1;
                         
                         if (a.prioridad !== b.prioridad) return b.prioridad - a.prioridad;
                         return (b.antiguedad || 0) - (a.antiguedad || 0);
                       })
                       .map(task => {
                         const isLeftover = allTasks.some(t => t.backlog_id === task.id && t.fecha < selectedPlanningDate && !['resuelto', 'terminada'].includes((t.estado_ejecucion || '').toLowerCase()));
                         return (
                         <div key={task.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all group flex flex-col gap-2 relative overflow-hidden">
                           {isLeftover && (
                             <div className="bg-amber-100 text-amber-700 text-[8px] font-black uppercase px-2 py-1 rounded-md self-start flex items-center gap-1 mb-1">
                               <AlertTriangle size={10} /> Sugerencia: Del día anterior
                             </div>
                           )}
                           <div className="flex items-center justify-between">
                              <span className="text-[7px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-md uppercase border border-slate-100">{task.area || 'Gral'}</span>
                              <div className="flex gap-1.5">
                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase border ${getStatusColor(task.status || 'pendiente').badge} ${getStatusColor(task.status || 'pendiente').badgeBorder}`}>
                                  {getStatusColor(task.status || 'pendiente').label}
                                </span>
                                {(() => {
                                  const prio = getPriorityColor(task.prioridad);
                                  return (
                                    <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${prio.badge}`}>
                                      {prio.label}
                                    </span>
                                  );
                                })()}
                                {task.is_collaborative ? (
                                  <span className="text-[7px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm bg-amber-50 text-amber-600 border border-amber-200 flex items-center gap-1">
                                    <Users size={8} /> GRUPAL
                                  </span>
                                ) : null}
                              </div>
                          </div>
                          <p className="text-[12px] font-bold text-slate-700 leading-snug pr-4">{task.actividad}</p>
                          
                          {/* Hover Layer to Add */}
                          <div className="absolute inset-0 bg-primary/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                            <button 
                              onClick={() => handleAssignToDayFromModal(task)}
                              className="px-6 py-2 bg-white text-primary rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
                            >
                              <Plus size={14} /> Añadir al Día
                            </button>
                          </div>
                        </div>
                        );
                      })}
                     {backlog.filter(t => !['resuelto', 'terminada', 'despriorizado', 'fallo', 'fallido'].includes(t.status)).filter(t => !dayTasks.some(dt => dt.backlog_id === t.id)).length === 0 && (
                       <div className="text-center p-6 text-[10px] font-bold text-slate-400">No hay tareas activas en el backlog.</div>
                     )}
                   </div>
                </div>

                {/* 2. Panel Central: Tareas Asignadas al Día */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <ListChecks size={16} className="text-primary" />
                      Tareas de {selectedPlanningDate} ({dayTasks.length})
                    </h4>
                    {dayTasks.length > 0 && !isPlanningBlocked && (
                      <button 
                        onClick={handleClearAllTasks}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Limpiar Todo
                      </button>
                    )}
                  </div>

                  {/* Tareas Pendientes del Día Anterior */}
                  {!isPlanningBlocked && pendingSuggestions.length > 0 && (
                    <div className="mb-6 bg-primary/5 border border-primary/20 rounded-2xl p-4">
                      <div className="flex items-center gap-2 mb-4 text-primary">
                        <span className="text-sm">🚀</span>
                        <h4 className="text-[11px] font-black uppercase tracking-widest">Tareas pendientes del día anterior</h4>
                      </div>
                      <div className="space-y-3">
                        {pendingSuggestions.map(t => (
                          <div key={t.id} className="bg-white p-6 rounded-[28px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-50 flex flex-col gap-5 transition-all hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] group">
                            <div className="flex items-start gap-4">
                              <div className="flex flex-col gap-2 pt-1">
                                {(() => {
                                  const prio = getPriorityColor(t.prioridad);
                                  return (
                                    <span className={`text-[7px] font-black px-2.5 py-1 rounded-full uppercase text-center tracking-widest shadow-sm ${prio.badge}`}>
                                      {prio.label}
                                    </span>
                                  );
                                })()}
                                {t.area && (
                                  <span className="text-[7px] font-black text-slate-300 bg-slate-50 px-2.5 py-1 rounded-full uppercase text-center tracking-widest border border-slate-100">{t.area}</span>
                                )}
                              </div>
                              <div className="flex-1">
                                <span className="text-[12px] font-bold text-slate-800 leading-relaxed block">{t.actividad}</span>
                                <p className="text-[9px] font-medium text-slate-400 mt-1 italic">Pendiente desde el turno anterior</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                              <button 
                                onClick={() => handleDiscardSuggestion(t.id)}
                                className="px-3 py-1.5 text-slate-300 hover:text-red-400 text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 hover:bg-red-50 rounded-full"
                              >
                                <X size={12} /> Descartar
                              </button>
                              
                              <button 
                                onClick={() => handleAssignToDayFromModal(t)}
                                className="px-5 py-2 bg-gradient-to-r from-primary to-primary-soft text-white text-[9px] font-black rounded-full hover:shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 active:scale-95 shadow-md uppercase tracking-widest"
                              >
                                <Plus size={12} /> Agregar a mi día
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {dayTasks.length > 0 ? (
                    <div className="space-y-3">
                      {dayTasks.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-[22px] border border-slate-100 shadow-sm flex items-center justify-between group hover:border-primary/20 transition-all">
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col gap-1.5">
                              <span className="text-[7px] font-black text-slate-300 bg-slate-50 px-2 py-0.5 rounded-md uppercase border border-slate-100 w-fit">{t.area || 'Gral'}</span>
                              {(() => {
                                const prio = getPriorityColor(t.prioridad);
                                return (
                                  <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase shadow-sm ${prio.badge} w-fit`}>
                                    {prio.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="text-[13px] font-bold text-slate-700">{t.actividad}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex gap-1.5">
                              <span className="text-[7px] font-black px-2 py-0.5 rounded-md uppercase border border-primary/20 text-primary bg-primary/5">
                                ASIGNADO
                              </span>
                              <span className={`flex items-center gap-1 text-[7px] font-black px-2 py-0.5 rounded-md uppercase border ${t.is_collaborative ? 'border-amber-200 text-amber-600 bg-amber-50' : 'border-emerald-200 text-emerald-600 bg-emerald-50'}`}>
                                {t.is_collaborative ? <Users size={10} /> : <User size={10} />}
                                {t.is_collaborative ? 'GRUPAL' : 'INDIVIDUAL'}
                              </span>
                            </div>
                            {!isPlanningBlocked && (
                              <button onClick={async () => {
                                if (!window.confirm("¿Estás seguro de que deseas eliminar esta tarea asignada?")) return;
                                await fetch(`/api/tareas/${t.id}`, { method: 'DELETE' });
                                setDayTasks(prev => prev.filter(x => x.id !== t.id));
                                fetchBacklog();
                                fetchAllTasks();
                                fetchDailyTasks();
                              }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all p-2"
                              title="Eliminar tarea asignada">
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="h-40 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center justify-center gap-2 opacity-50">
                      <ListChecks size={24} className="text-slate-400" />
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin tareas asignadas</p>
                      <p className="text-[8px] font-bold text-slate-400 text-center max-w-[200px]">Usa el panel izquierdo para añadir tareas o arrástralas desde el Kanban.</p>
                    </div>
                  )}
                </div>

                {/* 3. Panel Derecho: Resumen de Tiempo */}
                <div className="w-[320px] bg-white border-l border-slate-100 flex flex-col overflow-y-auto custom-scrollbar">
                  {/* Resumen de Tiempo */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                    <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2"><Clock size={14}/> Resumen de Tiempos</h5>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Hora Inicio</span>
                        <span className="text-[11px] font-black text-slate-800">{startTime}</span>
                      </div>
                      <div className="flex justify-between items-center bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Hora Fin</span>
                        <span className="text-[11px] font-black text-slate-800">{endTime}</span>
                      </div>
                      


                      {/* Mostrar Excepciones del día */}
                      {(() => {
                        let diaNombre = '';
                        if (selectedPlanningDate) {
                          const d = new Date(selectedPlanningDate + 'T00:00:00');
                          const daysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                          diaNombre = daysEs[d.getDay()];
                        }
                        const dayBlocks = bloques.filter(b => b.fecha === selectedPlanningDate || b.dia_semana === diaNombre);
                        if (dayBlocks.length === 0) return null;
                        return (
                          <div className="mt-4 pt-4 border-t border-slate-100">
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-2">Bloqueos Aplicados</span>
                            <div className="space-y-2">
                              {dayBlocks.map(b => (
                                <div key={b.id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
                                  <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                    <span className="text-[9px] font-bold text-slate-600">{b.tipo}</span>
                                  </div>
                                  <span className="text-[8px] font-black text-slate-400">{b.hora_inicio} - {b.hora_fin}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                    </div>
                  </div>

                  {/* Tanque de Energía Visual (Horizontal like Agenda Pro) */}
                  <div className="p-6 flex-1 flex flex-col justify-center bg-white border-t border-slate-50">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 flex flex-col justify-between gap-6 shadow-sm">
                      <div className="flex flex-col gap-6 w-full">
                        <div className="flex flex-col items-center text-center">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanque de Energía</span>
                          <div className="flex items-baseline gap-1 mt-1">
                            <span className={`text-3xl font-black ${availableHours > 0 && usedHours / availableHours < 0.85 ? 'text-emerald-500' : 'text-amber-500'}`}>
                              {Math.max(0, Math.round(100 - (availableHours > 0 ? (usedHours / availableHours) * 100 : 0)))}%
                            </span>
                            <span className="text-[11px] font-bold text-slate-400 uppercase">libre</span>
                          </div>
                        </div>
                        
                        <div className="w-full h-px bg-slate-100" />
                        
                        <div className="flex-1 w-full flex flex-col justify-center">
                          <div className="flex justify-between items-center mb-2">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                Carga Diaria
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                {availableHours > 0 && usedHours / availableHours > 1 ? (
                                  <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                    <AlertTriangle size={12}/> Sobrecarga
                                  </span>
                                ) : availableHours > 0 && usedHours / availableHours < 0.85 ? (
                                  <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-1">
                                    <Zap size={12}/> Energía de Sobra
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                                    <CheckCircle size={12}/> Óptimo
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right flex flex-col justify-end">
                              <span className="text-xl font-black text-slate-700 leading-none">
                                {Math.round(availableHours > 0 ? (usedHours / availableHours) * 100 : 0)}%
                              </span>
                            </div>
                          </div>
                          
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, (availableHours > 0 ? (usedHours / availableHours) * 100 : 0))}%` }}
                              className={`h-full rounded-full transition-all duration-1000 ${
                                availableHours > 0 && usedHours / availableHours > 1 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 
                                availableHours > 0 && usedHours / availableHours < 0.85 ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.4)]' : 
                                'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                              }`}
                            />
                          </div>
            
                          <div className="mt-1.5 flex justify-end">
                            <span className={`text-[8px] font-bold uppercase tracking-wider ${
                              availableHours > 0 && usedHours / availableHours > 1 ? 'text-amber-500' : 
                              availableHours > 0 && usedHours / availableHours < 0.85 ? 'text-blue-500' : 
                              'text-emerald-400'
                            }`}>
                              {availableHours > 0 && usedHours / availableHours > 1 
                                ? '¡Ánimo, un paso a la vez! Tú puedes 💪' 
                                : availableHours > 0 && usedHours / availableHours < 0.85 
                                ? '¡Aún tienes energía! ¿Te animas a tomar otra tarea? 😎' 
                                : '¡Carga óptima! Estás en tu mejor momento ⚡'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <>
      {/* 1. CALENDARIO SEMANAL L-V Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-4">
             <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                <Calendar size={28} />
             </div>
             <div>
                Visualización Semanal Operativa
                <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                   Distribución de Jornada y Bloqueos (L-V)
                </p>
             </div>
          </h2>
        </div>
        
        {/* Welcome Widget */}
        {(() => {
          const currentUserId = Number(localStorage.getItem('atenea_user_id') || 1);
          const currentUser = usersList.find(u => u.id === currentUserId);
          if (!currentUser) return null;
          return (
            <div className="flex items-center gap-3 bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-black shadow-md">
                {currentUser.nombre.charAt(0)}
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">¡Bienvenido!</span>
                <span className="text-sm font-bold text-slate-800">{currentUser.nombre}</span>
              </div>
            </div>
          );
        })()}
      </div>

      <div className="latam-card !p-8 bg-white border border-slate-100 shadow-2xl shadow-slate-200/40 rounded-[40px]">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 pb-6 border-b border-slate-50 items-end">
          {/* Control 1: Selección de Semana */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">1. Navegación Semanal</span>
            <div className="flex items-center bg-slate-50 p-1 rounded-2xl gap-2 w-full md:w-auto h-[48px]">
               <button onClick={() => setWeekOffset(prev => prev - 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-primary transition-all shrink-0">
                  <ArrowRight size={18} className="rotate-180" />
               </button>
               <div className="px-4 py-1 flex flex-col items-center flex-1 min-w-[100px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Semana</span>
                  <span className="text-xs font-black text-primary uppercase leading-none">#{currentWeekNumber}</span>
               </div>
               <button onClick={() => setWeekOffset(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-primary transition-all shrink-0">
                  <ArrowRight size={18} />
               </button>
            </div>
          </div>

          {/* Control 2: Horario Base */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">2. Jornada Laboral Base</span>
            <button 
              onClick={() => { 
                setStartWeek(toLocalYYYYMMDD(weekDates[0] || new Date())); 
                setEndWeek(toLocalYYYYMMDD(weekDates[0] || new Date())); 
                setModalSource('header'); 
                setIsJornadaRecurrente(false); 
                setIsJornadaModalOpen(true); 
              }}
              className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/40 hover:bg-white transition-all flex items-center gap-3 group w-full h-[48px]"
            >
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all shrink-0">
                <Clock size={16} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Jornada General</span>
                <span className="text-xs font-black text-slate-800 leading-none">{startTime} - {endTime}</span>
              </div>
            </button>
          </div>

          {/* Control 3: Añadir Excepción */}
          <div className="flex flex-col gap-2">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">3. Bloques Especiales</span>
            <button 
              onClick={() => {
                setStartWeek(toLocalYYYYMMDD(weekDates[0] || new Date())); 
                setEndWeek(toLocalYYYYMMDD(weekDates[0] || new Date())); 
                setModalSource('header');
                setIsExcepcionGroupMode(false);
                setNewBlock({...newBlock, isRecurrente: false});
                setIsExcepcionModalOpen(true);
              }}
              className="px-6 py-3 bg-slate-900 hover:bg-black text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 w-full h-[48px]"
            >
              <Plus size={16} /> Bloquear Tiempo
            </button>
          </div>
        </div>

        {/* Instrucción del Calendario para Nuevos Usuarios */}
        <div className="flex items-center gap-2 mb-6 pl-1 bg-slate-50 p-3 rounded-2xl border border-slate-100 w-fit">
          <span className="text-[9px] font-black text-primary uppercase tracking-widest flex items-center gap-1.5">
            💡 Instrucción:
          </span>
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">
            Haz clic en el día laborable para abrir el planificador y estructurar tu agenda.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {weekDates.map((date, index) => {
            const diaNombre = DIAS[index];
            const dateStr = toLocalYYYYMMDD(date);
            const dayBlocks = bloques.filter(b => b.dia_semana === diaNombre || b.fecha === dateStr);
            const isToday = toLocalYYYYMMDD(new Date()) === dateStr;
            const isFuture = dateStr > toLocalYYYYMMDD(new Date());
            const isClosed = dailyPlans[dateStr]?.estado_cierre === 1;

            const currentUserId = Number(localStorage.getItem('atenea_user_id') || 1);
            const dayTasksForUser = allTasks.filter(t => t.fecha === dateStr && t.user_id === currentUserId);
            const totalTasks = dayTasksForUser.length;
            const completedTasks = dayTasksForUser.filter(t => ['resuelto', 'terminada'].includes((t.estado_ejecucion || '').toLowerCase())).length;
            const pendingTasks = totalTasks - completedTasks;

            const isPast = dateStr < toLocalYYYYMMDD(new Date());

            return (
              <div 
                key={diaNombre} 
                id={`day-col-${dateStr}`}
                onDragOver={e => isToday && e.preventDefault()}
                onDrop={e => isToday && handleDropToDay(e, dateStr)}
                onClick={() => {
                  if (isFuture) return;
                  if (isPast) {
                    alert("🚫 PLANIFICACIÓN RESTRINGIDA: No puedes agendar ni modificar tareas en días pasados. Por favor, selecciona el día de HOY para asignar tus actividades.");
                    return;
                  }
                  setSelectedPlanningDate(dateStr); 
                  setIsPlanningModalOpen(true); 
                }}
                className={`flex flex-col rounded-2xl border overflow-hidden transition-all relative group ${(isFuture || isPast) ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'} ${isToday ? 'border-primary ring-2 ring-primary/20 shadow-lg scale-[1.02] z-10 bg-white' : 'border-slate-100 bg-slate-50/50'}`}
              >
                {isFuture && (
                  <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-4 bg-slate-50/10">
                     <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 mb-2">
                       <Clock size={12} className="text-slate-400" />
                       <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Planificación Cerrada</span>
                     </div>
                  </div>
                )}
                <div 
                  className="p-3 text-center text-white transition-opacity group-hover:opacity-90"
                  style={{ backgroundColor: isToday ? '#1b0088' : '#0f004f' }}
                >
                  <h4 className="text-[10px] font-black uppercase tracking-widest">{diaNombre}</h4>
                  <p className="text-[9px] font-bold mt-0.5 text-white/80">{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</p>
                </div>
                
                <div className="p-4 space-y-5">
                   <div 
                     onClick={(e) => {
                       e.stopPropagation();
                       if (isClosed) return; // closed days are read-only
                       setStartDate(dateStr);
                       setEndDate(dateStr);
                       const plan = dailyPlans[dateStr];
                       setStartTime(plan?.hora_inicio || '08:00');
                       setEndTime(plan?.hora_fin || '17:00');
                       setModalSource('card');
                       setIsJornadaRecurrente(false);
                       setIsJornadaModalOpen(true);
                     }}
                     className={`relative pl-3 border-l-2 p-2 ${isClosed ? 'border-slate-200 cursor-default' : 'border-primary/20 hover:bg-primary/5 cursor-pointer group/jornada'}`}
                   >
                     <div className="flex items-center justify-between">
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Jornada Base</span>
                       {!isClosed && (
                         <div className="opacity-0 group-hover/jornada:opacity-100 transition-opacity">
                           <Save size={8} className="text-primary" />
                         </div>
                       )}
                     </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-primary/60" />
                        <span className="text-[10px] font-black text-slate-700">
                          {dailyPlans[dateStr] ? `${dailyPlans[dateStr].hora_inicio} - ${dailyPlans[dateStr].hora_fin}` : 'Sin configurar'}
                        </span>
                      </div>
                    </div>
 
                   {/* Tareas de la Jornada */}
                   <div className="relative pl-3 border-l-2 border-emerald-500/20 p-2 space-y-1">
                     <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter block">Tareas de la Jornada</span>
                     {totalTasks > 0 ? (
                       <div className="flex flex-col gap-1 mt-1">
                         <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
                           <span>Asignadas:</span>
                           <span className="font-black text-slate-800">{totalTasks}</span>
                         </div>
                         {pendingTasks > 0 && (
                           <div className="flex items-center justify-between text-[9px] text-slate-500">
                             <span className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Pendientes:</span>
                             <span className="font-bold text-amber-600">{pendingTasks}</span>
                           </div>
                         )}
                       </div>
                     ) : (
                       <span className="text-[9px] font-medium text-slate-400 italic block mt-1">Sin tareas agendadas</span>
                     )}
                   </div>
 
                   {/* Excepciones */}
        {/* Excepciones */}
                   <div className="space-y-3 pt-2 border-t border-slate-50">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Bloqueos</span>
                         <span className="text-[7px] font-black text-primary/30 px-1.5 py-0.5 bg-slate-50 rounded-md">{dayBlocks.length}</span>
                       </div>
                       {true && (
                         <button 
                           onClick={(e) => {
                             e.stopPropagation();
                             setNewBlock({
                               isRecurrente: false,
                               dias: [],
                               fecha: dateStr,
                               fechaInicio: dateStr,
                               fechaFin: dateStr,
                               inicio: '13:00',
                               fin: '14:00',
                               tipo: 'Almuerzo',
                               motivo: ''
                             });
                             setModalSource('card');
                             setIsExcepcionGroupMode(false);
                             setIsExcepcionModalOpen(true);
                           }}
                           className="p-1 hover:bg-accent/10 rounded-md text-accent transition-all group/add"
                         >
                           <Plus size={10} className="group-hover/add:scale-125 transition-transform" />
                         </button>
                       )}
                     </div>
 
                     <div className="space-y-2">
                       {dayBlocks.length > 0 ? (
                         dayBlocks.map(b => (
                           <div key={b.id} className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-1.5 group/item relative hover:border-accent/30 transition-all">
                             <div className="flex items-center justify-between">
                               <div className="flex items-center gap-1.5">
                                 <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                                 <span className="text-[8px] font-black text-slate-700 uppercase">{b.tipo}</span>
                               </div>
                                 <button 
                                   onClick={(e) => { e.stopPropagation(); deleteBloque(b.id); }} 
                                   className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1 rounded-md transition-all"
                                   title="Eliminar bloqueo"
                                 >
                                   <Trash2 size={10} />
                                 </button>
                             </div>
                             <div className="flex items-center gap-1.5">
                               <Clock size={9} className="text-slate-400" />
                               <span className="text-[9px] font-bold text-slate-500 tracking-tight">{b.hora_inicio} - {b.hora_fin}</span>
                             </div>
                           </div>
                         ))
                       ) : (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setNewBlock({
                                isRecurrente: false,
                                dias: [],
                                fecha: dateStr,
                                fechaInicio: dateStr,
                                fechaFin: dateStr,
                                inicio: '13:00',
                                fin: '14:00',
                                tipo: 'Almuerzo',
                                motivo: ''
                              });
                              setModalSource('card');
                              setIsExcepcionGroupMode(false);
                              setIsExcepcionModalOpen(true);
                            }}
                            className={`w-full py-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 transition-all opacity-40 hover:opacity-100 hover:border-slate-300 hover:bg-slate-50 hover:text-primary cursor-pointer`}
                            title={"Haz clic para añadir un bloqueo (ej. Almuerzo)"}
                          >
                            <span className="text-[7px] font-black text-inherit uppercase">
                              + Añadir bloqueo
                            </span>
                          </button>
                       )}
                     </div>
                   </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="latam-card !p-6 bg-white border border-slate-200 shadow-sm flex-1 flex flex-col min-h-[600px]">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white">
              <ListChecks size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Tablero Kanban de Backlog</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Gestión de flujo de trabajo operativo</p>
            </div>
          </div>
          
          {/* Botones de Creación */}
          <div className="flex items-center gap-3">
            {/* Nuevo botón IA desde cero */}
            <button 
              onClick={openCustomAiModal}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-lg shadow-emerald-600/20"
            >
              <Wand2 size={14} /> Nueva Tarea IA
            </button>
          </div>
        </div>

        {/* Tablero Kanban en Formato de 4 Columnas Verticales con Scroll Independiente */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-[580px] overflow-hidden pb-4">
          {PRIORITIES.map(priority => {
            const tasks = backlog.filter(t => t.prioridad === priority.value && !['resuelto', 'terminada', 'despriorizado', 'fallo', 'fallido'].includes(t.status));
            return (
              <div 
                key={priority.value} 
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, priority.value)}
                className="flex flex-col gap-4 bg-slate-50/40 p-4 rounded-[24px] border border-slate-100 shadow-sm h-[580px] overflow-hidden"
              >
                {/* Cabecera Superior de la Columna */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-white shadow-sm border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getPriorityColor(priority.value).hex }} />
                    <span className="text-[10px] font-black text-slate-800 tracking-wider">{priority.label}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>
 
                {/* Contenedor de Tareas Vertical con Scrollbar */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar pb-4">
                  {tasks.length > 0 ? (
                    tasks.map(task => {
                      const badge = getCardBadgeInfo(task);
                      const bgClass = getCardBgClass(task);
                      return (
                        <div 
                          key={task.id} 
                          draggable
                          onDragStart={e => handleDragStart(e, task.id)}
                          onClick={() => { setEditingTask(task); setOriginalPriority(task.prioridad); setJustificationText(''); setIsModalOpen(true); }}
                          className={`w-full p-4 rounded-2xl border shadow-sm transition-all group/card relative cursor-pointer active:scale-95 flex flex-col gap-2 ${bgClass}`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">#{getTaskCode(task)}</span>
                            <div className="flex gap-1.5">
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase border ${getStatusColor(task.status || 'pendiente').badge} ${getStatusColor(task.status || 'pendiente').badgeBorder}`}>
                                {getStatusColor(task.status || 'pendiente').label}
                              </span>
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase border ${badge.classes}`}>
                                {badge.label}
                              </span>
                            </div>
                          </div>
                          <p className="text-[12px] font-black text-slate-800 uppercase tracking-tight leading-snug">{task.actividad}</p>
                          
                          {task.is_collaborative ? (
                            <div className="flex items-center gap-1.5 py-1 px-2 bg-amber-50 border border-amber-200 rounded-lg w-fit">
                              <Users size={10} className="text-amber-600" />
                              <span className="text-[7px] font-black text-amber-600 uppercase tracking-widest">Grupal</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 py-1 px-2 bg-emerald-50 border border-emerald-200 rounded-lg w-fit">
                              <User size={10} className="text-emerald-600" />
                              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Individual</span>
                            </div>
                          )}

                          <div className="flex justify-between items-end mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[8px] font-bold text-slate-400">{task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteBacklog(task.id); }} className="text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all p-1"
                            title="Eliminar tarea del backlog">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full flex flex-col items-center justify-center opacity-40 py-12 border-2 border-dashed border-slate-200 rounded-2xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Sin tareas en esta prioridad</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ARCHIVO DE BACKLOG */}
      <div className="latam-card !p-8 bg-white border border-slate-200 shadow-xl rounded-[40px] mt-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shadow-inner">
              <Archive size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Archivo de Backlog</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Historial de tareas finalizadas</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
            <input 
              type="text" 
              placeholder="Buscar en archivo..." 
              value={archiveSearch}
              onChange={e => { setArchiveSearch(e.target.value); setArchivePage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none focus:border-slate-400"
            />
            <select 
              value={archiveTimeFilter}
              onChange={e => { setArchiveTimeFilter(e.target.value); setArchivePage(1); }}
              className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-700 outline-none"
            >
              <option value="all">Todo el Historial</option>
              <option value="7">Últimos 7 días</option>
              <option value="30">Últimos 30 días</option>
            </select>
            <button 
              onClick={handlePurgeClosedBacklog}
              className="px-4 py-2 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2"
            >
              <Trash2 size={14} /> Purgar Archivo
            </button>
          </div>
        </div>

        {(() => {
          const archivedTasks = backlog.filter(t => {
            const isCompleted = ['resuelto', 'terminada', 'despriorizado', 'fallo', 'fallido'].includes(t.status);
            if (!isCompleted) return false;

            if (archiveSearch.trim()) {
              const query = archiveSearch.toLowerCase();
              const activityMatch = t.actividad.toLowerCase().includes(query);
              const areaMatch = t.area ? t.area.toLowerCase().includes(query) : false;
              if (!activityMatch && !areaMatch) return false;
            }

            if (archiveTimeFilter !== 'all') {
              const daysLimit = Number(archiveTimeFilter);
              const createdDate = t.created_at ? new Date(t.created_at) : new Date();
              const diffTime = Math.abs(new Date().getTime() - createdDate.getTime());
              const diffDays = diffTime / (1000 * 60 * 60 * 24);
              if (diffDays > daysLimit) return false;
            }

            return true;
          });

          const totalPages = Math.ceil(archivedTasks.length / archiveItemsPerPage);
          const paginatedTasks = archivedTasks.slice((archivePage - 1) * archiveItemsPerPage, archivePage * archiveItemsPerPage);

          return (
            <div className="space-y-4">
              {paginatedTasks.length > 0 ? (
                <div className="space-y-3">
                  {paginatedTasks.map(task => {
                    return (
                      <div 
                        key={task.id} 
                        className="bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
                      >
                        <div className="flex items-start sm:items-center gap-4 flex-1">
                          <div className="flex flex-col gap-1.5 min-w-[100px]">
                            <span className={`text-[7px] font-black px-2 py-1 rounded-md uppercase text-center border ${getStatusColor(task.status).badge} ${getStatusColor(task.status).badgeBorder}`}>
                              {getStatusColor(task.status).label}
                            </span>
                            <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase text-center ${getPriorityColor(task.prioridad).badge}`}>
                              {getPriorityColor(task.prioridad).label}
                            </span>
                          </div>

                          <div className="flex-1">
                            <h5 className="text-[11px] font-bold text-slate-800 leading-snug">{task.actividad}</h5>
                            <div className="flex items-center gap-2 mt-1.5">
                              <span className="text-[8px] font-bold bg-white text-slate-400 px-2 py-0.5 rounded border border-slate-100 uppercase">{task.area || 'Gral'}</span>
                              <span className="text-[8px] text-slate-400">ID: #{getTaskCode(task)}</span>
                              <span className="text-[8px] text-slate-400">•</span>
                              <span className="text-[8px] text-slate-400">Creado: {task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}</span>
                              {task.justificacion && (
                                <>
                                  <span className="text-[8px] text-slate-400">•</span>
                                  <span className="text-[8px] text-rose-500 font-medium">Justificación: {task.justificacion}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botones de acción */}
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleRestoreBacklog(task.id)}
                            className="px-4 py-2 border border-slate-200 hover:border-primary/30 hover:bg-primary/5 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5"
                            title="Restaurar al backlog activo"
                          >
                            <ArrowRight size={12} className="rotate-180" /> Restaurar
                          </button>
                          <button 
                            onClick={() => deleteBacklog(task.id)}
                            className="p-2 border border-slate-200 hover:border-red-500 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"
                            title="Eliminar permanentemente"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2 opacity-50">
                  <Archive size={24} className="text-slate-400" />
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sin actividades archivadas</p>
                </div>
              )}

              {/* Paginación */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400">
                    Página {archivePage} de {totalPages} ({archivedTasks.length} tareas en total)
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setArchivePage(prev => Math.max(prev - 1, 1))}
                      disabled={archivePage === 1}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Anterior
                    </button>
                    <button
                      onClick={() => setArchivePage(prev => Math.min(prev + 1, totalPages))}
                      disabled={archivePage === totalPages}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })()}
      </div>
      </>
    </div>
  );
}
