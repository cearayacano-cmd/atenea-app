import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, CheckCircle, ChevronLeft, ChevronRight, BrainCircuit, 
  Zap, AlertTriangle, TrendingUp, Activity, Target, 
  Calendar as CalendarIcon, Loader2, Lightbulb, PieChart, Clock, 
  ShieldCheck, ArrowUpRight, Gauge, ListTodo, Users, RefreshCw
} from 'lucide-react';

interface Task {
  id: number;
  fecha: string;
  actividad: string;
  prioridad: number;
  completada: number | boolean;
  estado_ejecucion?: string;
  area?: string;
  user_id: number;
}

interface Incidencia {
  id: number;
  fecha: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
  user_id: number;
}

interface UserInfo {
  id: number;
  nombre: string;
  email: string;
  rol: string;
}

export default function DashboardView2({ selectedDate, setSelectedDate }: {
  selectedDate: string,
  setSelectedDate: (date: string) => void
}) {
  const [tab, setTab] = useState<'semanal' | 'mensual'>('semanal');
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [usersList, setUsersList] = useState<UserInfo[]>([]);
  const [isDemoData, setIsDemoData] = useState(false);
  const [planesDiarios, setPlanesDiarios] = useState<any[]>([]);
  
  // Navigation offsets
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month, -1 = last month

  // Filters
  const loggedInUserId = Number(localStorage.getItem('atenea_user_id') || 1);
  const isSupervisor = loggedInUserId === 1; // carlose.araya@latam.com
  const [selectedFilterUserId, setSelectedFilterUserId] = useState<string>(isSupervisor ? 'all' : String(loggedInUserId));

  // Fetch users list for supervisor filter
  useEffect(() => {
    if (isSupervisor) {
      fetch('/api/usuarios')
        .then(res => res.json())
        .then(data => setUsersList(data))
        .catch(err => console.error("Error fetching users for dashboard filter:", err));
    }
  }, [isSupervisor]);

  // Reset offsets when tab changes
  useEffect(() => {
    setWeekOffset(0);
    setMonthOffset(0);
  }, [tab]);

  // Calculate Date Ranges
  const getWeekRange = (offset: number) => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust to Monday
    
    const monday = new Date(today.setDate(diff + (offset * 7)));
    monday.setHours(0, 0, 0, 0);
    
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);
    friday.setHours(23, 59, 59, 999);
    
    return { monday, friday };
  };

  const getMonthRange = (offset: number) => {
    const today = new Date();
    const year = today.getFullYear();
    const month = today.getMonth() + offset;
    
    const startOfMonth = new Date(year, month, 1);
    const endOfMonth = new Date(year, month + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return { startOfMonth, endOfMonth };
  };

  // Fetch metrics based on filters and tab
  useEffect(() => {
    const fetchDashboardData = async () => {
      setLoading(true);
      try {
        let startStr = '';
        let endStr = '';

        if (tab === 'semanal') {
          const { monday, friday } = getWeekRange(weekOffset);
          startStr = monday.toISOString().split('T')[0];
          endStr = friday.toISOString().split('T')[0];
        } else {
          const { startOfMonth, endOfMonth } = getMonthRange(monthOffset);
          startStr = startOfMonth.toISOString().split('T')[0];
          endStr = endOfMonth.toISOString().split('T')[0];
        }

        // Fetch Tasks
        const userQuery = selectedFilterUserId === 'all' ? 'all' : selectedFilterUserId;
        const tasksRes = await fetch(`/api/reporte-tiempos?userId=${userQuery}&fechaInicio=${startStr}&fechaFin=${endStr}`);
        const tasksData = await tasksRes.json();
        const tasksList = Array.isArray(tasksData.tasks) ? tasksData.tasks : [];

        // Fetch Incidences
        const incRes = await fetch(`/api/incidencias?userId=${userQuery === 'all' ? 1 : userQuery}&fechaInicio=${startStr}&fechaFin=${endStr}`);
        const incList = await incRes.json();
        const incData = Array.isArray(incList) ? incList : [];

        // Fetch Planes Diarios
        const planesRes = await fetch('/api/planes-diarios');
        const planesList = await planesRes.json();
        const planesData = Array.isArray(planesList) ? planesList : [];

        if (tasksList.length === 0) {
          setIsDemoData(true);
          const mockTasks: Task[] = [];
          const mockIncidencias: Incidencia[] = [];

          if (tab === 'semanal') {
            const { monday } = getWeekRange(weekOffset);
            const areas = ['Operativo', 'Monitoreo', 'Tendencias', 'Escuelita', 'Calidad'];
            const names = [
              'Revisión de indicadores entregados por RADAR',
              'Auditoría de llamadas críticas de calidad',
              'Calibración semanal con LCoach',
              'Análisis de tendencias de focos operacionales',
              'Capacitación técnica en Escuelita de Calidad',
              'Feedback mensual de desempeño',
              'Monitoreo preventivo de alertas de plataforma',
              'Planificación estratégica del sprint operacional',
              'Reunión de alineación de KPIs',
              'Validación de hipótesis operacionales en conjunto'
            ];

            for (let i = 0; i < 15; i++) {
              const dayOffset = i % 5;
              const tDate = new Date(monday);
              tDate.setDate(monday.getDate() + dayOffset);
              const dateStr = tDate.toISOString().split('T')[0];
              
              mockTasks.push({
                id: 1000 + i,
                fecha: dateStr,
                actividad: names[i % names.length],
                prioridad: [10, 7, 4, 2][i % 4],
                completada: i % 3 !== 0 ? 1 : 0,
                estado_ejecucion: i % 3 !== 0 ? 'resuelto' : 'nuevo',
                area: areas[i % areas.length],
                user_id: 1
              });
            }

            const tDate1 = new Date(monday);
            tDate1.setDate(monday.getDate() + 1);
            mockIncidencias.push({
              id: 5001,
              fecha: tDate1.toISOString().split('T')[0],
              descripcion: 'Incidente de sistema caído',
              hora_inicio: '10:00',
              hora_fin: '11:30',
              tipo: 'Soporte Técnico',
              user_id: 1
            });

            const tDate2 = new Date(monday);
            tDate2.setDate(monday.getDate() + 3);
            mockIncidencias.push({
              id: 5002,
              fecha: tDate2.toISOString().split('T')[0],
              descripcion: 'Reunión imprevista de urgencia operativa',
              hora_inicio: '14:00',
              hora_fin: '15:15',
              tipo: 'Reunión Extra',
              user_id: 1
            });

            mockIncidencias.push({
              id: 5003,
              fecha: tDate2.toISOString().split('T')[0],
              descripcion: 'Almuerzo diario',
              hora_inicio: '13:00',
              hora_fin: '14:00',
              tipo: 'Almuerzo',
              user_id: 1
            });
          } else {
            const { startOfMonth } = getMonthRange(monthOffset);
            const areas = ['Operativo', 'Monitoreo', 'Tendencias', 'Escuelita', 'Calidad'];
            const names = [
              'Revisión de indicadores de datos',
              'Auditoría mensual LATAM',
              'Alineación de calibración',
              'Análisis de focos operacionales',
              'Capacitación técnica Escuelita',
              'Monitoreo preventivo RADAR'
            ];

            for (let i = 0; i < 45; i++) {
              const dayOffset = i % 20;
              const tDate = new Date(startOfMonth);
              tDate.setDate(startOfMonth.getDate() + dayOffset);
              const dateStr = tDate.toISOString().split('T')[0];

              mockTasks.push({
                id: 2000 + i,
                fecha: dateStr,
                actividad: names[i % names.length],
                prioridad: [10, 7, 4, 2][i % 4],
                completada: i % 4 !== 0 ? 1 : 0,
                estado_ejecucion: i % 4 !== 0 ? 'resuelto' : 'nuevo',
                area: areas[i % areas.length],
                user_id: 1
              });
            }

            for (let w = 0; w < 4; w++) {
              const tDate = new Date(startOfMonth);
              tDate.setDate(startOfMonth.getDate() + (w * 7) + 2);
              mockIncidencias.push({
                id: 6000 + w,
                fecha: tDate.toISOString().split('T')[0],
                descripcion: `Soporte Semanal Sem. ${w + 1}`,
                hora_inicio: '09:00',
                hora_fin: '10:30',
                tipo: 'Reunión Extra',
                user_id: 1
              });
            }
          }

          setTasks(mockTasks);
          setIncidencias(mockIncidencias);
        } else {
          setIsDemoData(false);
          setTasks(tasksList);
          setIncidencias(incData);
        }
        setPlanesDiarios(planesData);

      } catch (err) {
        console.error("Error loading dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [tab, weekOffset, monthOffset, selectedFilterUserId]);

  // Data processing helpers
  const EXECUTED_STATUSES = ['resuelto', 'terminada'];
  const ACTIVE_STATES = ['nuevo', 'abierto', 'progreso', 'en progreso'];

  // 1. General Metrics
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => EXECUTED_STATUSES.includes((t.estado_ejecucion || 'nuevo').toLowerCase())).length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 2. Strategic Focus: Weight-based check on Critical (10) and High (7) tasks
  const strategicTasks = tasks.filter(t => t.prioridad >= 7);
  const completedStrategicTasks = strategicTasks.filter(t => EXECUTED_STATUSES.includes((t.estado_ejecucion || 'nuevo').toLowerCase())).length;
  const strategicFocusRate = strategicTasks.length > 0 ? Math.round((completedStrategicTasks / strategicTasks.length) * 100) : 0;

  // 3. Fuga Operativa (Downtime) - Excluimos el Almuerzo por ser un derecho planificado
  const calculateIncidentalMinutes = () => {
    return incidencias.reduce((acc, inc) => {
      if (inc.tipo === 'Almuerzo') return acc;
      if (!inc.hora_inicio || !inc.hora_fin) return acc;
      const [h1, m1] = inc.hora_inicio.split(':').map(Number);
      const [h2, m2] = inc.hora_fin.split(':').map(Number);
      const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
      return acc + (diff > 0 ? diff : 0);
    }, 0);
  };
  const totalIncidentalMinutes = calculateIncidentalMinutes();
  const incidentalHours = (totalIncidentalMinutes / 60).toFixed(1);

  // 4. Area distribution
  const areasDistribution: Record<string, number> = {};
  tasks.forEach(t => {
    const area = t.area || 'Operativo';
    areasDistribution[area] = (areasDistribution[area] || 0) + 1;
  });

  // 5. Generate Weekly / Monthly Days lists
  const getWeeklyTrend = () => {
    const { monday } = getWeekRange(weekOffset);
    const dayLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE'];
    
    return dayLabels.map((label, idx) => {
      const targetDate = new Date(monday);
      targetDate.setDate(monday.getDate() + idx);
      const dateStr = targetDate.toISOString().split('T')[0];
      
      const dayTasks = tasks.filter(t => t.fecha === dateStr);
      const done = dayTasks.filter(t => EXECUTED_STATUSES.includes((t.estado_ejecucion || 'nuevo').toLowerCase())).length;
      
      return {
        label,
        dateStr,
        total: dayTasks.length,
        done,
        rate: dayTasks.length > 0 ? Math.round((done / dayTasks.length) * 100) : 0
      };
    });
  };

  const getMonthlyWeeksTrend = () => {
    const { startOfMonth, endOfMonth } = getMonthRange(monthOffset);
    
    // Group into 4 quarters of the month
    const weeks = [
      { label: 'Semana 1', start: new Date(startOfMonth), end: new Date(startOfMonth) },
      { label: 'Semana 2', start: new Date(startOfMonth), end: new Date(startOfMonth) },
      { label: 'Semana 3', start: new Date(startOfMonth), end: new Date(startOfMonth) },
      { label: 'Semana 4', start: new Date(startOfMonth), end: new Date(endOfMonth) },
    ];
    
    const daysInMonth = endOfMonth.getDate();
    weeks[0].end.setDate(startOfMonth.getDate() + Math.floor(daysInMonth / 4) - 1);
    weeks[1].start.setDate(weeks[0].end.getDate() + 1);
    weeks[1].end.setDate(weeks[1].start.getDate() + Math.floor(daysInMonth / 4) - 1);
    weeks[2].start.setDate(weeks[1].end.getDate() + 1);
    weeks[2].end.setDate(weeks[2].start.getDate() + Math.floor(daysInMonth / 4) - 1);
    weeks[3].start.setDate(weeks[2].end.getDate() + 1);

    return weeks.map(w => {
      const sStr = w.start.toISOString().split('T')[0];
      const eStr = w.end.toISOString().split('T')[0];
      
      const wTasks = tasks.filter(t => t.fecha >= sStr && t.fecha <= eStr);
      const done = wTasks.filter(t => EXECUTED_STATUSES.includes((t.estado_ejecucion || 'nuevo').toLowerCase())).length;
      
      return {
        label: w.label,
        total: wTasks.length,
        done,
        rate: wTasks.length > 0 ? Math.round((done / wTasks.length) * 100) : 0
      };
    });
  };

  // Strategic AI recommendations generator
  const getStrategicAdvice = () => {
    const advices = [];
    if (totalTasks === 0) {
      return ["No hay datos de actividades planificadas para este periodo. Comienza asignando tareas desde tu agenda."];
    }
    
    // 1. Downtime check
    if (totalIncidentalMinutes > 480) {
      advices.push(`⚠️ Fuga operativa acumulada de ${incidentalHours} horas. Se sugiere agrupar reuniones en un solo bloque y evitar fraccionar la jornada.`);
    } else {
      advices.push("✅ Buen control de la fuga operativa en este ciclo. Sigue manteniendo los tiempos no operativos acotados.");
    }

    // 2. Strategic task rate check
    if (strategicFocusRate < 60) {
      advices.push("🔴 Alerta de metas: Has completado menos del 60% de tus tareas críticas. Recomendamos agendar máximo 1 tarea crítica al día para asegurar foco.");
    } else if (strategicFocusRate >= 85) {
      advices.push("🏆 ¡Disciplina sobresaliente! Has ejecutado con éxito la gran mayoría de tus tareas críticas de alto valor estratégico.");
    }

    // 3. Category diversification
    const operativeCount = areasDistribution['Operativo'] || 0;
    if (operativeCount / totalTasks > 0.7) {
      advices.push("💡 Sobrecarga táctica detectada: Más del 70% de tus actividades son del área Operativa. Intenta delegar tareas repetitivas o asignar espacio para Tendencias y Estrategia.");
    }

    return advices;
  };

  const adviceList = getStrategicAdvice();

  // Range text formatter
  const getHeaderDateRangeText = () => {
    if (tab === 'semanal') {
      const { monday, friday } = getWeekRange(weekOffset);
      const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
      return `${monday.toLocaleDateString('es-ES', options)} - ${friday.toLocaleDateString('es-ES', options)} (Semana offset: ${weekOffset === 0 ? 'Actual' : weekOffset})`;
    } else {
      const { startOfMonth } = getMonthRange(monthOffset);
      return startOfMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase();
    }
  };

  // Generate Calendar Days for Macro View
  const getCalendarDays = () => {
    const start = tab === 'semanal' ? getWeekRange(weekOffset).monday : getMonthRange(monthOffset).startOfMonth;
    const end = tab === 'semanal' ? getWeekRange(weekOffset).friday : getMonthRange(monthOffset).endOfMonth;
    const days = [];
    let curr = new Date(start);
    while (curr <= end) {
      if (curr.getDay() !== 0 && curr.getDay() !== 6) { // Only Mon-Fri
        days.push(new Date(curr));
      }
      curr.setDate(curr.getDate() + 1);
    }
    return days;
  };

  const calendarDays = getCalendarDays();

  return (
    <div className="space-y-8 pb-16 w-full">
      {/* Header premium con fondo claro integrado */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white border border-slate-100 p-8 rounded-[36px] shadow-xl shadow-slate-200/20 relative overflow-hidden">
        <div className="relative z-10 flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
            <BrainCircuit size={28} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight text-slate-800">Dashboard Pro</h2>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">
              Optimización, Tendencias y Rendimiento de Foco
            </p>
          </div>
        </div>

        <div className="relative z-10 flex flex-wrap items-center gap-4">
          {/* Selector de Usuario para Supervisor */}
          {isSupervisor && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-full px-4 py-2 text-[10px] font-bold text-slate-700">
              <Users size={14} className="text-primary" />
              <span className="text-slate-400">Filtrar:</span>
              <select 
                value={selectedFilterUserId}
                onChange={e => setSelectedFilterUserId(e.target.value)}
                className="bg-transparent text-slate-700 outline-none border-none cursor-pointer font-sans font-bold"
              >
                <option value="all" className="bg-white text-slate-700">Todo el Equipo</option>
                {usersList.map(u => (
                  <option key={u.id} value={u.id} className="bg-white text-slate-700">{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Toggle Tab Semanal/Mensual */}
          <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200/50">
            <button 
              onClick={() => setTab('semanal')} 
              className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${tab === 'semanal' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Semanal
            </button>
            <button 
              onClick={() => setTab('mensual')} 
              className={`px-5 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all ${tab === 'mensual' ? 'bg-primary text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              Mensual
            </button>
          </div>

          {/* Navegador de Fecha */}
          <div className="flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 text-slate-700">
            <button 
              onClick={() => tab === 'semanal' ? setWeekOffset(prev => prev - 1) : setMonthOffset(prev => prev - 1)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-all"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="text-[10px] font-black uppercase tracking-wider min-w-[120px] text-center text-slate-700">
              {getHeaderDateRangeText()}
            </span>
            <button 
              onClick={() => tab === 'semanal' ? setWeekOffset(prev => prev + 1) : setMonthOffset(prev => prev + 1)}
              className="p-1.5 hover:bg-slate-100 rounded-full transition-all"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-slate-400">
          <Loader2 className="animate-spin text-primary" size={40} />
          <span className="text-[10px] font-black uppercase tracking-widest">Cargando métricas de foco...</span>
        </div>
      ) : (
        <div className="space-y-8 animate-in fade-in duration-300">
          {isDemoData && (
            <div className="bg-amber-50 border border-amber-200 rounded-3xl p-5 flex items-center justify-between text-amber-800 text-[10px] font-bold uppercase tracking-wider shadow-sm">
              <span className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500 animate-pulse" />
                Modo Demo: Mostrando datos simulados realistas para ilustrar la visualización de este periodo.
              </span>
              <span className="text-[8px] bg-amber-200/50 px-2 py-0.5 rounded font-black text-amber-700">Simulación</span>
            </div>
          )}

          {/* Macro View: Calendario de Turnos */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">Estado de Turnos del Periodo</h3>
            <div className="grid grid-cols-5 md:grid-cols-5 lg:grid-cols-10 gap-3">
              {calendarDays.map((d) => {
                const dateStr = d.toISOString().split('T')[0];
                const dayTasks = tasks.filter(t => t.fecha === dateStr);
                const dayPlan = planesDiarios.find(p => p.date === dateStr && (selectedFilterUserId === 'all' ? true : p.user_id === Number(selectedFilterUserId)));
                
                let status = 'inactivo';
                if (dayTasks.length > 0) {
                  status = (dayPlan && dayPlan.estado_cierre === 1) ? 'cerrado' : 'pendiente';
                }

                return (
                  <div key={dateStr} className={`p-3 rounded-2xl border ${
                    status === 'inactivo' ? 'bg-slate-50 border-slate-100 text-slate-400' :
                    status === 'cerrado' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-100' :
                    'bg-rose-50 border-rose-200 text-rose-600 shadow-sm shadow-rose-100'
                  } flex flex-col items-center justify-center gap-1.5 text-center transition-all hover:scale-105`}>
                    <span className="text-[11px] font-black uppercase tracking-widest">{d.toLocaleDateString('es-ES', { weekday: 'short', timeZone: 'UTC' })} {d.getUTCDate()}</span>
                    <span className={`text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${
                      status === 'inactivo' ? 'bg-slate-200/50' :
                      status === 'cerrado' ? 'bg-emerald-200/50' :
                      'bg-rose-200/50'
                    }`}>
                      {status === 'inactivo' ? 'Inactivo' : status === 'cerrado' ? 'Cerrado' : 'Sin Cerrar'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Fila de 4 Indicadores Premium de Foco */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* KPI 1: Progreso General */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 flex items-center justify-between group hover:scale-[1.02] transition-all">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tareas Completadas</span>
                <h3 className="text-3xl font-black text-slate-800">{completionRate}%</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  {completedTasks} de {totalTasks} planificadas
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 relative">
                <Gauge size={24} className="text-primary" />
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="var(--color-primary, #6366f1)" strokeWidth="4" 
                    strokeDasharray={175} strokeDashoffset={175 - (175 * completionRate) / 100} />
                </svg>
              </div>
            </div>

            {/* KPI 2: Disciplina Estratégica */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 flex items-center justify-between group hover:scale-[1.02] transition-all">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Disciplina Crítica</span>
                <h3 className="text-3xl font-black text-slate-800">{strategicFocusRate}%</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  {completedStrategicTasks} de {strategicTasks.length} tareas clave
                </p>
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 relative">
                <Target size={24} className="text-rose-500" />
                <svg className="absolute inset-0 w-full h-full -rotate-90">
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f1f5f9" strokeWidth="4" />
                  <circle cx="32" cy="32" r="28" fill="transparent" stroke="#f43f5e" strokeWidth="4" 
                    strokeDasharray={175} strokeDashoffset={175 - (175 * strategicFocusRate) / 100} />
                </svg>
              </div>
            </div>

            {/* KPI 3: Fuga Operativa */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 flex items-center justify-between group hover:scale-[1.02] transition-all">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Fuga Operativa</span>
                <h3 className="text-3xl font-black text-amber-500">{incidentalHours}h</h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  Perdidas en incidentes
                </p>
              </div>
              <div className="p-4 bg-amber-50 rounded-2xl text-amber-500">
                <Clock size={28} />
              </div>
            </div>

            {/* KPI 4: Ratio de Productividad */}
            <div className="bg-white p-6 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/20 flex items-center justify-between group hover:scale-[1.02] transition-all">
              <div className="space-y-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ratio Foco</span>
                <h3 className="text-3xl font-black text-emerald-600">
                  {totalTasks > 0 ? Math.round(((totalTasks - incidencias.filter(i => i.tipo !== 'Almuerzo').length) / totalTasks) * 100) : 100}%
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase">
                  Tareas libres de bloqueos
                </p>
              </div>
              <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-500">
                <ShieldCheck size={28} />
              </div>
            </div>
          </div>

          {/* Gráfico Principal de Tendencia + Sugerencias IA */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Gráfico de barras premium (HTML / CSS puro) */}
            <div className="lg:col-span-2 bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {tab === 'semanal' ? 'Rendimiento Diario de la Semana' : 'Rendimiento Semanal del Mes'}
                </h3>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">
                  Porcentaje de finalización acumulado por periodo
                </p>
              </div>

              {/* Contenedor Gráfico */}
              <div className="mt-8 flex items-end justify-between gap-6 h-60 px-4 bg-slate-50/50 rounded-[28px] p-6 border border-slate-100 shadow-inner">
                {tab === 'semanal' ? (
                  getWeeklyTrend().map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                      <div className="absolute top-0 text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-0.5 rounded shadow z-30">
                        {d.done}/{d.total} Tareas ({d.rate}%)
                      </div>

                      {/* Barra de progreso vertical */}
                      <div className="w-full max-w-[40px] bg-slate-200 rounded-t-xl overflow-hidden h-40 flex flex-col justify-end relative shadow-inner group-hover:scale-105 transition-all">
                        <div 
                          style={{ height: `${d.rate}%` }} 
                          className="w-full bg-gradient-to-t from-primary to-primary-soft rounded-t-xl transition-all duration-700"
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{d.label}</span>
                    </div>
                  ))
                ) : (
                  getMonthlyWeeksTrend().map((w, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-3 group relative h-full justify-end">
                      <div className="absolute top-0 text-[9px] font-black text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white px-2 py-0.5 rounded shadow z-30">
                        {w.done}/{w.total} Tareas ({w.rate}%)
                      </div>

                      {/* Barra de progreso vertical */}
                      <div className="w-full max-w-[50px] bg-slate-200 rounded-t-xl overflow-hidden h-40 flex flex-col justify-end relative shadow-inner group-hover:scale-105 transition-all">
                        <div 
                          style={{ height: `${w.rate}%` }} 
                          className="w-full bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-xl transition-all duration-700"
                        />
                      </div>
                      <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{w.label}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sugerencias e Insights de IA */}
            <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-xl -mr-10 -mt-10" />
              
              <div className="space-y-6 relative z-10">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-xl text-primary">
                    <Lightbulb size={20} />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Sugerencias del Foco IA</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">Basado en datos de este ciclo</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {adviceList.map((adv, idx) => (
                    <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[10px] font-bold text-slate-600 leading-relaxed shadow-sm hover:bg-slate-100 transition-all flex gap-3">
                      <span className="text-primary font-black">#0{idx + 1}</span>
                      <span>{adv}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[8px] font-black text-slate-400 uppercase tracking-wider">
                <span>Última simulación</span>
                <span>En tiempo real</span>
              </div>
            </div>
          </div>

          {/* Distribución de Tareas por Área / Categoría */}
          <div className="bg-white rounded-[40px] p-8 border border-slate-100 shadow-xl shadow-slate-200/20">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6">
              Distribución de Foco por Área / Categoría
            </h3>

            {totalTasks > 0 ? (
              <div className="space-y-6">
                {/* Barra acumulada integrada */}
                <div className="flex items-center gap-1 w-full h-8 rounded-xl overflow-hidden bg-slate-100 p-1 border border-slate-200 shadow-inner">
                  {Object.entries(areasDistribution).map(([area, count], idx) => {
                    const pct = Math.round((count / totalTasks) * 100);
                    const colors = [
                      'from-primary to-primary-soft',
                      'from-emerald-600 to-emerald-400',
                      'from-amber-500 to-amber-400',
                      'from-rose-500 to-rose-400',
                      'from-violet-600 to-violet-400'
                    ];
                    const grad = colors[idx % colors.length];

                    return (
                      <motion.div 
                        key={area}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        className={`h-full bg-gradient-to-r ${grad} flex items-center justify-center text-[8px] font-black text-white relative group cursor-help`}
                      >
                        {pct > 5 && `${pct}%`}
                        <div className="absolute -top-8 bg-slate-800 text-white px-2.5 py-1 rounded text-[8px] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 shadow-lg">
                          {area.toUpperCase()}: {count} Tarea(s)
                        </div>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Leyendas con contador */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-2">
                  {Object.entries(areasDistribution).map(([area, count], idx) => {
                    const colors = [
                      'bg-primary',
                      'bg-emerald-500',
                      'bg-amber-500',
                      'bg-rose-500',
                      'bg-violet-600'
                    ];
                    const colorClass = colors[idx % colors.length];

                    return (
                      <div key={area} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-slate-100 transition-all">
                        <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                        <div>
                          <p className="text-[9px] font-black text-slate-800 uppercase leading-none">{area}</p>
                          <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{count} Tarea(s)</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-slate-400 font-bold text-xs uppercase tracking-widest bg-slate-50 rounded-[28px] border border-slate-100">
                No hay actividades registradas en este periodo para visualizar la distribución por áreas.
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
