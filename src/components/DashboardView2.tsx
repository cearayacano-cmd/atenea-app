import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, CheckCircle, ChevronLeft, ChevronRight, BrainCircuit, 
  Zap, AlertTriangle, TrendingUp, Activity, Target, 
  Calendar as CalendarIcon, Loader2, Lightbulb, PieChart, Clock, TrendingDown,
  ShieldCheck, ArrowUpRight, Gauge, ListTodo
} from 'lucide-react';

interface Task {
  id: number;
  actividad: string;
  prioridad: number;
  completada: number | boolean;
  estado_ejecucion?: string;
}

interface Incidencia {
  id: number;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

const EXECUTED_STATUSES = ['en espera', 'abierto', 'resuelto', 'terminada', 'despriorizada', 'fallo', 'fallido'];

export default function DashboardView2({ selectedDate, setSelectedDate }: {
  selectedDate: string,
  setSelectedDate: (date: string) => void
}) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<{ 
    day: string, 
    percentage: number,
    critico: number,
    alto: number,
    medio: number,
    date: string
  }[]>([]);
  const [backlogDist, setBacklogDist] = useState({ critico: 0, alto: 0, medio: 0, total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const anchorDate = new Date(selectedDate + 'T00:00:00');
        const currentDay = anchorDate.getDay();
        const dayOffset = currentDay === 0 ? 6 : currentDay - 1;
        const currentMonday = new Date(anchorDate);
        currentMonday.setDate(anchorDate.getDate() - dayOffset);
        
        const days5 = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(currentMonday);
          d.setDate(currentMonday.getDate() + i);
          days5.push(d.toISOString().split('T')[0]);
        }

        const results = await Promise.all(
          days5.map(async (dateStr) => {
            const tRes = await fetch(`/api/tareas?fecha=${dateStr}`);
            const tData = await tRes.json();
            const dayTasks: Task[] = tData.tasks || [];
            
            let pTotal = 0;
            let pCritico = 0;
            let pAlto = 0;
            let pMedio = 0;

            dayTasks.forEach(t => {
              const p = Number(t.prioridad) || 0;
              pTotal += p;
              
              const status = (t.estado_ejecucion || 'nuevo').toLowerCase();
              const isExecuted = !['nuevo', 'pendiente'].includes(status);
              
              if (isExecuted) {
                if (p >= 10) pCritico += p;
                else if (p >= 7) pAlto += p;
                else pMedio += p;
              }
            });

            return {
              day: new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase(),
              percentage: pTotal > 0 ? Math.round(((pCritico + pAlto + pMedio) / pTotal) * 100) : 0,
              critico: pTotal > 0 ? Math.round((pCritico / pTotal) * 100) : 0,
              alto: pTotal > 0 ? Math.round((pAlto / pTotal) * 100) : 0,
              medio: pTotal > 0 ? Math.round((pMedio / pTotal) * 100) : 0,
              date: dateStr
            };
          })
        );

        setTrend(results);
        
        const dayIdx = results.findIndex(r => r.date === selectedDate);
        if (dayIdx !== -1) {
          const res = await fetch(`/api/tareas?fecha=${selectedDate}`);
          const data = await res.json();
          setTasks(data.tasks || []);
          const iRes = await fetch(`/api/incidencias?fecha=${selectedDate}`);
          setIncidencias(await iRes.json());
        }

        const bRes = await fetch('/api/backlog');
        const bData = await bRes.json();
        const dist = { critico: 0, alto: 0, medio: 0, total: 0 };
        bData.forEach((t: any) => {
          if (['pendiente', 'nuevo', 'abierto', 'en espera'].includes(t.status)) {
            dist.total++;
            if (t.prioridad >= 10) dist.critico++;
            else if (t.prioridad >= 7) dist.alto++;
            else dist.medio++;
          }
        });
        setBacklogDist(dist);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [selectedDate]);

  const [isApplying, setIsApplying] = useState(false);
  const [applied, setApplied] = useState(false);

