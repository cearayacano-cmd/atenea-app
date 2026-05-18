import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, Pause, CheckCircle2, AlertTriangle, Clock, Sparkles, 
  BrainCircuit, RefreshCw, Layers, Award, ShieldAlert, BookOpen
} from 'lucide-react';

interface BacklogItem {
  id: number;
  actividad: string;
  prioridad: number;
  status: string;
  area?: string;
  urgencia: number;
  impacto: number;
  dependencia: number;
  contexto: number;
  score: number;
}

interface Task {
  id: number;
  actividad: string;
  prioridad: number;
  completada: number;
  estado_ejecucion: string;
  hallazgos?: string;
  justificacion?: string;
  area?: string;
  tiempo_invertido_minutos: number;
  backlog_id?: number;
}

export default function FocusView({ selectedDate }: { selectedDate: string }) {
  const [recommendations, setRecommendations] = useState<BacklogItem[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [todayTasks, setTodayTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastArea, setLastArea] = useState<string>('');
  
  // Timer State
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [showInactivityOverlay, setShowInactivityOverlay] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  // Completion Modal State
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [findings, setFindings] = useState('');
  const [evidence, setEvidence] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Failure Modal State
  const [isFailureModalOpen, setIsFailureModalOpen] = useState(false);
  const [justification, setJustification] = useState('');

  // 1. Fetch data
  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Get today's tasks
      const resTasks = await fetch(`/api/tareas?fecha=${selectedDate}`);
      const dataTasks = await resTasks.json();
      const tasksList: Task[] = dataTasks.tasks || [];
      setTodayTasks(tasksList);

      // Find any currently active task
      const active = tasksList.find(t => t.estado_ejecucion === 'abierto');
      if (active) {
        setActiveTask(active);
        setIsTimerRunning(true);
      } else {
        setActiveTask(null);
        setIsTimerRunning(false);
      }

      // Calculate last completed area for context boost
      const lastCompleted = [...tasksList]
        .reverse()
        .find(t => t.estado_ejecucion === 'resuelto' || t.estado_ejecucion === 'terminada');
      const lastAreaName = lastCompleted?.area || '';
      setLastArea(lastAreaName);

      // 2. Fetch AI Recommendations from backlog
      const resRecs = await fetch(`/api/backlog/recommend?lastArea=${encodeURIComponent(lastAreaName)}`);
      const dataRecs = await resRecs.json();
      setRecommendations(dataRecs);
    } catch (err) {
      console.error('Error fetching focus data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedDate]);

  // 2. Timer Loop with Tab Focus Telemetry
  useEffect(() => {
    if (isTimerRunning && activeTask) {
      // Start interval
      timerRef.current = setInterval(() => {
        setElapsedSeconds(prev => prev + 1);
        
        // Auto-pause if no user activity for 60 seconds (simulated passive pause)
        if (Date.now() - lastActivityRef.current > 60000) {
          pauseFocusDueToInactivity();
        }
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning, activeTask]);

  // Passive Tab Blur Detection (Tab Switch = Auto Pause!)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isTimerRunning) {
        pauseFocusDueToInactivity();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isTimerRunning]);

  // Detect general mouse/keyboard activity to reset inactivity timer
  useEffect(() => {
    const resetActivity = () => {
      lastActivityRef.current = Date.now();
    };

    window.addEventListener('mousemove', resetActivity);
    window.addEventListener('keydown', resetActivity);
    return () => {
      window.removeEventListener('mousemove', resetActivity);
      window.removeEventListener('keydown', resetActivity);
    };
  }, []);

  const pauseFocusDueToInactivity = async () => {
    if (!activeTask) return;
    setIsTimerRunning(false);
    setShowInactivityOverlay(true);
    
    // Pause state on server (en espera)
    await fetch(`/api/tareas/${activeTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_ejecucion: 'en espera' })
    });
  };

  const resumeFocus = async () => {
    if (!activeTask) return;
    setShowInactivityOverlay(false);
    setIsTimerRunning(true);
    lastActivityRef.current = Date.now();

    // Resume state on server (abierto)
    await fetch(`/api/tareas/${activeTask.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado_ejecucion: 'abierto' })
    });
  };

  // 3. Focus Control Actions
  const startFocus = async (item: BacklogItem) => {
    setIsLoading(true);
    try {
      // 1. Insert into today's Tasks as active (abierto)
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: selectedDate,
          actividad: item.actividad,
          prioridad: item.prioridad,
          backlog_id: item.id,
          estado_ejecucion: 'abierto',
          area: item.area || 'Gral'
        })
      });
      
      // 2. Update status in Backlog to 'en curso'
      await fetch(`/api/backlog/${item.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'en curso' })
      });

      setElapsedSeconds(0);
      lastActivityRef.current = Date.now();
      await fetchData();
    } catch (err) {
      console.error('Error starting focus:', err);
    }
  };

  const completeFocus = async () => {
    if (!activeTask) return;
    setIsSaving(true);
    try {
      const minutesSpent = Math.max(1, Math.round(elapsedSeconds / 60));
      
      // 1. Update task to 'resuelto' and record telemetry time
      await fetch(`/api/tareas/${activeTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_ejecucion: 'resuelto',
          tiempo_invertido_minutos: minutesSpent,
          hallazgos: findings,
          evidencia: JSON.stringify([evidence])
        })
      });

      // 2. Sync backlog item to 'terminada'
      if (activeTask.backlog_id) {
        await fetch(`/api/backlog/${activeTask.backlog_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'terminada' })
        });
      }

      setIsCompleteModalOpen(false);
      setFindings('');
      setEvidence('');
      await fetchData();
    } catch (err) {
      console.error('Error completing focus:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const failFocus = async () => {
    if (!activeTask) return;
    setIsSaving(true);
    try {
      // 1. Update task to 'fallo'
      await fetch(`/api/tareas/${activeTask.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado_ejecucion: 'fallo',
          justificacion
        })
      });

      // 2. Reset backlog item to 'pendiente'
      if (activeTask.backlog_id) {
        await fetch(`/api/backlog/${activeTask.backlog_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'pendiente' })
        });
      }

      setIsFailureModalOpen(false);
      setJustification('');
      await fetchData();
    } catch (err) {
      console.error('Error failing task:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper formats
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const getPriorityConfig = (priority: number) => {
    switch (priority) {
      case 10: return { label: 'CRÍTICA', color: 'bg-rose-500 text-white', border: 'border-rose-100', effort: 2.0 };
      case 7: return { label: 'ALTA', color: 'bg-amber-500 text-white', border: 'border-amber-100', effort: 1.5 };
      case 4: return { label: 'MEDIA', color: 'bg-sky-500 text-white', border: 'border-sky-100', effort: 1.0 };
      case 2: return { label: 'BAJA', color: 'bg-slate-400 text-white', border: 'border-slate-100', effort: 0.5 };
      default: return { label: 'MEDIA', color: 'bg-sky-500 text-white', border: 'border-sky-100', effort: 1.0 };
    }
  };

  // 4. Calculate Fatigue / Cognitive Load Points
  const resolvedTasks = todayTasks.filter(t => t.estado_ejecucion === 'resuelto' || t.estado_ejecucion === 'terminada');
  const cognitiveLoad = resolvedTasks.reduce((acc, t) => acc + getPriorityConfig(t.prioridad).effort, 0);
  const cognitiveLoadPercent = Math.min(100, (cognitiveLoad / 6.0) * 100);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative">
      <AnimatePresence>
        {showInactivityOverlay && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[#0f004f]/40 backdrop-blur-md z-30 flex items-center justify-center rounded-[32px] p-6 text-center"
          >
            <div className="bg-white/95 p-8 rounded-3xl shadow-2xl max-w-md border border-slate-100 flex flex-col items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center text-amber-500 animate-pulse">
                <BrainCircuit size={32} />
              </div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wider">¡Enfoque en Pausa Pasiva!</h3>
              <p className="text-xs text-slate-500 font-medium">Detectamos inactividad en la pestaña. Pausamos el contador para proteger la precisión de tus métricas reales.</p>
              <button 
                onClick={resumeFocus}
                className="w-full py-3.5 bg-primary text-white rounded-xl text-xs font-black uppercase tracking-wider hover:bg-primary-soft transition-all shadow-lg"
              >
                Reanudar Enfoque Activo
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Focus Area - Left/Center (2 Cols) */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        {activeTask ? (
          /* Active Focus Screen */
          <motion.div 
            layoutId="focusContainer"
            className="latam-card !p-8 bg-gradient-to-br from-white via-white to-blue-50/20 border border-blue-100/50 shadow-xl rounded-[32px] flex flex-col gap-6 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/5 rounded-full blur-3xl pointer-events-none" />
            
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-black bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                ENFOQUE ACTIVO
              </span>
              <span className="text-xs font-bold text-slate-400">#{activeTask.id}</span>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-md ${getPriorityConfig(activeTask.prioridad).color}`}>
                  {getPriorityConfig(activeTask.prioridad).label}
                </span>
                <span className="text-[8px] font-black bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-md uppercase">
                  {activeTask.area || 'Gral'}
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-800 leading-snug tracking-tight uppercase mt-1">
                {activeTask.actividad}
              </h2>
            </div>

            {/* Telemetry Status HUD (Non-Anxiety Inducing) */}
            <div className="bg-[#0f004f] text-white rounded-3xl p-8 flex flex-col items-center justify-center gap-3 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#99CC33] via-emerald-400 to-[#00D6CC]" />
              <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#99CC33] animate-ping" />
                MODO ENFOQUE OPERATIVO ACTIVO
              </span>
              <span className="text-sm font-black text-slate-100 uppercase tracking-wide text-center">
                Atenea está capturando telemetría de forma silenciosa.
              </span>
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-1 text-center">
                Pestaña monitoreada activamente • Concéntrate en resolver la actividad.
              </span>
            </div>

            {/* Actions Bar */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
              <button 
                onClick={pauseFocusDueToInactivity}
                className="py-4 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Pause size={14} /> Pausar Tarea
              </button>
              <button 
                onClick={() => setIsFailureModalOpen(true)}
                className="py-4 bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-600 rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <AlertTriangle size={14} /> Reportar Fallo
              </button>
              <button 
                onClick={() => setIsCompleteModalOpen(true)}
                className="col-span-2 md:col-span-1 py-4 bg-primary hover:bg-primary-soft text-white rounded-2xl text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-primary/20"
              >
                <CheckCircle2 size={14} /> Completar
              </button>
            </div>
          </motion.div>
        ) : (
          /* Recommendation Feed Screen */
          <div className="flex flex-col gap-6">
            {/* Top 1 Hero Recommendation */}
            {recommendations.length > 0 ? (
              <motion.div 
                layoutId="focusContainer"
                className="latam-card !p-8 bg-gradient-to-br from-indigo-900 to-[#0A0B2E] text-white border border-[#1b1c4e] shadow-2xl rounded-[32px] flex flex-col gap-6 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent/10 rounded-full blur-2xl pointer-events-none" />
                
                <div className="flex items-center justify-between">
                  <span className="text-[8px] font-black bg-accent text-white px-3 py-1 rounded-full uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles size={10} /> RECOMENDACIÓN TOP DE ENFOQUE
                  </span>
                  <div className="flex items-center gap-1.5">
                    <BrainCircuit size={14} className="text-sky-400" />
                    <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Score: {recommendations[0].score}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <span className={`text-[8px] font-black px-2.5 py-0.5 rounded-md ${getPriorityConfig(recommendations[0].prioridad).color}`}>
                      {getPriorityConfig(recommendations[0].prioridad).label}
                    </span>
                    <span className="text-[8px] font-black bg-white/10 text-white/70 px-2.5 py-0.5 rounded-md uppercase">
                      {recommendations[0].area || 'Gral'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-black text-white leading-snug tracking-tight uppercase mt-1">
                    {recommendations[0].actividad}
                  </h2>
                </div>

                {/* Score indicators */}
                <div className="grid grid-cols-4 gap-2 bg-white/5 rounded-2xl p-4 border border-white/5 text-center text-white">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-white/50 uppercase">Urgencia</span>
                    <span className="text-xs font-black text-sky-400">{recommendations[0].urgencia}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-white/50 uppercase">Impacto</span>
                    <span className="text-xs font-black text-sky-400">{recommendations[0].impacto}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-white/50 uppercase">Dependen.</span>
                    <span className="text-xs font-black text-sky-400">+{recommendations[0].dependencia}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[7px] font-black text-white/50 uppercase">Boost Ctx</span>
                    <span className="text-xs font-black text-sky-400">+{recommendations[0].contexto}</span>
                  </div>
                </div>

                <button 
                  onClick={() => startFocus(recommendations[0])}
                  className="w-full py-4.5 bg-accent hover:bg-accent/90 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-accent/30"
                >
                  <Play size={14} fill="white" /> INICIAR ENFOQUE ACTIVO
                </button>
              </motion.div>
            ) : (
              <div className="latam-card py-16 text-center bg-white border border-slate-200 flex flex-col items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                  <Award size={32} />
                </div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">¡Sin pendientes en el Backlog!</h3>
                <p className="text-xs text-slate-400 max-w-sm">Has resuelto todo lo programado en tu flujo. Disfruta tu victoria o crea una nueva tarea.</p>
              </div>
            )}

            {/* Recommendations Alternatives (Deck) */}
            {recommendations.length > 1 && (
              <div className="flex flex-col gap-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Layers size={14} /> Recomendaciones Alternativas
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {recommendations.slice(1, 3).map((item) => (
                    <div 
                      key={item.id}
                      className="latam-card !p-5 bg-white border border-slate-100 hover:border-blue-200/50 hover:shadow-md transition-all rounded-2xl flex flex-col gap-4 justify-between"
                    >
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className={`text-[7px] font-black px-2 py-0.5 rounded ${getPriorityConfig(item.prioridad).color}`}>
                            {getPriorityConfig(item.prioridad).label}
                          </span>
                          <span className="text-[8px] font-black text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                            Score: {item.score}
                          </span>
                        </div>
                        <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-tight leading-snug">
                          {item.actividad}
                        </h5>
                      </div>
                      
                      <button 
                        onClick={() => startFocus(item)}
                        className="w-full py-3 bg-slate-50 hover:bg-primary hover:text-white border border-slate-200/50 rounded-xl text-[8px] font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5"
                      >
                        <Play size={10} /> Tomar como Desvío
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right Column Sidebar (1 Col) */}
      <div className="flex flex-col gap-6">
        {/* Fatigue Tank Circular Gauge */}
        <div className="latam-card !p-6 bg-white border border-slate-200/80 shadow-sm rounded-[24px] flex flex-col items-center gap-4 text-center">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <BrainCircuit size={14} /> Carga Cognitiva del Analista
          </h4>

          {/* Effort Gauge Visual */}
          <div className="relative w-40 h-40 flex items-center justify-center mt-2">
            <svg className="w-full h-full transform -rotate-90">
              <circle 
                cx="80" 
                cy="80" 
                r="64" 
                className="stroke-slate-100 fill-none" 
                strokeWidth="12"
              />
              <circle 
                cx="80" 
                cy="80" 
                r="64" 
                className={`fill-none transition-all duration-500 ${
                  cognitiveLoadPercent > 80 ? 'stroke-rose-500' :
                  cognitiveLoadPercent > 50 ? 'stroke-amber-500' : 'stroke-emerald-500'
                }`} 
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 64}`}
                strokeDashoffset={`${2 * Math.PI * 64 * (1 - cognitiveLoadPercent / 100)}`}
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center">
              <span className="text-3xl font-black text-slate-800">{cognitiveLoad.toFixed(1)}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Esfuerzo Pts / 6.0</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-400 leading-relaxed font-bold">
            {cognitiveLoadPercent > 80 ? '⚠️ FATIGA OPERATIVA ALTA. Se sugieren desvíos de baja carga.' :
             cognitiveLoadPercent > 50 ? '⚡ RITMO ÓPTIMO. Mantén foco continuo en tareas asignadas.' : '🌱 Mente despejada. ¡Listo para retos críticos!'}
          </p>
        </div>

        {/* Today's Completed Timeline */}
        <div className="latam-card !p-6 bg-white border border-slate-200/80 shadow-sm rounded-[24px] flex-1 flex flex-col gap-4">
          <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <CheckCircle2 size={14} className="text-emerald-500" /> Tareas Concluidas Hoy
          </h4>
          
          <div className="flex-1 overflow-y-auto max-h-[300px] pr-1 custom-scrollbar flex flex-col gap-3">
            {resolvedTasks.length > 0 ? (
              resolvedTasks.map((t) => (
                <div 
                  key={t.id}
                  className="p-3 bg-emerald-50/30 border border-emerald-100 rounded-xl flex items-center justify-between gap-2"
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[9px] font-black text-slate-700 uppercase tracking-tight line-clamp-1">
                      {t.actividad}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">
                      {t.area || 'Gral'}
                    </span>
                  </div>
                  <span className="text-[8px] font-black bg-emerald-500 text-white px-2.5 py-1 rounded-md flex items-center gap-1 whitespace-nowrap shadow-sm uppercase tracking-wider">
                    RESUELTA
                  </span>
                </div>
              ))
            ) : (
              <div className="h-full flex items-center justify-center text-center py-8 opacity-40">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Aún sin tareas resueltas hoy</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Completion Modal */}
      {isCompleteModalOpen && activeTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-lg w-full p-8 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center">
                <CheckCircle2 size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Completar Tarea</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Reporta hallazgos y evidencias</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Hallazgos / Conclusión Técnica</label>
                <textarea 
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Detalla brevemente qué resolviste o qué detectaste..."
                  className="w-full h-24 p-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 resize-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Evidencia (Opcional - Links, Archivos)</label>
                <input 
                  type="text"
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  placeholder="Ej: https://github.com/PR-123 o logs-firewall.txt"
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsCompleteModalOpen(false)}
                className="px-5 py-3 text-slate-400 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={completeFocus}
                disabled={isSaving}
                className="px-6 py-3 bg-emerald-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 transition-all shadow-lg"
              >
                {isSaving ? 'Guardando...' : 'Finalizar Tarea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure Modal */}
      {isFailureModalOpen && activeTask && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl max-w-lg w-full p-8 flex flex-col gap-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-500 flex items-center justify-center">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-800 uppercase tracking-wider">Reportar Fallo Crítico</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">Explica por qué no se pudo concretar hoy</p>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Justificación del Fallo</label>
              <textarea 
                value={justification}
                onChange={(e) => setJustification(e.target.value)}
                placeholder="Describe la causa raíz del fallo (ej: Caída total del servicio del proveedor, API caída)..."
                className="w-full h-28 p-3 rounded-xl border border-slate-200 text-xs font-semibold outline-none focus:ring-2 focus:ring-primary/20 bg-slate-50/50 resize-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setIsFailureModalOpen(false)}
                className="px-5 py-3 text-slate-400 hover:bg-slate-50 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={failFocus}
                disabled={isSaving || !justification.trim()}
                className="px-6 py-3 bg-rose-500 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-rose-600 transition-all shadow-lg disabled:opacity-50"
              >
                {isSaving ? 'Registrando...' : 'Registrar Fallo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
