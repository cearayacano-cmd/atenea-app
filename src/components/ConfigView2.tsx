import { useState, useEffect } from 'react';
import { Save, Calendar, Clock, Trash2, Plus, Wand2, ListChecks, Database, ArrowRight, X, LayoutList, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

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
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPOS_BLOQUE = ['Almuerzo', 'Reunión', 'Personal', 'Otro'];
const PRIORITIES = [
  { label: 'CRÍTICA', value: 10, color: 'bg-accent' },
  { label: 'ALTA', value: 7, color: 'bg-primary' },
  { label: 'MEDIA', value: 4, color: 'bg-[#00A6D4]' },
  { label: 'BAJA', value: 2, color: 'bg-[#B8B8B8]' },
];

export default function ConfigView2() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Bloques y Jornadas
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [dailyPlans, setDailyPlans] = useState<Record<string, any>>({});
  const [newBlock, setNewBlock] = useState({ isRecurrente: false, dias: [] as string[], fecha: new Date().toISOString().split('T')[0], inicio: '13:00', fin: '14:00', tipo: 'Almuerzo', motivo: '' });

  // Backlog
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Modales y Edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isJornadaModalOpen, setIsJornadaModalOpen] = useState(false);
  const [isExcepcionModalOpen, setIsExcepcionModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isPlanningModalOpen, setIsPlanningModalOpen] = useState(false);
  const [selectedPlanningDate, setSelectedPlanningDate] = useState('');
  const [dayTasks, setDayTasks] = useState<any[]>([]);
  const [pendingSuggestions, setPendingSuggestions] = useState<any[]>([]);
  const [editingTask, setEditingTask] = useState<Partial<BacklogItem> | null>(null);

  useEffect(() => {
    if (isPlanningModalOpen && selectedPlanningDate) {
      fetchPendingFromYesterday(selectedPlanningDate);
    }
  }, [isPlanningModalOpen, selectedPlanningDate]);

  const fetchPendingFromYesterday = async (currentDate: string) => {
    const prevDateObj = new Date(currentDate + 'T00:00:00');
    prevDateObj.setDate(prevDateObj.getDate() - 1);
    const prevDate = prevDateObj.toISOString().split('T')[0];

    try {
      const res = await fetch(`/api/tareas?fecha=${prevDate}`);
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

  useEffect(() => {
    if (isPlanningModalOpen && selectedPlanningDate) {
      fetch(`/api/tareas?fecha=${selectedPlanningDate}`)
        .then(res => res.json())
        .then(data => {
           if (Array.isArray(data)) setDayTasks(data);
           else if (data && Array.isArray(data.tasks)) setDayTasks(data.tasks);
           else setDayTasks([]);
        }).catch(() => setDayTasks([]));
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
  
  const getWeekNumber = (d: Date) => {
    const date = new Date(d.getTime());
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
    const week1 = new Date(date.getFullYear(), 0, 4);
    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  const currentWeekNumber = getWeekNumber(weekDates[0]);

   useEffect(() => {
    fetchBloques();
    fetchBacklog();
    fetchConfig();
    fetchDailyPlans();
  }, []);

  const fetchDailyPlans = async () => {
    try {
      const res = await fetch('/api/planes-diarios');
      const data = await res.json();
      const plans: Record<string, any> = {};
      if (Array.isArray(data)) {
        data.forEach(d => {
          plans[d.date] = { hora_inicio: d.hora_inicio, hora_fin: d.hora_fin };
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
  const fetchBacklog = () => fetch('/api/backlog').then(res => res.json()).then(data => setBacklog(Array.isArray(data) ? data : [])).catch(() => setBacklog([]));

  const handleDragStart = (e: React.DragEvent, taskId: number) => {
    e.dataTransfer.setData('taskId', taskId.toString());
  };

  const handleDropToDay = async (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;
    
    const task = backlog.find(t => t.id === Number(taskId));
    if (!task) return;

    // Check capacity before adding (Simplified check for the card drop)
    const { remainingHours } = calculateTimeInfo();
    if (remainingHours <= 0) {
       const proceed = window.confirm("⚠️ CAPACIDAD ALCANZADA: La jornada de este día ya está llena. ¿Deseas forzar la carga de esta tarea?");
       if (!proceed) return;
    }

    try {
      // Crear tarea para ese día
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: dateStr,
          actividad: task.actividad,
          prioridad: task.prioridad,
          estado_ejecucion: 'nuevo', // Siempre nace como NUEVO al planificar
          tiempo_asignado_minutos: 0,
          backlog_id: task.id,
          area: task.area
        }),
      });
      
      // Actualizar el backlog para indicar que está en progreso/planificado
      await fetch(`/api/backlog/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'progreso' }) // Movido a "En Progreso" al planificar
      });

      fetchBacklog();
      
      // Feedback visual temporal
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
    
    await fetch(`/api/backlog/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prioridad: newPriority })
    });
    fetchBacklog();
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask?.actividad) return;

    const method = editingTask.id ? 'PUT' : 'POST';
    const url = editingTask.id ? `/api/backlog/${editingTask.id}` : '/api/backlog';

    // Asegurar que tenga fecha si es nueva
    const payload = {
      ...editingTask,
      created_at: editingTask.id ? editingTask.created_at : new Date().toISOString(),
      status: editingTask.status || 'nuevo',
      area: editingTask.area || 'Operativo'
    };

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    setIsModalOpen(false);
    setEditingTask(null);
    fetchBacklog();
  };

   const handleSaveConfig = async (pStart?: string, pEnd?: string) => {
    setIsSaving(true);
    const start = pStart || startTime;
    const end = pEnd || endTime;
    try {
      const dates = [];
      let current = new Date(startDate + 'T00:00:00');
      const last = new Date(endDate + 'T00:00:00');
      while (current <= last) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      
      await Promise.all(dates.map(date => 
        fetch('/api/plan-diario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, hora_inicio: start, hora_fin: end, horas_efectivas: 6 }),
        })
      ));
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
      await fetch('/api/bloques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: newBlock.fecha, hora_inicio: newBlock.inicio, hora_fin: newBlock.fin, tipo: newBlock.tipo, descripcion: newBlock.motivo }),
      });
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
        for (const item of items) {
          await fetch('/api/backlog', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ actividad: item.actividad, prioridad: item.prioridad, status: 'pendiente' })
          });
        }
      }
      setFreeText('');
      fetchBacklog();
    } catch (e) { console.error(e); }
    finally { setIsProcessing(false); }
  };

  const deleteBacklog = (id: number) => fetch(`/api/backlog/${id}`, { method: 'DELETE' }).then(fetchBacklog);

  const handleAssignToDayFromModal = async (task: any) => {
    if (!selectedPlanningDate) return;
    
    // Check capacity before adding
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    const taskWeight = weights[task.prioridad] || 1;
    const { remainingHours } = calculateTimeInfo();

    if (remainingHours - taskWeight < 0) {
      const proceed = window.confirm("⚠️ CAPACIDAD ALCANZADA: Esta tarea superará tu jornada operativa. ¿Deseas agregarla de todas formas?");
      if (!proceed) return;
    }

    try {
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: selectedPlanningDate,
          actividad: task.actividad,
          prioridad: task.prioridad,
          tiempo_asignado_minutos: 0,
          backlog_id: task.id,
          area: task.area
        }),
      });
      await fetch(`/api/backlog/${task.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'progreso' }) 
      });

      setPendingSuggestions(prev => prev.filter(p => p.id !== task.id));
      const dayTasksRes = await fetch(`/api/tareas?fecha=${selectedPlanningDate}`);
      if (dayTasksRes.ok) {
         const data = await dayTasksRes.json();
         if (Array.isArray(data)) setDayTasks(data);
         else if (data && Array.isArray(data.tasks)) setDayTasks(data.tasks);
         else setDayTasks([]);
      }
      fetchBacklog();
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllTasks = async () => {
    if (!selectedPlanningDate) return;
    if (!window.confirm("¿Estás seguro de que deseas limpiar todas las tareas de este día?")) return;
    
    try {
      await fetch(`/api/tareas/clear?fecha=${selectedPlanningDate}`, { method: 'DELETE' });
      setDayTasks([]);
      fetchBacklog(); 
    } catch (err) {
      console.error(err);
    }
  };

  const calculateTimeInfo = () => {
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    let usedHours = 0;
    dayTasks.forEach(t => {
      const baseHours = weights[t.prioridad] || 1;
      const status = (t.estado_ejecucion || 'nuevo').toLowerCase();
      
      if (status === 'nuevo' || status === 'abierto') {
        usedHours += baseHours; // Nuevo y Abierto consumen el 100%
      } else if (status === 'en espera') {
        usedHours += baseHours * 0.5; // En Espera libera el 50% de la carga
      } else if (status === 'resuelto') {
        // Usa tiempo invertido si existe (convertido a horas), sino asume 30 min por defecto
        usedHours += t.tiempo_invertido_minutos ? (t.tiempo_invertido_minutos / 60) : 0.5; 
      }
      // Despriorizado y Fallido consumen 0 horas
    });

    const safeStart = startTime || '08:00';
    const safeEnd = endTime || '17:00';
    const [startH, startM] = safeStart.split(':').map(Number);
    const [endH, endM] = safeEnd.split(':').map(Number);
    let availableHours = (endH + (endM || 0) / 60) - (startH + (startM || 0) / 60);

    // Descontar Almuerzo si existe
    const almuerzoBlocks = bloques.filter(b => b.tipo === 'Almuerzo');
    almuerzoBlocks.forEach(b => {
      const [bStartH, bStartM] = b.hora_inicio.split(':').map(Number);
      const [bEndH, bEndM] = b.hora_fin.split(':').map(Number);
      const duration = (bEndH + bEndM / 60) - (bStartH + bStartM / 60);
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

  return (
    <div className="w-full px-2 py-2 space-y-4 bg-[#F8FAFC]">
      
      {/* MODAL DE TAREA */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">{editingTask?.id ? 'Editar Actividad' : 'Nueva Actividad'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
              </div>
              <form onSubmit={handleSaveTask} className="p-6 space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Descripción de la actividad</label>
                  <textarea 
                    value={editingTask?.actividad || ''} 
                    onChange={e => setEditingTask({...editingTask, actividad: e.target.value})}
                    placeholder="¿Qué hay que hacer?"
                    className="w-full p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs font-bold text-slate-700 outline-none focus:border-primary h-32 resize-none"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Área / Categoría</label>
                    <select 
                      value={editingTask?.area || 'Operativo'} 
                      onChange={e => setEditingTask({...editingTask, area: e.target.value})}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="Operativo">Operativo</option>
                      <option value="Monitoreo">Monitoreo</option>
                      <option value="Tendencias">Tendencias</option>
                      <option value="Escuelita">Escuelita</option>
                      <option value="Calidad">Calidad</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase">Estado Inicial</label>
                    <select 
                      value={editingTask?.status || 'pendiente'} 
                      onChange={e => setEditingTask({...editingTask, status: e.target.value})}
                      className="w-full p-3 rounded-xl bg-slate-50 border border-slate-100 text-[10px] font-bold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="nuevo">NUEVO</option>
                      <option value="abierto">ABIERTO</option>
                      <option value="pendiente">PENDIENTE</option>
                      <option value="en espera">EN ESPERA</option>
                      <option value="resuelto">RESUELTO</option>
                      <option value="despriorizado">DESPRIORIZADO</option>
                      <option value="fallo">FALLO</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Prioridad / Gravedad</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PRIORITIES.map(p => (
                      <button 
                        key={p.value} 
                        type="button"
                        onClick={() => setEditingTask({...editingTask, prioridad: p.value})}
                        className={`p-3 rounded-xl border text-[10px] font-black uppercase transition-all flex items-center gap-2 ${editingTask?.prioridad === p.value ? 'bg-primary text-white border-primary' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-200'}`}
                      >
                        <div className={`w-2 h-2 rounded-full ${p.color}`} />
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Desde</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Fecha Hasta</label>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none focus:border-primary" />
                  </div>
                </div>

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

      {/* MODAL DE EXCEPCIÓN */}
      <AnimatePresence>
        {isExcepcionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center text-accent">
                    <Plus size={18} />
                  </div>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Añadir Excepción</h3>
                </div>
                <button onClick={() => setIsExcepcionModalOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
              </div>
              <div className="p-6 space-y-6">
                <div className="flex bg-slate-100 p-1.5 rounded-xl gap-1">
                  <button onClick={() => setNewBlock({...newBlock, isRecurrente: false})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${!newBlock.isRecurrente ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>Única</button>
                  <button onClick={() => setNewBlock({...newBlock, isRecurrente: true})} className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all ${newBlock.isRecurrente ? 'bg-white shadow-sm text-primary' : 'text-slate-500 hover:text-primary'}`}>Recurrente</button>
                </div>
                
                <div className="space-y-4">
                  {newBlock.isRecurrente ? (
                    <div className="flex justify-between gap-1.5">
                      {DIAS.map(d => (
                        <button key={d} onClick={() => setNewBlock(prev => ({...prev, dias: prev.dias.includes(d) ? prev.dias.filter(x => x !== d) : [...prev.dias, d]}))} className={`flex-1 h-9 rounded-xl text-[11px] font-black border transition-all ${newBlock.dias.includes(d) ? 'bg-primary text-white border-primary' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-primary/30'}`}>
                          {d.charAt(0)}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <input type="date" value={newBlock.fecha} onChange={e => setNewBlock({...newBlock, fecha: e.target.value})} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] font-bold text-slate-700 outline-none" />
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
                        placeholder="¿Por qué esta excepción?"
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
                  <Plus size={16} /> Confirmar Excepción
                </button>
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
                <button onClick={() => setIsAiModalOpen(false)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-black/10 flex items-center justify-center hover:bg-black/20 transition-all text-white">
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-10 space-y-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Escribe tus actividades</label>
                  <textarea 
                    autoFocus
                    value={freeText} 
                    onChange={e => setFreeText(e.target.value)} 
                    placeholder="Ej: Revisar correos de monitoreo a las 9am, luego capacitar al equipo en nuevas tendencias a las 11am..." 
                    className="w-full h-48 p-6 rounded-[32px] bg-slate-50 border-2 border-slate-100 text-sm font-medium text-slate-700 placeholder:text-slate-300 resize-none outline-none focus:border-emerald-500/30 transition-all shadow-inner leading-relaxed"
                  />
                  <div className="flex items-center justify-between px-2">
                    <button onClick={() => setFreeText('')} className="text-[10px] font-black text-slate-300 hover:text-red-500 uppercase tracking-widest transition-colors">
                      Limpiar todo
                    </button>
                    <span className="text-[9px] font-bold text-slate-300 uppercase italic">La IA clasificará por prioridad y área automáticamente</span>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button onClick={() => setIsAiModalOpen(false)} className="flex-1 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                    Cancelar
                  </button>
                  <button 
                    onClick={async () => {
                      await handleAiBacklog();
                      setIsAiModalOpen(false);
                    }}
                    disabled={isProcessing || !freeText.trim()}
                    className="flex-[2] py-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 flex items-center justify-center gap-3"
                  >
                    {isProcessing ? 'Procesando...' : <><Wand2 size={18} /> Procesar con IA</>}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL DE PLANIFICACIÓN DIARIA */}
      <AnimatePresence>
        {isPlanningModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden border border-white/20">
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
                {/* Sugerencia de Inicio (Global para el modal) */}
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

                <div className="flex-1 flex overflow-hidden">
                {/* 1. Panel Izquierdo: Backlog Disponible */}
                <div className="w-1/3 flex flex-col border-r border-slate-200 bg-white">
                   <div className="p-5 border-b border-slate-100">
                     <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                        <Database size={14} className="text-primary" />
                        Backlog Disponible
                     </h4>
                     <p className="text-[9px] font-bold text-slate-400 mt-1">Actividades esperando ser programadas.</p>
                   </div>
                   <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-3">
                     {backlog.filter(t => !dayTasks.some(dt => dt.backlog_id === t.id)).map(task => (
                       <div key={task.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-primary/30 transition-all group flex flex-col gap-2 relative overflow-hidden">
                         <div className="flex items-center justify-between">
                            <span className="text-[7px] font-black bg-white text-slate-400 px-2 py-0.5 rounded-md uppercase border border-slate-100">{task.area || 'Gral'}</span>
                            {(() => {
                              const prio = PRIORITIES.find(p => p.value === task.prioridad) || PRIORITIES[3];
                              return (
                                <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase text-white shadow-sm ${prio.color}`}>
                                  {prio.label}
                                </span>
                              );
                            })()}
                         </div>
                         <p className="text-[10px] font-bold text-slate-700 leading-snug pr-4">{task.actividad}</p>
                         
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
                     ))}
                     {backlog.filter(t => !dayTasks.some(dt => dt.backlog_id === t.id)).length === 0 && (
                       <div className="text-center p-6 text-[10px] font-bold text-slate-400">No hay tareas disponibles en el backlog.</div>
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
                    {dayTasks.length > 0 && (
                      <button 
                        onClick={handleClearAllTasks}
                        className="text-[9px] font-black text-slate-400 hover:text-red-500 uppercase tracking-widest transition-colors flex items-center gap-1"
                      >
                        <Trash2 size={12} /> Limpiar Todo
                      </button>
                    )}
                  </div>

                  {/* Tareas Pendientes del Día Anterior */}
                  {pendingSuggestions.length > 0 && (
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
                                  const prio = PRIORITIES.find(p => p.value === t.prioridad) || PRIORITIES[3];
                                  return (
                                    <span className={`text-[7px] font-black px-2.5 py-1 rounded-full uppercase text-white text-center tracking-widest shadow-sm ${prio.color}`}>
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
                                const prio = PRIORITIES.find(p => p.value === t.prioridad) || PRIORITIES[3];
                                return (
                                  <span className={`text-[7px] font-black px-2 py-0.5 rounded-full uppercase text-white shadow-sm ${prio.color} w-fit`}>
                                    {prio.label}
                                  </span>
                                );
                              })()}
                            </div>
                            <span className="text-[11px] font-bold text-slate-700">{t.actividad}</span>
                          </div>
                          <button onClick={async () => {
                            await fetch(`/api/tareas/${t.id}`, { method: 'DELETE' });
                            setDayTasks(prev => prev.filter(x => x.id !== t.id));
                            fetchBacklog();
                          }} className="text-slate-200 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
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

                {/* 3. Panel Derecho: IA y Resumen de Tiempo */}
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
                      
                        <div className="bg-primary/5 border border-primary/10 rounded-2xl p-5 flex flex-col items-center text-center mt-2 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-2 opacity-5">
                            <Clock size={40} className="text-primary" />
                          </div>
                          <span className="text-[10px] font-black text-primary uppercase tracking-widest mb-1 relative z-10">Jornada Efectiva</span>
                          <span className="text-2xl font-black text-primary relative z-10">{availableHours.toFixed(1)}h</span>
                        </div>
                    </div>
                  </div>

                  {/* Calculo de Capacidad Visual */}
                  <div className="p-6 flex-1 flex flex-col gap-6 bg-white">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga del Día</span>
                        <span className={`text-[10px] font-black uppercase ${remainingHours < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                          {remainingHours < 0 ? 'Sobrecargado' : 'Capacidad Óptima'}
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex shadow-inner">
                        <div 
                          className={`h-full transition-all duration-500 ${remainingHours < 0 ? 'bg-red-500' : 'bg-emerald-500'}`}
                          style={{ width: `${Math.min((usedHours / availableHours) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                    
                    {remainingHours < 0 ? (
                      <div className="mt-2 bg-orange-50 rounded-2xl p-5 border border-orange-200">
                        <h5 className="text-[10px] font-black text-orange-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <AlertTriangle size={14} /> Capacidad Alcanzada
                        </h5>
                        <p className="text-[9px] font-bold text-orange-600/90 leading-relaxed">
                          La planificación actual supera el tiempo disponible. Atenea no puede construir una agenda realista con esta carga.
                        </p>
                        <p className="text-[9px] font-bold text-orange-600/90 leading-relaxed mt-2">
                          Puedes ajustar la cantidad de actividades o redefinir prioridades para continuar.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-2 bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
                        <h5 className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <ListChecks size={14} /> Planificación Válida
                        </h5>
                        <p className="text-[9px] font-bold text-emerald-600/90 leading-relaxed">
                          Las actividades seleccionadas encajan perfectamente en tu jornada.
                        </p>
                        <p className="text-[9px] font-bold text-emerald-600/90 leading-relaxed mt-2">
                          La agenda del día está lista para ser ejecutada.
                        </p>
                      </div>
                    )}
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
                   Distribución de Jornada y Excepciones (L-V)
                </p>
             </div>
          </h2>
        </div>
      </div>

      <div className="latam-card !p-8 bg-white border border-slate-100 shadow-2xl shadow-slate-200/40 rounded-[40px]">
        <div className="flex flex-col md:flex-row justify-start items-center gap-4 mb-8 pb-6 border-b border-slate-50">
          <div className="flex items-center bg-slate-50 p-1 rounded-2xl gap-2">
             <button onClick={() => setWeekOffset(prev => prev - 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-primary transition-all">
                <ArrowRight size={18} className="rotate-180" />
             </button>
             <div className="px-6 py-1 flex flex-col items-center min-w-[120px]">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Semana</span>
                <span className="text-sm font-black text-primary uppercase">#{currentWeekNumber}</span>
             </div>
             <button onClick={() => setWeekOffset(prev => prev + 1)} className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-400 hover:text-primary transition-all">
                <ArrowRight size={18} />
             </button>
          </div>

          <div className="h-10 w-px bg-slate-100 mx-2 hidden md:block" />

          {/* Botón Compacto Jornada */}
          <button 
            onClick={() => setIsJornadaModalOpen(true)}
            className="px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-2xl hover:border-primary/40 hover:bg-white transition-all flex items-center gap-3 group"
          >
            <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
              <Clock size={16} />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-1">Jornada</span>
              <span className="text-xs font-black text-slate-800">{startTime} - {endTime}</span>
            </div>
          </button>

          <button 
            onClick={() => {
              setIsExcepcionModalOpen(true);
            }}
            className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all shadow-lg flex items-center gap-2"
          >
            <Plus size={16} /> Añadir Excepción
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">


          {weekDates.map((date, index) => {
            const diaNombre = DIAS[index];
            const dateStr = date.toISOString().split('T')[0];
            const dayBlocks = bloques.filter(b => b.dia_semana === diaNombre || b.fecha === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const isFuture = dateStr > new Date().toISOString().split('T')[0];

            return (
              <div 
                key={diaNombre} 
                id={`day-col-${dateStr}`}
                onDragOver={e => !isFuture && e.preventDefault()}
                onDrop={e => !isFuture && handleDropToDay(e, dateStr)}
                onClick={() => {
                  if (isFuture) return;
                  setSelectedPlanningDate(dateStr); 
                  setIsPlanningModalOpen(true); 
                }}
                className={`flex flex-col rounded-2xl border overflow-hidden transition-all relative group ${isFuture ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:shadow-md'} ${isToday ? 'bg-primary/5 border-primary/20 shadow-md ring-1 ring-primary/10' : 'bg-slate-50/50 border-slate-100'}`}
              >
                {isFuture && (
                  <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-end pb-4 bg-slate-50/10">
                     <div className="bg-white/90 backdrop-blur-sm border border-slate-200 px-3 py-1.5 rounded-full shadow-sm flex items-center gap-2 mb-2">
                       <Clock size={12} className="text-slate-400" />
                       <span className="text-[7px] font-black text-slate-500 uppercase tracking-widest">Planificación Cerrada</span>
                     </div>
                  </div>
                )}
                <div className={`p-3 transition-colors text-center ${isToday ? 'bg-primary text-white' : 'bg-primary group-hover:bg-primary-soft text-white'}`}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest">{diaNombre}</h4>
                  <p className={`text-[9px] font-bold mt-0.5 ${isToday ? 'text-white/80' : 'text-white/60'}`}>{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</p>
                </div>
                
                <div className="p-4 space-y-5">
                   <div 
                     onClick={(e) => {
                       e.stopPropagation();
                       setStartDate(dateStr);
                       setEndDate(dateStr);
                       const plan = dailyPlans[dateStr];
                       setStartTime(plan?.hora_inicio || '08:00');
                       setEndTime(plan?.hora_fin || '17:00');
                       setIsJornadaModalOpen(true);
                     }}
                     className={`relative pl-3 border-l-2 hover:bg-primary/5 transition-all rounded-r-lg p-2 cursor-pointer group/jornada ${isToday ? 'border-primary bg-primary/5' : 'border-primary/20'}`}
                   >
                     <div className="flex items-center justify-between">
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Jornada Base</span>
                       <div className="opacity-0 group-hover/jornada:opacity-100 transition-opacity">
                         <Save size={8} className="text-primary" />
                       </div>
                     </div>
                     <div className="flex items-center gap-2 mt-1">
                       <Clock size={10} className={isToday ? 'text-primary' : 'text-primary/60'} />
                       <span className="text-[10px] font-black text-slate-700">
                         {dailyPlans[dateStr]?.hora_inicio || '08:00'} - {dailyPlans[dateStr]?.hora_fin || '17:00'}
                       </span>
                     </div>
                   </div>

                   {/* Excepciones */}
                   <div className="space-y-3 pt-2 border-t border-slate-50">
                     <div className="flex items-center justify-between">
                       <div className="flex items-center gap-2">
                         <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Excepciones</span>
                         <span className="text-[7px] font-black text-primary/30 px-1.5 py-0.5 bg-slate-50 rounded-md">{dayBlocks.length}</span>
                       </div>
                       <button 
                         onClick={(e) => {
                           e.stopPropagation();
                           setNewBlock(prev => ({ ...prev, fecha: dateStr, isRecurrente: false }));
                           setIsExcepcionModalOpen(true);
                         }}
                         className="p-1 hover:bg-accent/10 rounded-md text-accent transition-all group/add"
                       >
                         <Plus size={10} className="group-hover/add:scale-125 transition-transform" />
                       </button>
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
                                 className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 transition-all p-1"
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
                         <div className="py-6 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-1 opacity-40">
                           <span className="text-[7px] font-black text-slate-300 uppercase">Sin excepciones</span>
                         </div>
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
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsAiModalOpen(true)}
              className="px-5 py-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-xl hover:bg-emerald-600 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-sm"
            >
              <Wand2 size={14} /> IA Asistente
            </button>
            <button 
              onClick={() => { setEditingTask({ prioridad: 10 }); setIsModalOpen(true); }}
              className="px-6 py-3 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary-soft transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
            >
              <Plus size={14} /> Nueva Tarea
            </button>
          </div>
        </div>

        {/* Tablero Kanban en Formato de 4 Columnas Verticales con Scroll Independiente */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 flex-1 min-h-[580px] overflow-hidden pb-4">
          {PRIORITIES.map(priority => {
            const tasks = backlog.filter(t => t.prioridad === priority.value);
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
                    <span className={`w-2.5 h-2.5 rounded-full ${priority.color}`} />
                    <span className="text-[10px] font-black text-slate-800 tracking-wider">{priority.label}</span>
                  </div>
                  <span className="text-[9px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    {tasks.length}
                  </span>
                </div>
 
                {/* Contenedor de Tareas Vertical con Scrollbar */}
                <div className="flex-1 flex flex-col gap-3 overflow-y-auto pr-1 custom-scrollbar pb-4">
                  {tasks.length > 0 ? (
                    tasks.map(task => (
                      <div 
                        key={task.id} 
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                        className={`w-full p-4 rounded-2xl border shadow-sm transition-all group/card relative cursor-pointer active:scale-95 flex flex-col gap-2 ${
                          task.status === 'nuevo'
                            ? 'bg-amber-50 border-amber-200 shadow-md ring-2 ring-amber-500/20'
                          : task.status === 'abierto' 
                            ? 'bg-red-50 border-red-200 shadow-md ring-2 ring-red-500/20' 
                          : task.status === 'pendiente' 
                            ? 'bg-sky-50 border-sky-200 hover:shadow-md hover:border-sky-500/30' 
                          : task.status === 'en espera'
                            ? 'bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
                          : task.status === 'resuelto'
                            ? 'bg-slate-100 border-slate-200 opacity-80'
                          : task.status === 'fallo' || task.status === 'fallido'
                            ? 'bg-rose-50 border-rose-200 shadow-md ring-2 ring-rose-500/20'
                          : 'bg-white border-slate-200 hover:shadow-md hover:border-primary/30'
                        }`}
                      >
                         <div className="flex items-center justify-between">
                            <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">#{task.id}</span>
                            <div className="flex gap-1.5">
                              <span className={`text-[7px] font-black px-2 py-0.5 rounded-md uppercase border ${
                                task.status === 'nuevo' ? 'bg-amber-500 text-white border-amber-600' :
                                task.status === 'abierto' ? 'bg-red-600 text-white border-red-700' :
                                task.status === 'pendiente' ? 'bg-sky-500 text-white border-sky-600' :
                                task.status === 'en espera' ? 'bg-slate-900 text-white border-slate-900' :
                                task.status === 'resuelto' ? 'bg-slate-500 text-white border-slate-600' :
                                task.status === 'despriorizado' ? 'bg-slate-400 text-white border-slate-500' :
                                'bg-rose-700 text-white border-rose-800'
                              }`}>
                                {task.status === 'nuevo' ? 'NUEVO' :
                                 task.status === 'abierto' ? 'ABIERTO' :
                                 task.status === 'pendiente' ? 'PENDIENTE' :
                                 task.status === 'en espera' ? 'EN ESPERA' :
                                 task.status === 'resuelto' ? 'RESUELTO' :
                                 task.status === 'despriorizado' ? 'DESPRIORIZADO' : 'FALLO'}
                              </span>
                              <span className="text-[7px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md uppercase">{task.area || 'Gral'}</span>
                            </div>
                            {task.created_at && (
                              <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24)) > 2 
                                  ? 'text-red-500 bg-red-50' 
                                  : 'text-slate-400 bg-slate-50'
                              }`}>
                                <Clock size={10} /> {Math.floor((new Date().getTime() - new Date(task.created_at).getTime()) / (1000 * 60 * 60 * 24))}d
                              </div>
                            )}
                          </div>
                         <p className="text-[10px] font-black text-slate-800 uppercase tracking-tight leading-snug">{task.actividad}</p>
                         <div className="flex justify-between items-end mt-auto pt-2 border-t border-slate-50">
                            <span className="text-[8px] font-bold text-slate-400">{task.created_at ? new Date(task.created_at).toLocaleDateString() : 'N/A'}</span>
                            <button onClick={(e) => { e.stopPropagation(); deleteBacklog(task.id); }} className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover/card:opacity-100">
                              <Trash2 size={12} />
                            </button>
                         </div>
                      </div>
                    ))
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
      </>
    </div>
  );
}
