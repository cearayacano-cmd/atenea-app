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

  // Bloques
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [newBlock, setNewBlock] = useState({ isRecurrente: false, dias: [] as string[], fecha: new Date().toISOString().split('T')[0], inicio: '13:00', fin: '14:00', tipo: 'Almuerzo' });

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
  const [editingTask, setEditingTask] = useState<Partial<BacklogItem> | null>(null);

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
  }, []);

  const fetchConfig = () => fetch('/api/configuracion').then(res => res.json()).then(data => {
    if (data) {
      if (data.hora_inicio) setStartTime(data.hora_inicio);
      if (data.hora_fin) setEndTime(data.hora_fin);
    }
  }).catch(() => {});

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

    try {
      // Crear tarea para ese día
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: dateStr,
          actividad: task.actividad,
          prioridad: task.prioridad,
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
      status: editingTask.status || 'pendiente',
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

  const handleSaveConfig = async () => {
    setIsSaving(true);
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
          body: JSON.stringify({ date, hora_inicio: startTime, hora_fin: endTime, horas_efectivas: 6 }),
        })
      ));
      setMessage('Horario actualizado');
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
          body: JSON.stringify({ dia_semana: dia, hora_inicio: newBlock.inicio, hora_fin: newBlock.fin, tipo: newBlock.tipo }),
        });
      }
    } else {
      await fetch('/api/bloques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: newBlock.fecha, hora_inicio: newBlock.inicio, hora_fin: newBlock.fin, tipo: newBlock.tipo }),
      });
    }
    setNewBlock({ ...newBlock, dias: [] });
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

  const calculateTimeInfo = () => {
    const weights: Record<number, number> = { 10: 2, 7: 1.5, 4: 1, 2: 0.5 };
    let usedHours = 0;
    dayTasks.forEach(t => {
      usedHours += weights[t.prioridad] || 1;
    });

    const safeStart = startTime || '08:00';
    const safeEnd = endTime || '17:00';
    const [startH, startM] = safeStart.split(':').map(Number);
    const [endH, endM] = safeEnd.split(':').map(Number);
    let availableHours = (endH + (endM || 0) / 60) - (startH + (startM || 0) / 60);
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
                      <option value="pendiente">Pendiente</option>
                      <option value="progreso">En Progreso</option>
                      <option value="finalizado">Finalizado</option>
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
            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl h-[85vh] flex flex-col overflow-hidden border border-white/20">
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

              <div className="flex-1 flex overflow-hidden bg-slate-50">
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
                <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <ListChecks size={16} className="text-primary" />
                      Tareas de {selectedPlanningDate} ({dayTasks.length})
                    </h4>
                  </div>
                  {dayTasks.length > 0 ? (
                    <div className="space-y-3">
                      {dayTasks.map(t => (
                        <div key={t.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between group">
                          <div className="flex flex-col gap-1.5">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-tight">{t.actividad}</span>
                            <div className="flex items-center gap-2">
                              <span className="text-[8px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md uppercase">{t.area || 'Gral'}</span>
                              {(() => {
                                const prio = PRIORITIES.find(p => p.value === t.prioridad) || PRIORITIES[3];
                                return (
                                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase text-white shadow-sm ${prio.color}`}>
                                    {prio.label}
                                  </span>
                                );
                              })()}
                            </div>
                          </div>
                          <button onClick={async () => {
                            await fetch(`/api/tareas/${t.id}`, { method: 'DELETE' });
                            setDayTasks(prev => prev.filter(x => x.id !== t.id));
                            fetchBacklog();
                          }} className="text-slate-300 hover:text-red-500 transition-colors p-2 opacity-0 group-hover:opacity-100">
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
                <div className="w-[320px] bg-white border-l border-slate-100 flex flex-col">
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
                        <span className="text-2xl font-black text-slate-800 relative z-10">{availableHours.toFixed(1)} <span className="text-[10px] text-slate-400">hrs</span></span>
                        <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-2 bg-white px-3 py-1 rounded-full shadow-sm relative z-10">Disponibles</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculo de Capacidad */}
                  <div className="p-6 flex-1 flex flex-col gap-4 bg-white">
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Tiempo Planificado</span>
                       <span className="text-[11px] font-black text-slate-800">{usedHours.toFixed(1)} hrs</span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                       <span className="text-[10px] font-bold text-slate-500 uppercase">Tiempo Restante</span>
                       <span className={`text-[11px] font-black ${remainingHours < 0 ? 'text-red-500' : 'text-emerald-500'}`}>{remainingHours.toFixed(1)} hrs</span>
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 1. CALENDARIO SEMANAL L-V */}
      <div className="latam-card !p-6 bg-white border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-50">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Calendar size={18} />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Visualización Semanal Operativa</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Distribución de Jornada y Excepciones (L-V)</p>
              </div>
            </div>

            {/* Selector de Semana */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl gap-2">
               <button onClick={() => setWeekOffset(prev => prev - 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-primary transition-all">
                  <ArrowRight size={14} className="rotate-180" />
               </button>
               <div className="px-4 py-1 flex flex-col items-center min-w-[100px]">
                  <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Semana</span>
                  <span className="text-[12px] font-black text-primary uppercase">#{currentWeekNumber}</span>
               </div>
               <button onClick={() => setWeekOffset(prev => prev + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 hover:text-primary transition-all">
                  <ArrowRight size={14} />
               </button>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Botón Compacto Jornada */}
            <button 
              onClick={() => setIsJornadaModalOpen(true)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-primary/40 hover:bg-white transition-all flex items-center gap-2 group"
            >
              <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
                <Clock size={14} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Jornada</span>
                <span className="text-[9px] font-black text-slate-700">{startTime} - {endTime}</span>
              </div>
            </button>

            {/* Botón Compacto Excepción */}
            <button 
              onClick={() => setIsExcepcionModalOpen(true)}
              className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:border-accent/40 hover:bg-white transition-all flex items-center gap-2 group"
            >
              <div className="w-6 h-6 rounded-lg bg-accent/10 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-white transition-all">
                <Plus size={14} />
              </div>
              <div className="flex flex-col items-start">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">Añadir</span>
                <span className="text-[9px] font-black text-slate-700 uppercase">Excepción</span>
              </div>
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {weekDates.map((date, index) => {
            const diaNombre = DIAS[index];
            const dateStr = date.toISOString().split('T')[0];
            const dayBlocks = bloques.filter(b => b.dia_semana === diaNombre || b.fecha === dateStr);
            const isToday = new Date().toISOString().split('T')[0] === dateStr;

            return (
              <div 
                key={diaNombre} 
                id={`day-col-${dateStr}`}
                onDragOver={e => e.preventDefault()}
                onDrop={e => handleDropToDay(e, dateStr)}
                onClick={() => { setSelectedPlanningDate(dateStr); setIsPlanningModalOpen(true); }}
                className={`flex flex-col rounded-2xl border overflow-hidden transition-all hover:shadow-md group cursor-pointer ${isToday ? 'bg-primary/5 border-primary/20 shadow-md ring-1 ring-primary/10' : 'bg-slate-50/50 border-slate-100'}`}
              >
                <div className={`p-3 transition-colors text-center ${isToday ? 'bg-primary text-white' : 'bg-primary group-hover:bg-primary-soft text-white'}`}>
                  <h4 className="text-[10px] font-black uppercase tracking-widest">{diaNombre}</h4>
                  <p className={`text-[9px] font-bold mt-0.5 ${isToday ? 'text-white/80' : 'text-white/60'}`}>{date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' })}</p>
                </div>
                
                <div className="p-4 space-y-5">
                  {/* Jornada Base */}
                  <div className={`relative pl-3 border-l-2 ${isToday ? 'border-primary' : 'border-primary/20'}`}>
                    <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Jornada Base</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock size={10} className={isToday ? 'text-primary' : 'text-primary/60'} />
                      <span className="text-[10px] font-black text-slate-700">{startTime} - {endTime}</span>
                    </div>
                  </div>

                  {/* Excepciones */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Excepciones</span>
                      <span className="text-[7px] font-black text-primary/40 uppercase">{dayBlocks.length}</span>
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
                              <button onClick={() => deleteBloque(b.id)} className="opacity-0 group-hover/item:opacity-100 text-slate-300 hover:text-red-500 transition-all">
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
            <button onClick={() => fetch('/api/reset-database', { method: 'POST' }).then(() => window.location.reload())} className="px-4 py-2 text-[9px] font-black text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all flex items-center gap-2">
              <Database size={12} /> REINICIAR TABLERO
            </button>
          </div>
        </div>

        {/* Tablero Kanban en Formato Swimlanes con Cuadrícula Compacta */}
        <div className="flex flex-col gap-6 flex-1 h-full overflow-y-auto pr-2 custom-scrollbar pb-4">
          {PRIORITIES.map(priority => {
            const tasks = backlog.filter(t => t.prioridad === priority.value);
            return (
              <div 
                key={priority.value} 
                onDragOver={e => e.preventDefault()}
                onDrop={e => onDrop(e, priority.value)}
                className="flex gap-4 items-stretch group/lane bg-white/40 p-4 rounded-[24px] border border-slate-100 shadow-sm"
              >
                {/* Etiqueta Lateral de Prioridad */}
                <div className={`w-12 rounded-xl flex items-center justify-center transition-all ${priority.color.replace('bg-', 'bg-opacity-20 text-')}`} style={{ backgroundColor: priority.color.includes('bg-') ? undefined : priority.color + '15' }}>
                  <div className={`flex flex-col items-center gap-2 py-4`}>
                    <span className="text-[9px] font-black text-slate-400 bg-white/80 px-2 py-0.5 rounded-full mb-2">
                      {tasks.length}
                    </span>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.3em] -rotate-180 [writing-mode:vertical-lr] whitespace-nowrap drop-shadow-sm opacity-80">
                      {priority.label}
                    </h5>
                  </div>
                </div>

                {/* Contenedor Grid de Tareas */}
                <div className="flex-1 flex flex-wrap gap-4 content-start">
                  {tasks.length > 0 ? (
                    tasks.map(task => (
                      <div 
                        key={task.id} 
                        draggable
                        onDragStart={e => handleDragStart(e, task.id)}
                        onClick={() => { setEditingTask(task); setIsModalOpen(true); }}
                        className={`w-[240px] p-4 rounded-2xl border shadow-sm transition-all group/card relative cursor-pointer active:scale-95 flex flex-col gap-2 ${
                          task.status === 'progreso' 
                            ? 'bg-slate-50 border-slate-200 opacity-60 grayscale hover:grayscale-0 hover:opacity-100' 
                            : 'bg-white border-slate-200 hover:shadow-md hover:border-primary/30'
                        }`}
                      >
                         <div className="flex items-center justify-between">
                           <span className="text-[7px] font-black text-slate-300 uppercase tracking-widest">#{task.id}</span>
                           <span className="text-[7px] font-black bg-slate-50 text-slate-400 px-2 py-0.5 rounded-md uppercase">{task.area || 'Gral'}</span>
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
                    <div className="w-full flex items-center justify-center opacity-40 py-6 border-2 border-dashed border-slate-200 rounded-2xl">
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sin tareas en esta prioridad</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
