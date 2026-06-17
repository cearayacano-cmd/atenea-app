import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronRight, ChevronLeft, Flag, Target, Award, 
  CalendarDays, CheckSquare, LayoutDashboard, Sparkles, 
  ThumbsUp, Rocket
} from 'lucide-react';

export default function TutorialView() {
  const [activeStep, setActiveStep] = useState<number>(0);

  const steps = [
    {
      title: "Tu Centro de Mando",
      subtitle: "Prepara tu Día en el Centro de Módulo 🏢",
      icon: LayoutDashboard,
      color: "from-blue-500 to-indigo-500",
      bgCard: "bg-blue-50/50",
      content: (
        <div className="space-y-6 text-slate-700">
          <p className="text-lg leading-relaxed">
            ¡Aquí es donde empieza la magia! Antes de empezar a trabajar, le diremos al sistema qué vamos a hacer.
          </p>
          <div className="space-y-4">
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">1</div>
              <p className="text-base font-medium"><strong>Tu tiempo:</strong> Agrega tu jornada laboral y anota si tienes algún bloqueo (como una cita médica).</p>
            </div>
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-black text-blue-600 shrink-0">2</div>
              <p className="text-base font-medium"><strong>Tus Tareas:</strong> Ve al Tablero Kanban y usa el botón <strong>"Nueva Tarea IA"</strong> para anotar todo lo que tienes pendiente.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Organiza tu Semana",
      subtitle: "El Calendario Semanal 📅",
      icon: CalendarDays,
      color: "from-emerald-400 to-teal-500",
      bgCard: "bg-emerald-50/50",
      content: (
        <div className="space-y-6 text-slate-700">
          <p className="text-lg leading-relaxed">
            Ahora vamos a acomodar esas tareas en los días de la semana. ¡Es muy fácil!
          </p>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-emerald-100 space-y-4">
            <p className="text-base font-medium flex items-start gap-3">
              <span className="text-2xl">👉</span> 
              <span>Haz clic en el día de hoy y presiona <strong>"Cargar Backlog Disponible"</strong>.</span>
            </p>
            <p className="text-base font-medium flex items-start gap-3">
              <span className="text-2xl">💡</span> 
              <span><em>¡El sistema es inteligente!</em> Te avisará cuántas tareas entran en tu día según tu tiempo disponible.</span>
            </p>
            <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200">
              <p className="text-base font-bold text-amber-800 flex items-center gap-2">
                <span className="text-2xl">⭐</span> Regla de Oro
              </p>
              <p className="text-amber-900 mt-1 font-medium">
                ¡Solo puedes elegir <strong>UNA tarea crítica</strong> por día! Así aseguramos que te enfoques en lo más importante sin estresarte.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "¡A Trabajar!",
      subtitle: "Tu Agenda Pro 🏃‍♂️",
      icon: CheckSquare,
      color: "from-rose-400 to-red-500",
      bgCard: "bg-rose-50/50",
      content: (
        <div className="space-y-6 text-slate-700">
          <p className="text-lg leading-relaxed">
            ¡Manos a la obra! La <strong>Agenda Pro</strong> es tu área principal donde marcarás tus avances del día a día.
          </p>
          <div className="grid gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex gap-4 items-center">
              <div className="text-3xl bg-rose-100 p-3 rounded-2xl">➕</div>
              <div>
                <h4 className="font-bold text-lg text-slate-800">Botón de Detalles</h4>
                <p className="font-medium text-slate-600">Úsalo para contarnos en qué estás trabajando y cómo vas avanzando.</p>
              </div>
            </div>
            
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex gap-4 items-center">
              <div className="text-3xl bg-orange-100 p-3 rounded-2xl">☕</div>
              <div>
                <h4 className="font-bold text-lg text-slate-800">Rompeagenda (Excepciones)</h4>
                <p className="font-medium text-slate-600">¿Te llamaron a una reunión sorpresa o fuiste al baño? Anótalo aquí para cuidar tu tiempo.</p>
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl shadow-sm border border-rose-100 flex gap-4 items-center">
              <div className="text-3xl bg-green-100 p-3 rounded-2xl">🔄</div>
              <div>
                <h4 className="font-bold text-lg text-slate-800">¿Terminaste rápido?</h4>
                <p className="font-medium text-slate-600">¡Súper! Puedes ir por más tareas al <em>Centro de Módulo</em> para seguir avanzando.</p>
              </div>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Misión Cumplida",
      subtitle: "Cierre de Jornada 🏁",
      icon: Flag,
      color: "from-slate-700 to-slate-800",
      bgCard: "bg-slate-100",
      content: (
        <div className="space-y-6 text-slate-700">
          <p className="text-lg leading-relaxed">
            Al final del día, es hora de cerrar con broche de oro y descansar.
          </p>
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center space-y-6">
            <div className="text-6xl mx-auto flex justify-center animate-bounce">
              🔒
            </div>
            <div>
              <h4 className="text-xl font-bold text-slate-800 mb-2">Cerrar el Candado</h4>
              <p className="text-base font-medium text-slate-600">
                El cierre valida que todas tus tareas tengan sus notas (hallazgos o justificaciones) y que tu tiempo coincida. 
                <br/><br/>
                ¡Una vez cerrado, tu progreso se guarda y estás listo para desconectarte!
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: "Tus Logros",
      subtitle: "Mira lo Genial que Eres 🏆",
      icon: Award,
      color: "from-violet-400 to-purple-500",
      bgCard: "bg-violet-50/50",
      content: (
        <div className="space-y-6 text-slate-700">
          <p className="text-lg leading-relaxed">
            ¡Todo tu esfuerzo tiene su recompensa! Aquí puedes ver lo bien que lo estás haciendo.
          </p>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-violet-100 text-center">
              <div className="text-5xl mb-4">📊</div>
              <h4 className="font-bold text-xl text-violet-800 mb-2">Dashboard PRO</h4>
              <p className="font-medium text-slate-600">
                Mira en gráficos divertidos qué tan productivo fuiste hoy y en qué usaste tu tiempo.
              </p>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-violet-100 text-center">
              <div className="text-5xl mb-4">⏪</div>
              <h4 className="font-bold text-xl text-violet-800 mb-2">Historial Pro</h4>
              <p className="font-medium text-slate-600">
                Viaja al pasado para ver cómo has mejorado semana a semana. ¡Tus logros quedan registrados!
              </p>
            </div>
          </div>
          
          <div className="mt-8 p-6 bg-gradient-to-r from-yellow-100 to-yellow-200 rounded-3xl text-center shadow-sm">
            <h3 className="text-2xl font-black text-yellow-800 mb-2">¡Estás listo para empezar! 🎉</h3>
            <p className="text-lg font-medium text-yellow-900">
              Atenea te ayudará a que tu día sea más fácil y ordenado. ¡Mucho éxito!
            </p>
          </div>
        </div>
      )
    }
  ];

  const nextStep = () => {
    if (activeStep < steps.length - 1) setActiveStep(activeStep + 1);
  };

  const prevStep = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  const progressPercentage = ((activeStep + 1) / steps.length) * 100;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      
      {/* Header Motivador */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-4 bg-blue-100 rounded-full mb-2">
          <Rocket className="text-blue-600" size={40} />
        </div>
        <h1 className="text-4xl lg:text-5xl font-black tracking-tight text-slate-800">
          ¡Aprende a usar Atenea!
        </h1>
        <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">
          Sigue esta guía paso a paso. Está diseñada para ser súper fácil y rápida. ¡Vamos allá!
        </p>
      </div>

      {/* Progress Bar */}
      <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-bold text-slate-400 uppercase tracking-wider">
            Tu Progreso
          </span>
          <span className="text-sm font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            Paso {activeStep + 1} de {steps.length}
          </span>
        </div>
        <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
          <motion.div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
            initial={{ width: 0 }}
            animate={{ width: `${progressPercentage}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      {/* Tarjeta Interactiva del Paso */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, scale: 0.95, x: 20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          exit={{ opacity: 0, scale: 0.95, x: -20 }}
          transition={{ duration: 0.3 }}
          className={`overflow-hidden rounded-[40px] shadow-xl border-4 border-white ${steps[activeStep].bgCard}`}
        >
          {/* Cabecera del Paso */}
          <div className={`p-8 lg:p-10 text-white bg-gradient-to-br ${steps[activeStep].color}`}>
            <div className="flex flex-col md:flex-row gap-6 items-center md:items-start text-center md:text-left">
              <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-3xl flex items-center justify-center shrink-0 shadow-inner">
                {React.createElement(steps[activeStep].icon, { size: 40, className: "text-white" })}
              </div>
              <div>
                <h2 className="text-3xl lg:text-4xl font-black mb-2">{steps[activeStep].title}</h2>
                <p className="text-lg font-medium text-white/90">{steps[activeStep].subtitle}</p>
              </div>
            </div>
          </div>

          {/* Contenido del Paso */}
          <div className="p-8 lg:p-10">
            {steps[activeStep].content}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Controles de Navegación Grandes y Amigables */}
      <div className="flex justify-between items-center gap-4 pt-4">
        <button
          onClick={prevStep}
          disabled={activeStep === 0}
          className={`flex items-center gap-2 px-6 py-4 rounded-2xl font-bold text-lg transition-all ${
            activeStep === 0 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
              : 'bg-white text-slate-700 hover:bg-slate-50 hover:scale-105 shadow-sm border border-slate-200'
          }`}
        >
          <ChevronLeft size={24} />
          Anterior
        </button>

        {activeStep < steps.length - 1 ? (
          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white bg-blue-600 hover:bg-blue-700 hover:scale-105 shadow-lg shadow-blue-600/30 transition-all animate-pulse"
          >
            Siguiente Paso
            <ChevronRight size={24} />
          </button>
        ) : (
          <button
            onClick={() => setActiveStep(0)}
            className="flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-lg text-white bg-emerald-500 hover:bg-emerald-600 hover:scale-105 shadow-lg shadow-emerald-500/30 transition-all"
          >
            <ThumbsUp size={24} />
            ¡Empezar a usar Atenea!
          </button>
        )}
      </div>

    </div>
  );
}
