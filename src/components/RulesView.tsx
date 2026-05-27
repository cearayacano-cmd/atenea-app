import { useState } from 'react';
import { 
  BookOpen, ShieldAlert, RefreshCw, Clock, Lock, 
  UserCheck, CheckCircle2, AlertCircle, Coffee, RotateCcw
} from 'lucide-react';
import { motion } from 'motion/react';

export default function RulesView() {
  const [activeTab, setActiveTab] = useState<'agenda' | 'backlog' | 'ia'>('agenda');

  const tabs = [
    { id: 'agenda', label: 'Gestión de Agenda', icon: Clock },
    { id: 'backlog', label: 'Flujo de Backlog', icon: RefreshCw },
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
            <p className="text-xs font-bold text-slate-400 uppercase mt-0.5">Guía rápida de cómo trabajar en el módulo</p>
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
              {/* Rule 1: Control de Jornada Abierta */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-red-50 text-red-600 rounded-2xl">
                    <Lock size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Control de Jornada</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Para poder iniciar tu día de trabajo actual o planificar actividades futuras, <strong>debes cerrar la jornada del día anterior</strong>. El sistema requiere que completes tu cierre diario antes de avanzar.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule 2: Reapertura de Turno */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                    <RotateCcw size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Reapertura de Turno</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Si cerraste tu turno por error, puedes usar el botón de <strong>"Reabrir Turno"</strong>. Para hacerlo, deberás ingresar obligatoriamente una justificación breve que explique el motivo.
                    </p>
                  </div>
                </div>
              </div>

              {/* Rule 3: Almuerzo Protegido */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                    <Coffee size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Almuerzo Protegido</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Tu hora de almuerzo está totalmente protegida por ley:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span><strong>No cuenta como fuga operativa:</strong> Es un descanso y no afecta tu desempeño en los reportes.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-emerald-500 font-bold">•</span>
                        <span><strong>Ratio de foco seguro:</strong> Tus métricas de efectividad no se verán penalizadas por el tiempo de almuerzo.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Rule 4: Tareas Críticas y Justificaciones */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl">
                    <ShieldAlert size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Reglas para Actividades Críticas</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Las tareas de prioridad máxima (Críticas) tienen controles específicos para asegurar tu concentración:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <li className="flex gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Límite de 1 tarea activa:</strong> Solo se permite tener una tarea Crítica activa a la vez. Para iniciar otra, debes resolver la actual o cambiar su estado.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Justificación de prioridad:</strong> Cambiar o crear una tarea en estado Crítica requiere que agregues una explicación breve de la urgencia.</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-rose-500 font-bold">•</span>
                        <span><strong>Justificación por descarte:</strong> Si dejas una tarea agendada sin completar al final de la jornada, deberás ingresar el motivo del incumplimiento al cerrar el día.</span>
                      </li>
                    </ul>
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
              {/* Rule 1: Privacidad */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-sky-50 text-sky-600 rounded-2xl">
                    <UserCheck size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Quién puede ver las tareas</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      El Backlog está diseñado para tu organización personal:
                    </p>
                    <ul className="space-y-2 text-xs text-slate-600 bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <li className="flex gap-2">
                        <span className="text-sky-500 font-bold">•</span>
                        <span>Sólo tú puedes ver las tareas que creaste o en las que fuiste asignado como responsable o colaborador.</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Rule 2: Sincronización */}
              <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                    <RefreshCw size={22} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <h3 className="text-md font-black text-slate-800 uppercase tracking-wider">Flujo de Estados</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">
                      Las tareas cambian de estado de forma automática según tus acciones en la agenda:
                    </p>
                    <div className="space-y-3 pt-2 text-xs">
                      <div className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="px-2 py-0.5 text-[9px] font-black bg-blue-100 text-blue-700 rounded uppercase">Al Agendar</span>
                        <p className="text-slate-600">Pasa a estado <strong>Agendado</strong> y se programa para el día seleccionado.</p>
                      </div>
                      <div className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="px-2 py-0.5 text-[9px] font-black bg-slate-100 text-slate-700 rounded uppercase">Al quitar</span>
                        <p className="text-slate-600">Si decides no hacerla hoy, regresa a estado <strong>Pendiente</strong> en tu backlog.</p>
                      </div>
                      <div className="flex gap-3 items-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <span className="px-2 py-0.5 text-[9px] font-black bg-emerald-100 text-emerald-700 rounded uppercase">Al completar</span>
                        <p className="text-slate-600">Al resolver la tarea, se marca como <strong>Completada</strong> y se archiva de la vista principal.</p>
                      </div>
                    </div>
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
