import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Activity, Radio, UserCheck, UserX, Clock, AlertTriangle, Briefcase, Users } from 'lucide-react';

interface AgentLiveStatus {
  id: number;
  nombre: string;
  email: string;
  initials: string;
  role: string;
  rol_ejecutante: string;
  estado: 'trabajando' | 'incidencia' | 'disponible' | 'asignada';
  detalle: string;
  tarea: any;
  incidencia: any;
  totalTareas: number;
  porcentajeOcupacion: number;
  minutosOcupados: number;
  minutosCapacidad: number;
  tareas: any[];
}

export default function LiveView() {
  const [agents, setAgents] = useState<AgentLiveStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [error, setError] = useState<string | null>(null);
  
  // State to handle which status filter is currently clicked/expanded
  const [activeFilter, setActiveFilter] = useState<'total' | 'ocupados' | 'trabajando' | 'asignada' | 'incidencia' | 'disponible' | null>(null);

  // State to handle which agent's tasks are expanded/visible
  const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);

  // Quick filters (search & team)
  const [searchQuery, setSearchQuery] = useState('');
  const [teamFilter, setTeamFilter] = useState<'all' | 'Calidad Fabrica' | 'Calidad LATAM'>('all');

  const fetchLiveStatus = async () => {
    try {
      const res = await fetch('/api/admin/live');
      if (!res.ok) throw new Error('Error al obtener estado en vivo');
      const data = await res.json();
      setAgents(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLiveStatus();
    // Refresh every 10 seconds
    const interval = setInterval(fetchLiveStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const total = agents.length;
  const trabajando = agents.filter(a => a.estado === 'trabajando').length;
  const enCola = agents.filter(a => a.estado === 'asignada').length;
  const incidencias = agents.filter(a => a.estado === 'incidencia').length;
  const disponibles = agents.filter(a => a.estado === 'disponible').length;
  const ocupados = trabajando + enCola + incidencias;

  // Carga y capacidad globales del equipo
  const totalMinutosCapacidad = agents.reduce((sum, a) => sum + (a.minutosCapacidad || 0), 0);
  const totalMinutosOcupados = agents.reduce((sum, a) => sum + (a.minutosOcupados || 0), 0);
  const globalOccupationPercent = totalMinutosCapacidad > 0 
    ? Math.round((totalMinutosOcupados / totalMinutosCapacidad) * 100) 
    : 0;

  // Avance global de tareas del día
  const allTasks = agents.flatMap(a => a.tareas || []);
  const totalTasksCount = allTasks.length;
  const completedTasksCount = allTasks.filter(t => 
    t.estado_ejecucion === 'resuelto' || t.estado_ejecucion === 'terminada'
  ).length;
  const globalCompletionPercent = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0;

  const getPercentage = (count: number) => {
    if (total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  // Helper to handle filter toggling
  const toggleFilter = (filterType: 'total' | 'ocupados' | 'trabajando' | 'asignada' | 'incidencia' | 'disponible') => {
    setActiveFilter(prev => prev === filterType ? null : filterType);
  };

  const filteredAgents = agents.filter(ag => {
    // 1. Filtro de Presencia (de las tarjetas superiores)
    if (activeFilter !== null && activeFilter !== 'total') {
      if (activeFilter === 'ocupados') {
        const isOcupado = ag.estado === 'trabajando' || ag.estado === 'asignada' || ag.estado === 'incidencia';
        if (!isOcupado) return false;
      } else if (ag.estado !== activeFilter) {
        return false;
      }
    }
    
    // 2. Filtro por nombre (búsqueda rápida)
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      if (!ag.nombre.toLowerCase().includes(q)) return false;
    }

    // 3. Filtro por equipo (Fábrica vs LATAM)
    if (teamFilter !== 'all') {
      if (ag.rol_ejecutante !== teamFilter) return false;
    }

    return true;
  });

  // Helper to format creation time (age)
  const formatCreationTime = (createdAtStr: string) => {
    try {
      const createdDate = new Date(createdAtStr);
      const diffMs = new Date().getTime() - createdDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Creado: hace un momento';
      if (diffMins < 60) return `Creado: hace ${diffMins}m`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Creado: hace ${diffHours}h`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Creado: hace ${diffDays}d`;
    } catch (e) {
      return '';
    }
  };

  // Helper to format update time (age)
  const formatUpdateTime = (updatedAtStr: string) => {
    try {
      const updatedDate = new Date(updatedAtStr);
      const diffMs = new Date().getTime() - updatedDate.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'Actualizado: hace un momento';
      if (diffMins < 60) return `Actualizado: hace ${diffMins}m`;
      
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `Actualizado: hace ${diffHours}h`;
      
      const diffDays = Math.floor(diffHours / 24);
      return `Actualizado: hace ${diffDays}d`;
    } catch (e) {
      return '';
    }
  };

  // Helper to color task status
  const getTaskStatusStyle = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s === 'nuevo' || s === 'nueva') return 'bg-cyan-50 text-cyan-700 border-cyan-150';
    if (s === 'pendiente') return 'bg-amber-50 text-amber-700 border-amber-150';
    if (s === 'reabierto' || s === 'reabierta') return 'bg-purple-50 text-purple-700 border-purple-150';
    if (s === 'progreso' || s === 'en progreso') return 'bg-emerald-50 text-emerald-700 border-emerald-150';
    if (s === 'arrastrada') return 'bg-orange-50 text-orange-700 border-orange-150';
    return 'bg-slate-50 text-slate-650 border-slate-200';
  };

  return (
    <div className="space-y-8">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white shadow-lg relative">
            <Radio size={24} className="animate-pulse" />
            <div className="absolute top-0 right-0 w-3 h-3 bg-rose-300 rounded-full animate-ping" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Monitoreo en Vivo</h1>
              <span className="px-3 py-1 text-[9px] font-black uppercase bg-red-600 text-white rounded-full tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">
              Última actualización: {lastUpdate.toLocaleTimeString('es-CL')}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-sm font-bold border border-red-200">
          {error}
        </div>
      )}

      {/* ─── Panel de Control Estratégico ──────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CARD 1: ESTADO OPERATIVO */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Operativo</p>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 rounded-lg text-[9px] font-black uppercase tracking-wider">Presencia</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-black text-slate-800">{ocupados}</span>
              <span className="text-sm font-bold text-slate-400">de {total} activos</span>
            </div>
          </div>
          
          <div className="space-y-3">
            {/* Unified Segmented Progress Bar */}
            <div className="h-2 w-full rounded-full bg-slate-100 flex overflow-hidden">
              <div 
                style={{ width: `${(trabajando / (total || 1)) * 100}%` }} 
                className="bg-emerald-500 transition-all duration-500" 
                title={`Trabajando: ${trabajando}`}
              />
              <div 
                style={{ width: `${(enCola / (total || 1)) * 100}%` }} 
                className="bg-blue-400 transition-all duration-500" 
                title={`En Cola: ${enCola}`}
              />
              <div 
                style={{ width: `${(incidencias / (total || 1)) * 100}%` }} 
                className="bg-rose-500 transition-all duration-500" 
                title={`Incidencias: ${incidencias}`}
              />
              <div 
                style={{ width: `${(disponibles / (total || 1)) * 100}%` }} 
                className="bg-slate-300 transition-all duration-500" 
                title={`Disponibles: ${disponibles}`}
              />
            </div>

            {/* Quick Status Legend / Filters */}
            <div className="flex flex-wrap gap-2 text-[10px] font-bold">
              <button 
                onClick={() => toggleFilter('trabajando')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  activeFilter === 'trabajando' 
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-black shadow-sm' 
                    : 'bg-emerald-50/50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Ejecución: {trabajando}
              </button>
              <button 
                onClick={() => toggleFilter('asignada')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  activeFilter === 'asignada' 
                    ? 'bg-blue-100 border-blue-300 text-blue-800 font-black shadow-sm' 
                    : 'bg-blue-50/50 border-blue-100 text-blue-700 hover:bg-blue-100/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                En Cola: {enCola}
              </button>
              <button 
                onClick={() => toggleFilter('incidencia')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  activeFilter === 'incidencia' 
                    ? 'bg-rose-100 border-rose-300 text-rose-800 font-black shadow-sm' 
                    : 'bg-rose-50/50 border-rose-100 text-rose-700 hover:bg-rose-100/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Incidencia: {incidencias}
              </button>
              <button 
                onClick={() => toggleFilter('disponible')}
                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                  activeFilter === 'disponible' 
                    ? 'bg-slate-200 border-slate-350 text-slate-700 font-black shadow-sm' 
                    : 'bg-slate-105 border-slate-200 text-slate-600 hover:bg-slate-200/50'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                Dispo: {disponibles}
              </button>
            </div>
          </div>
        </div>

        {/* CARD 2: EFICIENCIA DE CARGA / OCUPACIÓN */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Carga de Capacidad</p>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 rounded-lg text-[9px] font-black uppercase tracking-wider">Carga</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-black text-indigo-700">{globalOccupationPercent}%</span>
              <span className="text-sm font-bold text-slate-400">del tiempo total asignado</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>{totalMinutosOcupados}m ocupados</span>
              <span>{totalMinutosCapacidad}m planificados</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                style={{ width: `${Math.min(globalOccupationPercent, 100)}%` }} 
                className={`h-full rounded-full transition-all duration-500 ${
                  globalOccupationPercent > 100 ? 'bg-amber-500' :
                  globalOccupationPercent >= 80 ? 'bg-emerald-500' :
                  globalOccupationPercent >= 50 ? 'bg-indigo-500' :
                  'bg-slate-400'
                }`}
              />
            </div>
            <p className="text-[9px] font-bold text-slate-400">
              Porcentaje de horas efectivas del equipo ocupadas en tareas hoy.
            </p>
          </div>
        </div>

        {/* CARD 3: AVANCE DEL PLAN (PROGRESO) */}
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm flex flex-col justify-between min-h-[160px] relative overflow-hidden transition-all duration-300 hover:shadow-md">
          <div>
            <div className="flex justify-between items-start mb-2">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Avance del Plan</p>
              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-650 rounded-lg text-[9px] font-black uppercase tracking-wider">Progreso</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-4xl font-black text-emerald-600">{globalCompletionPercent}%</span>
              <span className="text-sm font-bold text-slate-400">tareas completadas</span>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
              <span>{completedTasksCount} resueltas</span>
              <span>{totalTasksCount} totales</span>
            </div>
            <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
              <div 
                style={{ width: `${globalCompletionPercent}%` }} 
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              />
            </div>
            <p className="text-[9px] font-bold text-slate-400">
              Porcentaje de tareas completadas/resueltas sobre el total planificado para hoy.
            </p>
          </div>
        </div>

      </div>

      {/* ─── Agents Detail Grid ─────────────────────────────────────────── */}
      {loading && agents.length === 0 ? (
        <div className="flex justify-center py-20 text-slate-400">
          <Radio className="animate-spin text-rose-500" size={32} />
        </div>
      ) : (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* ─── Controles de Filtro Rápido (Búsqueda y Equipo) ─── */}
          <div className="bg-white border border-slate-100 rounded-3xl p-4 shadow-sm flex flex-col md:flex-row items-center gap-4">
            {/* Buscador */}
            <div className="relative w-full md:flex-1">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-xs">
                🔍
              </span>
              <input
                type="text"
                placeholder="Buscar agente por nombre..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 placeholder-slate-450 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400 focus:bg-white transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Selector de Equipo */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-2xl p-1 w-full md:w-auto self-stretch md:self-auto overflow-x-auto shrink-0 select-none">
              <button
                onClick={() => setTeamFilter('all')}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                  teamFilter === 'all'
                    ? 'bg-[#0f004f] text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-700 font-bold'
                }`}
              >
                👥 Todo el equipo
              </button>
              <button
                onClick={() => setTeamFilter('Calidad Fabrica')}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                  teamFilter === 'Calidad Fabrica'
                    ? 'bg-[#0f004f] text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-700 font-bold'
                }`}
              >
                🏭 Equipo FAB
              </button>
              <button
                onClick={() => setTeamFilter('Calidad LATAM')}
                className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer text-center whitespace-nowrap ${
                  teamFilter === 'Calidad LATAM'
                    ? 'bg-[#0f004f] text-white shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-700 font-bold'
                }`}
              >
                ✈️ Equipo LATAM
              </button>
            </div>
          </div>

          {/* Active filter header (only show when a filter is explicitly selected) */}
          {activeFilter !== null && (
            <div className="flex items-center justify-between bg-slate-50 px-6 py-3 rounded-2xl border border-slate-100">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-400 tracking-wider">Filtro Activo:</span>
                <span className="text-xs font-black uppercase text-slate-800 tracking-wider bg-white px-2.5 py-1 rounded-lg border border-slate-100 shadow-sm flex items-center gap-1.5">
                  {activeFilter === 'total' && <>Todos los Operadores ({filteredAgents.length})</>}
                  {activeFilter === 'ocupados' && <>Operadores Activos / Ocupados ({filteredAgents.length})</>}
                  {activeFilter === 'trabajando' && <>Operadores Trabajando ({filteredAgents.length})</>}
                  {activeFilter === 'asignada' && <>Operadores En Cola ({filteredAgents.length})</>}
                  {activeFilter === 'incidencia' && <>Operadores En Incidencia ({filteredAgents.length})</>}
                  {activeFilter === 'disponible' && <>Operadores Disponibles ({filteredAgents.length})</>}
                </span>
              </div>
              <button 
                onClick={() => setActiveFilter(null)}
                className="text-xs font-black text-slate-400 hover:text-slate-600 uppercase tracking-wider cursor-pointer flex items-center gap-1 transition-colors"
              >
                Limpiar filtro ✕
              </button>
            </div>
          )}

          {/* List of matching agents */}
          <div className="flex flex-col gap-4">
            {filteredAgents.length === 0 ? (
              <div className="bg-white rounded-3xl border border-slate-100 p-8 text-center text-slate-400">
                <UserX size={32} className="mx-auto mb-2 text-slate-200" />
                <p className="text-xs font-bold uppercase tracking-wider">No hay operadores en este estado</p>
              </div>
            ) : (
              filteredAgents.map((ag) => {
                const isTrabajando = ag.estado === 'trabajando';
                const isIncidencia = ag.estado === 'incidencia';
                const isAsignada = ag.estado === 'asignada';
                
                // Colores por estado
                let bgCard = 'bg-slate-50 border-slate-200';
                let bgAvatar = 'bg-slate-300';
                let statusText = 'Disponible';
                let statusColor = 'text-slate-500';
                let indicator = 'bg-slate-300';

                if (isTrabajando) {
                  bgCard = 'bg-white border-emerald-200';
                  bgAvatar = 'bg-gradient-to-br from-emerald-400 to-emerald-600';
                  statusText = 'En Ejecución';
                  statusColor = 'text-emerald-600';
                  indicator = 'bg-emerald-500 animate-pulse';
                } else if (isIncidencia) {
                  bgCard = 'bg-rose-50 border-rose-200';
                  bgAvatar = 'bg-gradient-to-br from-rose-400 to-rose-600';
                  statusText = 'Incidencia';
                  statusColor = 'text-rose-600';
                  indicator = 'bg-rose-500 animate-pulse';
                } else if (isAsignada) {
                  bgCard = 'bg-white border-blue-200';
                  bgAvatar = 'bg-gradient-to-br from-blue-400 to-blue-600';
                  statusText = 'En Cola';
                  statusColor = 'text-blue-600';
                  indicator = 'bg-blue-400';
                }

                const isExpanded = expandedAgentId === ag.id;

                return (
                  <div key={ag.id} className="flex flex-col gap-2">
                    <motion.div
                      layoutId={`agent-${ag.id}`}
                      onClick={() => setExpandedAgentId(prev => prev === ag.id ? null : ag.id)}
                      className={`rounded-3xl border p-4 flex flex-col md:flex-row md:items-center gap-6 transition-all cursor-pointer hover:shadow-md ${bgCard} ${
                        isExpanded ? 'ring-2 ring-indigo-500/20 border-indigo-400 shadow-sm' : ''
                      }`}
                    >
                      {/* Agent Info (Left side) */}
                      <div className="flex items-center gap-4 md:w-56 shrink-0">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black shadow-md shrink-0 ${bgAvatar}`}>
                          {ag.initials}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-black text-slate-800 truncate" title={ag.nombre}>{ag.nombre}</h3>
                          <p className="text-[9px] font-bold uppercase text-slate-400 tracking-wider truncate">{ag.rol_ejecutante}</p>
                        </div>
                      </div>

                      {/* Factor de Ocupación por Agente */}
                      <div className="flex flex-col gap-0.5 md:w-44 shrink-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Ocupación:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            ag.porcentajeOcupacion > 100 ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                            ag.porcentajeOcupacion >= 80 ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' :
                            ag.porcentajeOcupacion >= 50 ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                            'bg-slate-100 text-slate-700 border border-slate-200'
                          }`}>
                            {ag.porcentajeOcupacion}%
                          </span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400">
                          {ag.totalTareas} {ag.totalTareas === 1 ? 'tarea tomada' : 'tareas tomadas'} ({ag.minutosOcupados}m / {ag.minutosCapacidad}m)
                        </span>
                      </div>

                      {/* Status Badge (Middle) */}
                      <div className="flex items-center gap-2 md:w-28 shrink-0">
                        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${indicator}`} />
                        <span className={`text-[10px] font-black uppercase tracking-wider ${statusColor}`}>{statusText}</span>
                      </div>

                      {/* Expand indicator button aligned to the right */}
                      <div className="ml-auto shrink-0 text-[10px] font-bold uppercase tracking-widest bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-500 rounded-xl px-3 py-1.5 transition-colors select-none">
                        {isExpanded ? 'Contraer ▲' : 'Ver todo ▼'}
                      </div>
                    </motion.div>

                    {/* Expanded list showing all tasks (Individual & Collaborative/Group) */}
                    {isExpanded && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-150 rounded-3xl p-5 ml-4 md:ml-12 shadow-sm space-y-4"
                      >
                        {/* Current Active Foco / Status Details Banner */}
                        {(isTrabajando || isIncidencia || isAsignada) && (
                          <div className="pb-2">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Estado Actual / Foco</p>
                            {isTrabajando && ag.tarea ? (
                              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold uppercase text-emerald-600 mb-0.5">Actividad En Ejecución</p>
                                  <p className="text-sm font-bold text-slate-800" title={ag.detalle}>{ag.detalle}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end md:max-w-[320px]">
                                  {/* Creado hace */}
                                  {ag.tarea.created_at && (
                                    <span className="px-2 py-0.5 bg-white text-slate-500 border border-slate-150 rounded-lg text-[9px] font-bold shadow-sm">
                                      {formatCreationTime(ag.tarea.created_at)}
                                    </span>
                                  )}

                                  {/* Actualizado hace */}
                                  {ag.tarea.updated_at && 
                                   ag.tarea.created_at && 
                                   (new Date(ag.tarea.updated_at).getTime() - new Date(ag.tarea.created_at).getTime() > 60000) && (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                      {formatUpdateTime(ag.tarea.updated_at)}
                                    </span>
                                  )}

                                  {/* Status */}
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border shadow-sm ${
                                    getTaskStatusStyle(ag.tarea.backlog_status || ag.tarea.estado_ejecucion)
                                  }`}>
                                    {ag.tarea.backlog_status || ag.tarea.estado_ejecucion || 'Nuevo'}
                                  </span>

                                  {/* Complejidad */}
                                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                    Compl: {ag.tarea.complejidad || 2}
                                  </span>

                                  {/* Prioridad Crítica */}
                                  {ag.tarea.prioridad === 10 && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase shadow-sm">Crítica</span>
                                  )}

                                  {/* Tiempo Asignado */}
                                  <span className="px-2 py-0.5 bg-white rounded-lg text-[9px] font-black text-emerald-700 shadow-sm flex items-center gap-1 border border-slate-150">
                                    <Clock size={10} /> {ag.tarea.tiempo_asignado_minutos || 60}m
                                  </span>
                                </div>
                              </div>
                            ) : isIncidencia ? (
                              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-100">
                                <p className="text-[9px] font-bold uppercase text-rose-650 mb-0.5">Incidencia Reportada</p>
                                <p className="text-sm font-bold text-slate-800" title={ag.detalle}>{ag.detalle}</p>
                              </div>
                            ) : isAsignada && ag.tarea ? (
                              <div className="bg-blue-50/50 rounded-2xl p-4 border border-blue-100 border-dashed flex items-center justify-between gap-4">
                                <div className="min-w-0">
                                  <p className="text-[9px] font-bold uppercase text-blue-600 mb-0.5">Asignada / Próxima en Cola</p>
                                  <p className="text-sm font-bold text-slate-700" title={ag.detalle}>{ag.detalle}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-1.5 shrink-0 justify-end md:max-w-[320px]">
                                  {/* Creado hace */}
                                  {ag.tarea.created_at && (
                                    <span className="px-2 py-0.5 bg-white text-slate-500 border border-slate-150 rounded-lg text-[9px] font-bold shadow-sm">
                                      {formatCreationTime(ag.tarea.created_at)}
                                    </span>
                                  )}

                                  {/* Actualizado hace */}
                                  {ag.tarea.updated_at && 
                                   ag.tarea.created_at && 
                                   (new Date(ag.tarea.updated_at).getTime() - new Date(ag.tarea.created_at).getTime() > 60000) && (
                                    <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                      {formatUpdateTime(ag.tarea.updated_at)}
                                    </span>
                                  )}

                                  {/* Status */}
                                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border shadow-sm ${
                                    getTaskStatusStyle(ag.tarea.backlog_status || ag.tarea.estado_ejecucion)
                                  }`}>
                                    {ag.tarea.backlog_status || ag.tarea.estado_ejecucion || 'Nuevo'}
                                  </span>

                                  {/* Complejidad */}
                                  <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                    Compl: {ag.tarea.complejidad || 2}
                                  </span>

                                  {/* Prioridad Crítica */}
                                  {ag.tarea.prioridad === 10 && (
                                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase shadow-sm">Crítica</span>
                                  )}

                                  {/* Tiempo Asignado */}
                                  <span className="px-2 py-0.5 bg-white rounded-lg text-[9px] font-black text-blue-700 shadow-sm flex items-center gap-1 border border-slate-150">
                                    <Clock size={10} /> {ag.tarea.tiempo_asignado_minutos || 60}m
                                  </span>
                                </div>
                              </div>
                            ) : null}
                          </div>
                        )}

                        <div className="flex items-center justify-between border-b border-slate-100 pb-3 pt-2">
                          <h4 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                            Tareas Asignadas del Día - {ag.nombre}
                          </h4>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 border border-slate-100 px-2.5 py-1 rounded-lg">
                            Capacidad: {ag.minutosCapacidad} minutos ({ag.minutosCapacidad / 60} hrs)
                          </span>
                        </div>

                        {ag.tareas && ag.tareas.length > 0 ? (
                          <div className="grid grid-cols-1 gap-2">
                            {ag.tareas.map((t: any) => {
                              const tCompletada = t.estado_ejecucion === 'resuelto' || t.estado_ejecucion === 'terminada';
                              const tEnProgreso = ['progreso', 'en progreso', 'en curso'].includes(t.estado_ejecucion || '');
                              const tIncidencia = t.estado_ejecucion === 'incidencia';

                              let statusBadge = 'bg-slate-50 text-slate-500 border-slate-200';
                              let statusLabel = 'Pendiente';
                              if (tCompletada) {
                                statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                                statusLabel = 'Completada';
                              } else if (tEnProgreso) {
                                statusBadge = 'bg-amber-50 text-amber-700 border-amber-100 animate-pulse';
                                statusLabel = 'En Progreso';
                              } else if (tIncidencia) {
                                statusBadge = 'bg-rose-50 text-rose-700 border-rose-100';
                                statusLabel = 'Incidencia';
                              }

                              return (
                                <div key={t.id} className="flex items-center justify-between gap-4 p-3 bg-slate-50/50 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-colors">
                                  <div className="flex items-center gap-3 min-w-0">
                                    {/* Collaborative (Group) or Individual Badge */}
                                    {t.is_collaborative === 1 ? (
                                      <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase shrink-0" title="Tarea grupal / colaborativa">
                                        Grupal
                                      </span>
                                    ) : (
                                      <span className="px-2 py-0.5 bg-slate-100 border border-slate-250 text-slate-650 rounded-lg text-[9px] font-black uppercase shrink-0" title="Tarea individual">
                                        Individual
                                      </span>
                                    )}

                                    <span className={`px-2 py-0.5 border rounded-lg text-[9px] font-black uppercase shrink-0 ${statusBadge}`}>
                                      {statusLabel}
                                    </span>

                                    <p className="text-xs font-bold text-slate-700 truncate" title={t.actividad}>
                                      {t.actividad}
                                    </p>
                                  </div>

                                  <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
                                    {/* Creado hace */}
                                    {t.created_at && (
                                      <span className="px-2 py-0.5 bg-white text-slate-500 border border-slate-150 rounded-lg text-[9px] font-bold shadow-sm">
                                        {formatCreationTime(t.created_at)}
                                      </span>
                                    )}

                                    {/* Actualizado hace */}
                                    {t.updated_at && 
                                     t.created_at && 
                                     (new Date(t.updated_at).getTime() - new Date(t.created_at).getTime() > 60000) && (
                                      <span className="px-2 py-0.5 bg-amber-50 text-amber-700 border border-amber-150 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                        {formatUpdateTime(t.updated_at)}
                                      </span>
                                    )}

                                    {/* Status */}
                                    {t.backlog_status && (
                                      <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase border shadow-sm ${
                                        getTaskStatusStyle(t.backlog_status)
                                      }`}>
                                        {t.backlog_status}
                                      </span>
                                    )}

                                    {/* Complejidad */}
                                    <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-150 text-indigo-700 rounded-lg text-[9px] font-black uppercase shadow-sm">
                                      Compl: {t.complejidad || 2}
                                    </span>

                                    {t.prioridad === 10 && (
                                      <span className="px-2 py-0.5 bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-[9px] font-black uppercase shadow-sm">Crítica</span>
                                    )}
                                    <span className="text-xs font-bold text-slate-500 flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-100 shadow-sm">
                                      <Clock size={12} className="text-slate-400" /> {t.tiempo_asignado_minutos || 60}m
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 text-center py-4">No tiene tareas planificadas para hoy.</p>
                        )}
                      </motion.div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

