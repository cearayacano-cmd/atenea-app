import { useState, useEffect } from 'react';
import { 
  Zap, Calendar, ListChecks, Brain, Plus, Trash2, 
  ChevronLeft, ChevronRight, Clock, AlertCircle, Sparkles,
  Settings, Save, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BacklogItem {
  id: number;
  task: string;
  priority: string;
  status: string;
  area?: string;
  estimated_minutes?: number;
}

interface Bloque {
  id: number;
  fecha: string | null;
  dia_semana: string | null;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPOS = ['Almuerzo', 'Reunión', 'Personal', 'Otro'];
const PRIORITIES = [
  { label: 'CRÍTICA', value: 10, color: '#DC2626', mins: 120 },
  { label: 'ALTA', value: 7, color: '#F97316', mins: 90 },
  { label: 'MEDIA', value: 4, color: '#F59E0B', mins: 45 },
  { label: 'BAJA', value: 2, color: '#10B981', mins: 15 },
];

export default function CommandCenterView() {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [iaInput, setIaInput] = useState('');
  const [isProcessingIA, setIsProcessingIA] = useState(false);
  const [plannedTasks, setPlannedTasks] = useState<Record<string, any[]>>({});
  const [showConfig, setShowConfig] = useState(false);
  
  // Availability Config States
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [effectiveHours, setEffectiveHours] = useState<number | string>(6);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMessage, setConfigMessage] = useState('');
  const [availability, setAvailability] = useState<any>(null);

  // New Block States
  const [newRecurrente, setNewRecurrente] = useState({ dias: [] as string[], inicio: '13:00', fin: '14:00', tipo: 'Almuerzo' });
  const [newEspecifico, setNewEspecifico] = useState({ fecha: new Date().toISOString().split('T')[0], inicio: '09:00', fin: '10:00', tipo: 'Reunión' });

  const today = new Date();
  const [selectedWeekStart, setSelectedWeekStart] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  });

  const weekDates = Array.from({ length: 5 }, (_, i) => {
    const d = new Date(selectedWeekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  useEffect(() => {
    fetchData();
  }, [selectedWeekStart]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [backlogRes, bloquesRes, configRes] = await Promise.all([
        fetch('/api/backlog'),
        fetch('/api/bloques'),
        fetch('/api/configuracion')
      ]);
      
      const backlogData = await backlogRes.json();
      const bloquesData = await bloquesRes.json();
      const configData = await configRes.json();
      
      setBacklog(backlogData.filter((item: any) => item.status === 'pendiente'));
      setBloques(bloquesData);
      setAvailability(configData);
      
      // Update form states
      if (configData) {
        setStartTime(configData.hora_inicio || '08:00');
        setEndTime(configData.hora_fin || '17:00');
        setEffectiveHours(configData.horas_efectivas || 6);
      }
      
      const tasksByDay: Record<string, any[]> = {};
      await Promise.all(weekDates.map(async (date) => {
        const res = await fetch(`/api/tareas?fecha=${date}`);
        const data = await res.json();
        tasksByDay[date] = data.tasks || [];
      }));
      setPlannedTasks(tasksByDay);

    } catch (error) {
      console.error("Error fetching command center data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    try {
      const hours = typeof effectiveHours === 'string' ? parseFloat(effectiveHours) : effectiveHours;
      const dates = getDatesInRange(startDate, endDate);
      const promises = dates.map(date => 
        fetch('/api/plan-diario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date, hora_inicio: startTime, hora_fin: endTime, horas_efectivas: hours }),
        })
      );
      await Promise.all(promises);
      await fetch('/api/configuracion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hora_inicio: startTime, hora_fin: endTime, horas_efectivas: hours })
      });
      setConfigMessage(`Configuración guardada para ${dates.length} día(s)`);
      fetchData();
      setTimeout(() => setConfigMessage(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSavingConfig(false);
    }
  };

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (current <= last) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleAddRecurrente = async () => {
    if (newRecurrente.dias.length === 0) return;
    for (const dia of newRecurrente.dias) {
      await fetch('/api/bloques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dia_semana: dia, hora_inicio: newRecurrente.inicio, hora_fin: newRecurrente.fin, tipo: newRecurrente.tipo }),
      });
    }
    setNewRecurrente(prev => ({ ...prev, dias: [] }));
    fetchData();
  };

  const handleAddEspecifico = async () => {
    await fetch('/api/bloques', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fecha: newEspecifico.fecha, hora_inicio: newEspecifico.inicio, hora_fin: newEspecifico.fin, tipo: newEspecifico.tipo }),
    });
    fetchData();
  };

  const deleteBloque = async (id: number) => {
    await fetch(`/api/bloques/${id}`, { method: 'DELETE' });
    fetchData();
  };

  const toggleDay = (day: string) => {
    setNewRecurrente(prev => {
      const dias = prev.dias.includes(day) ? prev.dias.filter(d => d !== day) : [...prev.dias, day];
      return { ...prev, dias };
    });
  };

  const toggleAllDays = () => {
    setNewRecurrente(prev => {
      const allSelected = prev.dias.length === DIAS.length;
      return { ...prev, dias: allSelected ? [] : [...DIAS] };
    });
  };

  const handleIACapture = async () => {
    if (!iaInput.trim()) return;
    setIsProcessingIA(true);
    try {
      const res = await fetch('/api/ia/procesar-backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: iaInput })
      });
      if (res.ok) {
        setIaInput('');
        fetchData();
      }
    } catch (error) {
      console.error("IA Capture error:", error);
    } finally {
      setIsProcessingIA(false);
    }
  };

  const calculateDayCapacity = (date: string) => {
    const dateObj = new Date(date + 'T00:00:00');
    const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const normalizedDay = dayNames[dateObj.getDay()];
    
    // Total day duration from availability config
    let totalMins = 9 * 60; 
    if (availability) {
      const start = availability.hora_inicio.split(':').map(Number);
      const end = availability.hora_fin.split(':').map(Number);
      totalMins = (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    }
    
    // Busy mins from blocks
    const dayBlocks = bloques.filter(b => b.fecha === date || b.dia_semana === normalizedDay);
    const busyMins = dayBlocks.reduce((acc, b) => {
      const start = b.hora_inicio.split(':').map(Number);
      const end = b.hora_fin.split(':').map(Number);
      return acc + (end[0] * 60 + end[1]) - (start[0] * 60 + start[1]);
    }, 0);
    
    return Math.max(0, totalMins - busyMins);
  };

  const loadTaskToDay = async (task: BacklogItem, date: string) => {
    try {
      const res = await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: date,
          actividad: task.task,
          prioridad: task.priority === 'CRÍTICA' ? 10 : (task.priority === 'ALTA' ? 7 : (task.priority === 'MEDIA' ? 4 : 2)),
          backlog_id: task.id,
          tiempo_asignado_minutos: task.estimated_minutes || 60
        })
      });
      
      if (res.ok) {
        // Update backlog status to 'planificada'
        await fetch(`/api/backlog/${task.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'planificada' })
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error loading task to day:", error);
    }
  };

  const handleSeedData = async () => {
    try {
      const res = await fetch('/api/seed-data', { method: 'POST' });
      if (res.ok) {
        fetchData();
        setConfigMessage("Datos ficticios cargados");
        setTimeout(() => setConfigMessage(''), 3000);
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-border-soft">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-xl text-primary">
            <Zap size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-primary">Centro de Mando</h2>
            <p className="text-xs text-text-muted font-medium">Gestión Operativa e Inteligencia de Carga</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <button 
            onClick={handleSeedData}
            className="text-[10px] font-black text-accent border border-accent/20 px-3 py-1.5 rounded-lg hover:bg-accent/5 transition-all uppercase"
          >
            Cargar Demos
          </button>

          <div className="flex items-center gap-3 bg-bg-main p-1.5 rounded-xl border border-border-soft">
            <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronLeft size={18} /></button>
            <div className="px-4 py-1 text-sm font-bold text-primary">
              Semana del {new Date(selectedWeekStart + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
            </div>
            <button className="p-2 hover:bg-white hover:shadow-sm rounded-lg transition-all"><ChevronRight size={18} /></button>
          </div>

          <button 
            onClick={() => setShowConfig(!showConfig)}
            className={`p-3 rounded-xl transition-all flex items-center gap-2 font-bold text-xs uppercase tracking-widest ${
              showConfig ? 'bg-primary text-white' : 'bg-white border border-border-soft text-text-muted hover:border-primary hover:text-primary'
            }`}
          >
            <Settings size={18} />
            Configuración
          </button>
        </div>
      </div>

      {/* COLLAPSIBLE CONFIG SECTION */}
      <AnimatePresence>
        {showConfig && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Daily Plan Config */}
              <div className="latam-card !p-6 border-t-4 border-accent">
                <h3 className="text-sm font-black text-primary mb-6 uppercase flex items-center gap-2">
                  <Clock size={16} className="text-accent" />
                  Horario Operativo
                </h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase mb-1 block">Inicio</label>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="latam-input !p-2 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase mb-1 block">Fin</label>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="latam-input !p-2 text-xs" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase mb-1 block">Entrada</label>
                      <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} className="latam-input !p-2 text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-text-muted uppercase mb-1 block">Salida</label>
                      <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} className="latam-input !p-2 text-xs" />
                    </div>
                  </div>
                  <button 
                    onClick={handleSaveConfig}
                    disabled={isSavingConfig}
                    className="latam-btn-primary w-full py-2 text-xs flex items-center justify-center gap-2"
                  >
                    <Save size={14} />
                    {isSavingConfig ? 'Guardando...' : 'Aplicar Horario'}
                  </button>
                  {configMessage && <p className="text-[10px] text-center font-bold text-[#7DA81A]">{configMessage}</p>}
                </div>
              </div>

              {/* Recurring Blocks */}
              <div className="latam-card !p-6 border-t-4 border-primary">
                <h3 className="text-sm font-black text-primary mb-6 uppercase flex items-center gap-2">
                  <Calendar size={16} className="text-primary" />
                  Bloques Recurrentes
                </h3>
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-1">
                    {DIAS.map(d => (
                      <button 
                        key={d} 
                        onClick={() => toggleDay(d)}
                        className={`px-2 py-1 rounded text-[10px] font-black border transition-all ${
                          newRecurrente.dias.includes(d) ? 'bg-primary text-white border-primary' : 'bg-bg-main text-text-muted border-border-soft'
                        }`}
                      >
                        {d.charAt(0)}
                      </button>
                    ))}
                    <button onClick={toggleAllDays} className="px-2 py-1 rounded text-[10px] font-black bg-bg-main text-primary border border-border-soft">T</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={newRecurrente.inicio} onChange={e => setNewRecurrente({...newRecurrente, inicio: e.target.value})} className="latam-input !p-2 text-xs" />
                    <input type="time" value={newRecurrente.fin} onChange={e => setNewRecurrente({...newRecurrente, fin: e.target.value})} className="latam-input !p-2 text-xs" />
                  </div>
                  <select 
                    value={newRecurrente.tipo} 
                    onChange={e => setNewRecurrente({...newRecurrente, tipo: e.target.value})}
                    className="latam-input !p-2 text-xs w-full"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={handleAddRecurrente} className="latam-btn-primary !bg-primary-soft w-full py-2 text-xs flex items-center justify-center gap-2">
                    <Plus size={14} /> Agregar Semanal
                  </button>
                </div>
              </div>

              {/* Specific Blocks */}
              <div className="latam-card !p-6 border-t-4 border-accent">
                <h3 className="text-sm font-black text-primary mb-6 uppercase flex items-center gap-2">
                  <AlertCircle size={16} className="text-accent" />
                  Bloques Específicos
                </h3>
                <div className="space-y-4">
                  <input type="date" value={newEspecifico.fecha} onChange={e => setNewEspecifico({...newEspecifico, fecha: e.target.value})} className="latam-input !p-2 text-xs w-full" />
                  <div className="grid grid-cols-2 gap-3">
                    <input type="time" value={newEspecifico.inicio} onChange={e => setNewEspecifico({...newEspecifico, inicio: e.target.value})} className="latam-input !p-2 text-xs" />
                    <input type="time" value={newEspecifico.fin} onChange={e => setNewEspecifico({...newEspecifico, fin: e.target.value})} className="latam-input !p-2 text-xs" />
                  </div>
                  <select 
                    value={newEspecifico.tipo} 
                    onChange={e => setNewEspecifico({...newEspecifico, tipo: e.target.value})}
                    className="latam-input !p-2 text-xs w-full"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <button onClick={handleAddEspecifico} className="latam-btn-primary !bg-accent w-full py-2 text-xs flex items-center justify-center gap-2">
                    <Plus size={14} /> Agregar Específico
                  </button>
                </div>
              </div>
            </div>

            {/* List of current blocks in the config section for deletion */}
            <div className="flex gap-4 overflow-x-auto pb-6 custom-scrollbar">
              {bloques.map(b => (
                <div key={b.id} className="flex-shrink-0 p-3 bg-white border border-border-soft rounded-xl shadow-sm flex items-center gap-3 group min-w-[180px]">
                  <div className={`w-1 h-8 rounded-full ${b.dia_semana ? 'bg-primary' : 'bg-accent'}`} />
                  <div className="flex-1 overflow-hidden">
                    <p className="text-[10px] font-black text-primary truncate">{b.dia_semana || b.fecha}</p>
                    <p className="text-[9px] font-bold text-text-strong truncate">{b.tipo} | {b.hora_inicio}-{b.hora_fin}</p>
                  </div>
                  <button onClick={() => deleteBloque(b.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all" title="Eliminar bloque">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TOP SECTION: El Cerebro (IA Capture) */}
      <div className="latam-card !p-0 overflow-hidden">
        <div className="p-4 bg-primary text-white flex items-center gap-2">
          <Brain size={18} />
          <span className="font-bold text-sm uppercase tracking-wider">El Cerebro (Captura IA)</span>
        </div>
        <div className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1">
              <textarea 
                value={iaInput}
                onChange={(e) => setIaInput(e.target.value)}
                placeholder="Escribe aquí tus ideas, tareas o pendientes... Atenea los estructurará por ti."
                className="w-full h-32 p-4 bg-bg-main border border-border-soft rounded-2xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium text-primary placeholder:text-text-muted"
              />
            </div>
            <div className="md:w-64 flex flex-col justify-center">
              <button 
                onClick={handleIACapture}
                disabled={isProcessingIA || !iaInput.trim()}
                className={`latam-btn-primary h-32 flex flex-col items-center justify-center gap-3 ${isProcessingIA ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isProcessingIA ? <Sparkles className="animate-spin" size={24} /> : <Sparkles size={24} />}
                <span>{isProcessingIA ? 'Procesando...' : 'Estructurar con Atenea'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE SECTION: Backlog (Horizontal) */}
      <div className="latam-card !p-0 border-t-4 border-primary">
        <div className="p-4 border-b border-border-soft flex items-center justify-between bg-bg-main/50">
          <div className="flex items-center gap-2">
            <ListChecks size={18} className="text-primary" />
            <span className="font-bold text-sm uppercase tracking-wider">Backlog Pendiente</span>
          </div>
          <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-[10px] font-black">
            {backlog.length} ITEMS
          </span>
        </div>
        <div className="p-4 overflow-x-auto custom-scrollbar">
          <div className="flex gap-4 pb-2" style={{ minWidth: 'min-content' }}>
            <AnimatePresence>
              {backlog.map(item => (
                <motion.div 
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="w-72 flex-shrink-0 p-4 bg-white border border-border-soft rounded-2xl hover:shadow-xl transition-all group relative border-l-4"
                  style={{ borderLeftColor: PRIORITIES.find(p => p.label === item.priority)?.color || 'var(--color-primary)' }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className="text-[10px] text-text-muted font-black uppercase">{item.area || 'General'}</span>
                    <Sparkles size={12} className="text-primary/20" />
                  </div>
                  <p className="text-sm font-bold text-text-strong leading-tight mb-4 min-h-[40px] line-clamp-2">{item.task}</p>
                  
                  <div className="grid grid-cols-5 gap-1">
                    {weekDates.map(date => (
                      <button 
                        key={date}
                        onClick={() => loadTaskToDay(item, date)}
                        className="py-2 bg-bg-main border border-border-soft rounded-xl text-[9px] font-black hover:bg-primary hover:text-white hover:border-primary transition-all uppercase"
                      >
                        {new Date(date + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'narrow' })}
                      </button>
                    ))}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {backlog.length === 0 && (
              <div className="w-full text-center py-8 text-text-muted text-sm font-bold italic">
                No hay tareas pendientes en el backlog.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: Weekly Calendar (Energy Tanks) */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {weekDates.map(date => {
          const dateObj = new Date(date + 'T00:00:00');
          const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
          const dayName = dayNames[dateObj.getDay()];
          const isToday = date === today.toISOString().split('T')[0];
          const capacity = calculateDayCapacity(date);
          const dayTasks = plannedTasks[date] || [];
          const occupiedMins = dayTasks.reduce((acc, t) => acc + (t.tiempo_asignado_minutos || 0), 0);
          const occupancyPercent = Math.min(100, (occupiedMins / capacity) * 100);
          
          return (
            <div key={date} className={`flex flex-col gap-4 ${isToday ? 'scale-102' : ''}`}>
              {/* Day Header */}
              <div className={`p-4 rounded-3xl text-center border shadow-md transition-all ${
                isToday ? 'bg-primary text-white border-primary shadow-xl ring-4 ring-primary/20' : 'bg-white border-border-soft'
              }`}>
                <p className={`text-[10px] font-black uppercase ${isToday ? 'text-white/70' : 'text-text-muted'}`}>
                  {dayName}
                </p>
                <p className="text-2xl font-black">{dateObj.getDate()}</p>
                {availability && (
                  <p className={`text-[10px] font-black mt-1 ${isToday ? 'text-white/60' : 'text-primary/70'}`}>
                    {availability.hora_inicio} - {availability.hora_fin}
                  </p>
                )}
              </div>

              {/* The Energy Tank Container */}
              <div className="flex-1 bg-white border border-border-soft rounded-3xl p-5 flex flex-col shadow-sm relative overflow-hidden min-h-[500px]">
                {/* Visual grid pattern background */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(var(--color-primary) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
                
                <div className="relative flex-1 flex flex-col">
                  {/* ENERGY TANK AT THE TOP (Below Header) */}
                  <div className="mb-6 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-text-muted uppercase tracking-tighter">Carga Operativa</span>
                      <span className={`text-sm font-black ${occupancyPercent > 90 ? 'text-accent' : 'text-primary'}`}>
                        {Math.round(occupancyPercent)}%
                      </span>
                    </div>

                    <div className="w-full h-4 bg-bg-main rounded-full overflow-hidden border-2 border-border-soft shadow-inner p-0.5">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${occupancyPercent}%` }}
                        className={`h-full rounded-full bar-glow transition-colors duration-1000 ${
                          occupancyPercent > 90 ? 'bg-accent shadow-[0_0_15px_rgba(224,30,90,0.5)]' : 
                          (occupancyPercent > 70 ? 'bg-primary shadow-[0_0_15px_rgba(25,32,108,0.3)]' : 'bg-[#7DA81A]')
                        }`}
                      />
                    </div>
                    <div className="text-center">
                      <span className="text-[10px] font-black text-text-muted">{occupiedMins} / {capacity} MIN</span>
                    </div>
                  </div>

                  {/* Fixed Blocks (Meetings) */}
                  <div className="space-y-2 mb-8">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 border-b border-border-soft pb-1">Bloques Fijos</p>
                    {bloques
                      .filter(b => b.fecha === date || b.dia_semana === dayName)
                      .map(b => (
                        <div key={b.id} className="p-3 bg-slate-50 border-l-4 border-slate-300 rounded-r-xl text-[11px] font-bold text-text-strong flex justify-between items-center">
                          <span className="truncate block">{b.tipo}</span>
                          <span className="text-[9px] text-text-muted">{b.hora_inicio}</span>
                        </div>
                      ))
                    }
                  </div>

                  {/* Planned Tasks (Flexible) */}
                  <div className="flex-1 space-y-3">
                    <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-2 border-b border-border-soft pb-1">Tareas Planificadas</p>
                    <div className="space-y-3">
                      {dayTasks.map((t: any) => (
                        <div key={t.id} className="p-3 bg-white border border-border-soft rounded-2xl shadow-sm text-xs font-bold text-text-strong border-l-4"
                             style={{ borderLeftColor: PRIORITIES.find(p => p.value === t.prioridad)?.color || 'var(--color-primary)' }}>
                          {t.actividad}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
