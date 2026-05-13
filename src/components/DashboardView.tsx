import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle, ChevronLeft, ChevronRight, BrainCircuit, Zap, AlertTriangle, TrendingUp, Activity } from 'lucide-react';

interface Stats {
  total: number;
  completed: number;
  pending: number;
}

interface Task {
  id: number;
  actividad: string;
  prioridad: number;
  completada: number | boolean;
  estado_ejecucion?: string;
  hallazgos?: string;
  justificacion?: string;
}

interface Incidencia {
  id: number;
  fecha: string;
  descripcion: string;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

interface Plan {
  date: string;
  hora_inicio: string;
  hora_fin: string;
  horas_efectivas: number;
  estado_cierre: number;
  ejecucion_iniciada: number;
  hora_inicio_ejecucion: string | null;
}

const EXECUTED_STATUSES = ['en espera', 'en curso', 'en estudio', 'terminada', 'despriorizada'];

export default function DashboardView() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidencias, setIncidencias] = useState<Incidencia[]>([]);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [trend, setTrend] = useState<{ day: string, percentage: number }[]>([]);
  const [weeklyOperativo, setWeeklyOperativo] = useState<{
    avgPercentage: number;
    totalMinutes: number;
    hasPattern: boolean;
  }>({ avgPercentage: 0, totalMinutes: 0, hasPattern: false });
  const [reincidencia, setReincidencia] = useState<{
    status: 'green' | 'yellow' | 'red';
  }>({ status: 'green' });
  const [loading, setLoading] = useState(true);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (!loading) {
      setAnimate(false);
      const timer = setTimeout(() => setAnimate(true), 100);
      return () => clearTimeout(timer);
    }
  }, [loading, selectedDate]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const anchorDate = new Date(selectedDate + 'T00:00:00');
        const currentDay = anchorDate.getDay(); // 0 (Sun) to 6 (Sat)
        // Ajustar para inicio en Lunes (Lun=1, ..., Dom=7)
        const dayOffset = currentDay === 0 ? 6 : currentDay - 1;
        
        // Lunes de la semana actual
        const currentMonday = new Date(anchorDate);
        currentMonday.setDate(anchorDate.getDate() - dayOffset);
        
        // Lunes de la semana anterior
        const prevMonday = new Date(currentMonday);
        prevMonday.setDate(currentMonday.getDate() - 7);
        
        const days14 = [];
        for (let i = 0; i < 14; i++) {
          const d = new Date(prevMonday);
          d.setDate(prevMonday.getDate() + i);
          days14.push(d.toISOString().split('T')[0]);
        }

        const results = await Promise.all(
          days14.map(async (dateStr, index) => {
            // Fetch tasks and plan
            const tRes = await fetch(`/api/tareas?fecha=${dateStr}`);
            const tData = await tRes.json();
            const dayTasks: Task[] = tData.tasks || [];
            const dayPlan: Plan = tData.plan;

            // Common task processing
            const pTotal = dayTasks.reduce((acc, t) => acc + (Number(t.prioridad) || 0), 0);
            const pCompletado = dayTasks.reduce((acc, t) => {
              const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
              return acc + (isExecuted ? (Number(t.prioridad) || 0) : 0);
            }, 0);
            const percentage = pTotal > 0 ? Math.round((pCompletado / pTotal) * 100) : 0;

            const uncompletedHigh = dayTasks
              .filter(t => {
                const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
                return !isExecuted && Number(t.prioridad) >= 7;
              })
              .map(t => t.actividad.toLowerCase().trim());

            // Incident logic (only needed for last 7 days)
            let opMinutes = 0;
            let opPercentage = 0;
            let dayIncidencias: Incidencia[] = [];
            if (index >= 7) {
              const iRes = await fetch(`/api/incidencias?fecha=${dateStr}`);
              dayIncidencias = await iRes.json();
              opMinutes = dayIncidencias.reduce((acc, inc) => {
                const [h1, m1] = inc.hora_inicio.split(':').map(Number);
                const [h2, m2] = inc.hora_fin.split(':').map(Number);
                return acc + ((h2 * 60 + m2) - (h1 * 60 + m1));
              }, 0);
              const dayEffHours = dayPlan?.horas_efectivas || 6.0;
              const dayEffMinutes = dayEffHours * 60;
              opPercentage = dayEffMinutes > 0 ? (opMinutes / dayEffMinutes) * 100 : 0;
            }

            const dateObj = new Date(dateStr + 'T00:00:00');
            const dayName = dateObj.toLocaleDateString('es-ES', { weekday: 'short' }).replace('.', '');

            return {
              day: dayName.charAt(0).toUpperCase() + dayName.slice(1),
              percentage,
              opPercentage,
              opMinutes,
              uncompletedHigh,
              tasks: dayTasks,
              plan: dayPlan,
              incidencias: dayIncidencias
            };
          })
        );

        // El día seleccionado está en el índice 7 + dayOffset
        const currentDayResult = results[7 + dayOffset];
        setTasks(currentDayResult.tasks);
        setPlan(currentDayResult.plan);
        setIncidencias(currentDayResult.incidencias);

        const currentWeekResults = results.slice(7);
        setTrend(currentWeekResults.map(r => ({ day: r.day, percentage: r.percentage })));

        // Weekly Operativo
        const totalOpMinutes = currentWeekResults.reduce((acc, r) => acc + r.opMinutes, 0);
        const avgOpPercentage = Math.round(currentWeekResults.reduce((acc, r) => acc + r.opPercentage, 0) / currentWeekResults.length);
        
        let hasPattern = false;
        let consecutiveCount = 0;
        for (const r of currentWeekResults) {
          if (r.opPercentage > 20) {
            consecutiveCount++;
            if (consecutiveCount >= 3) {
              hasPattern = true;
              break;
            }
          } else {
            consecutiveCount = 0;
          }
        }
        setWeeklyOperativo({ avgPercentage: avgOpPercentage, totalMinutes: totalOpMinutes, hasPattern });

        // Recurrence Analysis
        const counts7: Record<string, number> = {};
        const counts14: Record<string, number> = {};

        results.forEach((r, idx) => {
          r.uncompletedHigh.forEach(name => {
            counts14[name] = (counts14[name] || 0) + 1;
            if (idx >= 7) {
              counts7[name] = (counts7[name] || 0) + 1;
            }
          });
        });

        let recurrenceStatus: 'green' | 'yellow' | 'red' = 'green';
        for (const name in counts14) {
          if (counts14[name] >= 3) {
            recurrenceStatus = 'red';
            break;
          }
          if (counts7[name] >= 2) {
            recurrenceStatus = 'yellow';
          }
        }
        setReincidencia({ status: recurrenceStatus });

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // Calcular estadísticas básicas
  const totalTareas = tasks.length;
  const completadas = tasks.filter(t => t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion)).length;
  const pendientes = totalTareas - completadas;

  const stats = {
    total: totalTareas,
    completed: completadas,
    pending: pendientes
  };

  const changeDate = (days: number) => {
    const date = new Date(selectedDate + 'T00:00:00');
    date.setDate(date.getDate() + days);
    setSelectedDate(date.toISOString().split('T')[0]);
  };

  if (loading) return <div className="text-center py-12 text-[#a8a29e]">Cargando estadísticas...</div>;

  if (totalTareas === 0) {
    return (
      <div className="space-y-8">
        <div className="flex justify-end items-center gap-2">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-bg-main hover:scale-110 hover:text-primary rounded-lg transition-all duration-300 text-text-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-border-soft rounded-xl px-4 py-2 text-sm font-medium text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all hover:border-primary/30"
          />
          <button 
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-bg-main hover:scale-110 hover:text-primary rounded-lg transition-all duration-300 text-text-muted"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="latam-card !p-16 text-center">
          <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center mx-auto mb-6">
            <BarChart3 size={32} className="text-text-muted" />
          </div>
          <h3 className="text-xl font-bold text-primary mb-2">Sin datos suficientes</h3>
          <p className="text-text-muted">Sin datos suficientes para generar análisis para esta fecha.</p>
        </div>
      </div>
    );
  }

  // Calcular Cumplimiento Estratégico
  const pesoTotal = tasks.reduce((acc, t) => acc + (Number(t.prioridad) || 0), 0);
  const pesoCompletado = tasks.reduce((acc, t) => {
    const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
    return acc + (isExecuted ? (Number(t.prioridad) || 0) : 0);
  }, 0);
  
  const porcentajeEstrategico = pesoTotal > 0 ? Math.round((pesoCompletado / pesoTotal) * 100) : 0;
  const pesoPendiente = pesoTotal - pesoCompletado;

  // --- Cálculos de Impacto y Lectura ---
  const pendingTasks = tasks.filter(t => !t.estado_ejecucion || !EXECUTED_STATUSES.includes(t.estado_ejecucion));
  
  const criticasPendientes = pendingTasks.filter(t => Number(t.prioridad) === 10).length;
  const altaPendientes = pendingTasks.filter(t => Number(t.prioridad) === 7).length;
  const mediaPendientes = pendingTasks.filter(t => Number(t.prioridad) === 4).length;
  const bajaPendientes = pendingTasks.filter(t => Number(t.prioridad) === 2).length;

  const pendingSummary = (() => {
    const items = [];
    if (criticasPendientes > 0) items.push(`${criticasPendientes} ${criticasPendientes === 1 ? 'tarea' : 'tareas'} CRÍTICA`);
    if (altaPendientes > 0) items.push(`${altaPendientes} ${altaPendientes === 1 ? 'tarea' : 'tareas'} ALTA`);
    if (mediaPendientes > 0) items.push(`${mediaPendientes} ${mediaPendientes === 1 ? 'tarea' : 'tareas'} MEDIA`);
    if (bajaPendientes > 0) items.push(`${bajaPendientes} ${bajaPendientes === 1 ? 'tarea' : 'tareas'} BAJA`);
    
    if (items.length === 0) return "Sin tareas pendientes";
    if (items.length === 1) return `${items[0]} pendiente`;
    
    const lastItem = items.pop();
    const joined = items.join(', ');
    return `${joined} y ${lastItem} pendiente${stats.pending > 1 ? 's' : ''}`;
  })();

  let impactoMessage = { text: "Sin impacto pendiente", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: CheckCircle };
  if (criticasPendientes > 0) {
    impactoMessage = { text: "Impacto crítico pendiente", color: "text-accent", bg: "bg-accent/5", icon: AlertTriangle };
  } else if (porcentajeEstrategico < 70) {
    impactoMessage = { text: "Enfoque operativo dominante", color: "text-amber-600", bg: "bg-amber-50", icon: Activity };
  } else if (tasks.length > 0) {
    impactoMessage = { text: "Buen equilibrio estratégico", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: CheckCircle };
  }

  // --- Cálculos de Impacto Operativo ---
  const calcularMinutos = (inicio: string, fin: string) => {
    if (!inicio || !fin) return 0;
    const [h1, m1] = inicio.split(':').map(Number);
    const [h2, m2] = fin.split(':').map(Number);
    return (h2 * 60 + m2) - (h1 * 60 + m1);
  };

  const totalMinutosIncidencias = incidencias.reduce((acc, inc) => {
    return acc + calcularMinutos(inc.hora_inicio, inc.hora_fin);
  }, 0);

  // --- Cálculos de Insights ---
  const totalHallazgos = tasks.filter(t => t.hallazgos && t.hallazgos.trim().length > 0).length;
  const totalDesviaciones = tasks.filter(t => !t.estado_ejecucion || !EXECUTED_STATUSES.includes(t.estado_ejecucion)).length;
  const hallazgosList = tasks
    .filter(t => t.hallazgos && t.hallazgos.trim().length > 0)
    .map(t => t.hallazgos!.trim());
  const hallazgosPreview = hallazgosList.slice(0, 3);
  const insightDestacado = hallazgosList.length > 0 
    ? hallazgosList.reduce((a, b) => a.length > b.length ? a : b)
    : null;

  const horasEfectivasPlan = plan?.horas_efectivas || 6.0;
  const minutosEfectivos = horasEfectivasPlan * 60;
  const porcentajeOperativo = minutosEfectivos > 0 
    ? Math.round((totalMinutosIncidencias / minutosEfectivos) * 100) 
    : 0;

  const formatTiempo = (minutos: number) => {
    const h = Math.floor(minutos / 60);
    const m = minutos % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  let operativoMessage = { text: "Operación controlada", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: CheckCircle };
  if (porcentajeOperativo > 20) {
    operativoMessage = { text: "Fuga estratégica detectada", color: "text-accent", bg: "bg-accent/5", icon: AlertTriangle };
  } else if (porcentajeOperativo >= 10) {
    operativoMessage = { text: "Interrupciones frecuentes", color: "text-amber-600", bg: "bg-amber-50", icon: Activity };
  }

  // --- Cálculos de Impacto Operativo Semanal ---
  let weeklyOperativoMessage = { text: "Operación saludable", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: CheckCircle };
  if (weeklyOperativo.avgPercentage > 20) {
    weeklyOperativoMessage = { text: "Desviación estructural detectada", color: "text-accent", bg: "bg-accent/5", icon: AlertTriangle };
  } else if (weeklyOperativo.avgPercentage >= 10) {
    weeklyOperativoMessage = { text: "Interrupciones frecuentes", color: "text-amber-600", bg: "bg-amber-50", icon: Activity };
  }

  // --- Lógica Lectura Inteligente ---
  
  // Lectura del Día
  let lecturaDia = { text: "Sin actividades registradas.", color: "text-[#78716c]", bg: "bg-[#f5f5f4]", icon: Activity };
  
  if (tasks.length > 0) {
    if (pendingTasks.length === 0) {
      lecturaDia = { 
        text: "Ejecutado con disciplina estratégica total.", 
        color: "text-[#7DA81A]", 
        bg: "bg-[#7DA81A]/5", 
        icon: CheckCircle 
      };
    } else if (criticasPendientes > 0) {
      if (porcentajeEstrategico >= 60) {
        lecturaDia = { 
          text: "Buen avance general, pero existe una tarea crítica sin ejecutar.", 
          color: "text-amber-600", 
          bg: "bg-amber-50", 
          icon: Activity 
        };
      } else {
        lecturaDia = { 
          text: "Riesgo estratégico real. Impacto clave no ejecutado.", 
          color: "text-accent", 
          bg: "bg-accent/5", 
          icon: AlertTriangle 
        };
      }
    } else if (altaPendientes > 0) {
      lecturaDia = { 
        text: "Buen avance general, pero quedó carga estratégica pendiente.", 
        color: "text-amber-600", 
        bg: "bg-amber-50", 
        icon: Activity 
      };
    } else {
      // No hay tareas críticas ni altas pendientes
      if (porcentajeEstrategico >= 75) {
        lecturaDia = { 
          text: "Día estratégicamente sólido. Las prioridades clave fueron protegidas.", 
          color: "text-[#7DA81A]", 
          bg: "bg-[#7DA81A]/5", 
          icon: Zap 
        };
      } else if (porcentajeEstrategico >= 40) {
        lecturaDia = { 
          text: "Foco correcto en lo crítico, pero quedó carga operativa pendiente.", 
          color: "text-amber-500", 
          bg: "bg-amber-50", 
          icon: Activity 
        };
      } else {
        lecturaDia = { 
          text: "Lo crítico fue protegido, pero el volumen ejecutado fue bajo.", 
          color: "text-amber-500", 
          bg: "bg-amber-50", 
          icon: Activity 
        };
      }
    }
  }

  // Lectura de la Semana
  const promedioSemanal = trend.length > 0 ? Math.round(trend.reduce((acc, curr) => acc + curr.percentage, 0) / trend.length) : 0;
  
  // Cálculo de Consistencia Estratégica
  const percentages = trend.map(t => t.percentage);
  const maxPerc = percentages.length > 0 ? Math.max(...percentages) : 0;
  const minPerc = percentages.length > 0 ? Math.min(...percentages) : 0;
  const variabilidad = maxPerc - minPerc;

  let consistencia = { label: "Inestable", color: "text-accent", bg: "bg-accent/5", border: "border-accent/10", icon: AlertTriangle };
  if (variabilidad <= 20) {
    consistencia = { label: "Alta consistencia", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", border: "border-[#7DA81A]/10", icon: CheckCircle };
  } else if (variabilidad <= 40) {
    consistencia = { label: "Moderada", color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100", icon: Activity };
  }

  // Determinar tendencia (creciente si los últimos 3 días son mayores o iguales al anterior)
  const isCreciente = trend.length >= 3 && 
    trend[trend.length - 1].percentage >= trend[trend.length - 2].percentage && 
    trend[trend.length - 2].percentage > trend[trend.length - 3].percentage;
    
  // Determinar variabilidad (si hay diferencias mayores a 40 entre días)
  const isVariable = trend.some((val, i, arr) => i > 0 && Math.abs(val.percentage - arr[i-1].percentage) > 40);

  let lecturaSemana = { text: "Semana en observación.", color: "text-[#78716c]", bg: "bg-[#f5f5f4]", icon: TrendingUp };
  
  if (promedioSemanal >= 75) {
    lecturaSemana = { text: "Semana consistente.", color: "text-[#7DA81A]", bg: "bg-[#7DA81A]/5", icon: TrendingUp };
  } else if (promedioSemanal < 60) {
    lecturaSemana = { text: "Semana con riesgo estratégico.", color: "text-accent", bg: "bg-accent/5", icon: AlertTriangle };
  } else if (isCreciente) {
    lecturaSemana = { text: "Semana en mejora progresiva.", color: "text-primary", bg: "bg-primary/5", icon: TrendingUp };
  } else if (isVariable) {
    lecturaSemana = { text: "Semana irregular.", color: "text-amber-600", bg: "bg-amber-50", icon: Activity };
  }

  // --- Lógica Reincidencia Estratégica ---
  let reincidenciaConfig = { 
    text: "Sin tareas estratégicas repetitivas detectadas.", 
    color: "text-[#7DA81A]", 
    bg: "bg-[#7DA81A]/5", 
    icon: CheckCircle 
  };
  
  if (reincidencia.status === 'red') {
    reincidenciaConfig = { 
      text: "⚠️ Tarea estratégica postergada repetidamente.", 
      color: "text-accent", 
      bg: "bg-accent/5", 
      icon: AlertTriangle 
    };
  } else if (reincidencia.status === 'yellow') {
    reincidenciaConfig = { 
      text: "🔁 Reincidencia estratégica detectada.", 
      color: "text-amber-600", 
      bg: "bg-amber-50", 
      icon: Activity 
    };
  }

  // --- Lógica Insights Estratégicos ---
  let insightMessage = {
    text: "",
    color: "",
    bg: "",
    icon: Activity
  };

  if (totalHallazgos === 0 && totalDesviaciones === 0) {
    insightMessage.text = "No hay información suficiente para generar aprendizaje. Registra hallazgos para mejorar tu sistema.";
    insightMessage.color = "text-text-muted";
    insightMessage.bg = "bg-bg-main";
    insightMessage.icon = Activity;
  }
  else if (totalHallazgos > 0 && totalDesviaciones === 0) {
    insightMessage.text = "Se registraron aprendizajes relevantes. Buen cierre del día.";
    insightMessage.color = "text-[#7DA81A]";
    insightMessage.bg = "bg-[#7DA81A]/5";
    insightMessage.icon = CheckCircle;
  }
  else if (totalHallazgos === 0 && totalDesviaciones > 0) {
    insightMessage.text = "Se detectaron desviaciones sin aprendizaje registrado. Esto limita la mejora.";
    insightMessage.color = "text-accent";
    insightMessage.bg = "bg-accent/5";
    insightMessage.icon = AlertTriangle;
  }
  else {
    insightMessage.text = "Se detectaron aprendizajes y desviaciones. Existe oportunidad de optimización.";
    insightMessage.color = "text-amber-600";
    insightMessage.bg = "bg-amber-50";
    insightMessage.icon = Activity;
  }

  let strategicColor = 'text-accent';
  let strategicBg = 'bg-accent/5';
  let strategicBorder = 'border-accent/10';

  if (porcentajeEstrategico >= 80) {
    strategicColor = 'text-[#7DA81A]';
    strategicBg = 'bg-[#7DA81A]/5';
    strategicBorder = 'border-[#7DA81A]/10';
  } else if (porcentajeEstrategico >= 50) {
    strategicColor = 'text-amber-600';
    strategicBg = 'bg-amber-50';
    strategicBorder = 'border-amber-100';
  }

  const causasDelDiaRaw = tasks
    .filter(t => {
      const isExecuted = t.estado_ejecucion && EXECUTED_STATUSES.includes(t.estado_ejecucion);
      return !isExecuted && t.justificacion && t.justificacion.trim().length > 0;
    })
    .map(t => t.justificacion!.trim().toLowerCase());

  const causasAgrupadas = Object.entries(
    causasDelDiaRaw.reduce((acc: Record<string, number>, causa: string) => {
      acc[causa] = (acc[causa] || 0) + 1;
      return acc;
    }, {})
  ) as [string, number][];

  const causaPrincipal = causasAgrupadas.length > 0
    ? [...causasAgrupadas].sort((a, b) => b[1] - a[1])[0][0]
    : null;

  let mensajeCausa = null;

  if (causaPrincipal) {
    if (causaPrincipal.includes("tiempo")) {
      mensajeCausa = "La falta de tiempo está afectando tu ejecución estratégica.";
    }
    else if (causaPrincipal.includes("interrup")) {
      mensajeCausa = "Las interrupciones están afectando tu foco y continuidad.";
    }
    else if (causaPrincipal.includes("reun")) {
      mensajeCausa = "Las reuniones están impactando tu disponibilidad real.";
    }
    else if (causaPrincipal.includes("depend")) {
      mensajeCausa = "La dependencia de terceros está limitando tu ejecución.";
    }
    else {
      mensajeCausa = "Existe un patrón que está afectando tu ejecución.";
    }
  }

  localStorage.setItem("atenea_recomendacion", JSON.stringify({
    causaPrincipal,
    porcentajeEstrategico,
    porcentajeOperativo,
    fecha: selectedDate
  }));

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-primary">Análisis de Desempeño</h2>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => changeDate(-1)}
            className="p-2 hover:bg-bg-main hover:scale-110 hover:text-primary rounded-lg transition-all duration-300 text-text-muted"
          >
            <ChevronLeft size={20} />
          </button>
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border border-border-soft rounded-xl px-4 py-2 text-sm font-medium text-text-strong focus:outline-none focus:ring-2 focus:ring-primary/10 transition-all hover:border-primary/30"
          />
          <button 
            onClick={() => changeDate(1)}
            className="p-2 hover:bg-bg-main hover:scale-110 hover:text-primary rounded-lg transition-all duration-300 text-text-muted"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* Primera sección: Lectura Inteligente (ancho completo) */}
      <div className="latam-card !p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <BrainCircuit size={20} className="text-white" />
          </div>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Lectura Inteligente</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Lectura del Día */}
          <div className={`p-6 rounded-2xl border border-transparent ${lecturaDia.bg} transition-all duration-300 shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 p-2 rounded-lg bg-white shadow-sm ${lecturaDia.color}`}>
                <lecturaDia.icon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Lectura del Día</p>
                <p className={`text-lg font-bold leading-tight ${lecturaDia.color}`}>{lecturaDia.text}</p>
              </div>
            </div>
          </div>

          {/* Lectura de la Semana */}
          <div className={`p-6 rounded-2xl border border-transparent ${lecturaSemana.bg} transition-all duration-300 shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 p-2 rounded-lg bg-white shadow-sm ${lecturaSemana.color}`}>
                <lecturaSemana.icon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Lectura de la Semana</p>
                <p className={`text-lg font-bold leading-tight ${lecturaSemana.color}`}>{lecturaSemana.text}</p>
                <p className="text-xs text-text-muted mt-2 font-medium">Promedio: {promedioSemanal}%</p>
              </div>
            </div>
          </div>

          {/* Reincidencia Estratégica */}
          <div className={`p-6 rounded-2xl border border-transparent ${reincidenciaConfig.bg} transition-all duration-300 shadow-sm`}>
            <div className="flex items-start gap-4">
              <div className={`mt-1 p-2 rounded-lg bg-white shadow-sm ${reincidenciaConfig.color}`}>
                <reincidenciaConfig.icon size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-widest mb-1">Reincidencia Estratégica</p>
                <p className={`text-lg font-bold leading-tight ${reincidenciaConfig.color}`}>{reincidenciaConfig.text}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda sección: Impacto Estratégico e Impacto Operativo (2 columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="latam-card !p-8">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Impacto Estratégico del Día</h3>
          
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-text-strong">{porcentajeEstrategico}%</span>
                  <span className="text-sm font-bold text-text-muted uppercase tracking-wider">ejecutado</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-text-muted">{100 - porcentajeEstrategico}%</span>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">pendiente</span>
                </div>
              </div>
              <div className={`w-16 h-16 ${strategicBg} rounded-2xl flex items-center justify-center shadow-inner`}>
                <BarChart3 size={32} className={strategicColor} />
              </div>
            </div>

            <div className="w-full bg-bg-main h-3 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="bar-strategic bar-glow h-full transition-all duration-1000 ease-out"
                style={{ width: `${animate ? porcentajeEstrategico : 0}%` }}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-text-muted font-medium italic">
                ({pendingSummary})
              </p>
              
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest w-fit border ${impactoMessage.bg} ${impactoMessage.color} ${impactoMessage.color.replace('text', 'border').replace('600', '200')}`}>
                <impactoMessage.icon size={14} />
                {impactoMessage.text}
              </div>
            </div>
          </div>
        </div>

        <div className="latam-card !p-8">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Impacto Operativo del Día</h3>
          
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-text-strong">{porcentajeOperativo}%</span>
                  <span className="text-sm font-bold text-text-muted uppercase tracking-wider">de la jornada</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-text-muted">{formatTiempo(totalMinutosIncidencias)}</span>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">no planificado</span>
                </div>
              </div>
              <div className={`w-16 h-16 ${operativoMessage.bg} rounded-2xl flex items-center justify-center shadow-inner`}>
                <Activity size={32} className={operativoMessage.color} />
              </div>
            </div>

            <div className="w-full bg-bg-main h-3 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="bar-operational bar-glow h-full transition-all duration-1000 ease-out"
                style={{ width: `${animate ? Math.min(porcentajeOperativo, 100) : 0}%` }}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <p className="text-sm text-text-muted font-medium italic">
                ({incidencias.length} {incidencias.length === 1 ? 'incidencia registrada' : 'incidencias registradas'})
              </p>
              
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest w-fit border ${operativoMessage.bg} ${operativoMessage.color} ${operativoMessage.color.replace('text', 'border').replace('600', '200')}`}>
                <operativoMessage.icon size={14} />
                {operativoMessage.text}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Insights del Día (Ancho Completo) */}
      <div className="latam-card !p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-accent/10 rounded-xl flex items-center justify-center">
            <BrainCircuit size={20} className="text-accent" />
          </div>
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">Insights del Día</h3>
        </div>
        
        {totalHallazgos > 0 || totalDesviaciones > 0 ? (
          <div className="space-y-4">
            
            <div className={`p-4 rounded-xl flex items-center gap-3 ${insightMessage.bg}`}>
              <insightMessage.icon size={18} className={insightMessage.color} />
              <p className={`text-sm font-bold ${insightMessage.color}`}>
                {insightMessage.text}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-text-muted">Hallazgos</p>
                <p className="font-bold text-primary">{totalHallazgos}</p>
              </div>
              <div>
                <p className="text-text-muted">Desviaciones</p>
                <p className="font-bold text-primary">{totalDesviaciones}</p>
              </div>
            </div>

            {hallazgosList.length > 0 && (
              <div className="pt-2 border-t border-border-soft">
                <p className="text-xs text-text-muted uppercase mb-2">
                  Hallazgos del día
                </p>

                <ul className="space-y-2">
                  {hallazgosPreview.map((h, idx) => (
                    <li key={idx} className="text-sm text-text-strong italic">
                      • {h}
                    </li>
                  ))}
                </ul>

                {hallazgosList.length > 3 && (
                  <p className="text-xs text-text-muted mt-2">
                    +{hallazgosList.length - 3} adicionales
                  </p>
                )}
              </div>
            )}

          </div>
        ) : (
          <div className="p-4 bg-bg-main rounded-xl">
            <p className="text-sm text-text-muted italic">
              No se registraron aprendizajes hoy. Sin datos, no hay mejora.
            </p>
          </div>
        )}
      </div>

      {/* Causas del Día (Ancho Completo) */}
      {causasAgrupadas.length > 0 ? (
        <div className="latam-card !p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">
              Causas del Día
            </h3>
          </div>

          {mensajeCausa && (
            <div className="mb-4 p-4 rounded-xl bg-amber-50 border border-amber-100">
              <p className="text-sm font-bold text-amber-700">
                {mensajeCausa}
              </p>
            </div>
          )}

          <div className="space-y-3">
            {causasAgrupadas.map(([causa, count], idx) => (
              <div 
                key={idx}
                className="p-4 bg-bg-main rounded-xl text-sm text-text-strong border border-border-soft flex justify-between items-center"
              >
                <span className="capitalize">{causa}</span>
                {count > 1 && (
                  <span className="text-xs font-bold text-primary">
                    x{count}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="latam-card !p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-amber-600" />
            </div>
            <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider">
              Causas del Día
            </h3>
          </div>
          <p className="text-sm text-text-muted italic">
            No se registraron causas hoy.
          </p>
        </div>
      )}

      {/* Tercera sección: Consistencia Estratégica e Impacto Operativo Semanal (2 columnas) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="latam-card !p-8">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Consistencia Estratégica</h3>
          <div className="flex items-center justify-between">
            <div>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${consistencia.bg} ${consistencia.color} ${consistencia.border} mb-3`}>
                <consistencia.icon size={12} />
                {consistencia.label}
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-text-strong">{promedioSemanal}%</span>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Promedio Semanal</span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-text-strong">{variabilidad} pts</p>
              <p className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Variabilidad</p>
            </div>
          </div>
        </div>

        <div className="latam-card !p-8">
          <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Impacto Operativo Semanal</h3>
          
          <div className="space-y-6">
            <div className="flex items-end justify-between">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-text-strong">{weeklyOperativo.avgPercentage}%</span>
                  <span className="text-sm font-bold text-text-muted uppercase tracking-wider">Promedio Semanal</span>
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-bold text-text-muted">{formatTiempo(weeklyOperativo.totalMinutes)}</span>
                  <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Acumulado Semanal</span>
                </div>
              </div>
              <div className={`w-16 h-16 ${weeklyOperativoMessage.bg} rounded-2xl flex items-center justify-center shadow-inner`}>
                <TrendingUp size={32} className={weeklyOperativoMessage.color} />
              </div>
            </div>

            <div className="w-full bg-bg-main h-3 rounded-full overflow-hidden flex shadow-inner">
              <div 
                className="bar-weekly bar-glow h-full transition-all duration-1000 ease-out"
                style={{ width: `${animate ? Math.min(weeklyOperativo.avgPercentage, 100) : 0}%` }}
              />
            </div>

            <div className="flex flex-col gap-3 pt-2">
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest w-fit border ${weeklyOperativoMessage.bg} ${weeklyOperativoMessage.color} ${weeklyOperativoMessage.color.replace('text', 'border').replace('600', '200')}`}>
                <weeklyOperativoMessage.icon size={14} />
                {weeklyOperativoMessage.text}
              </div>

              {weeklyOperativo.hasPattern && (
                <div className="flex items-center gap-2 text-red-600 bg-red-50 px-4 py-3 rounded-xl border border-red-100 animate-pulse">
                  <AlertTriangle size={18} />
                  <span className="text-sm font-bold uppercase tracking-tight">Patrón recurrente de fuga estratégica</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cuarta sección: Tendencia Semanal (ancho completo) */}
      <div className="latam-card !p-8">
        <h3 className="text-sm font-bold text-text-muted uppercase tracking-wider mb-6">Tendencia Semanal (Lun - Dom)</h3>
        <div className="space-y-4">
          {trend.map((item, idx) => {
            let colorClass = 'text-accent';
            if (item.percentage >= 80) {
              colorClass = 'text-[#7DA81A]';
            } else if (item.percentage >= 50) {
              colorClass = 'text-amber-600';
            }

            return (
              <div key={idx} className="flex items-center justify-between group">
                <span className="text-sm font-medium text-text-muted w-12">{item.day}</span>
                <div className="flex-1 mx-4 h-2 bg-bg-main rounded-full overflow-hidden shadow-inner">
                  <div 
                    className={`h-full transition-all duration-1000 ease-out bar-glow ${item.percentage >= 80 ? 'bar-strategic' : item.percentage >= 50 ? 'bar-weekly' : 'bar-operational'}`}
                    style={{ 
                      width: `${animate ? item.percentage : 0}%`,
                      transitionDelay: `${idx * 100}ms`
                    }}
                  />
                </div>
                <span className={`text-sm font-bold w-12 text-right ${colorClass}`}>{item.percentage}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
