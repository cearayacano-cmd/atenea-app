import { BookOpen, Lightbulb, Zap, Shield, Target } from 'lucide-react';
import { motion } from 'motion/react';

export default function TipsView() {
  const tips = [
    {
      id: 1,
      title: 'Planifica tu día con anticipación',
      description: 'Usa la Vista de Agenda Pro al inicio de tu jornada para estructurar tus tareas. Asignar tiempos específicos mejora la productividad y reduce el estrés.',
      icon: Target,
      color: 'bg-blue-500',
    },
    {
      id: 2,
      title: 'Cierra tus tareas diarias',
      description: 'Asegúrate de marcar tus tareas como completadas o arrastrarlas al siguiente día antes de finalizar tu turno. Esto mantiene limpio el backlog.',
      icon: Zap,
      color: 'bg-amber-500',
    },
    {
      id: 3,
      title: 'Registra las incidencias',
      description: 'Si tienes bloqueos o interrupciones, regístralas en la sección correspondiente. Esto ayuda a medir los tiempos muertos y mejorar la planificación.',
      icon: Shield,
      color: 'bg-emerald-500',
    },
    {
      id: 4,
      title: 'Revisa tu Dashboard',
      description: 'El Dashboard Pro te da una visión general de tu rendimiento. Úsalo para identificar cuellos de botella en tus procesos diarios.',
      icon: Lightbulb,
      color: 'bg-indigo-500',
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center shadow-inner">
              <BookOpen className="text-indigo-600" size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tight">Tips y Mejores Prácticas</h1>
              <p className="text-slate-500 mt-1 text-sm font-medium">Recomendaciones para aprovechar al máximo la plataforma Atenea.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {tips.map((tip, index) => {
          const Icon = tip.icon;
          return (
            <motion.div
              key={tip.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 hover:shadow-lg transition-shadow duration-300 group"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-2xl ${tip.color} text-white flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">{tip.title}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed">{tip.description}</p>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden mt-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
          <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm flex-shrink-0">
            <Lightbulb size={32} className="text-white" />
          </div>
          <div>
            <h3 className="text-xl font-bold mb-2">¿Tienes una sugerencia?</h3>
            <p className="text-white/80 text-sm">
              Estamos constantemente mejorando Atenea. Si tienes ideas de cómo podemos hacer que tu trabajo sea más eficiente, compártela con tu supervisor o el equipo de desarrollo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
