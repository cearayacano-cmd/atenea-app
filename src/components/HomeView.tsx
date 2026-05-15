import React from 'react';
import { motion } from 'motion/react';
import { Zap, ChevronRight } from 'lucide-react';
import ateneaBot from '../assets/atenea_user_bot.png';

interface HomeViewProps {
  onNavigate: (view: string) => void;
}

const HomeView: React.FC<HomeViewProps> = ({ onNavigate }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1 }}
      className="relative min-h-screen bg-[#F8F7FF] flex items-center justify-center p-12 lg:p-24 overflow-hidden"
    >
      {/* Immersive Background Patterns */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <svg className="absolute top-1/2 left-1/2 -translate-x-1/4 -translate-y-1/2 w-[150%] h-[150%] opacity-[0.05]" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="40" fill="none" stroke="#0A0B2E" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="30" fill="none" stroke="#0A0B2E" strokeWidth="0.1" />
          <circle cx="50" cy="50" r="20" fill="none" stroke="#0A0B2E" strokeWidth="0.1" />
        </svg>
        
        <div className="absolute bottom-0 right-0 w-full h-1/2 opacity-[0.08]">
          <svg className="w-full h-full" viewBox="0 0 1440 320" preserveAspectRatio="none">
            <path fill="#0A0B2E" d="M0,160L48,176C96,192,192,224,288,213.3C384,203,480,149,576,144C672,139,768,181,864,181.3C960,181,1056,139,1152,122.7C1248,107,1344,117,1392,122.7L1440,128L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
          </svg>
        </div>

        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#0A0B2E]/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-[1800px] mx-auto w-full flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
        <div className="flex-1 space-y-10">
          <div className="space-y-6">
            <motion.div 
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              className="flex items-center gap-4"
            >
              <div className="w-8 h-[2px] bg-red-600" />
              <span className="text-[11px] font-black uppercase tracking-[0.4em] text-red-600">Bienvenido a</span>
            </motion.div>
            
            <div className="space-y-2">
              <motion.h1 
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8 }}
                className="text-7xl md:text-9xl font-black text-[#0A0B2E] tracking-tighter leading-none"
              >
                ATENEA
              </motion.h1>
              <h2 className="text-2xl md:text-4xl font-bold text-[#0A0B2E]/60 tracking-tight">
                Inteligencia Operativa
              </h2>
            </div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="flex items-center gap-4 pt-2"
            >
              <div className="w-8 h-[2px] bg-red-600/30" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[#0A0B2E]/40">
                No mide tareas. Mide decisiones.
              </span>
              <div className="w-8 h-[2px] bg-red-600/30" />
            </motion.div>
          </div>

          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
            className="space-y-6"
          >
            <h3 className="text-4xl md:text-5xl font-black text-[#0A0B2E] leading-[1.1] max-w-xl">
              Transforma tu día en un <br className="hidden md:block" />
              <span className="text-red-600">sistema de decisiones.</span>
            </h3>
            
            <p className="text-base md:text-lg text-[#0A0B2E]/60 font-medium max-w-md leading-relaxed text-balance">
              Detecta postergación, mide impacto real y revela cómo trabajas. 
              La inteligencia operativa al servicio de tu propósito.
            </p>
          </motion.div>
        </div>


        <motion.div 
          initial={{ scale: 0.9, opacity: 0, x: 50 }}
          animate={{ scale: 1, opacity: 1, x: 0 }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="relative flex-1 flex justify-center items-center"
        >
          <div className="absolute inset-0 bg-gradient-to-tr from-[#0A0B2E]/5 to-red-500/5 rounded-full blur-[100px] scale-110" />
          <div className="relative">
            <motion.div
              animate={{ 
                y: [0, -15, 0],
                rotate: [0, 1, 0]
              }}
              transition={{ 
                duration: 8, 
                repeat: Infinity, 
                ease: "easeInOut" 
              }}
              className="relative z-10"
            >
              <img 
                src={ateneaBot} 
                alt="Atenea Premium Bot" 
                className="w-full max-w-[700px] h-auto drop-shadow-[0_40px_80px_rgba(0,0,0,0.1)]"
              />
            </motion.div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80%] h-[80%] bg-red-500/10 rounded-full blur-[80px] opacity-40 animate-pulse" />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default HomeView;
