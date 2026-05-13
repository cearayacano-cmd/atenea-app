import { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Clock, Link as LinkIcon, Paperclip, AlertTriangle, CheckCircle2, Circle, ChevronDown, ChevronUp, Sparkles, Loader2 } from 'lucide-react';
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
    case 'terminada': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'en curso': return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'en espera': return 'bg-slate-100 text-slate-600 border-slate-200';
    case 'en estudio': return 'bg-purple-100 text-purple-700 border-purple-200';
    case 'despriorizada':
    case 'despriorizado': return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'no realizado': return 'bg-red-100 text-red-700 border-red-200';
    default: return 'bg-slate-100 text-slate-600 border-slate-200';
  }
};

const STATUS_OPTIONS = [
  { id: 'all', label: 'Todos los Estados' },
  { id: 'pendiente', label: 'Pendiente' },
  { id: 'en espera', label: 'Espera' },
  { id: 'en curso', label: 'Curso' },
  { id: 'en estudio', label: 'Estudio' },
  { id: 'terminada', label: 'Listo' },
  { id: 'despriorizada', label: 'Despriorizada' },
  { id: 'no realizado', label: 'No realizado' },
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

  useEffect(() => {
    fetchTasks();
  }, []);

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
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-black text-primary tracking-tight uppercase">Historial Acumulado</h2>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Buscar actividad o hallazgo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 rounded-xl border border-border-soft outline-none focus:ring-2 focus:ring-primary w-full md:w-64 text-sm"
            />
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-border-soft">
            <Filter size={16} className="ml-2 text-text-muted" />
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="bg-transparent outline-none text-sm font-bold text-text-strong pr-2 py-1"
            >
              <option value="all">Todas las Áreas</option>
              {uniqueAreas.sort().map(area => (
                <option key={area} value={area}>{area.charAt(0).toUpperCase() + area.slice(1)}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-border-soft">
            <Filter size={16} className="ml-2 text-text-muted" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent outline-none text-sm font-bold text-text-strong pr-2 py-1"
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-text-muted">Cargando historial...</div>
      ) : filteredTasks.length === 0 ? (
        <div className="latam-card p-20 text-center text-text-muted">
          No se encontraron tareas con los filtros seleccionados.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTasks.map((task, idx) => {
            const taskKey = `${task.actividad}-${task.area}`;
            const isExpanded = expandedTasks.includes(taskKey);
            const priority = getPriorityInfo(task.prioridad);

            return (
              <div key={taskKey} className={`latam-card transition-all overflow-hidden ${isExpanded ? 'ring-2 ring-primary/20' : ''}`}>
                <div
                  className="p-4 flex items-center justify-between cursor-pointer hover:bg-bg-main/50 transition-colors"
                  onClick={() => toggleExpand(taskKey)}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`${task.completada ? 'text-[#7DA81A]' : 'text-text-muted'}`}>
                      {task.completada ? <CheckCircle2 size={24} /> : <Circle size={24} />}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-bold text-text-muted flex items-center">
                          <Calendar size={12} className="mr-1" />
                          {task.fechas.length} ejecuciones
                        </span>
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${priority.color}`}>
                          {priority.label}
                        </span>
                        {task.area && (
                          <span className="text-[9px] font-bold px-2 py-0.5 rounded border bg-primary/5 text-primary border-primary/10 uppercase">
                            {task.area}
                          </span>
                        )}
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border uppercase ${getStatusColor(task.backlog_status)}`}>
                          Status: {task.backlog_status}
                        </span>
                      </div>
                      <h4 className={`font-bold text-lg leading-tight ${task.completada ? 'text-[#7DA81A]' : 'text-primary'}`}>
                        {task.actividad}
                      </h4>
                    </div>
                  </div>

                  <div className="ml-4 text-text-muted">
                    {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
