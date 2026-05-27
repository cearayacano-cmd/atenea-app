import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  BarChart3, Users, AlertTriangle,
  Clock, Zap, ShieldAlert, Activity, Target,
  ChevronLeft, ChevronRight, Loader2, Award, Coffee,
  ArrowUpRight, ArrowDownRight, Minus, Gauge, CalendarDays, X,
  RefreshCw, History
} from 'lucide-react';

interface AgenteStat {
  id: number;
  nombre: string;
  email: string;
  initials: string;
  role: string;
  rol_ejecutante: string;
  totalTareas: number;
  completadas: number;
  tasaCumplimiento: number;
  horasInvertidas: number;
  horasPlaneadas: number;
  horasLeak: number;
  incidencias: number;
  criticas: number;
  criticasCompletadas: number;
  tasaCriticas: number;
  cargaCognitiva: number;
}

interface TendenciaDia {
  fecha: string;
  total: number;
  completadas: number;
  tasa: number;
}

interface ResumenData {
  resumenGlobal: {
    totalTareas: number;
    completadas: number;
    tasaCumplimiento: number;
    horasInvertidas: number;
    horasPlaneadas: number;
    horasLeak: number;
    criticas: number;
    criticasCompletadas: number;
    tasaCriticas: number;
    tasaAltas: number;
    tasaOcupacion: number;
    jornadas: any;
    reprogramadas: number;
    arrastradas: number;
    antiguedadPromedio: number;
    backlogAcumuladoDias: number;
    backlogPromedioDias: number;
  };
  porAgente: AgenteStat[];
  tendenciaDiaria: TendenciaDia[];
  distribucionArea: Record<string, number>;
  distribucionPrioridad: { critica: number; alta: number; media: number; baja: number };
  tiposIncidencia: Record<string, number>;
}

const AREA_COLORS: Record<string, string> = {
  'Operativo': '#6366f1',
  'Monitoreo': '#0ea5e9',
  'Tendencias': '#f59e0b',
  'Escuelita': '#10b981',
  'Calidad': '#ec4899',
};

function getAreaColor(area: string) {
  return AREA_COLORS[area] || '#94a3b8';
}

function RingChart({ pct, color, size = 80 }: { pct: number; color: string; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={10} />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
      <text x={size / 2} y={size / 2 + 5} textAnchor="middle" fontSize={size * 0.18} fontWeight="900" fill="#1e293b">
        {pct}%
      </text>
    </svg>
  );
}

function BarMini({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
      <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
    </div>
  );
}

function TrendBadge({ value }: { value: number }) {
  if (value > 70) return <span className="flex items-center gap-0.5 text-[10px] font-black text-emerald-600"><ArrowUpRight size={12} />Alto</span>;
  if (value >= 50) return <span className="flex items-center gap-0.5 text-[10px] font-black text-amber-600"><Minus size={12} />Medio</span>;
  return <span className="flex items-center gap-0.5 text-[10px] font-black text-red-600"><ArrowDownRight size={12} />Bajo</span>;
}

function getWeekRange(offset: number) {
  const today = new Date();
  const day = today.getDay();
  const diff = today.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(today.setDate(diff + offset * 7));
  monday.setHours(0, 0, 0, 0);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 6);
  return { monday, friday };
}

function getMonthRange(offset: number) {
  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  return { startOfMonth, endOfMonth };
}

const fmt = (d: Date) => d.toISOString().split('T')[0];
const fmtDate = (s: string) => {
  const d = new Date(s + 'T12:00:00');
  return d.toLocaleDateString('es-CL', { day: '2-digit', month: 'short' });
};

