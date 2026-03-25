import { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertTriangle, Calendar as CalendarIcon, Save, PlusCircle, Clock, Tag, X, Loader2, Link as LinkIcon, Paperclip, Plus, Trash2 } from 'lucide-react';

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
  backlog_id?: number;
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

const getPriorityInfo = (value: number) => {
  switch (value) {
    case 10: return { label: 'CRÍTICA', color: 'bg-accent/10 text-accent border-accent/20' };
    case 7: return { label: 'ALTA', color: 'bg-primary/10 text-primary border-primary/20' };
    case 4: return { label: 'MEDIA', color: 'bg-blue-50 text-blue-600 border-blue-100' };
    case 2: return { label: 'BAJA', color: 'bg-slate-100 text-slate-700 border-slate-200' };
    default: return { label: 'MEDIA', color: 'bg-blue-50 text-blue-600 border-blue-100' };
  }
};

const EXECUTED_STATUSES = ['en espera', 'en curso', 'en estudio', 'terminada', 'despriorizada'];

export default function AgendaView({ onNavigate }: { onNavigate?: (view: any) => void }) {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);
  const [errorCierre, setErrorCierre] = useState<string | null>(null);
  
  const [isClosing, setIsClosing] = useState(false);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [newIncident, setNewIncident] = useState<Partial<Incidencia>>({
    tipo: 'Interrupción',
    hora_inicio: '',
    hora_fin: '',
    descripcion: ''
  });
  
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  const isPast = new Date(selectedDate) < new Date(new Date().toISOString().split('T')[0]);
  const isClosed = plan?.estado_cierre === 1;
  const isExecutionStarted = plan?.ejecucion_iniciada === 1;

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
      const res = await fetch(`/tareas?fecha=${selectedDate}`);
      const data = await res.json();
      setTasks(data.tasks.map((t: any) => ({
        ...t,
        completada: t.completada === 1,
        estado_ejecucion: t.estado_ejecucion || null
      })));
      setPlan(data.plan);
      
      const incRes = await fetch(`/incidencias?fecha=${selectedDate}`);
      const incData = await incRes.json();
      setIncidencias(incData);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveIncident = async () => {
    if (!newIncident.descripcion || !newIncident.hora_inicio || !newIncident.hora_fin) {
      window.alert?.('Por favor, completa todos los campos de la incidencia.');
      return;
    }

    const res = await fetch('/incidencias', {
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
        tipo: 'Interrupción',
        hora_inicio: '',
        hora_fin: '',
        descripcion: ''
      });
      fetchData();
    }
  };

  const updateTask = async (id: number, updates: Partial<Task>) => {
    // Irreversible execution check:
    // If execution started, don't allow unmarking a completed task
    if (isExecutionStarted && updates.completada === false) {
      const task = tasks.find(t => t.id === id);
      if (task?.completada) {
        window.alert?.("La ejecución ya ha sido iniciada. No es posible desmarcar tareas completadas.");
        return;
      }
    }

    const res = await fetch(`/tareas/${id}`, {
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
    
    const noRealizadoWithoutJustification = tasks.filter(t => 
      (t.estado_ejecucion === 'no realizado' || !t.estado_ejecucion) && (!t.justificacion || t.justificacion.trim() === "")
    );

    if (noRealizadoWithoutJustification.length > 0) {
      setErrorCierre(`Falta justificación en ${noRealizadoWithoutJustification.length} tarea(s) sin estatus o marcadas como 'no realizado'.`);
      return;
    }

    setIsClosing(true);
    setErrorCierre(null);
    try {
      // Save all tasks to ensure everything is persisted
      // We use a single batch update or individual updates
      for (const task of tasks) {
        const res = await fetch(`/tareas/${task.id}`, {
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
      const closureRes = await fetch('/plan-diario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: selectedDate,
          estado_cierre: 1
        }),
      });

      if (!closureRes.ok) throw new Error('Error al cerrar el plan diario');

      if (onNavigate) onNavigate('dashboard');
    } catch (error) {
      console.error('Error al finalizar el día:', error);
      setErrorCierre(error instanceof Error ? error.message : 'Hubo un error al guardar los datos. Por favor, inténtalo de nuevo.');
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

  // Resumen por nivel
  const stats = {
    criticas: { total: 0, done: 0 },
    altas: { total: 0, done: 0 },
    medias: { total: 0, done: 0 },
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

  return (
    <div className="space-y-6">
      {isClosed && (
        <div className="bg-[#7DA81A]/10 border border-[#7DA81A]/20 text-[#7DA81A] px-6 py-4 rounded-2xl flex items-center shadow-sm">
          <CheckCircle2 size={24} className="mr-3" />
          <span className="font-bold">Día cerrado correctamente. Todas las actividades han sido registradas.</span>
        </div>
      )}

      {!isClosed && isExecutionStarted && (
        <div className="bg-primary/5 border border-primary/20 text-primary px-6 py-4 rounded-2xl flex items-center shadow-sm">
          <Clock size={24} className="mr-3" />
          <span className="font-bold">
            Ejecución iniciada a las {plan?.hora_inicio_ejecucion && !isNaN(Date.parse(plan.hora_inicio_ejecucion))
              ? new Date(plan.hora_inicio_ejecucion).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
              : plan?.hora_inicio_ejecucion}.
          </span>
        </div>
      )}

      {!isClosed && !isExecutionStarted && tasks.length > 0 && tasks.some(t => t.hora_inicio_plan) && (
        <div className="bg-[#7DA81A]/5 border border-[#7DA81A]/20 text-[#7DA81A] px-6 py-4 rounded-2xl flex items-center shadow-sm">
          <CheckCircle2 size={24} className="mr-3" />
          <span className="font-bold">Agenda estratégica generada. Listo para iniciar ejecución.</span>
        </div>
      )}

      <div className="latam-card !p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center text-text-muted">
            <CalendarIcon size={20} className="mr-2" />
            <span className="font-medium">Seleccionar Fecha:</span>
          </div>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary transition-all hover:border-primary/30"
          />
        </div>
      </div>

      {/* Bloque de Estado Estratégico */}
      {tasks.length > 0 && (
        <div className="latam-card !p-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Estado Estratégico del Día</h3>
            <div className={`px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${strategicStatus.bg} ${strategicStatus.color} ${strategicStatus.color.replace('text', 'border').replace('600', '200')}`}>
              {porcentajeEstrategico}% Ejecutado
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-black text-text-strong">{porcentajeEstrategico}%</span>
              <span className="text-sm font-bold text-text-muted uppercase tracking-wider">ejecutado</span>
              <span className="ml-auto text-xl font-bold text-text-muted">{100 - porcentajeEstrategico}% pendiente</span>
            </div>

            {/* Resumen por nivel */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 py-2 border-y border-border-soft/50">
              {stats.criticas.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Críticas:</span>
                  <span className={`text-xs font-bold ${stats.criticas.done === stats.criticas.total ? 'text-[#7DA81A]' : 'text-accent'}`}>
                    {stats.criticas.done} / {stats.criticas.total}
                  </span>
                </div>
              )}
              {stats.altas.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Altas:</span>
                  <span className="text-xs font-bold text-text-strong">
                    {stats.altas.done} / {stats.altas.total}
                  </span>
                </div>
              )}
              {stats.medias.total > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Medias:</span>
                  <span className="text-xs font-bold text-text-strong">
                    {stats.medias.done} / {stats.medias.total}
                  </span>
                </div>
              )}
            </div>

            <div className="w-full bg-bg-main h-3 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className={`${strategicStatus.bar} bar-glow h-full transition-all duration-700 ease-out`}
                style={{ width: `${animate ? porcentajeEstrategico : 0}%` }}
              />
            </div>

            <p className={`text-sm font-bold ${strategicStatus.color} italic flex items-center`}>
              <span className="mr-2 text-base leading-none">{strategicStatus.icon}</span>
              {strategicStatus.text}
            </p>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-[#a8a29e]">Cargando agenda...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#e7e5e4] p-12 text-center text-[#a8a29e]">
          No hay tareas planificadas para esta fecha.
        </div>
      ) : (
        <div className="space-y-4">
          {(() => {
            const getFirstTime = (timeStr: string | undefined) => {
              if (!timeStr) return '99:99';
              try {
                const parsed = JSON.parse(timeStr);
                if (Array.isArray(parsed) && parsed.length > 0) return parsed[0];
              } catch (e) {}
              return timeStr;
            };

            const orderedTasks = [...tasks].sort((a, b) => {
              const timeA = getFirstTime(a.hora_inicio_plan);
              const timeB = getFirstTime(b.hora_inicio_plan);
              return timeA.localeCompare(timeB);
            });
            return orderedTasks.map((task) => (
              <div 
                key={task.id} 
                className={`latam-card transition-all ${
                  task.estado_ejecucion === 'terminada' ? 'border-emerald-200 bg-emerald-50/30' : 
                  task.estado_ejecucion === 'no realizado' ? 'border-red-100 bg-red-50/20' : ''
                }`}
              >
                <div className="flex items-start gap-4 mb-6">
                  <div className={`transition-colors mt-1 ${task.estado_ejecucion === 'terminada' ? 'text-[#7DA81A]' : 'text-border-soft'}`}>
                    {task.estado_ejecucion === 'terminada' ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    {/* Line 1: Status Chips in a line */}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: 'en espera', label: 'ESPERA', color: 'bg-slate-100 text-slate-600 border-slate-200' },
                        { id: 'en curso', label: 'CURSO', color: 'bg-blue-100 text-blue-700 border-blue-200' },
                        { id: 'en estudio', label: 'ESTUDIO', color: 'bg-purple-100 text-purple-700 border-purple-200' },
                        { id: 'terminada', label: 'LISTO', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
                        { id: 'despriorizada', label: 'DESPRIO', color: 'bg-amber-100 text-amber-700 border-amber-200' },
                        { id: 'no realizado', label: 'NO REALIZADO', color: 'bg-red-100 text-red-700 border-red-200' },
                      ].map((state) => (
                        <button
                          key={state.id}
                          disabled={isClosed}
                          onClick={() => {
                            const isDone = state.id === 'terminada';
                            updateTask(task.id, { estado_ejecucion: state.id, completada: isDone });
                          }}
                          className={`text-[9px] font-black uppercase tracking-tight px-2.5 py-1 rounded border transition-all cursor-pointer disabled:cursor-not-allowed ${
                            task.estado_ejecucion === state.id 
                              ? `${state.color} border-current ring-1 ring-current shadow-sm` 
                              : 'bg-white text-text-muted border-border-soft opacity-60 hover:opacity-100'
                          }`}
                        >
                          {state.label}
                        </button>
                      ))}
                    </div>

                    {/* Line 2: Priority and Time */}
                    <div className="flex items-center gap-4">
                      <span className={`text-[11px] font-bold px-3 py-1 rounded border shadow-sm ${getPriorityInfo(task.prioridad).color}`}>
                        {getPriorityInfo(task.prioridad).label}
                      </span>
                      {task.area && (
                        <span className="text-[11px] font-bold px-3 py-1 rounded border shadow-sm bg-primary/5 text-primary border-primary/10 uppercase">
                          {task.area}
                        </span>
                      )}
                      {task.hora_inicio_plan && (() => {
                        try {
                          const starts = JSON.parse(task.hora_inicio_plan);
                          const ends = task.hora_fin_plan ? JSON.parse(task.hora_fin_plan) : null;
                          if (Array.isArray(starts) && Array.isArray(ends)) {
                            return (
                              <div className="flex flex-wrap gap-x-4 gap-y-1">
                                {starts.map((start, idx) => (
                                  <div key={idx} className="flex items-center">
                                    <Clock size={14} className="mr-2 text-text-muted" />
                                    <span className="text-sm font-bold text-text-strong">
                                      {start} – {ends[idx]}
                                    </span>
                                    {idx < starts.length - 1 && (
                                      <span className="ml-4 text-border-soft">|</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            );
                          }
                        } catch (e) {}
                        return (
                          <div className="flex items-center">
                            <Clock size={14} className="mr-2 text-text-muted" />
                            <span className="text-sm font-bold text-text-strong">
                              {task.hora_inicio_plan}{task.hora_fin_plan ? ` – ${task.hora_fin_plan}` : ''}
                            </span>
                          </div>
                        );
                      })()}
                    </div>

                    {/* Line 3: Activity */}
                    <h4 className={`text-2xl font-bold leading-tight ${task.estado_ejecucion === 'terminada' ? 'line-through text-text-muted opacity-70' : 'text-primary'}`}>
                      {task.actividad}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-xs font-bold text-text-muted uppercase mb-2">Hallazgos Relevantes</label>
                    <textarea 
                      disabled={isClosed}
                      value={task.hallazgos || ''}
                      onChange={(e) => updateTask(task.id, { hallazgos: e.target.value })}
                      placeholder="¿Qué aprendiste o descubriste?"
                      className="w-full p-3 rounded-xl border border-border-soft bg-white text-sm outline-none focus:ring-2 focus:ring-primary min-h-[80px] disabled:bg-bg-main disabled:text-text-muted"
                    />
                  </div>
                  
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-text-muted uppercase flex items-center">
                        <LinkIcon size={12} className="mr-1" />
                        Links o Evidencias (Opcional)
                      </label>
                      {!isClosed && (
                        <button 
                          onClick={() => {
                            let currentLinks: string[] = [];
                            try {
                              if (task.evidencia) {
                                const parsed = JSON.parse(task.evidencia);
                                currentLinks = Array.isArray(parsed) ? parsed : [task.evidencia];
                              }
                            } catch (e) {
                              if (task.evidencia) currentLinks = [task.evidencia];
                            }
                            updateTask(task.id, { evidencia: JSON.stringify([...currentLinks, '']) });
                          }}
                          className="p-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                          title="Agregar otro link"
                        >
                          <Plus size={14} />
                        </button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {(() => {
                        let links: string[] = [''];
                        try {
                          if (task.evidencia) {
                            const parsed = JSON.parse(task.evidencia);
                            links = Array.isArray(parsed) ? parsed : [task.evidencia];
                          }
                        } catch (e) {
                          if (task.evidencia) links = [task.evidencia];
                        }

                        if (links.length === 0) links = [''];

                        return links.map((link, idx) => (
                          <div key={idx} className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                              <input 
                                type="text"
                                disabled={isClosed}
                                value={link}
                                onChange={(e) => {
                                  const newLinks = [...links];
                                  newLinks[idx] = e.target.value;
                                  updateTask(task.id, { evidencia: JSON.stringify(newLinks) });
                                }}
                                placeholder="https://... o nombre del archivo"
                                className="w-full p-2 pl-8 rounded-xl border border-border-soft bg-white text-xs outline-none focus:ring-2 focus:ring-primary disabled:bg-bg-main disabled:text-text-muted"
                              />
                              <Paperclip size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" />
                            </div>
                            
                            <div className="flex items-center gap-1">
                              {link && (link.startsWith('http') || link.startsWith('www')) && (
                                <a 
                                  href={link.startsWith('http') ? link : `https://${link}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                                  title="Abrir link"
                                >
                                  <LinkIcon size={14} />
                                </a>
                              )}
                              {!isClosed && links.length > 1 && (
                                <button 
                                  onClick={() => {
                                    const newLinks = links.filter((_, i) => i !== idx);
                                    updateTask(task.id, { evidencia: JSON.stringify(newLinks) });
                                  }}
                                  className="p-2 text-text-muted hover:text-red-500 transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                    <p className="text-[9px] text-text-muted mt-1 italic">Puedes agregar múltiples links o nombres de archivos.</p>
                  </div>

                  {task.estado_ejecucion !== 'terminada' && (
                    <div>
                      <label className={`block text-xs font-bold uppercase mb-2 flex items-center ${(task.estado_ejecucion === 'no realizado' || !task.estado_ejecucion) ? 'text-accent' : 'text-text-muted'}`}>
                        <AlertTriangle size={12} className="mr-1" />
                        Justificación de Desviación {(task.estado_ejecucion === 'no realizado' || !task.estado_ejecucion) ? '*' : ''}
                      </label>
                      <textarea 
                        disabled={isClosed}
                        required={task.estado_ejecucion === 'no realizado' || !task.estado_ejecucion}
                        value={task.justificacion || ''}
                        onChange={(e) => updateTask(task.id, { justificacion: e.target.value })}
                        placeholder={(task.estado_ejecucion === 'no realizado' || !task.estado_ejecucion) ? "Obligatorio: ¿Por qué no se realizó?" : "¿Por qué no se completó?"}
                        className={`w-full p-3 rounded-xl border bg-white text-sm outline-none focus:ring-2 min-h-[80px] disabled:bg-bg-main disabled:text-text-muted ${
                          (task.estado_ejecucion === 'no realizado' || !task.estado_ejecucion) && (!task.justificacion || task.justificacion.trim() === "") 
                            ? 'border-red-300 focus:ring-red-500' 
                            : 'border-border-soft focus:ring-primary'
                        }`}
                      />
                    </div>
                  )}
                </div>
              </div>
            ));
          })()}

          {showUnplannedWarning && (
            <div className="mt-6 p-4 rounded-xl bg-amber-50/50 border border-amber-100/50 flex items-center text-amber-700/80">
              <span className="mr-2 text-lg">🟡</span>
              <span className="text-sm font-bold">
                Tiempo disponible sin planificar: {formatTime(roundedUnplanned)}
              </span>
            </div>
          )}

          {incidencias.length > 0 && (
            <div className="mt-12 pt-8 border-t border-border-soft">
              <h3 className="text-sm font-bold text-text-muted uppercase mb-6 flex items-center tracking-wider">
                <AlertTriangle size={16} className="mr-2 text-[#FFC700]" />
                Actividades No Planificadas del Día
              </h3>
              <div className="space-y-4">
                {incidencias.map((inc) => (
                  <div key={inc.id} className="latam-card !p-5 flex items-start">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center text-sm font-bold text-primary">
                          <Clock size={14} className="mr-2 text-text-muted" />
                          {inc.hora_inicio} – {inc.hora_fin}
                        </div>
                        <span className="text-[10px] font-bold text-text-muted bg-bg-main border border-border-soft px-2 py-1 rounded-lg uppercase tracking-widest">
                          {inc.tipo}
                        </span>
                      </div>
                      <p className="text-sm text-text-strong leading-relaxed">{inc.descripcion}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tasks.length > 0 && !isClosed && (
            <div className="pt-6 space-y-6">
              {errorCierre && (
                <div className="bg-accent/10 border border-accent/20 text-accent px-6 py-4 rounded-2xl flex items-center shadow-sm">
                  <AlertTriangle size={20} className="mr-2" />
                  <span className="font-bold">{errorCierre}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <button 
                  onClick={() => setShowIncidentModal(true)}
                  className="flex items-center bg-amber-500 text-white px-6 py-4 rounded-xl font-bold hover:bg-amber-600 hover:scale-105 hover:shadow-xl transition-all duration-300 shadow-lg shadow-amber-100"
                >
                  <PlusCircle size={20} className="mr-2" />
                  Registrar Actividad No Planificada
                </button>
                
                <button 
                  onClick={handleFinishDay}
                  disabled={isClosing}
                  className="latam-btn-primary px-10 flex items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isClosing ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Finalizando...
                    </>
                  ) : (
                    'Finalizar Día'
                  )}
                </button>
              </div>
            </div>
          )}
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
                  <option value="Interrupción">Interrupción</option>
                  <option value="Reunión">Reunión</option>
                  <option value="Rome_fila">Rompe_fila</option>
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
              <button 
                onClick={() => setShowIncidentModal(false)}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-text-muted hover:bg-border-soft transition-all duration-300 hover:scale-105"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveIncident}
                className="flex-1 px-6 py-3 rounded-xl font-bold text-white bg-amber-500 hover:bg-amber-600 transition-all duration-300 hover:scale-105 shadow-lg shadow-amber-100"
              >
                Guardar Actividad
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
