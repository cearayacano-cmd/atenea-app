import { useState } from 'react';
import { BookOpen, ShieldAlert, RefreshCw, Brain, Clock, Lock, UserCheck, CheckCircle2, ChevronRight, FileText } from 'lucide-react';
import { motion } from 'motion/react';

export default function RulesView() {
  const [activeTab, setActiveTab] = useState<'agenda' | 'backlog' | 'ia'>('agenda');

  const tabs = [
    { id: 'agenda', label: 'Gestión de Agenda', icon: Clock },
    { id: 'backlog', label: 'Flujo de Backlog', icon: RefreshCw },
    { id: 'ia', label: 'Políticas e IA', icon: Brain },
  ] as const;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-100">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-[#0f004f] flex items-center justify-center text-white shadow-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-wider">Reglas de Operación</h1>
            <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">Manual operativo y lógica de negocio del módulo</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-px">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-6 py-3 border-b-2 text-xs font-black uppercase tracking-widest transition-all ${
                isActive
                  ? 'border-primary text-primary bg-primary/5 rounded-t-xl'
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-t-xl'
              }`}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Column */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'agenda' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Rule 1 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    <Lock size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Bloqueo por Jornadas Abiertas</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Gobernanza de Tiempos</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      No es posible planificar ni iniciar la agenda de hoy o de días futuros si existe alguna jornada de trabajo anterior sin cerrar. El sistema requiere que el usuario justifique las desviaciones del día pendiente y ejecute el <strong>Cierre de Jornada</strong> correspondiente antes de avanzar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule 2 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Clock size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Tiempos de Duración por Prioridad</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Estándar Operativo</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      Al planificar, cada actividad toma una duración estimada por defecto que depende de su nivel de prioridad:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-center">
                        <span className="block text-[8px] font-black text-red-700 uppercase">CRÍTICA</span>
                        <span className="text-lg font-black text-red-950">120m</span>
                        <span className="block text-[8px] text-red-500 font-bold uppercase mt-0.5">(2.0 Horas)</span>
                      </div>
                      <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl text-center">
                        <span className="block text-[8px] font-black text-orange-700 uppercase">ALTA</span>
                        <span className="text-lg font-black text-orange-950">90m</span>
                        <span className="block text-[8px] text-orange-500 font-bold uppercase mt-0.5">(1.5 Horas)</span>
                      </div>
                      <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-center">
                        <span className="block text-[8px] font-black text-amber-700 uppercase">MEDIA</span>
                        <span className="text-lg font-black text-amber-950">60m</span>
                        <span className="block text-[8px] text-amber-500 font-bold uppercase mt-0.5">(1.0 Hora)</span>
                      </div>
                      <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-center">
                        <span className="block text-[8px] font-black text-emerald-700 uppercase">BAJA</span>
                        <span className="text-lg font-black text-emerald-950">30m</span>
                        <span className="block text-[8px] text-emerald-500 font-bold uppercase mt-0.5">(0.5 Horas)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Rule 3 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Control de Saturación</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Optimización de Capacidad</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      La agenda calcula en tiempo real la <strong>Jornada Efectiva</strong> restando reuniones fijas, incidencias y bloques no disponibles del día. Si la suma de las duraciones de las tareas supera este tiempo útil, el sistema emitirá una alerta visual de saturación y bloqueará la generación automática de la agenda para evitar sobrecarga operativa.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'backlog' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Rule 1 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                    <UserCheck size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Restricción de Visibilidad</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Seguridad y Enfoque</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      Los operadores solo pueden visualizar las tareas que ellos mismos agregan al Backlog (tareas individuales). Las tareas colaborativas o grupales solo serán visibles si han sido invitados explícitamente agregándolos en los usuarios asignados del card.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule 2 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                    <RefreshCw size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Ciclo de Sincronización del Backlog</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Integración en Tiempo Real</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      El backlog y la agenda diaria están completamente sincronizados:
                    </p>
                    <ul className="space-y-3 pt-3">
                      <li className="flex gap-2 text-sm text-slate-600">
                        <ChevronRight size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Al Planificar:</strong> Agregar una tarea del backlog a la agenda cambia su estado en el Kanban a <strong>"Agendado"</strong> (mostrando la fecha de agenda y estado en tiempo real).</span>
                      </li>
                      <li className="flex gap-2 text-sm text-slate-600">
                        <ChevronRight size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Al Desagendar:</strong> Si eliminas una tarea programada de la agenda, su estado del backlog regresa a <strong>"Pendiente"</strong> para poder ser planificada otro día.</span>
                      </li>
                      <li className="flex gap-2 text-sm text-slate-600">
                        <ChevronRight size={16} className="text-primary flex-shrink-0 mt-0.5" />
                        <span><strong>Al Cerrar la Jornada:</strong> Las tareas completadas exitosamente pasan a <strong>"Terminada"</strong> y se ocultan del Kanban activo para guardarse en el <strong>Archivo de Backlog</strong>. Las tareas no realizadas regresan a <strong>"Pendiente"</strong>.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'ia' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Rule 1 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <Brain size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Inmutabilidad del Asistente de IA</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Consistencia Cognitiva</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      Los campos analizados y propuestos por el <strong>Asistente IA</strong> (Título, Prioridad y Complejidad) no son editables de forma directa en el modal del asistente. El usuario sólo puede cambiar el Área. Esto garantiza la integridad y consistencia del análisis de complejidad del modelo antes de guardar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule 2 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <FileText size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Justificación de Desviaciones y Cambios</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Trazabilidad Operativa</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2 font-medium">
                      El sistema aplica auditorías estrictas en las siguientes situaciones:
                    </p>
                    <ul className="space-y-2 pt-2 text-sm text-slate-600">
                      <li className="flex gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Cambio de Prioridad:</strong> Editar la prioridad de una tarea del backlog requiere que el usuario ingrese un comentario que justifique el cambio.</span>
                      </li>
                      <li className="flex gap-2">
                        <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                        <span><strong>Desviación de Agenda:</strong> Marcar una tarea planificada como "No Realizado" o dejarla sin completar al cerrar el día requiere ingresar una justificación obligatoria.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Rule 3 */}
              <div className="latam-card !p-6 bg-white border border-slate-100 shadow-sm rounded-3xl space-y-4">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <ShieldAlert size={20} />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Límite de Actividades Críticas</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase">Enfoque Estratégico</p>
                    <p className="text-sm text-slate-600 leading-relaxed pt-2">
                      Para garantizar el enfoque estratégico y proteger la jornada, el sistema solo permite asignar la prioridad **CRÍTICA** (Valor 10) a una sola actividad en la agenda del día. Las prioridades críticas conllevan mayor desgaste y atención, por lo que no es posible saturar la planificación con múltiples tareas críticas simultáneas.
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Side Summary Column */}
        <div className="space-y-6">
          <div className="p-6 bg-[#0f004f] text-white rounded-[32px] shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />
            <h3 className="text-md font-black uppercase tracking-widest mb-4">Glosario de Estados</h3>
            
            <div className="space-y-4 text-xs font-semibold">
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">NUEVO</span>
                <span className="px-2 py-0.5 bg-amber-500 text-white rounded font-black">Backlog</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">PENDIENTE</span>
                <span className="px-2 py-0.5 bg-sky-500 text-white rounded font-black">Backlog</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">EN ESPERA</span>
                <span className="px-2 py-0.5 bg-slate-800 text-white rounded font-black">Backlog</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">AGENDADO</span>
                <span className="px-2 py-0.5 bg-emerald-600 text-white rounded font-black">En Agenda</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">RESUELTO</span>
                <span className="px-2 py-0.5 bg-emerald-800 text-white rounded font-black">Completada</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/10 pb-2">
                <span className="text-white/60">DESPRIORIZADO</span>
                <span className="px-2 py-0.5 bg-slate-400 text-white rounded font-black">Descartada</span>
              </div>
              <div className="flex justify-between items-center pb-2">
                <span className="text-white/60">FALLO</span>
                <span className="px-2 py-0.5 bg-rose-600 text-white rounded font-black">Incompleta</span>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-100 rounded-[32px] shadow-sm space-y-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-widest">Soporte Técnico</h4>
            <p className="text-xs text-slate-500 leading-relaxed">
              Las reglas son aplicadas automáticamente tanto por el cliente en el navegador como por el servidor a través de transacciones en SQLite. Si detectas comportamientos inesperados, contacta al administrador del sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