export default function AdminView() {
  const [tab, setTab] = useState<'semanal' | 'mensual' | 'rango'>('rango');
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthOffset, setMonthOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ResumenData | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<number | 'all' | 'team:FAB' | 'team:LATAM'>('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const today = fmt(new Date());
  const defaultFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return fmt(d);
  })();
  const [customFrom, setCustomFrom] = useState(defaultFrom);
  const [customTo, setCustomTo]   = useState(today);
  const datePickerRef = useRef<HTMLDivElement>(null);
  const dateLabel = `${fmtDate(customFrom)} – ${fmtDate(customTo)}`;

  const [isDemoData, setIsDemoData] = useState(false);

  const buildMockData = (): ResumenData => {
    const agentesDemo: AgenteStat[] = [
      { id: 1, nombre: 'Carlos E. Araya',   email: 'carlose.araya@latam.com',  initials: 'CA', role: 'supervisor', rol_ejecutante: 'Calidad Fabrica', totalTareas: 18, completadas: 16, tasaCumplimiento: 89, horasInvertidas: 28.5, horasPlaneadas: 32.0, horasLeak: 1.5, incidencias: 2, criticas: 3, criticasCompletadas: 3, tasaCriticas: 100, cargaCognitiva: 3.8 },
      { id: 2, nombre: 'FAB Calidad 01',    email: 'FABcalidad01@latam.com',   initials: 'F1', role: 'operador',   rol_ejecutante: 'Calidad Fabrica', totalTareas: 22, completadas: 18, tasaCumplimiento: 82, horasInvertidas: 34.0, horasPlaneadas: 38.0, horasLeak: 2.5, incidencias: 3, criticas: 2, criticasCompletadas: 2, tasaCriticas: 100, cargaCognitiva: 4.2 },
      { id: 3, nombre: 'FAB Calidad 02',    email: 'FABcalidad02@latam.com',   initials: 'F2', role: 'operador',   rol_ejecutante: 'Calidad Fabrica', totalTareas: 19, completadas: 13, tasaCumplimiento: 68, horasInvertidas: 29.0, horasPlaneadas: 35.0, horasLeak: 3.0, incidencias: 4, criticas: 1, criticasCompletadas: 1, tasaCriticas: 100, cargaCognitiva: 2.9 },
      { id: 4, nombre: 'FAB Calidad 03',    email: 'FABcalidad03@latam.com',   initials: 'F3', role: 'operador',   rol_ejecutante: 'Calidad Fabrica', totalTareas: 15, completadas:  7, tasaCumplimiento: 47, horasInvertidas: 22.0, horasPlaneadas: 30.0, horasLeak: 4.5, incidencias: 5, criticas: 2, criticasCompletadas: 1, tasaCriticas:  50, cargaCognitiva: 1.5 },
      { id: 5, nombre: 'LATAM Calidad 01',  email: 'LATAMcalidad01@latam.com', initials: 'L1', role: 'operador',   rol_ejecutante: 'Calidad LATAM',   totalTareas: 24, completadas: 21, tasaCumplimiento: 88, horasInvertidas: 37.5, horasPlaneadas: 40.0, horasLeak: 1.0, incidencias: 1, criticas: 3, criticasCompletadas: 3, tasaCriticas: 100, cargaCognitiva: 4.5 },
      { id: 6, nombre: 'LATAM Calidad 02',  email: 'LATAMcalidad02@latam.com', initials: 'L2', role: 'operador',   rol_ejecutante: 'Calidad LATAM',   totalTareas: 20, completadas: 16, tasaCumplimiento: 80, horasInvertidas: 31.0, horasPlaneadas: 36.0, horasLeak: 2.0, incidencias: 2, criticas: 2, criticasCompletadas: 2, tasaCriticas: 100, cargaCognitiva: 3.2 },
      { id: 7, nombre: 'LATAM Calidad 03',  email: 'LATAMcalidad03@latam.com', initials: 'L3', role: 'operador',   rol_ejecutante: 'Calidad LATAM',   totalTareas: 17, completadas: 10, tasaCumplimiento: 59, horasInvertidas: 25.0, horasPlaneadas: 32.0, horasLeak: 3.5, incidencias: 3, criticas: 1, criticasCompletadas: 0, tasaCriticas:   0, cargaCognitiva: 1.8 },
    ];

    const totT     = agentesDemo.reduce((s, a) => s + a.totalTareas,       0);
    const totC     = agentesDemo.reduce((s, a) => s + a.completadas,       0);
    const totHI    = agentesDemo.reduce((s, a) => s + a.horasInvertidas,   0);
    const totHP    = agentesDemo.reduce((s, a) => s + a.horasPlaneadas,    0);
    const totHL    = agentesDemo.reduce((s, a) => s + a.horasLeak,         0);
    const totCrit  = agentesDemo.reduce((s, a) => s + a.criticas,          0);
    const totCritOk= agentesDemo.reduce((s, a) => s + a.criticasCompletadas,0);

    // Tendencia: generate dates relative to today
    const base = new Date();
    const dayOfWeek = base.getDay();
    const mondayDiff = base.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
    // Tendencia: generate dates matching the selected range
    const start = new Date(customFrom + 'T00:00:00');
    const end = new Date(customTo + 'T00:00:00');
    const diffTime = Math.max(0, end.getTime() - start.getTime());
    const dias = Math.min(60, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    const totalesPorDia   = [8, 12, 10, 14,  9,  6,  7];
    const completasPorDia = [7, 10,  7, 12,  7,  4,  6];
    const tendencia: TendenciaDia[] = Array.from({ length: dias }, (_, i) => {
      const d = new Date(start.getTime());
      d.setDate(start.getDate() + i);
      const total     = totalesPorDia[i % 7] + (i % 3);
      const completadas = Math.min(completasPorDia[i % 7] + (i % 2), total);
      return {
        fecha: fmt(d),
        total,
        completadas,
        tasa: total > 0 ? Math.round((completadas / total) * 100) : 0,
      };
    });

    return {
      resumenGlobal: {
        totalTareas:       totT,
        completadas:       totC,
        tasaCumplimiento:  Math.round((totC / totT) * 100),
        horasInvertidas:   +totHI.toFixed(1),
        horasPlaneadas:    +totHP.toFixed(1),
        horasLeak:         +totHL.toFixed(1),
        criticas:          totCrit,
        criticasCompletadas: totCritOk,
        tasaCriticas:      totCrit > 0 ? Math.round((totCritOk / totCrit) * 100) : 0,
        tasaAltas:         76,
        tasaOcupacion:     totHP > 0 ? Math.round((totHI / totHP) * 100) : 0,
        jornadas:          { total: 35, jornadas: 30 },
        reprogramadas:     14,
        arrastradas: 4,
        antiguedadPromedio: 1.5,
        backlogAcumuladoDias: 245,
        backlogPromedioDias: 18,
      },
      porAgente:          agentesDemo,
      tendenciaDiaria:    tendencia,
      distribucionArea:   { 'Operativo': 42, 'Calidad': 31, 'Monitoreo': 24, 'Escuelita': 18, 'Tendencias': 20 },
      distribucionPrioridad: { critica: 14, alta: 38, media: 53, baja: 30 },
      tiposIncidencia:    { 'Soporte Técnico': 8, 'Reunión Extra': 6, 'Incidente Sistema': 3, 'Capacitación No Planificada': 2 },
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        let startStr = '', endStr = '';
        if (tab === 'semanal') {
          const base = new Date();
          const dow = base.getDay();
          const mondayDate = base.getDate() - dow + (dow === 0 ? -6 : 1);
          const monday = new Date(base.getFullYear(), base.getMonth(), mondayDate + weekOffset * 7);
          const friday = new Date(base.getFullYear(), base.getMonth(), mondayDate + weekOffset * 7 + 6);
          startStr = fmt(monday); endStr = fmt(friday);
        } else if (tab === 'mensual') {
          const { startOfMonth, endOfMonth } = getMonthRange(monthOffset);
          startStr = fmt(startOfMonth); endStr = fmt(endOfMonth);
        } else {
          // rango personalizado
          if (!customFrom || !customTo) return;
          startStr = customFrom; endStr = customTo;
        }

        const res = await fetch(`/api/admin/resumen?fechaInicio=${startStr}&fechaFin=${endStr}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();

        const hasData = json?.resumenGlobal && json.resumenGlobal.totalTareas > 0;
        if (hasData) {
          setIsDemoData(false);
          setData(json);
        } else {
          setIsDemoData(true);
          setData(buildMockData());
        }
      } catch (e) {
        console.error('Error loading admin data, using demo:', e);
        setIsDemoData(true);
        setData(buildMockData());
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [customFrom, customTo]);



  const g = data?.resumenGlobal;
  const agents = data?.porAgente || [];
  const visibleAgents = selectedAgent === 'all' ? agents :
    selectedAgent === 'team:FAB' ? agents.filter(a => a.rol_ejecutante === 'Calidad Fabrica') :
    selectedAgent === 'team:LATAM' ? agents.filter(a => a.rol_ejecutante === 'Calidad LATAM') :
    agents.filter(a => a.id === selectedAgent);
  const trend = data?.tendenciaDiaria || [];
  const maxTrendTotal = Math.max(...trend.map(t => t.total), 1);

  // Area chart
  const areas = Object.entries(data?.distribucionArea || {}).sort((a, b) => b[1] - a[1]);
  const totalAreas = areas.reduce((s, [, v]) => s + v, 0);

  // Priority chart
  const prio = data?.distribucionPrioridad || { critica: 0, alta: 0, media: 0, baja: 0 };
  const totalPrio = prio.critica + prio.alta + prio.media + prio.baja || 1;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <Loader2 size={36} className="animate-spin text-primary" />
          <span className="text-sm font-bold uppercase tracking-widest">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0f004f] to-[#4f0f9f] flex items-center justify-center text-white shadow-lg">
            <BarChart3 size={24} />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Panel de Administración</h1>
              <span className="px-3 py-1 text-[9px] font-black uppercase bg-[#0f004f] text-white rounded-full tracking-widest">Solo Supervisor</span>
            </div>
            <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">Visión global del equipo · {dateLabel}</p>
          </div>
        </div>

        {/* Period controls (Range Picker Only) */}
        <div className="flex items-center gap-3">
          <div className="relative" ref={datePickerRef}>
            <button
              onClick={() => setShowDatePicker(p => !p)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors">
              <CalendarDays size={14} className="text-indigo-500" />
              {fmtDate(customFrom)} → {fmtDate(customTo)}
            </button>
            <AnimatePresence>
              {showDatePicker && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.97 }}
                  className="absolute right-0 top-12 z-50 bg-white rounded-3xl shadow-2xl border border-slate-100 p-6 w-72">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm font-black text-slate-800 uppercase tracking-wider">Seleccionar período</span>
                    <button onClick={() => setShowDatePicker(false)} className="p-1 text-slate-400 hover:text-slate-700"><X size={16}/></button>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Desde</label>
                      <input type="date" value={customFrom} max={customTo}
                        onChange={e => setCustomFrom(e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    <div>
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block mb-1.5">Hasta</label>
                      <input type="date" value={customTo} min={customFrom} max={today}
                        onChange={e => setCustomTo(e.target.value)}
                        className="w-full border border-slate-200 rounded-2xl px-4 py-2.5 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                    </div>
                    {/* Quick presets */}
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      {[
                        { label: 'Últimos 7 días', days: 7 },
                        { label: 'Últimos 14 días', days: 14 },
                        { label: 'Últimos 30 días', days: 30 },
                        { label: 'Últimos 60 días', days: 60 },
                      ].map(p => (
                        <button key={p.days}
                          onClick={() => {
                            const end = new Date();
                            const start = new Date();
                            start.setDate(start.getDate() - p.days + 1);
                            setCustomFrom(fmt(start)); setCustomTo(fmt(end));
                          }}
                          className="px-3 py-2 text-[10px] font-black uppercase bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors text-slate-600">
                          {p.label}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setShowDatePicker(false)}
                      className="w-full py-2.5 bg-[#0f004f] text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-[#1a0080] transition-colors">
                      Aplicar Rango
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ─── KPIs Globales ──────────────────────────────────────── */}
      {isDemoData && (
        <div className="flex items-center gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs">
          <span className="text-lg">🧪</span>
          <div>
            <span className="font-black text-amber-800 uppercase tracking-wider">Datos de Demostración</span>
            <span className="text-amber-700 ml-2">— No hay registros reales en este período. Los datos mostrados son ficticios y representativos del equipo.</span>
          </div>
        </div>
      )}

      {/* ─── KPIs Globales ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {[
          {
            label: 'Cumplimiento Global', value: `${g?.tasaCumplimiento ?? 0}%`,
            sub: `${g?.completadas ?? 0} de ${g?.totalTareas ?? 0} tareas`, icon: Target,
            bg: 'bg-violet-50', text: 'text-violet-600'
          },
          {
            label: 'Ocupación Promedio', value: `${g?.tasaOcupacion ?? 0}%`,
            sub: `${g?.horasInvertidas ?? 0}h de ${g?.horasPlaneadas ?? 0}h planeadas`, icon: Gauge,
            bg: 'bg-teal-50', text: 'text-teal-600'
          },
          {
            label: 'Horas Trabajadas', value: `${g?.horasInvertidas ?? 0}h`,
            sub: `Planeadas: ${g?.horasPlaneadas ?? 0}h`, icon: Clock,
            bg: 'bg-sky-50', text: 'text-sky-600'
          },
          {
            label: 'Fuga Operativa', value: `${g?.horasLeak ?? 0}h`,
            sub: 'Incidencias no planificadas', icon: AlertTriangle,
            bg: 'bg-rose-50', text: 'text-rose-600'
          },
          {
            label: 'Tareas Críticas', value: `${g?.tasaCriticas ?? 0}%`,
            sub: `${g?.criticasCompletadas ?? 0} de ${g?.criticas ?? 0} resueltas`, icon: ShieldAlert,
            bg: 'bg-amber-50', text: 'text-amber-600'
          },
          {
            label: 'Al Otro Día', value: `${g?.arrastradas ?? 0}`,
            sub: `Antigüedad prom: ${g?.antiguedadPromedio ?? 0}d`, icon: RefreshCw,
            bg: 'bg-indigo-50', text: 'text-indigo-600'
          },
          {
            label: 'Backlog Acumulado', value: `${g?.backlogAcumuladoDias ?? 0}d`,
            sub: `Promedio: ${g?.backlogPromedioDias ?? 0}d / item`, icon: History,
            bg: 'bg-emerald-50', text: 'text-emerald-600'
          },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className={`p-2.5 ${kpi.bg} ${kpi.text} rounded-2xl`}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-3xl font-black text-slate-900 mb-0.5">{kpi.value}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xs text-slate-500 mt-1">{kpi.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* ─── Filtro de agente ────────────────────────────────────── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button onClick={() => setSelectedAgent('all')}
          className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${selectedAgent === 'all' ? 'bg-[#0f004f] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
          <Users size={12} className="inline mr-1.5" />Todo el equipo
        </button>

        {/* Filtros por Equipo */}
        <button onClick={() => setSelectedAgent('team:FAB')}
          className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${selectedAgent === 'team:FAB' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
          🏭 Equipo FAB
        </button>
        <button onClick={() => setSelectedAgent('team:LATAM')}
          className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${selectedAgent === 'team:LATAM' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
          ✈️ Equipo LATAM
        </button>

        <div className="h-6 w-[1px] bg-slate-200 mx-1 flex-shrink-0" />
        {agents.map(a => (
          <button key={a.id} onClick={() => setSelectedAgent(a.id)}
            className={`flex-shrink-0 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-wider transition-all ${selectedAgent === a.id ? 'bg-[#0f004f] text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-slate-400'}`}>
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white text-[8px] font-black mr-1.5">{a.initials}</span>
            {a.nombre.split(' ')[0]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ─── Left: Agents table + Trend ───────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Agentes tabla */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
            <div className="px-6 pt-5 pb-3 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Users size={16} className="text-primary" /> Rendimiento por Agente
              </h2>
            </div>
            <div className="divide-y divide-slate-50">
              {visibleAgents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">Sin datos en el período seleccionado.</div>
              ) : (
                visibleAgents.map((ag, i) => (
                  <motion.div key={ag.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="px-6 py-4 hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-4">
                      {/* Avatar */}
                      <div className="w-10 h-10 flex-shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-violet-600 flex items-center justify-center text-white text-xs font-black shadow">
                        {ag.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <span className="text-sm font-black text-slate-800">{ag.nombre}</span>
                            <span className="ml-2 text-[9px] font-bold uppercase text-slate-400">{ag.rol_ejecutante}</span>
                          </div>
                          <TrendBadge value={ag.tasaCumplimiento} />
                        </div>

                        {/* Dual bars: cumplimiento + ocupación */}
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-slate-400 uppercase w-20 flex-shrink-0">Cumplimiento</span>
                            <div className="flex-1">
                              <BarMini value={ag.tasaCumplimiento} max={100} color={ag.tasaCumplimiento >= 70 ? '#10b981' : ag.tasaCumplimiento >= 50 ? '#f59e0b' : '#ef4444'} />
                            </div>
                            <span className="text-[10px] font-black text-slate-600 w-8 text-right">{ag.tasaCumplimiento}%</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black text-teal-400 uppercase w-20 flex-shrink-0">Ocupación</span>
                            <div className="flex-1">
                              <BarMini
                                value={ag.horasPlaneadas > 0 ? Math.round((ag.horasInvertidas / ag.horasPlaneadas) * 100) : 0}
                                max={100}
                                color="#0d9488"
                              />
                            </div>
                            <span className="text-[10px] font-black text-teal-700 w-8 text-right">
                              {ag.horasPlaneadas > 0 ? Math.round((ag.horasInvertidas / ag.horasPlaneadas) * 100) : 0}%
                            </span>
                          </div>
                        </div>

                        {/* Stats row */}
                        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
                          <div className="text-center p-2 bg-slate-50 rounded-xl">
                            <p className="text-base font-black text-slate-800">{ag.tasaCumplimiento}%</p>
                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cumplimiento</p>
                          </div>
                          <div className="text-center p-2 bg-teal-50 rounded-xl">
                            <p className="text-base font-black text-teal-800">{ag.horasPlaneadas > 0 ? Math.round((ag.horasInvertidas / ag.horasPlaneadas) * 100) : 0}%</p>
                            <p className="text-[9px] font-bold text-teal-400 uppercase">Ocupación</p>
                          </div>
                          <div className="text-center p-2 bg-sky-50 rounded-xl">
                            <p className="text-base font-black text-sky-800">{ag.horasInvertidas}h</p>
                            <p className="text-[9px] font-bold text-sky-400 uppercase">Trabajadas</p>
                          </div>
                          <div className="text-center p-2 bg-rose-50 rounded-xl">
                            <p className="text-base font-black text-rose-800">{ag.horasLeak}h</p>
                            <p className="text-[9px] font-bold text-rose-400 uppercase">Fuga</p>
                          </div>
                          <div className="text-center p-2 bg-amber-50 rounded-xl">
                            <p className="text-base font-black text-amber-800">{ag.criticas}</p>
                            <p className="text-[9px] font-bold text-amber-400 uppercase">Críticas</p>
                          </div>
                          <div className={`text-center p-2 rounded-xl transition-colors duration-300 ${
                            ag.cargaCognitiva > 4.5 ? 'bg-rose-50 text-rose-800' :
                            ag.cargaCognitiva >= 3.0 ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-800'
                          }`}>
                            <p className="text-base font-black">{ag.cargaCognitiva ?? 0} pts</p>
                            <p className="text-[9px] font-bold opacity-60 uppercase">Cognición</p>
                          </div>
                        </div>

                        {/* Sub details */}
                        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-2 text-[10px] text-slate-500">
                          <span><strong className="text-slate-700">{ag.completadas}</strong>/{ag.totalTareas} tareas resueltas</span>
                          <span><strong className="text-slate-700">{ag.horasPlaneadas}h</strong> planeadas</span>
                          {ag.criticas > 0 && <span><strong className="text-slate-700">{ag.tasaCriticas}%</strong> críticas resueltas</span>}
                          {ag.incidencias > 0 && <span className="text-rose-500"><strong>{ag.incidencias}</strong> incidencias</span>}
                          <span><strong className="text-slate-700">{ag.cargaCognitiva ?? 0} pts/día</strong> carga cognitiva promedio</span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>

          {/* Tendencia diaria */}
          <div className="bg-white border border-slate-100 rounded-3xl shadow-sm p-6">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-5">
              <Activity size={16} className="text-primary" /> Tendencia de Actividad Diaria
            </h2>
            {trend.length === 0 ? (
              <div className="h-32 flex items-center justify-center text-slate-400 text-sm">Sin datos de tendencia.</div>
            ) : (
              <div className="space-y-2">
                {/* Bar chart */}
                <div className="flex gap-1 h-32 items-stretch">
                  {trend.map((d, i) => {
                    const totalH = maxTrendTotal > 0 ? (d.total / maxTrendTotal) * 100 : 0;
                    const compH = d.total > 0 ? (d.completadas / d.total) * totalH : 0;
                    return (
                      <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1 group relative">
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-[9px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
                          {fmtDate(d.fecha)}: {d.completadas}/{d.total} ({d.tasa}%)
                        </div>
                        <div className="w-full relative flex flex-col justify-end" style={{ height: `${Math.max(totalH, 4)}%` }}>
                          {/* bg bar */}
                          <div className="absolute inset-0 bg-slate-100 rounded-t-lg" />
                          {/* completed bar */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-indigo-600 to-violet-500 rounded-t-lg transition-all"
                            style={{ height: `${d.total > 0 ? (d.completadas / d.total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[7px] font-bold text-slate-400 uppercase leading-none">{fmtDate(d.fecha)}</span>
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-slate-400 pt-1">
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-gradient-to-r from-indigo-600 to-violet-500 inline-block" /> Completadas</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-2 rounded-sm bg-slate-100 inline-block" /> Total agendadas</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ─── Right: Rings + distributions ────────────────────── */}
        <div className="space-y-5">

          {/* Anillos de cumplimiento */}
          <div className="bg-[#0f004f] text-white rounded-3xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-xs font-black uppercase tracking-widest mb-5 flex items-center gap-2">
              <Award size={14} /> Índices de Calidad
            </h3>
            <div className="space-y-5">
              {[
                { label: 'Cumplimiento General', pct: g?.tasaCumplimiento ?? 0, color: '#10b981' },
                { label: 'Tareas Críticas', pct: g?.tasaCriticas ?? 0, color: '#f59e0b' },
                { label: 'Alta Prioridad', pct: g?.tasaAltas ?? 0, color: '#6366f1' },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4">
                  <RingChart pct={item.pct} color={item.color} size={60} />
                  <div>
                    <p className="text-xs font-black text-white/90">{item.label}</p>
                    <p className="text-[10px] text-white/50 mt-0.5">
                      {item.pct >= 80 ? '✓ Excelente rendimiento' : item.pct >= 60 ? '~ Rendimiento aceptable' : '⚠ Requiere atención'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Distribución por área */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <BarChart3 size={14} className="text-primary" /> Por Área de Trabajo
            </h3>
            {areas.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">Sin datos</p>
            ) : (
              <div className="space-y-3">
                {areas.map(([area, count]) => {
                  const pct = totalAreas > 0 ? Math.round((count / totalAreas) * 100) : 0;
                  const color = getAreaColor(area);
                  return (
                    <div key={area}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-bold text-slate-700">{area}</span>
                        <span className="text-xs font-black text-slate-500">{count} <span className="text-slate-300 font-normal">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Distribución por prioridad */}
          <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
              <Zap size={14} className="text-amber-500" /> Por Prioridad
            </h3>
            <div className="space-y-2">
              {[
                { label: 'Crítica', count: prio.critica, pct: Math.round((prio.critica / totalPrio) * 100), color: '#ef4444', bg: 'bg-red-50', text: 'text-red-700' },
                { label: 'Alta', count: prio.alta, pct: Math.round((prio.alta / totalPrio) * 100), color: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-700' },
                { label: 'Media', count: prio.media, pct: Math.round((prio.media / totalPrio) * 100), color: '#6366f1', bg: 'bg-indigo-50', text: 'text-indigo-700' },
                { label: 'Baja', count: prio.baja, pct: Math.round((prio.baja / totalPrio) * 100), color: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-700' },
              ].map(p => (
                <div key={p.label} className={`flex items-center gap-3 p-2.5 ${p.bg} rounded-xl`}>
                  <span className={`text-[9px] font-black uppercase w-12 ${p.text}`}>{p.label}</span>
                  <div className="flex-1 bg-white/60 rounded-full h-2 overflow-hidden">
                    <div className="h-2 rounded-full" style={{ width: `${p.pct}%`, background: p.color, transition: 'width 0.8s ease' }} />
                  </div>
                  <span className="text-[9px] font-black text-slate-600 w-10 text-right">{p.count} ({p.pct}%)</span>
                </div>
              ))}
            </div>
          </div>

          {/* Incidencias por tipo */}
          {Object.keys(data?.tiposIncidencia || {}).length > 0 && (
            <div className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm">
              <h3 className="text-xs font-black text-slate-700 uppercase tracking-widest mb-4 flex items-center gap-2">
                <AlertTriangle size={14} className="text-rose-500" /> Tipos de Incidencia
              </h3>
              <div className="space-y-2">
                {Object.entries(data!.tiposIncidencia).sort(([, a], [, b]) => b - a).map(([tipo, count]) => (
                  <div key={tipo} className="flex justify-between items-center text-xs">
                    <span className="text-slate-600 font-medium">{tipo}</span>
                    <span className="font-black text-rose-700 px-2 py-0.5 bg-rose-50 rounded-full">{count}×</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Almuerzo note */}
          <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-3xl flex items-start gap-3">
            <Coffee size={18} className="text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[10px] font-black text-emerald-800 uppercase tracking-wider">Almuerzo Excluido</p>
              <p className="text-[10px] text-emerald-700 mt-0.5 leading-relaxed">Los descansos de almuerzo no se contabilizan como fuga operativa en ninguna métrica.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
