import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, Link as LinkIcon, Paperclip, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Loader2, History } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';

interface Task {
  actividad: string;
  area?: string;
  prioridad: number;
  backlog_status: string;
  hallazgos: { fecha: string; text: string }[];
  justificaciones: { fecha: string; text: string }[];
  evidencias: { fecha: string; text: string }[];
  fechas: string[];
  completada: boolean;
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

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'nuevo': return 'bg-cyan-100 text-cyan-700 border-cyan-200';
    case 'abierto': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'pendiente': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'en espera': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'resuelto': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'despriorizado': return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'fallido': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const STATUS_OPTIONS = [
  { id: 'all', label: 'Todos los Estados' },
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'abierto', label: 'Abierto' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en espera', label: 'En espera' },
  { id: 'resuelto', label: 'Resuelto' },
  { id: 'despriorizado', label: 'Despriorizado' },
  { id: 'fallido', label: 'Fallido' },
];

export default function HistoryView() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterArea, setFilterArea] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTasks, setExpandedTasks] = useState<string[]>([]);
  const [reports, setReports] = useState<Record<string, string>>({});
  const [generatingReport, setGeneratingReport] = useState<string | null>(null);
  const [backlogStats, setBacklogStats] = useState({ pendientes: 0, enEspera: 0, delayPromedio: 0 });

  useEffect(() => {
    fetchTasks();
    fetchBacklogStats();
  }, []);

  const fetchBacklogStats = async () => {
    try {
      const res = await fetch('/api/backlog');
      const backlog = await res.json();
      let pendientes = 0;
      let enEspera = 0;
      let totalDelay = 0;
      let delayedItems = 0;

      backlog.forEach((item: any) => {
        if (item.status === 'pendiente') pendientes++;
        if (item.status === 'en espera') enEspera++;
        if (['pendiente', 'en espera', 'abierto', 'nuevo'].includes(item.status)) {
          if (item.created_at) {
             const delay = Math.floor((new Date().getTime() - new Date(item.created_at).getTime()) / (1000 * 60 * 60 * 24));
             totalDelay += delay;
             delayedItems++;
          }
        }
      });
      setBacklogStats({
        pendientes,
        enEspera,
        delayPromedio: delayedItems > 0 ? Math.round(totalDelay / delayedItems) : 0
      });
    } catch (error) {
      console.error(error);
    }
  };

  const generateSmartReport = async (task: Task) => {
    const taskKey = `${task.actividad}-${task.area}`;
    setGeneratingReport(taskKey);
    try {
      const prompt = `
        Eres un asistente experto en gestión de proyectos. A continuación se presentan los hallazgos acumulados y las evidencias de una actividad específica.
        
        Actividad: ${task.actividad}
        Área: ${task.area || 'N/A'}
        
        Hallazgos Acumulados:
        ${task.hallazgos.map(h => `- [${h.fecha}]: ${h.text}`).join('\n')}
        
        Evidencias:
        ${task.evidencias.map(e => `- [${e.fecha}]: ${e.text}`).join('\n')}
        
        Tu tarea es generar un informe inteligente que incluya:
        1. Un resumen ejecutivo claro y profesional de lo que se ha logrado y descubierto.
        2. Los puntos clave o hitos más importantes.
        3. Una sección de evidencias con sus enlaces correspondientes (si existen).
        
        El informe debe ser profesional, conciso y estar en español. Utiliza formato Markdown.
      `;

      const res = await fetch('/api/ai/generate-report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });

      const data = await res.json();

      if (data.text) {
        setReports(prev => ({ ...prev, [taskKey]: data.text }));
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setGeneratingReport(null);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/history/accumulated');
      const data = await res.json();
      setTasks(data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTasks(prev =>
      prev.includes(id) ? prev.filter(tId => tId !== id) : [...prev, id]
    );
  };

  const uniqueAreas = Array.from(new Set(tasks.map(t => t.area).filter(Boolean))) as string[];

  const filteredTasks = tasks.filter(task => {
    const matchesStatus = filterStatus === 'all' || task.backlog_status === filterStatus;
    const matchesArea = filterArea === 'all' || task.area === filterArea;
    const matchesSearch = task.actividad.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.hallazgos.some(h => h.text.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesArea && matchesSearch;
  });

  return (
    <div className="space-y-10 pb-20 max-w-7xl mx-auto">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-4xl font-black text-[#0F004F] tracking-tight flex items-center gap-3">
             <History className="text-[#99CC33]" size={40} />
             Historial Inteligente
          </h2>
          <p className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
             Trazabilidad Estratégica y Auditoría Operativa
          </p>
        </div>

        {/* Dashboard de Salud del Backlog */}
        <div className="flex gap-4">
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Pendientes</span>
             <span className="text-xl font-black text-blue-500">{backlogStats.pendientes}</span>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">En Espera</span>
             <span className="text-xl font-black text-amber-500">{backlogStats.enEspera}</span>
          </div>
          <div className="bg-white px-5 py-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center">
             <span className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">Retraso Prom.</span>
             <span className={`text-xl font-black ${backlogStats.delayPromedio > 2 ? 'text-red-500' : 'text-emerald-500'}`}>{backlogStats.delayPromedio}d</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-[32px] border border-slate-100 shadow-xl shadow-slate-200/50">
          <div className="relative group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#99CC33] transition-colors" />
            <input
              type="text"
              placeholder="Buscar por actividad..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 pr-6 py-3 rounded-2xl bg-slate-50 border-none outline-none focus:ring-2 focus:ring-[#99CC33]/20 w-full md:w-64 text-sm font-bold text-slate-700 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-transparent hover:border-slate-200 transition-all cursor-pointer">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase tracking-widest pr-2 cursor-pointer"
            >
              <option value="all">Áreas</option>
              {uniqueAreas.sort().map(area => (
                <option key={area} value={area}>{area}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-slate-50 px-4 py-3 rounded-2xl border border-transparent hover:border-slate-200 transition-all cursor-pointer">
            <Filter size={16} className="text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent outline-none text-xs font-black text-slate-600 uppercase tracking-widest pr-2 cursor-pointer"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-40 gap-4">
           <Loader2 className="animate-spin text-[#99CC33]" size={40} />
           <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sincronizando Historial...</p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="bg-white rounded-[48px] p-20 text-center border border-slate-100 shadow-2xl">
          <p className="text-slate-400 font-bold">No hay registros que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTasks.map((task, idx) => {
            const taskKey = `${task.actividad}-${task.area}`;
            const isExpanded = expandedTasks.includes(taskKey);
            const priority = getPriorityInfo(task.prioridad);

            return (
              <motion.div 
                key={taskKey}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className={`bg-white rounded-[40px] border transition-all duration-500 overflow-hidden group shadow-xl ${
                   isExpanded ? 'border-[#99CC33] shadow-[#99CC33]/10 ring-4 ring-[#99CC33]/5' : 'border-slate-100 shadow-slate-200/30 hover:border-[#99CC33]/30'
                }`}
              >
                <div
                  className="p-8 flex items-center justify-between cursor-pointer"
                  onClick={() => toggleExpand(taskKey)}
                >
                  <div className="flex items-center gap-8 flex-1">
                    <div className={`p-4 rounded-3xl transition-all duration-500 ${task.completada ? 'bg-[#99CC33]/10 text-[#99CC33]' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-100'}`}>
                      {task.completada ? <CheckCircle2 size={32} /> : <Circle size={32} />}
                    </div>

                    <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center gap-3">
                        <span className="px-3 py-1 bg-slate-50 rounded-full text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1.5 border border-slate-100">
                          <Calendar size={12} /> {task.fechas.length} ejecuciones
                        </span>
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${
                           task.prioridad >= 7 ? 'bg-[#ED1650]/10 text-[#ED1650] border-[#ED1650]/20' : 'bg-slate-50 text-slate-400 border-slate-100'
                        }`}>
                          {priority.label}
                        </span>
                        {task.area && (
                          <span className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter bg-[#00D6CC]/10 text-[#00D6CC] border border-[#00D6CC]/20">
                            {task.area}
                          </span>
                        )}
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter border ${getStatusColor(task.backlog_status)}`}>
                          {task.backlog_status === 'nuevo' ? 'NUEVO' :
                           task.backlog_status === 'abierto' ? 'ABIERTO' :
                           task.backlog_status === 'pendiente' ? 'PENDIENTE' :
                           task.backlog_status === 'en espera' ? 'EN ESPERA' :
                           task.backlog_status === 'resuelto' ? 'RESUELTO' :
                           task.backlog_status === 'despriorizado' ? 'DESPRIORIZADO' :
                           task.backlog_status === 'fallido' ? 'FALLIDO' : task.backlog_status}
                        </span>
                      </div>
                      <h4 className={`text-xl font-black leading-tight transition-colors duration-500 ${isExpanded ? 'text-[#0F004F]' : 'text-slate-800'}`}>
                        {task.actividad}
                      </h4>
                    </div>
                  </div>

                  <div className={`p-4 rounded-2xl transition-all duration-500 ${isExpanded ? 'bg-[#0F004F] text-white rotate-180' : 'bg-slate-50 text-slate-400'}`}>
                    <ChevronDown size={20} />
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-0 border-t border-border-soft/50 bg-bg-main/20 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
                      <div className="space-y-6">
                        {task.hallazgos.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Search size={12} />
                              Hallazgos y Descubrimientos Acumulados
                            </h5>
                            <div className="space-y-3">
                              {task.hallazgos.map((h, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white border border-border-soft text-sm text-text-strong leading-relaxed shadow-sm">
                                  <div className="text-[10px] font-bold text-text-muted mb-1 flex items-center gap-1">
                                    <Calendar size={10} /> {h.fecha}
                                  </div>
                                  {h.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {task.hallazgos.length > 0 && (
                          <div className="pt-2">
                            <button
                              onClick={() => generateSmartReport(task)}
                              disabled={generatingReport === taskKey}
                              className="w-full py-3 px-4 rounded-xl bg-primary/5 text-primary border border-primary/20 font-bold text-xs flex items-center justify-center gap-2 hover:bg-primary/10 transition-all disabled:opacity-50"
                            >
                              {generatingReport === taskKey ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Sparkles size={14} />
                              )}
                              GENERAR INFORME INTELIGENTE
                            </button>
                          </div>
                        )}

                        {reports[taskKey] && (
                          <div className="mt-4 p-5 rounded-xl bg-white border border-primary/20 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-2 mb-3 text-primary">
                              <Sparkles size={16} />
                              <h6 className="text-xs font-black uppercase tracking-widest">Informe Inteligente Generado</h6>
                            </div>
                            <div className="prose prose-sm max-w-none text-text-strong text-sm leading-relaxed markdown-body">
                              <ReactMarkdown>{reports[taskKey]}</ReactMarkdown>
                            </div>
                          </div>
                        )}

                        {task.justificaciones.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-accent uppercase tracking-widest mb-3 flex items-center gap-2">
                              <AlertTriangle size={12} />
                              Justificaciones Acumuladas
                            </h5>
                            <div className="space-y-3">
                              {task.justificaciones.map((j, i) => (
                                <div key={i} className="p-4 rounded-xl bg-accent/5 border border-accent/10 text-sm text-text-strong leading-relaxed shadow-sm">
                                  <div className="text-[10px] font-bold text-accent/60 mb-1 flex items-center gap-1">
                                    <Calendar size={10} /> {j.fecha}
                                  </div>
                                  {j.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-6">
                        {task.evidencias.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Paperclip size={12} />
                              Evidencias y Enlaces Acumulados
                            </h5>
                            <div className="space-y-2">
                              {task.evidencias.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-border-soft group hover:border-primary/30 transition-all shadow-sm">
                                  <Paperclip size={14} className="text-text-muted" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-bold text-text-muted mb-0.5">{e.fecha}</div>
                                    <span className="text-xs text-text-strong block truncate">{e.text}</span>
                                  </div>
                                  {(e.text.startsWith('http') || e.text.startsWith('www')) && (
                                    <a
                                      href={e.text.startsWith('http') ? e.text : `https://${e.text}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                                    >
                                      <LinkIcon size={14} />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                    {task.hallazgos.length === 0 && task.justificaciones.length === 0 && task.evidencias.length === 0 && (
                      <div className="py-8 text-center text-text-muted italic text-sm">
                        No hay registros acumulados para esta actividad.
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
