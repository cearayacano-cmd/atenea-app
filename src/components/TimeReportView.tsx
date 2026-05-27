import { useState, useEffect } from 'react';
import { Clock, Calendar, Download, Printer, Search, Users, ShieldAlert, BarChart3, AlertCircle, ArrowUpRight, ArrowDownRight, RefreshCw, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { getStatusColor, getPriorityColor } from '../utils/colors';

interface TaskInstance {
  id: number;
  fecha: string;
  actividad: string;
  prioridad: number;
  completada: number;
  estado_ejecucion: string;
  hallazgos: string | null;
  justificacion: string | null;
  evidencia: string | null;
  area: string | null;
  tiempo_asignado_minutos: number | null;
  tiempo_invertido_minutos: number | null;
  user_name: string;
  user_email: string;
  user_id: number;
  created_at?: string | null;
  assigned_at?: string | null;
  closed_at?: string | null;
}

export default function TimeReportView() {
  const [tasks, setTasks] = useState<TaskInstance[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dailyPlans, setDailyPlans] = useState<any[]>([]);
  const [config, setConfig] = useState<any>(null);
  
  // Accordion open states
  const [expandedAgents, setExpandedAgents] = useState<{ [userId: number]: boolean }>({});
  const [expandedDays, setExpandedDays] = useState<{ [key: string]: boolean }>({});
  
  // Filters
  const [selectedUser, setSelectedUser] = useState('all');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14); // default 2 weeks back
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState('operador');

  useEffect(() => {
    // Get current user role
    fetch('/api/me')
      .then(res => res.json())
      .then(data => {
        setCurrentUserRole(data.role);
        if (data.role === 'operador') {
          // operators only see themselves
          setSelectedUser(data.id.toString());
        }
      })
      .catch(e => console.error(e));

    // Fetch users list
    fetch('/api/usuarios')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(e => console.error(e));

    // Fetch daily plans
    fetch('/api/planes-diarios')
      .then(res => res.json())
      .then(data => setDailyPlans(data))
      .catch(e => console.error(e));

    // Fetch configuration
    fetch('/api/configuracion')
      .then(res => res.json())
      .then(data => setConfig(data))
      .catch(e => console.error(e));
  }, []);

  const toggleAgent = (userId: number) => {
    setExpandedAgents(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const toggleDay = (userId: number, date: string) => {
    const key = `${userId}-${date}`;
    setExpandedDays(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  useEffect(() => {
    fetchReportData();
  }, [selectedUser, startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const query = `/api/reporte-tiempos?userId=${selectedUser}&fechaInicio=${startDate}&fechaFin=${endDate}`;
      const res = await fetch(query);
      const data = await res.json();
      if (data.success) {
        setTasks(data.tasks);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityBadge = (prio: number) => {
    const config = getPriorityColor(prio);
    return <span className={`border text-[8px] font-black px-2 py-0.5 rounded uppercase ${config.badge}`}>{config.label}</span>;
  };

  const getStatusBadge = (status: string | null) => {
    const config = getStatusColor(status || 'nuevo');
    return <span className={`text-[8px] font-black px-2 py-1 rounded-lg uppercase shadow-sm border ${config.badge} ${config.badgeBorder}`}>{config.label}</span>;
  };

  const formatHours = (minutes: number | null) => {
    if (minutes === null || minutes === undefined) return '--';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  const formatTime = (isoString: string | null | undefined) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return '—';
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    } catch (e) {
      return '—';
    }
  };

  // Calculations
  const filteredTasks = tasks.filter(t => 
    t.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.area && t.area.toLowerCase().includes(searchTerm.toLowerCase())) ||
    t.user_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalAssignedMins = filteredTasks.reduce((acc, t) => acc + (t.tiempo_asignado_minutos || 0), 0);
  const totalSpentMins = filteredTasks.reduce((acc, t) => acc + (t.tiempo_invertido_minutos || 0), 0);
  const completedTasks = filteredTasks.filter(t => ['resuelto', 'terminada'].includes(t.estado_ejecucion)).length;
  
  const timeDeviationMins = totalSpentMins - totalAssignedMins;

  // Group tasks by agent (user_id), then by date
  const groupedData: {
    [userId: number]: {
      userId: number;
      userName: string;
      userEmail: string;
      days: {
        [date: string]: {
          date: string;
          tasks: TaskInstance[];
          assignedMinutes: number;
          expectedMinutes: number;
          occupancyPercentage: number;
        }
      };
      totalAssignedMinutes: number;
      totalExpectedMinutes: number;
      overallOccupancy: number;
    }
  } = {};

  filteredTasks.forEach(task => {
    const uid = task.user_id;
    if (!groupedData[uid]) {
      groupedData[uid] = {
        userId: uid,
        userName: task.user_name,
        userEmail: task.user_email,
        days: {},
        totalAssignedMinutes: 0,
        totalExpectedMinutes: 0,
        overallOccupancy: 0
      };
    }

    const date = task.fecha;
    if (!groupedData[uid].days[date]) {
      const plan = dailyPlans.find(p => p.date === date && p.user_id === uid) 
        || dailyPlans.find(p => p.date === date);
      const expectedHrs = plan ? plan.horas_efectivas : (config?.horas_efectivas || 6);
      const expectedMins = expectedHrs * 60;

      groupedData[uid].days[date] = {
        date,
        tasks: [],
        assignedMinutes: 0,
        expectedMinutes: expectedMins,
        occupancyPercentage: 0
      };
    }

    groupedData[uid].days[date].tasks.push(task);
    groupedData[uid].days[date].assignedMinutes += (task.tiempo_asignado_minutos || 0);
  });

  // Compute stats
  Object.values(groupedData).forEach(agent => {
    let totalAssigned = 0;
    let totalExpected = 0;
    
    Object.values(agent.days).forEach(day => {
      day.occupancyPercentage = day.expectedMinutes > 0 
        ? Math.round((day.assignedMinutes / day.expectedMinutes) * 100) 
        : 0;
      totalAssigned += day.assignedMinutes;
      totalExpected += day.expectedMinutes;
    });

    agent.totalAssignedMinutes = totalAssigned;
    agent.totalExpectedMinutes = totalExpected;
    agent.overallOccupancy = totalExpected > 0 
      ? Math.round((totalAssigned / totalExpected) * 100) 
      : 0;
  });

  // Export to CSV
  const exportToCSV = () => {
    const headers = ['Fecha', 'Usuario', 'Actividad', 'Area', 'Prioridad', 'Estado', 'Tiempo Asignado (min)', 'Hora Creación', 'Hora Asignación', 'Hora Cierre', 'Hallazgos/Justificación'];
    const rows = filteredTasks.map(t => [
      t.fecha,
      t.user_name,
      `"${t.actividad.replace(/"/g, '""')}"`,
      t.area || 'CORE',
      t.prioridad,
      t.estado_ejecucion,
      t.tiempo_asignado_minutos || 0,
      formatTime(t.created_at),
      formatTime(t.assigned_at),
      formatTime(t.closed_at),
      `"${(t.hallazgos || t.justificacion || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_tiempos_atenea_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 w-full p-1 print:p-0">
      
      {/* Header Premium (No visible on Print) */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 print:hidden">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#0f004f]/10 rounded-2xl text-primary">
            <Clock size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Planilla de Tiempos</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
              Análisis Detallado de Horas Invertidas y Desvíos Operativos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={exportToCSV}
            className="px-5 py-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-sm"
          >
            <Download size={14} /> Exportar CSV
          </button>
          <button 
            onClick={() => window.print()}
            className="px-5 py-3 bg-[#0f004f] hover:bg-[#1b0088] text-white rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg shadow-[#0f004f]/10"
          >
            <Printer size={14} /> Imprimir Planilla
          </button>
        </div>
      </div>

      {/* FILTROS (No visible on Print) */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-xl shadow-slate-200/20 flex flex-col md:flex-row flex-wrap items-center justify-between gap-4 print:hidden">
        <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
          {/* User selector (only for supervisor role) */}
          {currentUserRole === 'supervisor' && (
            <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-slate-100 w-full md:w-56">
              <Users size={16} className="text-slate-400" />
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase tracking-widest cursor-pointer w-full"
              >
                <option value="all">TODOS LOS ANALISTAS</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Date range pickers */}
          <div className="flex items-center gap-2 bg-slate-50 px-4 py-2.5 rounded-2xl border border-slate-100 w-full md:w-auto">
            <Calendar size={16} className="text-slate-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 cursor-pointer"
            />
            <span className="text-[10px] font-black text-slate-300 mx-1">A</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none text-xs font-bold text-slate-600 cursor-pointer"
            />
          </div>
        </div>

        {/* Text search */}
        <div className="relative w-full md:w-72 lg:w-80">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Filtrar por actividad, área..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 pr-6 py-3 rounded-2xl bg-slate-50 border border-slate-100 outline-none focus:ring-2 focus:ring-primary/20 w-full text-xs font-bold text-slate-700 transition-all"
          />
        </div>
      </div>

      {/* METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Tasks completed */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-xl shadow-slate-200/25 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Tareas Resueltas</span>
            <span className="text-3xl font-black text-primary block">{completedTasks}</span>
            <span className="text-[9px] text-slate-400 font-bold block">de {filteredTasks.length} registradas</span>
          </div>
          <div className="p-4 bg-primary/10 rounded-2xl text-primary">
            <FileText size={24} />
          </div>
        </div>

        {/* Hours Assigned */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-xl shadow-slate-200/25 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Horas Planificadas</span>
            <span className="text-3xl font-black text-slate-700 block">{formatHours(totalAssignedMins)}</span>
            <span className="text-[9px] text-slate-400 font-bold block">Carga estimada teórica</span>
          </div>
          <div className="p-4 bg-blue-50 text-blue-500 rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        {/* Hours Spent */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-xl shadow-slate-200/25 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Horas Reales Invertidas</span>
            <span className="text-3xl font-black text-primary block">{formatHours(totalSpentMins)}</span>
            <span className="text-[9px] text-slate-400 font-bold block">Telemetría de tiempo neto</span>
          </div>
          <div className="p-4 bg-[#99CC33]/15 text-[#7DA81A] rounded-2xl">
            <Clock size={24} />
          </div>
        </div>

        {/* Deviation */}
        <div className="bg-white rounded-[24px] p-6 border border-slate-100 shadow-xl shadow-slate-200/25 flex items-center justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="space-y-1">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Desvío de Tiempos</span>
            <span className={`text-3xl font-black block ${timeDeviationMins > 0 ? 'text-amber-500' : timeDeviationMins < 0 ? 'text-emerald-500' : 'text-slate-500'}`}>
              {timeDeviationMins > 0 ? `+${formatHours(timeDeviationMins)}` : timeDeviationMins < 0 ? `-${formatHours(Math.abs(timeDeviationMins))}` : '0m'}
            </span>
            <span className="text-[9px] text-slate-400 font-bold block">Diferencia (Real - Estimado)</span>
          </div>
          <div className={`p-4 rounded-2xl ${
            timeDeviationMins > 0 ? 'bg-amber-50 text-amber-500' : 'bg-emerald-50 text-emerald-500'
          }`}>
            {timeDeviationMins > 0 ? <ArrowUpRight size={24} /> : <ArrowDownRight size={24} />}
          </div>
        </div>
      </div>

      {/* PRINT TITLE (Only visible on Print) */}
      <div className="hidden print:block border-b-2 border-slate-800 pb-4 mb-6">
        <h1 className="text-2xl font-black font-outfit uppercase">Planilla de Registro de Tiempos (Atenea)</h1>
        <p className="text-xs font-bold text-slate-500 mt-1">
          Rango de Fechas: {startDate} a {endDate} | Filtro de Analista: {selectedUser === 'all' ? 'Todos' : selectedUser}
        </p>
      </div>

      {/* DETAILS ACCORDION BY AGENT AND DAY */}
      <div className="space-y-6 print:space-y-8">
        {loading ? (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl flex flex-col items-center justify-center py-32 gap-3">
            <RefreshCw className="animate-spin text-primary" size={32} />
            <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Compilando Planilla...</span>
          </div>
        ) : Object.keys(groupedData).length === 0 ? (
          <div className="bg-white rounded-[32px] border border-slate-100 shadow-2xl text-center py-24 text-slate-400">
            <AlertCircle className="mx-auto mb-2 opacity-50" size={32} />
            <p className="text-xs font-black uppercase tracking-widest">No se encontraron tareas registradas para los filtros activos.</p>
          </div>
        ) : (
          Object.values(groupedData).map((agent) => {
            const isAgentExpanded = !!expandedAgents[agent.userId];
            const sortedDays = Object.values(agent.days).sort((a, b) => b.date.localeCompare(a.date));
            const initials = agent.userName ? agent.userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'AN';

            return (
              <div key={agent.userId} className="bg-white rounded-[24px] border border-slate-100 shadow-xl overflow-hidden print:border-none print:shadow-none">
                {/* Agent Header Accordion Row */}
                <div 
                  onClick={() => toggleAgent(agent.userId)}
                  className="p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-slate-50/40 cursor-pointer transition-colors border-b border-slate-50 print:cursor-default"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-[#0f004f]/5 border border-[#0f004f]/10 flex items-center justify-center text-[#0f004f] font-black text-sm tracking-widest">
                      {initials}
                    </div>
                    <div>
                      <h4 className="text-base font-black text-slate-800 uppercase tracking-tight">{agent.userName}</h4>
                      <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">{agent.userEmail}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                    {/* Capacity / Occupancy stats */}
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Ocupación Promedio</span>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-black ${
                            agent.overallOccupancy > 100 ? 'text-amber-600' : 'text-primary'
                          }`}>
                            {agent.overallOccupancy}%
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">
                            ({formatHours(agent.totalAssignedMinutes)} asignados)
                          </span>
                        </div>
                      </div>

                      {/* Premium progress bar */}
                      <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden hidden md:block">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            agent.overallOccupancy > 100 
                              ? 'bg-amber-500' 
                              : agent.overallOccupancy > 80 
                              ? 'bg-primary' 
                              : 'bg-blue-400'
                          }`}
                          style={{ width: `${Math.min(agent.overallOccupancy, 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* Chevron toggle button */}
                    <div className="text-slate-400 print:hidden">
                      {isAgentExpanded ? <ChevronDown size={20} className="text-[#0f004f]" /> : <ChevronRight size={20} />}
                    </div>
                  </div>
                </div>

                {/* Days list (Level 2) */}
                <div className={`${isAgentExpanded ? 'block' : 'hidden'} p-6 bg-slate-50/20 border-t border-slate-50 space-y-4 print:block`}>
                  {sortedDays.map((day) => {
                    const dayKey = `${agent.userId}-${day.date}`;
                    const isDayExpanded = !!expandedDays[dayKey];
                    const dateObj = new Date(day.date + 'T00:00:00');
                    const formattedDate = dateObj.toLocaleDateString('es-ES', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    });

                    return (
                      <div key={day.date} className="bg-white rounded-[20px] border border-slate-100 shadow-sm overflow-hidden print:border-none print:shadow-none">
                        {/* Day Row Header */}
                        <div 
                          onClick={() => toggleDay(agent.userId, day.date)}
                          className="px-5 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 hover:bg-slate-50/50 cursor-pointer transition-colors print:cursor-default"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 border border-slate-100 text-slate-500 rounded-lg">
                              <Calendar size={14} />
                            </div>
                            <span className="text-xs font-black text-slate-700 capitalize">
                              {formattedDate}
                            </span>
                          </div>

                          <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                            <div className="flex items-center gap-3">
                              {/* Daily Percentage badge */}
                              <span className={`text-[9px] font-black px-2 py-0.5 rounded border ${
                                day.occupancyPercentage > 100 
                                  ? 'bg-rose-50 text-rose-600 border-rose-100' 
                                  : day.occupancyPercentage >= 70 
                                  ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                  : 'bg-slate-50 text-slate-500 border-slate-100'
                              }`}>
                                {day.occupancyPercentage}% OCUPACIÓN
                              </span>
                              
                              <span className="text-[10px] text-slate-400 font-bold">
                                {formatHours(day.assignedMinutes)} / {formatHours(day.expectedMinutes)}
                              </span>
                            </div>

                            {/* Chevron Toggle indicator */}
                            <div className="text-slate-400 print:hidden">
                              {isDayExpanded ? <ChevronDown size={16} className="text-[#0f004f]" /> : <ChevronRight size={16} />}
                            </div>
                          </div>
                        </div>

                        {/* Task details table for this day (Level 3) */}
                        <div className={`${isDayExpanded ? 'block' : 'hidden'} border-t border-slate-50 overflow-x-auto print:block`}>
                          <table className="w-full border-collapse text-left text-xs">
                            <thead className="bg-[#0f004f]/5 text-slate-700 text-[9px] font-black uppercase tracking-wider border-b border-slate-100">
                              <tr>
                                <th className="p-4 font-black">Área</th>
                                <th className="p-4 font-black">Prioridad</th>
                                <th className="p-4 font-black">Actividad</th>
                                <th className="p-4 font-black">Estado</th>
                                <th className="p-4 font-black text-center">T. Estimado</th>
                                <th className="p-4 font-black text-center">H. Creación</th>
                                <th className="p-4 font-black text-center">H. Asignación</th>
                                <th className="p-4 font-black text-center">H. Cierre</th>
                                <th className="p-4 font-black max-w-[200px]">Hallazgos / Justificación</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {day.tasks.map((t) => (
                                <tr key={t.id} className="hover:bg-slate-50/20 transition-colors">
                                  <td className="p-4">
                                    <span className="bg-slate-100 text-slate-500 text-[8px] font-black px-2 py-0.5 rounded uppercase tracking-wider">
                                      {t.area || 'CORE'}
                                    </span>
                                  </td>
                                  <td className="p-4 whitespace-nowrap">{getPriorityBadge(t.prioridad)}</td>
                                  <td className="p-4 font-bold text-slate-700 uppercase leading-relaxed">{t.actividad}</td>
                                  <td className="p-4 whitespace-nowrap">{getStatusBadge(t.estado_ejecucion)}</td>
                                  <td className="p-4 text-center font-bold text-slate-500 whitespace-nowrap">
                                    {formatHours(t.tiempo_asignado_minutos)}
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-600 whitespace-nowrap">
                                    {formatTime(t.created_at)}
                                  </td>
                                  <td className="p-4 text-center font-bold text-slate-600 whitespace-nowrap">
                                    {formatTime(t.assigned_at)}
                                  </td>
                                  <td className="p-4 text-center whitespace-nowrap">
                                    {formatTime(t.closed_at) !== '—' ? (
                                      <span className={`font-black text-[9px] px-2.5 py-0.5 rounded border tracking-wider flex items-center gap-1 justify-center w-20 mx-auto ${getStatusColor(t.estado_ejecucion).badge} ${getStatusColor(t.estado_ejecucion).badgeBorder}`}>
                                        {formatTime(t.closed_at)}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="p-4 text-slate-500 leading-normal max-w-[200px] font-medium break-words italic">
                                    {t.hallazgos || t.justificacion || (
                                      <span className="text-slate-300 not-italic text-[10px]">—</span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
