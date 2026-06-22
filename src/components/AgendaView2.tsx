import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, AlertTriangle, Calendar as CalendarIcon, Save, PlusCircle, Clock, Tag, X, Loader2, Link as LinkIcon, Paperclip, Plus, Trash2, BrainCircuit, Activity, TrendingUp, BarChart3, CheckCircle, Zap, ListChecks, RefreshCw, User, Users } from 'lucide-react';
import { getStatusColor, getPriorityColor } from '../utils/colors';

interface Task {
  id: number;
  actividad: string;
  prioridad: number;
  completada: boolean;
  estado_ejecucion: string;
  hallazgos: string;
  justificacion: string;
  evidencia?: string;
  area?: string | null;
  hora_inicio_plan?: string;
  hora_fin_plan?: string;
  tiempo_asignado_minutos?: number;
  tiempo_invertido_minutos?: number;
  backlog_id?: number;
  created_at?: string;
  is_collaborative?: boolean;
}

interface Plan {
  date: string;
  hora_inicio: string;
  hora_fin: string;
  horas_efectivas: number;
  estado_cierre: number;
  ejecucion_iniciada: number;
  hora_inicio_ejecucion: string | null;
}

interface Incidencia {
  id?: number;
  fecha: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

interface Bloque {
  id: number;
  fecha: string | null;
  dia_semana: string | null;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}


const EXECUTED_STATUSES = ['en espera', 'en curso', 'en estudio', 'terminada', 'despriorizada'];

const getFirstTime = (timeStr: string | undefined) => {
  if (!timeStr) return '--:--';
  try {
    const parsed = JSON.parse(timeStr);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
  } catch (e) {}
  return timeStr;
};

const getAge = (createdAt: string | undefined): string => {
  if (!createdAt) return '';
  try {
    const created = new Date(createdAt.includes('T') ? createdAt : createdAt + 'T00:00:00');
    if (isNaN(created.getTime())) return '';
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (isNaN(diffMins)) return '';
    if (diffMins < 1) return 'ahora';
    if (diffMins < 60) return `${diffMins}m`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 30) return `${diffDays}d`;
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths}mes`;
  } catch {
    return '';
  }
};

function TaskCard({ task, isClosed, updateTask, getFirstTime, onOpenDetails }: { 
  task: Task, 
  isClosed: boolean, 
  updateTask: (id: number, updates: Partial<Task>) => Promise<void>,
  getFirstTime: (timeStr: string | undefined) => string,
  onOpenDetails: (task: Task) => void
}) {
  const sc = getStatusColor(task.estado_ejecucion);
  const pc = getPriorityColor(task.prioridad);
  const isDone = task.estado_ejecucion === 'resuelto' || task.estado_ejecucion === 'terminada';

  return (
    <motion.div 
      layout
      className={`rounded-[24px] border ${sc.cardBorder} ${sc.cardBg} hover:shadow-xl transition-all duration-300 flex flex-col p-5 gap-4 relative group shadow-sm overflow-hidden`}
    >
      {/* Barra lateral de estado (color del status) */}
      <div className={`absolute top-0 left-0 w-1.5 h-full ${sc.accent}`} />

      <div className="flex items-start justify-between ml-1">
        <div className="flex flex-wrap gap-1.5">
          {/* Priority badge */}
          <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-sm ${pc.badge}`}>
            {pc.label}
          </span>
          {/* Status badge */}
          <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase border shadow-sm ${sc.badge} ${sc.badgeBorder}`}>
            {sc.label}
          </span>
          {/* Colaborativo badge */}
          <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-sm flex items-center gap-1 ${task.is_collaborative ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'}`}>
            {task.is_collaborative ? <Users size={10} /> : <User size={10} />}
            {task.is_collaborative ? 'Grupal' : 'Individual'}
          </span>
          {task.area && (
            <span className="text-[8px] font-black text-slate-500 bg-white px-2 py-1 rounded-lg uppercase border border-slate-100 shadow-sm">{task.area}</span>
          )}
        </div>
        <div className={`transition-all duration-500 ${isDone ? 'text-[#858585] scale-110' : 'text-slate-200'}`}>
          {isDone ? <CheckCircle2 size={20} /> : <Circle size={20} />}
        </div>
      </div>

      <div className="flex-1 min-h-[44px] ml-1 relative">
        <h4 className={`text-[13px] font-black leading-tight line-clamp-2 transition-all ${isDone ? 'text-slate-400' : 'text-slate-700'}`}>
          {task.actividad}
        </h4>
        {isDone && (
          <div className="absolute -right-2 -bottom-2 opacity-10 pointer-events-none select-none">
             <span className="text-4xl font-black text-[#858585] rotate-[-12deg] block">DONE</span>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mt-auto pt-3 border-t border-slate-50/50 ml-1">
        <div className="flex items-center gap-2">
          {task.hora_inicio_plan && (
            <div className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5 bg-white/50 px-2 py-1 rounded-lg border border-slate-50">
              <Clock size={12} className="text-slate-300" /> {getFirstTime(task.hora_inicio_plan)}
            </div>
          )}
          {task.created_at && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-100 px-2 py-1 rounded-lg" title={`Creado: ${task.created_at}`}>
              <span className="text-[9px] font-black text-slate-300">hace</span>
              <span className="text-[9px] font-black text-slate-500">{getAge(task.created_at)}</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex -space-x-1">
            {task.hallazgos && <div className="w-2.5 h-2.5 rounded-full bg-primary border-2 border-white shadow-sm" title="Hallazgos" />}
            {task.evidencia && <div className="w-2.5 h-2.5 rounded-full bg-blue-400 border-2 border-white shadow-sm" title="Evidencias" />}
            {task.justificacion && <div className="w-2.5 h-2.5 rounded-full bg-red-400 border-2 border-white shadow-sm" title="Justificación" />}
          </div>
          
          <button 
            onClick={() => onOpenDetails(task)}
            className={`p-2.5 transition-all rounded-2xl shadow-lg hover:scale-110 active:scale-95 ${
              isDone ? 'bg-[#858585] text-white shadow-gray-100' : 'bg-slate-900 text-white shadow-slate-200'
            }`}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function IncidentCard({ incident, onDelete }: { incident: Incidencia; onDelete?: () => void }) {
  return (
    <motion.div 
      layout
      className="bg-gradient-to-br from-amber-50/50 to-white rounded-[24px] border border-amber-100 shadow-sm hover:shadow-xl transition-all duration-300 p-5 flex flex-col gap-4 relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <AlertTriangle size={60} className="text-amber-500" />
      </div>

      <div className="flex items-start justify-between">
        <span className="text-[8px] font-black px-2 py-1 rounded-lg uppercase bg-amber-500 text-white shadow-md shadow-amber-100 flex items-center gap-1.5">
          <AlertTriangle size={10} /> {incident.tipo}
        </span>
        <div className="text-[10px] font-black text-amber-600 bg-amber-100/50 px-2 py-1 rounded-lg flex items-center gap-1.5">
          <Clock size={12} /> {incident.hora_inicio} - {incident.hora_fin}
        </div>
      </div>

      <div className="flex-1">
        <h4 className="text-[13px] font-black leading-tight text-amber-900 line-clamp-3">
          {incident.descripcion}
        </h4>
      </div>

      <div className="mt-auto pt-3 border-t border-amber-100 flex items-center justify-between">
        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Actividad No Planificada</span>
        <div className="flex items-center gap-2">
          {onDelete && (
            <button 
              onClick={(e) => { e.stopPropagation(); onDelete(); }} 
              className="text-amber-600/60 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-all"
              title="Eliminar actividad no planificada"
            >
              <Trash2 size={12} />
            </button>
          )}
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}

function BlockCard({ block }: { block: Bloque }) {
  return (
    <motion.div 
      layout
      className="bg-slate-50 rounded-[24px] border border-slate-200/50 shadow-sm hover:shadow-md transition-all duration-300 p-5 flex flex-col gap-4 relative overflow-hidden group border-dashed"
    >
      <div className="absolute top-0 right-0 p-4 opacity-5">
        <Clock size={60} className="text-slate-400" />
      </div>

      <div className="flex items-start justify-between">
        <span className="text-[8px] font-black px-2 py-1 rounded-lg uppercase bg-slate-200 text-slate-500 shadow-sm flex items-center gap-1.5">
          <Clock size={10} /> BLOQUE OPERATIVO
        </span>
        <div className="text-[10px] font-black text-slate-500 bg-white border border-slate-100 px-2 py-1 rounded-lg flex items-center gap-1.5">
           {block.hora_inicio} - {block.hora_fin}
        </div>
      </div>

      <div className="flex-1">
        <h4 className="text-[13px] font-black leading-tight text-slate-600">
          {block.tipo}
        </h4>
        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Sincronizado de Centro de Módulo</p>
      </div>

      <div className="mt-auto pt-3 border-t border-slate-200/50 flex items-center justify-between">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Reserva de Tiempo</span>
        <div className="flex gap-1">
          <div className="w-2 h-2 rounded-full bg-slate-300" />
        </div>
      </div>
    </motion.div>
  );
}

export default function AgendaView2({ onNavigate, selectedDate, setSelectedDate }: { 
  onNavigate?: (view: any) => void,
  selectedDate: string,
  setSelectedDate: (date: string) => void
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [backlog, setBacklog] = useState<any[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const [weeklyTrend, setWeeklyTrend] = useState<{ day: string, percentage: number }[]>([]);
  const [weeklyOperativo, setWeeklyOperativo] = useState({ avgPercentage: 0, totalMinutes: 0 });
  const [reincidenciaPattern, setReincidenciaPattern] = useState<'green' | 'yellow' | 'red'>('green');
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  
  const [isClosing, setIsClosing] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<Incidencia>>({
    tipo: 'Reunión',
    hora_inicio: '',
    hora_fin: '',
    descripcion: ''
  });
  
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isPast = selectedDate < new Date().toISOString().split('T')[0];
  const isClosed = plan?.estado_cierre === 1;
  const isExecutionStarted = plan?.ejecucion_iniciada === 1;

  const calculateTimeInfo = () => {
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    let usedHours = 0;
    tasks.forEach(t => {
      const baseHours = (t.tiempo_asignado_minutos !== undefined && t.tiempo_asignado_minutos !== null && t.tiempo_asignado_minutos > 0)
        ? (t.tiempo_asignado_minutos / 60)
        : (weights[t.prioridad] || 1);
      const status = (t.estado_ejecucion || 'nuevo').toLowerCase();
      
      if (status === 'nuevo' || status === 'abierto' || status === 'en curso' || status === 'en estudio') {
        usedHours += baseHours; // Trabajo Activo o Planeado: 100% carga
      } else if (status === 'en espera') {
        usedHours += baseHours * 0.5; // Bloqueado: Libera el 50% para permitir rotación
      } else if (status === 'resuelto' || status === 'terminada') {
        // Usa tiempo invertido si existe (convertido a horas), sino asume 30 min por defecto
        usedHours += (t.tiempo_invertido_minutos !== undefined && t.tiempo_invertido_minutos !== null && t.tiempo_invertido_minutos > 0)
          ? (t.tiempo_invertido_minutos / 60)
          : 0.5; 
      }
      // Despriorizado y Fallido consumen 0 horas
    });

    const safeStart = plan?.hora_inicio || '08:00';
    const safeEnd = plan?.hora_fin || '17:00';
    const [startH, startM] = safeStart.split(':').map(Number);
    const [endH, endM] = safeEnd.split(':').map(Number);
    let availableHours = (endH + (endM || 0) / 60) - (startH + (startM || 0) / 60);

    bloques.forEach(b => {
      const [bh1, bm1] = b.hora_inicio.split(':').map(Number);
      const [bh2, bm2] = b.hora_fin.split(':').map(Number);
      const duration = (bh2 + (bm2 || 0) / 60) - (bh1 + (bm1 || 0) / 60);
      availableHours -= duration;
    });

    if (isNaN(availableHours) || availableHours < 0) availableHours = 8.0;

    return { 
      usedHours, 
      availableHours, 
      remainingHours: availableHours - usedHours,
      percentage: availableHours > 0 ? (usedHours / availableHours) * 100 : 0
    };
  };

  const timeInfo = calculateTimeInfo();

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  useEffect(() => {
    if (!loading) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userId = Number(localStorage.getItem('atenea_user_id') || 1);
      const res = await fetch(`/api/tareas?userId=${userId}&fecha=${selectedDate}&_t=${Date.now()}`);
      const data = await res.json();
      const tasksList = Array.isArray(data.tasks) ? data.tasks : [];
      setTasks(tasksList.map((t: any) => ({
        ...t,
        completada: t.completada === 1,
        estado_ejecucion: t.estado_ejecucion || 'en espera'
      })));
      setPlan(data.plan || null);
      
      try {
        const backlogRes = await fetch(`/api/backlog?userId=${userId}&_t=${Date.now()}`);
        const backlogData = await backlogRes.json();
        setBacklog(Array.isArray(backlogData) ? backlogData : []);
      } catch (e) {
        console.error("Error fetching backlog in AgendaView2:", e);
      }
      
      const incRes = await fetch(`/api/incidencias?fecha=${selectedDate}&_t=${Date.now()}`);
      const incData = await incRes.json();
      setIncidencias(Array.isArray(incData) ? incData : []);

      const bloqRes = await fetch(`/api/bloques?_t=${Date.now()}`);
      const bloqData = await bloqRes.json();
      
      // Filtrar bloques por fecha específica o día de la semana
      const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
      const currentDayName = dayNames[new Date(selectedDate + 'T12:00:00').getDay()];
      
      const filteredBloques = Array.isArray(bloqData) ? bloqData.filter((b: Bloque) => {
        if (b.descripcion && b.descripcion.startsWith("Incidencia: ")) return false;
        if (b.fecha === selectedDate) return true;
        if (b.dia_semana === currentDayName) return true;
        return false;
      }) : [];
      setBloques(filteredBloques);

      // --- Lógica de Dashboard Integrada (Tendencia Semanal) ---
      const anchorDate = new Date(selectedDate + 'T00:00:00');
      const EXECUTED_STATUSES = ['en espera', 'en curso', 'en estudio', 'terminada', 'despriorizada'];
      
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(anchorDate);
        d.setDate(anchorDate.getDate() - i);
        last7Days.push(d.toISOString().split('T')[0]);
      }

      const historyData = await Promise.all(
        last7Days.map(async (dStr) => {
          const userId = Number(localStorage.getItem('atenea_user_id') || 1);
          const tRes = await fetch(`/api/tareas?userId=${userId}&fecha=${dStr}&_t=${Date.now()}`);
          const tData = await tRes.json();
          const dayTasks: any[] = tData.tasks || [];
          
          const pTotal = dayTasks.reduce((acc, t) => acc + (Number(t.prioridad) || 0), 0);
          const pCompletado = dayTasks.reduce((acc, t) => {
            const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
            return acc + (isExecuted ? (Number(t.prioridad) || 0) : 0);
          }, 0);
          
          const iRes = await fetch(`/api/incidencias?fecha=${dStr}&_t=${Date.now()}`);
          const dayInc: any[] = await iRes.json();
          const opMins = dayInc.reduce((acc, inc) => {
            const [h1, m1] = inc.hora_inicio.split(':').map(Number);
            const [h2, m2] = inc.hora_fin.split(':').map(Number);
            return acc + ((h2 * 60 + m2) - (h1 * 60 + m1));
          }, 0);

          return {
            percentage: pTotal > 0 ? (pCompletado / pTotal) * 100 : 0,
            opMins
          };
        })
      );

      const avgStrat = historyData.reduce((acc, h) => acc + h.percentage, 0) / 7;
      const totalOpMins = historyData.reduce((acc, h) => acc + h.opMins, 0);
      
      setWeeklyTrend(historyData.map((h, i) => ({ day: last7Days[i], percentage: h.percentage })));
      setWeeklyOperativo({ 
        avgPercentage: Math.round(avgStrat), 
        totalMinutes: totalOpMins 
      });
      setReincidenciaPattern(avgStrat > 70 ? 'green' : avgStrat > 40 ? 'yellow' : 'red');

    } catch (error) {
      console.error("Error fetching integrated dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIncident = async () => {
    if (!newIncident.descripcion || !newIncident.hora_inicio || !newIncident.hora_fin) {
      window.alert?.('Por favor, completa todos los campos de la incidencia.');
      return;
    }

    const res = await fetch('/api/incidencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newIncident,
        fecha: selectedDate
      }),
    });

    if (res.ok) {
      setShowIncidentModal(false);
      setNewIncident({
        tipo: 'Almuerzo',
        hora_inicio: '',
        hora_fin: '',
        descripcion: ''
      });
      fetchData();
    }
  };

  const deleteIncident = async (id: number) => {
    if (!window.confirm?.('¿Estás seguro de que deseas eliminar esta actividad no planificada?')) {
      return;
    }
    const res = await fetch(`/api/incidencias/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    const res = await fetch(`/api/tareas/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      // If this was the first completion, we need to refresh the plan to get the execution status
      if (updates.completada === true && !isExecutionStarted) {
        fetchData();
      } else {
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
      }
    }
  };

  const handleFinishDay = async () => {
    console.log('Finalizando día para:', selectedDate, 'Tareas:', tasks.length);
    
    const missingInfo = tasks.filter(t => {
      const status = t.estado_ejecucion || 'en espera';
      
      // Regla 1: Hallazgos obligatorios para Espera, Curso, Estudio, Listo
      const needsHallazgos = ['en espera', 'en curso', 'en estudio', 'terminada'].includes(status);
      if (needsHallazgos && (!t.hallazgos || t.hallazgos.trim() === "")) return true;

      // Regla 2: Justificación obligatoria para Despriorizado y Fallo
      const needsJustificacion = ['despriorizada', 'no realizado'].includes(status);
      if (needsJustificacion && (!t.justificacion || t.justificacion.trim() === "")) return true;

      return false;
    });

    if (missingInfo.length > 0) {
      setErrorCierre(`Falta información obligatoria (Hallazgos o Justificación) en ${missingInfo.length} tarea(s).`);
      return;
    }

    setIsClosing(true);
    setErrorCierre(null);
    try {
      // Save all tasks to ensure everything is persisted
      // We use a single batch update or individual updates
      for (const task of tasks) {
        const res = await fetch(`/api/tareas/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            estado_ejecucion: task.estado_ejecucion,
            hallazgos: task.hallazgos,
            justificacion: task.justificacion,
            evidencia: task.evidencia
          }),
        });
        if (!res.ok) throw new Error(`Error al guardar la tarea: ${task.actividad}`);
      }

      // Formal closure
      const closureRes = await fetch('/api/plan-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          estado_cierre: 1
        }),
      });

      if (!closureRes.ok) throw new Error('Error al cerrar el plan diario');

      await fetchData();
      alert('¡Turno finalizado con éxito! Puedes seleccionar el siguiente día en el calendario superior.');
    } catch (error) {
      console.error('Error al finalizar el día:', error);
      setErrorCierre(error instanceof Error ? error.message : 'Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.');
    } finally {
      setIsClosing(false);
    }
  };

  const handleReopenDay = async () => {
    let justification = window.prompt("Por favor, escribe una justificación para reabrir este turno (Requerido):");
    if (justification === null || !justification.trim()) {
      justification = "Reapertura solicitada por el usuario";
    }

    setIsClosing(true);
    setErrorCierre(null);
    try {
      const res = await fetch('/api/plan-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          estado_cierre: 0,
          justificacion_reapertura: justification.trim()
        }),
      });

      if (!res.ok) throw new Error('Error al reabrir el plan diario');
      
      await fetchData();
      alert("✅ Turno reabierto con éxito. Ya puedes realizar modificaciones.");
    } catch (error) {
      console.error('Error al reabrir el día:', error);
      setErrorCierre(error instanceof Error ? error.message : 'Hubo un error al reabrir el turno.');
    } finally {
      setIsClosing(false);
    }
  };

  // Cálculos Estratégicos
  const pesoTotal = tasks.reduce((acc, t) => acc + (Number(t.prioridad) || 0), 0);
  const pesoCompletado = tasks.reduce((acc, t) => {
    const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
    return acc + (isExecuted ? (Number(t.prioridad) || 0) : 0);
  }, 0);
  const porcentajeEstrategico = pesoTotal > 0 ? Math.round((pesoCompletado / pesoTotal) * 100) : 0;
  const floatingPendingCount = backlog.filter(t => t.status === 'pendiente' || t.status === 'nuevo').length;
  const floatingWaitingCount = backlog.filter(t => t.status === 'en espera').length;

  // Resumen por nivel
  const stats = {
    criticas: { done: 0, total: 0 },
    altas: { done: 0, total: 0 },
    medias: { done: 0, total: 0 },
    operativos: { total: bloques.length }
  };

  tasks.forEach(t => {
    const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
    if (t.prioridad === 10) {
      stats.criticas.total++;
      if (isExecuted) stats.criticas.done++;
    } else if (t.prioridad === 7) {
      stats.altas.total++;
      if (isExecuted) stats.altas.done++;
    } else if (t.prioridad === 4) {
      stats.medias.total++;
      if (isExecuted) stats.medias.done++;
    }
  });

  const hasCriticalPending = stats.criticas.total > stats.criticas.done;

  // Cálculos de tiempo
  const plannedTimeMins = tasks.reduce((acc, t) => acc + (t.tiempo_asignado_minutos || 0), 0);
  const availableTimeMins = plan ? Math.round(plan.horas_efectivas * 60) : 0;
  const unplannedTimeMins = availableTimeMins - plannedTimeMins;

  const lastTaskEndTime = (() => {
    if (tasks.length === 0) return null;
    const endTimes = tasks.map(t => {
      if (!t.hora_fin_plan) return null;
      try {
        const parsed = JSON.parse(t.hora_fin_plan);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed[parsed.length - 1];
        }
        return t.hora_fin_plan;
      } catch (e) {
        return t.hora_fin_plan;
      }
    }).filter(Boolean) as string[];
    
    if (endTimes.length === 0) return null;
    return endTimes.sort().reverse()[0];
  })();

  const roundedUnplanned = Math.floor(unplannedTimeMins / 15) * 15;
  const showUnplannedWarning = roundedUnplanned >= 15 && (!lastTaskEndTime || lastTaskEndTime < (plan?.hora_fin || '17:00'));

  const formatTime = (totalMinutes: number) => {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const hPart = hours > 0 ? `${hours}h` : '';
    const mPart = minutes > 0 ? `${minutes}m` : '';
    return `${hPart} ${mPart}`.trim();
  };

  const getLecturaSemanal = () => {
    const avg = weeklyOperativo.avgPercentage;
    if (avg >= 80) return { text: "Semana con alta disciplina.", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: <CheckCircle size={18} />, status: "green" };
    if (avg >= 50) return { text: "Semana con riesgo estratégico.", color: "text-amber-600", bg: "bg-amber-50", icon: <AlertTriangle size={18} />, status: "yellow" };
    return { text: "Semana crítica. Baja ejecución.", color: "text-accent", bg: "bg-accent/5", icon: <Zap size={18} />, status: "red" };
  };

  const lecturaSemanal = getLecturaSemanal();

  let strategicStatus = { 
    text: "En progreso estratégico", 
    color: "text-amber-600", 
    bg: "bg-amber-50", 
    bar: "bar-warning",
    icon: "🟠"
  };

  if (hasCriticalPending) {
    strategicStatus = { 
      text: "Riesgo estratégico activo", 
      color: "text-accent", 
      bg: "bg-accent/5", 
      bar: "bar-operational",
      icon: "🔴"
    };
  } else if (porcentajeEstrategico >= 70) {
    strategicStatus = { 
      text: "Buen equilibrio estratégico", 
      color: "text-[#7DA81A]", 
      bg: "bg-[#7DA81A]/5", 
      bar: "bar-strategic",
      icon: "🟢"
    };
  } else if (porcentajeEstrategico < 50) {
    strategicStatus = { 
      text: "Enfoque operativo dominante", 
      color: "text-amber-600", 
      bg: "bg-amber-50", 
      bar: "bar-warning",
      icon: "🟠"
    };
  }

  // --- Cálculo de Distribución Operativa ---
  const bloquesDist = bloques.reduce((acc: Record<string, number>, b) => {
    const [h1, m1] = b.hora_inicio.split(':').map(Number);
    const [h2, m2] = b.hora_fin.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    acc[b.tipo] = (acc[b.tipo] || 0) + mins;
    return acc;
  }, {});

  return (
    <div className="space-y-8 pb-20">
      {/* Header con Distribución de Tiempos */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
        <div className="flex flex-col md:flex-row md:items-center gap-8">
           <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-2xl text-primary">
                 <CalendarIcon size={28} />
              </div>
              <div>
                 <h2 className="text-3xl font-black text-slate-900 tracking-tight">Agenda de Operaciones</h2>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
                    {new Date(selectedDate + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                 </p>
              </div>
           </div>

           {/* Cuadro de Distribución Resumen */}
           <div className="flex flex-wrap gap-3 p-1">
              {Object.entries(bloquesDist).map(([tipo, mins]) => (
                <div key={tipo} className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-100 shadow-sm transition-all hover:shadow-md hover:scale-105">
                   <div className={`w-2 h-2 rounded-full ${
                     tipo === 'Almuerzo' ? 'bg-amber-400' : 
                     tipo === 'Reunión' ? 'bg-blue-400' : 
                     tipo === 'Centro de Módulo' ? 'bg-purple-400' : 'bg-slate-400'
                   }`} />
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{tipo}</span>
                   <span className="text-xs font-black text-slate-700">{Math.round((mins / ((plan?.horas_efectivas || 6.0) * 60)) * 100)}%</span>
                </div>
              ))}
           </div>
        </div>
        
        <div className="flex items-center gap-4 bg-white p-2 rounded-[24px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="flex items-center text-slate-400 px-3">
            <CalendarIcon size={18} className="mr-2" />
            <span className="text-[10px] font-black uppercase tracking-widest">Cambiar Fecha:</span>
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 rounded-xl border-none outline-none focus:ring-0 text-sm font-black text-slate-700 bg-slate-50"
          />
          <button 
            onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
            className="mr-2 px-3 py-1.5 bg-primary text-white text-[9px] font-black rounded-lg hover:bg-primary-soft transition-all uppercase tracking-widest shadow-sm"
          >
            Hoy
          </button>
        </div>
      </div>

      {isClosed && (
        <div className="bg-[#7DA81A]/10 border border-[#7DA81A]/20 text-[#7DA81A] px-6 py-4 rounded-[24px] flex items-center shadow-sm">
          <CheckCircle2 size={24} className="mr-3" />
          <span className="font-bold">Turno finalizado correctamente. Todas las actividades han sido registradas.</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-20">
           <Loader2 className="animate-spin mx-auto text-primary mb-4" size={40} />
           <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Cargando Plan de Operaciones...</p>
        </div>
      ) : (
        <div className="space-y-10">
          {/* Resumen Estratégico Compacto */}
          <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-2xl shadow-slate-200/40 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impacto Estratégico</span>
                <span className="text-4xl font-black text-primary">{porcentajeEstrategico}%</span>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden md:block" />
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanque de Energía</span>
                <div className="flex items-baseline gap-1">
                  <span className={`text-2xl font-black ${timeInfo.remainingHours > 1 ? 'text-emerald-500' : 'text-amber-500'}`}>
                    {Math.max(0, Math.round(100 - timeInfo.percentage))}%
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">libre</span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden md:block" />
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Críticas</span>
                  <span className="text-sm font-black text-slate-700">{stats.criticas.done}/{stats.criticas.total}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Altas</span>
                  <span className="text-sm font-black text-slate-700">{stats.altas.done}/{stats.altas.total}</span>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-100 hidden md:block" />
              <div className="flex gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flotantes (Pendiente)</span>
                  <span className="text-sm font-black text-primary text-center">{floatingPendingCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Flotantes (Espera)</span>
                  <span className="text-sm font-black text-primary text-center">{floatingWaitingCount}</span>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-[220px] flex flex-col justify-center">
              <div className="flex justify-between items-center mb-2">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Carga Diaria
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {timeInfo.percentage > 100 ? (
                      <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-1">
                        <AlertTriangle size={12}/> Sobrecarga
                      </span>
                    ) : timeInfo.percentage < 85 ? (
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
                    {Math.round(timeInfo.percentage)}%
                  </span>
                </div>
              </div>
              
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, timeInfo.percentage)}%` }}
                  className={`h-full rounded-full transition-all duration-1000 ${
                    timeInfo.percentage > 100 ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 
                    timeInfo.percentage < 85 ? 'bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.4)]' : 
                    'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
                  }`}
                />
              </div>

              <div className="mt-1.5 flex justify-end">
                <span className={`text-[8px] font-bold uppercase tracking-wider ${
                  timeInfo.percentage > 100 ? 'text-rose-500' : 'text-primary'
                }`}>
                  {tasks.length === 0 
                    ? 'DÍA INACTIVO. NINGUNA ACTIVIDAD PLANIFICADA 🌴'
                    : timeInfo.percentage > 100 
                    ? '¡Ánimo, un paso a la vez! Tú puedes 💪' 
                    : timeInfo.percentage < 85 
                    ? '¡Aún tienes energía! ¿Te animas a tomar otra tarea? 🚀' 
                    : '¡Carga óptima! Estás en tu mejor momento 🎯'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {!isClosed && (
                <button
                  onClick={() => setShowIncidentModal(true)}
                  className="flex items-center gap-2 px-5 py-3.5 bg-amber-500 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-amber-600 active:scale-95 transition-all shadow-lg shadow-amber-100"
                >
                  <PlusCircle size={16} />
                  Rompe Agenda
                </button>
              )}
              {tasks.length === 0 ? (
                <div className="flex items-center gap-2 px-6 py-3.5 bg-slate-100 border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest cursor-default">
                  Día Inactivo
                </div>
              ) : (
                <button 
                  onClick={isClosed ? handleReopenDay : handleFinishDay}
                  disabled={isClosing}
                  className={`flex items-center gap-2 px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg hover:scale-105 active:scale-95 ${
                    isClosed 
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/20' 
                      : 'bg-slate-900 hover:bg-black text-white'
                  }`}
                >
                  {isClosing ? <Loader2 className="animate-spin" size={18} /> : (isClosed ? <RefreshCw size={14} /> : <Save size={18} />)}
                  {isClosed ? 'Turno Cerrado (Reabrir)' : 'Turno Sin Cerrar (Finalizar)'}
                </button>
              )}
            </div>
          </div>
          
          {errorCierre && (
            <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-600 rounded-2xl flex items-start gap-3 shadow-sm animate-in fade-in slide-in-from-top-2">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <p className="text-xs font-bold leading-relaxed">{errorCierre}</p>
            </div>
          )}

          {/* Layout principal: Grid de tareas + Sidebar derecha */}
          <div className="flex gap-6 items-start">
            {/* Grid de tareas (solo tareas, sin bloques ni incidencias) */}
            <div className="flex-1 min-w-0">
              {tasks.length === 0 ? (
                <div className="bg-white rounded-[40px] border border-slate-100 p-20 text-center shadow-xl shadow-slate-100/50">
                  <p className="text-slate-400 font-black text-xs uppercase tracking-widest">No hay actividades para esta fecha.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[...tasks]
                    .sort((a, b) => (b.prioridad || 0) - (a.prioridad || 0))
                    .map((task) => (
                      <TaskCard 
                        key={task.id} 
                        task={task} 
                        isClosed={isClosed} 
                        updateTask={updateTask}
                        getFirstTime={getFirstTime}
                        onOpenDetails={(t) => setEditingTask(t)}
                      />
                    ))}
                </div>
              )}
            </div>

            {/* Sidebar derecha: Excepciones + Tiempo No Planificado */}
            {(bloques.length > 0 || incidencias.length > 0) && (
              <div className="w-64 shrink-0 flex flex-col gap-5">

                {/* Sección: Excepción */}
                {bloques.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-slate-300" />
                      Excepción
                    </h4>
                    <div className="flex flex-col gap-2">
                      {bloques.map((block, idx) => (
                        <div key={`sb-block-${idx}`} className="bg-slate-50 border border-slate-200/60 border-dashed rounded-2xl px-4 py-3 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black px-2 py-0.5 rounded-md uppercase bg-slate-200 text-slate-500 flex items-center gap-1">
                              <Clock size={8} /> {block.tipo}
                            </span>
                            <span className="text-[8px] font-black text-slate-400">{block.hora_inicio}–{block.hora_fin}</span>
                          </div>
                          <p className="text-[10px] font-black text-slate-600 leading-tight">Sincronizado de Centro de Módulo</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sección: Tiempo No Planificado */}
                {incidencias.length > 0 && (
                  <div>
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.25em] mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-400" />
                      Tiempo No Planificado
                    </h4>
                    <div className="flex flex-col gap-2">
                      {incidencias.map((inc, idx) => (
                        <div key={`sb-inc-${idx}`} className={`rounded-2xl border px-4 py-3 flex flex-col gap-2 relative ${
                          inc.tipo === 'Almuerzo' ? 'bg-amber-50/60 border-amber-100' :
                          inc.tipo === 'Reunión' ? 'bg-blue-50/60 border-blue-100' :
                          inc.tipo === 'Personal' ? 'bg-purple-50/60 border-purple-100' :
                          'bg-orange-50/60 border-orange-100'
                        }`}>
                          <div className="flex items-center justify-between">
                            <span className={`text-[8px] font-black px-2 py-0.5 rounded-md uppercase flex items-center gap-1 ${
                              inc.tipo === 'Almuerzo' ? 'bg-amber-500 text-white' :
                              inc.tipo === 'Reunión' ? 'bg-blue-500 text-white' :
                              inc.tipo === 'Personal' ? 'bg-purple-500 text-white' :
                              'bg-orange-500 text-white'
                            }`}>
                              <AlertTriangle size={8} /> {inc.tipo}
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="text-[8px] font-black text-slate-500">{inc.hora_inicio}–{inc.hora_fin}</span>
                              {!isClosed && inc.id && (
                                <button 
                                  onClick={() => deleteIncident(inc.id!)} 
                                  className="text-slate-300 hover:text-red-500 transition-colors p-0.5"
                                >
                                  <Trash2 size={10} />
                                </button>
                              )}
                            </div>
                          </div>
                          <p className="text-[10px] font-black text-slate-600 leading-tight line-clamp-2">{inc.descripcion}</p>
                          <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Actividad No Planificada</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>

          {/* Panel de Cierre de Jornada (Resumen Consolidado) */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 bg-white rounded-[48px] p-12 text-slate-800 shadow-2xl shadow-slate-200/50 border border-slate-100 relative overflow-hidden"
            style={{ fontFamily: "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', 'Lucida Sans', Arial, sans-serif" }}
          >
            {/* Fondo decorativo Light */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -ml-32 -mb-32 pointer-events-none" />

            <div className="relative z-10">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                <div className="flex items-center gap-5">
                  <div className="p-4 bg-amber-50 rounded-3xl border border-amber-100">
                    <BarChart3 size={32} className="text-amber-500" />
                  </div>
                  <div>
                    <h3 className="text-3xl font-black tracking-tight leading-tight text-slate-900">Cierre de Jornada</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Bitácora Detallada de Ejecución</p>
                  </div>
                </div>
                <div className="flex gap-4">
                   <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Resumen de Impacto</p>
                      <p className="text-sm font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2 mt-1">
                         <CheckCircle2 size={14} /> {porcentajeEstrategico}% LOGRADO
                      </p>
                   </div>
                </div>
              </div>

              {/* Bitácora Detallada tipo Excel (Light) */}
              <div className="space-y-6">
                 <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex flex-col">
                       <h4 className="text-sm font-black uppercase tracking-[0.2em] text-slate-700">Bitácora de Ejecución del Día</h4>
                       <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">Reporte dinámico de actividades gestionadas hoy</p>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="px-4 py-1.5 bg-emerald-50 rounded-full border border-emerald-100 text-[9px] font-black text-emerald-600">
                          {tasks.filter(t => t.estado_ejecucion === 'resuelto' || t.estado_ejecucion === 'terminada').length} COMPLETADAS
                       </div>
                       <div className="px-4 py-1.5 bg-slate-50 rounded-full border border-slate-200 text-[9px] font-black text-slate-500">
                          EXPORTACIÓN VISUAL
                       </div>
                    </div>
                 </div>
                 
                 <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                       <thead>
                          <tr className="border-b border-slate-100">
                             <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Actividad</th>
                             <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Impacto</th>
                             <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Estado</th>
                             <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Hallazgos y Aprendizajes</th>
                             <th className="py-4 px-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Justificación de Desviación</th>
                          </tr>
                       </thead>
                       <tbody>
                          {tasks.map((task) => {
                              const isRollover = task.actividad.toLowerCase().includes('dia 2026') || task.actividad.toLowerCase().includes('ayer');
                              const displayActivity = task.actividad.split(' - Dia')[0]; 
                              
                              return (
                              <tr key={task.id} className={`border-b border-slate-50 hover:bg-slate-50/50 transition-colors group ${task.estado_ejecucion === 'nuevo' ? 'opacity-50 grayscale' : ''}`}>
                                 <td className="py-5 px-4">
                                    <div className="flex items-center gap-2 mb-1">
                                       <p className="text-xs font-black text-slate-700 group-hover:text-primary transition-colors">{displayActivity}</p>
                                       {isRollover && (
                                          <span className="text-[7px] font-black px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-md">ARRASTRE</span>
                                       )}
                                    </div>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">ID: #{task.id} {isRollover ? '• Origen Histórico' : '• Nueva de Hoy'}</p>
                                 </td>
                                <td className="py-5 px-4 text-center">
                                   <span className={`text-[9px] font-black px-2 py-1 rounded-md ${
                                      task.prioridad >= 10 ? 'bg-red-50 text-red-500 border border-red-100' :
                                      task.prioridad >= 7 ? 'bg-amber-50 text-amber-500 border border-amber-100' :
                                      'bg-slate-50 text-slate-500 border border-slate-100'
                                   }`}>
                                      {task.prioridad >= 10 ? 'CRÍTICA' : task.prioridad >= 7 ? 'ALTA' : 'MEDIA'}
                                   </span>
                                </td>
                                <td className="py-5 px-4 text-center">
                                    <span className={`text-[9px] font-black px-2 py-1 rounded-md border ${getStatusColor(task.estado_ejecucion).badge} ${getStatusColor(task.estado_ejecucion).badgeBorder}`}>
                                       {getStatusColor(task.estado_ejecucion).label}
                                    </span>
                                 </td>
                                <td className="py-5 px-4">
                                   <p className="text-[11px] font-medium text-slate-600 leading-relaxed max-w-xs italic">
                                      {task.hallazgos ? `"${task.hallazgos}"` : <span className="text-slate-400 opacity-50">— Sin comentarios —</span>}
                                   </p>
                                </td>
                                <td className="py-5 px-4">
                                   <p className="text-[11px] font-medium text-amber-600 leading-relaxed max-w-xs italic">
                                      {task.justificacion ? `"${task.justificacion}"` : <span className="text-slate-400 opacity-50">— N/A —</span>}
                                   </p>
                                </td>
                             </tr>
                           );
                        })}
                       </tbody>
                    </table>
                 </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Incident Modal */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 border-b border-[#e7e5e4] flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#1c1917]">Registrar Actividad No Planificada</h3>
              <button onClick={() => setShowIncidentModal(false)} className="text-[#a8a29e] hover:text-[#1c1917]">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#78716c] uppercase mb-2">Tipo de Actividad</label>
                <select 
                  value={newIncident.tipo}
                  onChange={(e) => setNewIncident({...newIncident, tipo: e.target.value})}
                  className="w-full p-3 rounded-xl border border-[#d6d3d1] outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                >
                  <option value="Reunión">Reunión</option>
                  <option value="Personal">Personal</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#78716c] uppercase mb-2">Hora Inicio</label>
                  <input 
                    type="time" 
                    value={newIncident.hora_inicio}
                    onChange={(e) => setNewIncident({...newIncident, hora_inicio: e.target.value})}
                    className="w-full p-3 rounded-xl border border-[#d6d3d1] outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#78716c] uppercase mb-2">Hora Fin</label>
                  <input 
                    type="time" 
                    value={newIncident.hora_fin}
                    onChange={(e) => setNewIncident({...newIncident, hora_fin: e.target.value})}
                    className="w-full p-3 rounded-xl border border-[#d6d3d1] outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#78716c] uppercase mb-2">Descripción</label>
                <textarea 
                  value={newIncident.descripcion}
                  onChange={(e) => setNewIncident({...newIncident, descripcion: e.target.value})}
                  placeholder="Describe qué sucedió..."
                  className="w-full p-3 rounded-xl border border-[#d6d3d1] outline-none focus:ring-2 focus:ring-amber-500 min-h-[100px]"
                />
              </div>
            </div>
            <div className="p-6 bg-bg-main flex gap-3">
              <button onClick={() => setShowIncidentModal(false)} className="flex-1 px-6 py-3 rounded-xl font-bold text-text-muted hover:bg-border-soft transition-all duration-300 hover:scale-105">Cancelar</button>
              <button onClick={handleSaveIncident} className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all duration-300 hover:scale-105 shadow-lg shadow-amber-100">Guardar Actividad</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Detalles de Tarea */}
      {editingTask && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-100">
            <div className="p-8 pb-4 border-b border-slate-100 flex justify-between items-start bg-slate-50/50">
              <div className="space-y-3 flex-1">
                {isClosed && (
                  <div className="mb-4 bg-rose-50 text-rose-600 p-3 rounded-xl border border-rose-100 flex items-center gap-2">
                    <Lock size={16} />
                    <span className="text-xs font-black uppercase tracking-wider">El turno está cerrado. Reábrelo para editar.</span>
                  </div>
                )}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase ${getPriorityColor(editingTask.prioridad).badge}`}>{getPriorityColor(editingTask.prioridad).label}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{editingTask.area || 'GENERAL'}</span>
                </div>
                <h3 className="text-2xl font-black text-slate-800 leading-tight">{editingTask.actividad}</h3>
              </div>
              <button onClick={() => setEditingTask(null)} className="p-3 bg-white text-slate-400 hover:text-slate-800 rounded-2xl shadow-sm border border-slate-100 transition-all hover:scale-110"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={14} /> Estado de Ejecución</label>
                <div className="flex bg-slate-100/50 p-1.5 rounded-2xl border border-slate-100 gap-1.5 flex-wrap">
                  {[
                    { id: 'nuevo',         label: 'NUEVO',         color: 'bg-[#FFE017] text-[#5C4200]' },
                    { id: 'abierto',       label: 'ABIERTO',       color: 'bg-[#ED1650] text-white' },
                    { id: 'pendiente',     label: 'PENDIENTE',     color: 'bg-[#00D6CC] text-white' },
                    { id: 'en espera',     label: 'EN ESPERA',     color: 'bg-[#1B1B1B] text-white' },
                    { id: 'resuelto',      label: 'RESUELTO',      color: 'bg-[#858585] text-white' },
                    { id: 'despriorizado', label: 'DESPRIORIZADO', color: 'bg-[#B8B8B8] text-[#4D4D4D]' },
                    { id: 'fallo',         label: 'FALLO',         color: 'bg-[#B20F3B] text-white' },
                  ].filter(state => state.id !== 'nuevo').map((state) => (
                    <button 
                       key={state.id} 
                       disabled={isClosed} 
                       onClick={() => { 
                         const isDone = state.id === 'resuelto'; 
                         updateTask(editingTask.id, { estado_ejecucion: state.id, completada: isDone }); 
                         setEditingTask({...editingTask, estado_ejecucion: state.id, completada: isDone}); 
                       }} 
                       className={`text-[9px] font-black px-4 py-2.5 rounded-xl transition-all ${editingTask.estado_ejecucion === state.id ? `${state.color} shadow-lg scale-105 ring-2 ring-offset-2 ring-black/10` : 'bg-white text-slate-400 hover:text-slate-600 border border-slate-200/50'}`}
                     >
                       {state.label}
                     </button>
                  ))}
                </div>

              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${(['en espera', 'en curso', 'en estudio', 'terminada'].includes(editingTask.estado_ejecucion || 'en espera') && !editingTask.hallazgos) ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><Tag size={14} className={(['en espera', 'en curso', 'en estudio', 'terminada'].includes(editingTask.estado_ejecucion || 'en espera') && !editingTask.hallazgos) ? 'text-red-500' : 'text-primary'} /> Hallazgos y Aprendizajes</label>
                  <textarea disabled={isClosed} value={editingTask.hallazgos || ''} onChange={(e) => { const val = e.target.value; setEditingTask({...editingTask, hallazgos: val}); updateTask(editingTask.id, { hallazgos: val }); }} placeholder="¿Qué descubriste hoy?" className={`w-full p-4 rounded-3xl border text-sm outline-none focus:ring-4 min-h-[140px] transition-all resize-none font-medium text-slate-700 ${(['en espera', 'en curso', 'en estudio', 'terminada'].includes(editingTask.estado_ejecucion || 'en espera') && !editingTask.hallazgos) ? 'border-red-200 bg-red-50/10 focus:ring-red-500/10' : 'border-slate-100 bg-slate-50/50 focus:ring-primary/10'}`} />
                </div>
                <div className="space-y-6">
                  <div className="space-y-3">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><LinkIcon size={14} className="text-blue-500" /> Evidencias y Links</label>
                    <input type="text" disabled={isClosed} value={editingTask.evidencia || ''} onChange={(e) => { const val = e.target.value; setEditingTask({...editingTask, evidencia: val}); updateTask(editingTask.id, { evidencia: val }); }} placeholder="Link o nombre de archivo..." className="w-full p-4 rounded-2xl border border-slate-100 bg-slate-50/50 text-sm outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium text-slate-700" />
                  </div>
                  <div className="space-y-3">
                    <label className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${(['despriorizada', 'no realizado'].includes(editingTask.estado_ejecucion || 'en espera') && !editingTask.justificacion) ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}><AlertTriangle size={14} /> Justificación</label>
                    <textarea disabled={isClosed} value={editingTask.justificacion || ''} onChange={(e) => { const val = e.target.value; setEditingTask({...editingTask, justificacion: val}); updateTask(editingTask.id, { justificacion: val }); }} placeholder="Obligatorio para despriorizados o fallos..." className={`w-full p-4 rounded-2xl border text-sm outline-none focus:ring-4 min-h-[100px] transition-all resize-none font-medium text-slate-700 ${(['despriorizada', 'no realizado'].includes(editingTask.estado_ejecucion || 'en espera') && !editingTask.justificacion) ? 'border-red-200 bg-red-50/10 focus:ring-red-500/10' : 'border-slate-100 bg-slate-50/50 focus:ring-primary/10'}`} />
                  </div>
                </div>
              </div>
            </div>
            <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button onClick={() => setEditingTask(null)} className="px-8 py-3 bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg shadow-slate-200 hover:scale-105 active:scale-95">Cerrar y Guardar</button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
