import React from 'react';
import { Settings, Calendar, CheckCircle, BarChart3, ListChecks, History } from 'lucide-react';
import { motion } from 'motion/react';

interface HomeViewProps {
  onNavigate: (view: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  const menuItems = [
    {
      id: 'config',
      title: 'Disponibilidad',
      description: 'Define tu capacidad real de ejecución',
      icon: <Settings className="w-10 h-10" />,
      color: 'from-primary/20 to-primary/5',
      accent: 'text-primary',
      border: 'border-primary/20'
    },
    {
      id: 'backlog',
      title: 'Backlog',
      description: 'Captura y organiza tus actividades pendientes',
      icon: <ListChecks className="w-10 h-10" />,
      color: 'from-purple-500/20 to-purple-500/5',
      accent: 'text-purple-600',
      border: 'border-purple-500/20'
    },
    {
      id: 'planning',
      title: 'Planificación',
      description: 'Decide en qué vale la pena trabajar hoy',
      icon: <Calendar className="w-10 h-10" />,
      color: 'from-accent/20 to-accent/5',
      accent: 'text-accent',
      border: 'border-accent/20'
    },
    {
      id: 'agenda',
      title: 'Agenda del Día',
      description: 'Registra lo que realmente ocurrió',
      icon: <CheckCircle className="w-10 h-10" />,
      color: 'from-[#7DA81A]/20 to-[#7DA81A]/5',
      accent: 'text-[#7DA81A]',
      border: 'border-[#7DA81A]/20'
    },
    {
      id: 'history',
      title: 'Historial',
      description: 'Consulta todas tus tareas y resultados pasados',
      icon: <History className="w-10 h-10" />,
      color: 'from-blue-500/20 to-blue-500/5',
      accent: 'text-blue-600',
      border: 'border-blue-500/20'
    },
    {
      id: 'dashboard',
      title: 'Dashboard',
      description: 'Entiende cómo estás tomando decisiones',
      icon: <BarChart3 className="w-10 h-10" />,
      color: 'from-primary-soft/20 to-primary-soft/5',
      accent: 'text-primary-soft',
      border: 'border-primary-soft/20'
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8 }}
      className="min-h-screen relative overflow-hidden bg-gradient-to-br from-white via-white to-primary/5 p-6 lg:p-12"
    >
      {/* Capa Visual: Fondo Tecnológico */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-5%] left-[-5%] w-[30%] h-[30%] bg-primary/5 rounded-full blur-[80px]" />
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-accent/5 rounded-full blur-[80px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full flex flex-col gap-12">
        {/* Header Dashboard Style */}
        <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
          <div className="space-y-2">
            <motion.h1 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-5xl md:text-7xl font-black text-primary tracking-wide leading-none drop-shadow-sm"
            >
              ATENEA
            </motion.h1>
            <div className="space-y-1">
              <h2 className="text-2xl md:text-3xl font-bold text-text-strong tracking-tight">
                Sistema de Inteligencia Operativa
              </h2>
              <p className="text-accent font-bold uppercase tracking-[0.3em] text-xs">
                No mide tareas. Mide decisiones.
              </p>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest">Status del Sistema</span>
              <span className="text-xs font-bold text-[#7DA81A] flex items-center">
                <span className="w-2 h-2 bg-[#7DA81A] rounded-full mr-2 animate-pulse" />
                OPTIMIZACIÓN ACTIVA
              </span>
            </div>
            <div className="h-12 w-[1px] bg-border-soft" />
            <div className="w-32 h-12 flex items-end gap-1">
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <motion.div 
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: `${h}%` }}
                  transition={{ delay: 0.5 + (i * 0.1), duration: 1, repeat: Infinity, repeatType: 'reverse' }}
                  className="flex-1 bg-primary/20 rounded-t-sm"
                />
              ))}
            </div>
          </div>
        </header>

        {/* Hero Section: Refined Card */}
        <div className="relative">
          {/* Capa de profundidad detrás del hero */}
          <div className="absolute inset-0 bg-primary/5 blur-xl opacity-50 -z-10 translate-y-4" />
          
          <motion.div 
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="relative group overflow-hidden rounded-[2.5rem] border border-primary/20 bg-gradient-to-br from-primary/10 to-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] backdrop-blur-sm"
          >
            <div className="relative z-10 p-10 md:p-16 flex flex-col md:flex-row items-center gap-10">
              <div className="flex-1 space-y-6">
                <h3 className="text-3xl md:text-5xl font-bold text-primary leading-tight">
                  Atenea transforma tu día en un <span className="text-accent underline decoration-accent/30 underline-offset-8">sistema de decisiones</span>
                </h3>
                <p className="text-text-muted text-lg md:text-xl max-w-2xl font-medium">
                  Detecta postergación, mide impacto real y revela cómo trabajas. 
                  La inteligencia operativa al servicio de tu propósito.
                </p>
              </div>
              <div className="w-32 h-32 md:w-48 md:h-48 rounded-full border-2 border-primary/10 flex items-center justify-center relative bg-white shadow-inner">
                <div className="absolute inset-0 rounded-full border-2 border-accent/20 animate-ping opacity-20" />
                <div className="w-full h-full rounded-full bg-gradient-to-tr from-primary/5 to-transparent animate-spin-slow" />
                <BarChart3 className="w-16 h-16 md:w-24 md:h-24 text-primary absolute" />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Grid de Decisiones (Cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item, index) => (
            <motion.button
              key={item.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 + (index * 0.1) }}
              onClick={() => onNavigate(item.id)}
              className={`relative group flex flex-col p-8 rounded-[2rem] border border-border-soft bg-white/60 backdrop-blur-md transition-all duration-300 hover:scale-105 hover:shadow-lg hover:border-primary/30 hover:bg-white overflow-hidden`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${item.color} rounded-bl-[5rem] opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              
              <div className={`mb-8 p-6 rounded-full bg-white shadow-sm border border-border-soft group-hover:scale-110 transition-transform duration-300 ${item.accent} relative`}>
                <div className="absolute inset-0 bg-current opacity-5 rounded-full blur-md group-hover:opacity-10 transition-opacity" />
                {item.icon}
              </div>
              
              <div className="relative z-10 text-left">
                <h3 className="text-2xl font-black text-primary mb-3 tracking-tight">
                  {item.title}
                </h3>
                <p className="text-text-muted text-sm font-medium leading-relaxed group-hover:text-text-strong transition-colors">
                  {item.description}
                </p>
              </div>

              <div className="mt-8 flex items-center text-[10px] font-black uppercase tracking-[0.2em] text-text-muted group-hover:text-primary transition-colors">
                Acceder al Módulo
                <div className="ml-2 h-[1px] flex-1 bg-border-soft group-hover:bg-primary transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Footer Estratégico */}
        <footer className="mt-12 flex flex-col md:flex-row items-center justify-between gap-6 border-t border-border-soft pt-12">
          <p className="text-xl md:text-2xl text-text-strong font-black tracking-tight italic opacity-80">
            "Cada día es una decisión. Atenea te muestra cuáles realmente importan."
          </p>
          <div className="flex gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-primary/20" />
            ))}
          </div>
        </footer>
      </div>
    </motion.div>
  );
};

export default HomeView;
