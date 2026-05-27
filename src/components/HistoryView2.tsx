import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, Link as LinkIcon, Paperclip, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Loader2, History } from 'lucide-react';
import { motion } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { getStatusColor, getPriorityColor } from '../utils/colors';
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
  tiempos?: { fecha: string; minutos: number }[];
  logs?: any[];
}

const STATUS_OPTIONS = [
  { id: 'all', label: 'Todos los Estados' },
  { id: 'nuevo', label: 'Nuevo' },
  { id: 'abierto', label: 'Abierto' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en espera', label: 'En espera' },
  { id: 'resuelto', label: 'Resuelto' },
  { id: 'despriorizado', label: 'Despriorizado' },
  { id: 'fallo', label: 'Fallo' },
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
    <div className="space-y-10 pb-20 w-full">
      {/* Header Premium */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-2xl text-primary">
             <History size={28} />
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Historial Inteligente</h2>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">
               Trazabilidad Estratégica y Auditoría Operativa
            </p>
          </div>
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
        <div className="flex flex-col gap-3">
          {filteredTasks.map((task, idx) => {
            const taskKey = `${task.actividad}-${task.area}`;
            const isExpanded = expandedTasks.includes(taskKey);
            const priority = getPriorityColor(task.prioridad);

            return (
              <motion.div 
                key={taskKey}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.02 }}
                className={`group relative bg-white rounded-2xl border transition-all duration-300 overflow-hidden cursor-pointer shadow-sm hover:shadow-md hover:border-slate-350 ${
                   isExpanded ? 'border-primary ring-4 ring-primary/5' : 'border-slate-100'
                }`}
                onClick={() => toggleExpand(taskKey)}
              >
                {/* Indicador de prioridad lateral izquierdo */}
                <div 
                   className="absolute top-0 bottom-0 left-0 w-1.5 transition-colors duration-500" 
                   style={{ backgroundColor: priority.hex }}
                />

                <div className="flex flex-col md:flex-row md:items-center justify-between p-4 pl-6 gap-4">
                  {/* Left part: Icon, executions count and Activity title */}
                  <div className="flex flex-1 items-center gap-4 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 text-primary border border-primary/20 shrink-0">
                       <CheckCircle2 size={16} />
                    </div>
                    
                    <div className="flex flex-col shrink-0 min-w-[55px]">
                       <span className="text-xs font-black text-slate-800 tracking-tight leading-none">{task.fechas.length}</span>
                       <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Eje.</span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <h4 className={`text-xs font-black leading-snug truncate transition-colors duration-500 ${isExpanded ? 'text-primary' : 'text-slate-800'}`}>
                         {task.actividad.split(' - Dia')[0]}
                      </h4>
                      <div className="flex items-center gap-2">
                         <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${
                            task.completada ? 'bg-emerald-500' : 'bg-amber-500'
                         }`} />
                         <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            {task.fechas[0] ? `Último: ${task.fechas[0]}` : 'Sin fecha'}
                         </span>
                      </div>
                    </div>
                  </div>

                  {/* Right part: Badges and Collapse arrow */}
                  <div className="flex items-center gap-3 shrink-0 self-end md:self-auto">
                    <span className="px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest bg-slate-50 border border-slate-100 text-slate-500">
                       {task.area || 'CORE'}
                    </span>
                    <span className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border shadow-inner ${priority.badge}`}>
                       {priority.label}
                    </span>
                    <div className={`px-2.5 py-1 rounded-lg text-[8px] font-black uppercase border shadow-sm backdrop-blur-md ${getStatusColor(task.backlog_status || 'resuelto').badge} ${getStatusColor(task.backlog_status || 'resuelto').badgeBorder}`}>
                       {getStatusColor(task.backlog_status || 'resuelto').label}
                    </div>
                    <div className={`text-slate-350 group-hover:text-slate-550 transition-colors ml-2`}>
                       <ChevronDown size={16} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180 text-primary' : ''}`} />
                    </div>
                  </div>
                </div>

                {isExpanded && (
                  <div className="p-6 pt-4 border-t border-slate-100 bg-slate-50/30 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column: Hallazgos and Justificaciones */}
                      <div className="space-y-6">
                        {task.hallazgos.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Search size={12} />
                              Hallazgos y Descubrimientos Acumulados
                            </h5>
                            <div className="space-y-3">
                              {task.hallazgos.map((h, i) => (
                                <div key={i} className="p-4 rounded-xl bg-white border border-slate-100 text-xs text-slate-700 leading-relaxed shadow-sm">
                                  <div className="text-[9px] font-bold text-slate-450 mb-1 flex items-center gap-1">
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
                              onClick={(e) => { e.stopPropagation(); generateSmartReport(task); }}
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
                            <div className="prose prose-sm max-w-none text-slate-700 text-xs leading-relaxed markdown-body">
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
                                <div key={i} className="p-4 rounded-xl bg-accent/5 border border-accent/10 text-xs text-slate-700 leading-relaxed shadow-sm">
                                  <div className="text-[9px] font-bold text-accent/60 mb-1 flex items-center gap-1">
                                    <Calendar size={10} /> {j.fecha}
                                  </div>
                                  {j.text}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Right Column: Evidencias, Tiempos and Logs */}
                      <div className="space-y-6">
                        {task.evidencias.length > 0 && (
                          <div>
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Paperclip size={12} />
                              Evidencias y Enlaces Acumulados
                            </h5>
                            <div className="space-y-2">
                              {task.evidencias.map((e, i) => (
                                <div key={i} className="flex items-center gap-2 p-3 rounded-xl bg-white border border-slate-100 group hover:border-primary/30 transition-all shadow-sm">
                                  <Paperclip size={14} className="text-slate-400" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[9px] font-bold text-slate-400 mb-0.5">{e.fecha}</div>
                                    <span className="text-xs text-slate-700 block truncate">{e.text}</span>
                                  </div>
                                  {(e.text.startsWith('http') || e.text.startsWith('www')) && (
                                    <a
                                      href={e.text.startsWith('http') ? e.text : `https://${e.text}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 bg-primary/5 text-primary rounded-lg hover:bg-primary/10 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <LinkIcon size={14} />
                                    </a>
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {task.tiempos && task.tiempos.length > 0 && (
                          <div className="mb-6">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                              <Clock size={12} className="text-[#99CC33]" />
                              Registro de Enfoque Telemetría (Vista Líder)
                            </h5>
                            <div className="space-y-2 bg-slate-900 text-slate-100 rounded-2xl p-4 border border-slate-800 shadow-xl relative overflow-hidden">
                              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-emerald-500 to-[#99CC33]" />
                              {task.tiempos.map((t, idx) => (
                                <div key={idx} className="flex justify-between items-center text-xs py-1.5 border-b border-white/5 last:border-b-0">
                                  <span className="font-bold text-white/60">{t.fecha}</span>
                                  <span className="font-mono font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                    {t.minutos} min netos en foco
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Clock size={12} className="text-primary" />
                            Trazabilidad Operativa (Log de Estados)
                          </h5>
                          {task.logs && task.logs.length > 0 ? (
                            <div className="space-y-3 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-px before:bg-slate-100">
                              {[...task.logs].sort((a: any, b: any) => new Date(b.hora).getTime() - new Date(a.hora).getTime()).map((log: any, i: number) => (
                                <div key={i} className="relative pl-8 group">
                                  <div 
                                    className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-white shadow-sm flex items-center justify-center transition-all group-hover:scale-110" 
                                    style={{ backgroundColor: getStatusColor(log.estado_nuevo).hex }}
                                  />
                                  <div className="p-3 bg-white border border-slate-50 rounded-2xl shadow-sm hover:border-primary/20 transition-all">
                                    <div className="flex justify-between items-center mb-1">
                                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">
                                        {log.fecha} • {log.comentario?.split('las ')[1] || log.hora?.split('T')[1]?.slice(0,5) || 'HH:MM'}
                                      </span>
                                      <span className={`text-[8px] font-black px-2 py-0.5 rounded-md border ${getStatusColor(log.estado_nuevo).badge} ${getStatusColor(log.estado_nuevo).badgeBorder}`}>
                                        {getStatusColor(log.estado_nuevo).label}
                                      </span>
                                    </div>
                                    <p className="text-[11px] font-medium text-slate-600 italic">
                                      "{log.estado_anterior?.toUpperCase()} → {log.estado_nuevo?.toUpperCase()}"
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="p-8 text-center text-slate-300 italic text-xs bg-slate-50/50 rounded-3xl border border-dashed border-slate-100">
                               No hay registros de cambios de estado para esta actividad.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
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