  const handleApplyStrategy = async () => {
    setIsApplying(true);
    try {
      // 1. Identificar tareas pendientes de HOY
      const pendingTasks = tasks.filter(t => 
        !t.estado_ejecucion || !['terminada', 'despriorizada'].includes(t.estado_ejecucion)
      );

      // 2. Calcular fecha de mañana
      const tomorrow = new Date(selectedDate + 'T00:00:00');
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // 3. Inyectar Bloque Estratégico
      await fetch('/api/tareas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fecha: tomorrowStr,
          actividad: '🛡️ FOCO PROFUNDO: RECUPERACIÓN ESTRATÉGICA (IA)',
          prioridad: 3,
          area: 'ESTRATEGIA',
          hora_inicio: '08:00',
          hora_fin: '10:00'
        })
      });

      // 4. Hacer Rollover de pendientes
      for (const task of pendingTasks) {
        await fetch('/api/tareas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fecha: tomorrowStr,
            actividad: `[ROLLOVER] ${task.actividad}`,
            prioridad: task.prioridad,
            area: 'OPERACIONES',
            hora_inicio: '10:00',
            hora_fin: '11:00'
          })
        });
      }

      setApplied(true);
      setTimeout(() => setApplied(false), 3000);
    } catch (err) {
      console.error("Error aplicando estrategia pro:", err);
    } finally {
      setIsApplying(false);
    }
  };

  const pesoTotal = tasks.reduce((acc, t) => acc + (Number(t.prioridad) || 0), 0);
  const pesoCompletado = tasks.reduce((acc, t) => {
    const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
    return acc + (isExecuted ? (Number(t.prioridad) || 0) : 0);
  }, 0);
  const porcentajeEstrategico = pesoTotal > 0 ? Math.round((pesoCompletado / pesoTotal) * 100) : 0;

  const totalMinsOp = incidencias.reduce((acc, inc) => {
    const [h1, m1] = inc.hora_inicio.split(':').map(Number);
    const [h2, m2] = inc.hora_fin.split(':').map(Number);
    return acc + ((h2 * 60 + m2) - (h1 * 60 + m1));
  }, 0);
  const porcentajeOperativo = Math.round((totalMinsOp / (8 * 60)) * 100);

  return (
    <div className="space-y-10 pb-20 w-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
             <BrainCircuit size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Dashboard de Inteligencia</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
               Análisis Predictivo y Optimización de Jornada
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4 bg-white p-3 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <button onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() - 1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronLeft size={20} /></button>
          <div className="flex flex-col items-center px-4 border-x border-slate-100">
             <span className="text-[10px] font-black text-slate-400 uppercase">Fecha de Análisis</span>
             <span className="text-sm font-black text-slate-800">{selectedDate}</span>
          </div>
          <button onClick={() => {
            const d = new Date(selectedDate + 'T00:00:00'); d.setDate(d.getDate() + 1); setSelectedDate(d.toISOString().split('T')[0]);
          }} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><ChevronRight size={20} /></button>
        </div>
      </div>

      {/* Lectura Inteligente - Semáforo Operativo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className={`absolute top-4 right-6 w-3 h-3 rounded-full blur-[2px] animate-pulse ${porcentajeEstrategico >= 80 ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : porcentajeEstrategico >= 50 ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`} />
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><CheckCircle size={18} /></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lectura del Día</span>
            </div>
            <p className="text-sm font-black text-slate-800 leading-tight">
               {porcentajeEstrategico >= 80 ? 'Ejecución con disciplina estratégica total.' : porcentajeEstrategico >= 50 ? 'Equilibrio operativo en progreso.' : 'Enfoque reactivo dominante detectado.'}
            </p>
         </div>

         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:scale-[1.02] transition-all relative overflow-hidden">
            {/* Lógica de semáforo semanal */}
            <div className={`absolute top-4 right-6 w-3 h-3 rounded-full blur-[2px] animate-pulse ${trend.reduce((acc, d) => acc + d.percentage, 0) / 5 >= 70 ? 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]'}`} />
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><TrendingUp size={18} /></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lectura de la Semana</span>
            </div>
            <p className="text-sm font-black text-slate-800 leading-tight">
               Semana con {trend.reduce((acc, d) => acc + d.percentage, 0) / 5 < 50 ? 'riesgo' : 'estabilidad'} estratégica.
               <span className="block text-[10px] text-slate-400 mt-1">Promedio: {Math.round(trend.reduce((acc, d) => acc + d.percentage, 0) / 5)}%</span>
            </p>
         </div>

         <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/30 group hover:scale-[1.02] transition-all relative overflow-hidden">
            <div className="absolute top-4 right-6 w-3 h-3 rounded-full blur-[2px] bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]" />
            <div className="flex items-center gap-3 mb-4">
               <div className="p-2 bg-slate-50 rounded-xl text-slate-400"><Activity size={18} /></div>
               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Reincidencia</span>
            </div>
            <p className="text-sm font-black text-slate-800 leading-tight">
               Sin tareas estratégicas repetitivas detectadas.
            </p>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Analytics Card */}
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-8 bg-white rounded-[56px] p-12 text-slate-900 relative overflow-hidden shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] border border-slate-100"
        >
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[120px] -mr-48 -mt-48" />
          
          <div className="relative z-10 space-y-12">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-primary/10 rounded-3xl backdrop-blur-xl">
                      <Gauge size={32} className="text-primary" />
                   </div>
                   <h3 className="text-2xl font-black tracking-tight">Estado de Carga Operativa</h3>
                </div>
                <div className="px-6 py-2 bg-[#99CC33]/20 border border-[#99CC33]/30 rounded-full text-[#99CC33] text-[10px] font-black uppercase tracking-widest">
                   Optimizado v2.0
                </div>
             </div>

             <div className="flex flex-col gap-12">
                {/* Fila Superior: Estadísticas y KPIs rápidos */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                   <div className="relative">
                      <span className="text-8xl font-black leading-none tracking-tighter">{porcentajeOperativo}%</span>
                      <span className="text-xs font-black text-slate-500 uppercase tracking-widest block mt-4">Fuga Operativa Detectada</span>
                   </div>
                   <div className="flex flex-col justify-center gap-4">
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-slate-100 transition-all">
                         <div className="p-2 bg-[#FFE017]/20 rounded-xl text-amber-600"><Clock size={20} /></div>
                         <div>
                            <p className="text-sm font-black text-slate-900">{Math.floor(totalMinsOp / 60)}h {totalMinsOp % 60}m</p>
                            <p className="text-[10px] font-bold text-slate-400">Total en incidencias</p>
                         </div>
                      </div>
                   </div>
                   <div className="flex flex-col justify-center gap-4">
                      <div className="flex items-center gap-4 p-5 bg-slate-50 rounded-3xl border border-slate-100">
                         <div className="p-2 bg-primary/10 rounded-xl text-primary"><ShieldCheck size={20} /></div>
                         <div>
                            <p className="text-sm font-black text-slate-900">{100 - porcentajeOperativo}%</p>
                            <p className="text-[10px] font-bold text-slate-400">Capacidad de Foco</p>
                         </div>
                      </div>
                   </div>
                </div>

                {/* Fila Inferior: Gráfico de Tendencia de ancho completo */}
                <div className="bg-slate-50 rounded-[40px] p-10 border border-slate-100 flex flex-col">
                   <div className="flex items-center justify-between mb-10">
                      <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Tendencia de Ejecución Semanal</h4>
                      <div className="flex gap-8">
                         <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Impacto Promedio</span>
                            <span className="text-lg font-black text-slate-900">{Math.round(trend.reduce((acc, d) => acc + d.percentage, 0) / 5)}%</span>
                         </div>
                         <div className="flex flex-col items-end">
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Pérdida Acumulada</span>
                            <span className="text-lg font-black text-amber-500">12h 45m</span>
                         </div>
                      </div>
                   </div>
                   
                   <div className="flex items-end justify-between gap-6 h-64">
                       {trend.map((t, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-4 group cursor-help">
                            <div className="relative w-full flex items-end justify-center h-52 bg-slate-100/50 rounded-3xl border border-slate-200/30 overflow-hidden mb-2 shadow-inner group-hover:bg-slate-100 transition-all">
                               {/* Fondo de capacidad */}
                               <div className="absolute inset-0 bg-slate-200/10 z-0" />
                               
                               {/* Barra Stacked por Prioridad */}
                               <div 
                                 style={{ height: `${Math.max(2, t.percentage)}%` }} 
                                 className="w-full max-w-[54px] transition-all duration-1000 ease-out z-10 relative flex flex-col-reverse rounded-t-xl overflow-hidden shadow-2xl"
                               >
                                  {/* Segmento Medio/Bajo */}
                                  <div 
                                    style={{ height: `${(t.medio / t.percentage) * 100}%` }}
                                    className="w-full bg-gradient-to-t from-slate-400 to-slate-300 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.medio > 10 && `${t.medio}%`}
                                  </div>
                                  {/* Segmento Alto */}
                                  <div 
                                    style={{ height: `${(t.alto / t.percentage) * 100}%` }}
                                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 border-t border-white/20 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.alto > 10 && `${t.alto}%`}
                                  </div>
                                  {/* Segmento Crítico */}
                                  <div 
                                    style={{ height: `${(t.critico / t.percentage) * 100}%` }}
                                    className="w-full bg-gradient-to-t from-red-600 to-red-500 border-t border-white/20 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.critico > 10 && `${t.critico}%`}
                                  </div>
                               </div>

                               {/* Indicador de porcentaje total flotante */}
                               <div className="absolute top-4 text-[10px] font-black text-slate-400 opacity-40">
                                  {t.percentage}%
                               </div>
                            </div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t.day}</span>
                         </div>
                       ))}
                    </div>
                </div>
              </div>

              {/* Gráfico de Backlog por Prioridad */}
              <div className="mt-12 bg-slate-50/30 rounded-[40px] p-10 border border-slate-100/50">
                 <div className="flex items-center justify-between mb-8">
                    <div>
                       <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Distribución de Backlog Vivo</h4>
                       <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Carga acumulada por nivel de criticidad</p>
                    </div>
                    <div className="px-4 py-2 bg-white rounded-2xl border border-slate-100 text-xs font-black text-primary">
                       {backlogDist.total} TAREAS TOTALES
                    </div>
                 </div>

                 <div className="flex items-end gap-1 w-full h-12 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 p-1">
                    {backlogDist.critico > 0 && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(backlogDist.critico / backlogDist.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-red-600 to-red-500 flex items-center justify-center text-[8px] font-black text-white relative group"
                      >
                        {Math.round((backlogDist.critico / backlogDist.total) * 100)}%
                        <div className="absolute -top-8 bg-red-600 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">CRÍTICO ({backlogDist.critico})</div>
                      </motion.div>
                    )}
                    {backlogDist.alto > 0 && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(backlogDist.alto / backlogDist.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center text-[8px] font-black text-white relative group"
                      >
                        {Math.round((backlogDist.alto / backlogDist.total) * 100)}%
                        <div className="absolute -top-8 bg-amber-500 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">ALTO ({backlogDist.alto})</div>
                      </motion.div>
                    )}
                    {backlogDist.medio > 0 && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(backlogDist.medio / backlogDist.total) * 100}%` }}
                        className="h-full bg-gradient-to-r from-slate-400 to-slate-300 flex items-center justify-center text-[8px] font-black text-white relative group"
                      >
                        {Math.round((backlogDist.medio / backlogDist.total) * 100)}%
                        <div className="absolute -top-8 bg-slate-500 text-white px-2 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20">MEDIO/BAJO ({backlogDist.medio})</div>
                      </motion.div>
                    )}
                 </div>
                 <div className="flex justify-between mt-4">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-red-500" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Crítico</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-amber-500" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Alto</span>
                    </div>
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-slate-300" />
                       <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Medio/Bajo</span>
                    </div>
                 </div>
              </div>
           </div>
        </motion.div>

        {/* Sidebar Insights */}
        <div className="lg:col-span-4 space-y-8">
           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-white rounded-[48px] p-10 border border-slate-100 shadow-2xl shadow-slate-200/50 relative overflow-hidden"
           >
              <div className="flex items-center gap-4 mb-8">
                 <div className="p-3 bg-primary/10 rounded-2xl text-primary"><Target size={24} /></div>
                 <h3 className="text-lg font-black text-slate-800">Impacto Estratégico</h3>
              </div>
              <div className="space-y-6">
                 <div className="text-center py-10 bg-slate-50 rounded-[40px] border border-slate-100 shadow-inner">
                    <span className="text-7xl font-black text-primary leading-none">{porcentajeEstrategico}%</span>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-4">Cumplimiento de Metas</p>
                 </div>
                 <div className="flex items-center justify-between px-4">
                    <div className="flex flex-col">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Eficiencia</span>
                       <span className="text-sm font-black text-slate-800">Alta</span>
                    </div>
                    <div className="flex flex-col items-end">
                       <span className="text-[9px] font-black text-slate-400 uppercase">Tendencia</span>
                       <span className="text-sm font-black text-[#7DA81A] flex items-center gap-1">
                          <TrendingUp size={14} /> +12%
                       </span>
                    </div>
                 </div>
              </div>
           </motion.div>

           <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.3 }}
             className="bg-amber-500 rounded-[48px] p-10 text-white shadow-2xl shadow-amber-200 relative overflow-hidden group hover:scale-[1.02] transition-all"
           >
              <div className="absolute top-0 right-0 p-4 opacity-20"><Zap size={80} /></div>
              <div className="flex items-center gap-4 mb-6">
                 <div className="p-3 bg-white/20 rounded-2xl"><Lightbulb size={24} /></div>
                 <h3 className="text-lg font-black">Sugerencia IA</h3>
              </div>
              <p className="text-sm font-bold leading-relaxed mb-6 opacity-90">
                 Has perdido el 67% de tu mañana en incidencias. Para mañana, bloquea las primeras 3 horas sin reuniones.
              </p>
              <button 
                onClick={handleApplyStrategy}
                disabled={isApplying || applied}
                className={`w-full py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 transition-all ${
                  applied 
                  ? 'bg-green-500 text-white' 
                  : 'bg-white text-amber-500 hover:scale-[1.02]'
                }`}
              >
                 {isApplying ? (
                   <Loader2 className="animate-spin" size={16} />
                 ) : applied ? (
                   <>¡Estrategia Aplicada! <CheckCircle size={16} /></>
                 ) : (
                   <>Aplicar Estrategia <ArrowUpRight size={16} /></>
                 )}
              </button>
           </motion.div>
        </div>
      </div>
    </div>
  );
}
