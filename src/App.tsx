/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Settings, LayoutDashboard, Menu, X, History, BarChart3, ListTodo } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HomeView from './components/HomeView';
import ConfigView2 from './components/ConfigView2';
import AgendaView2 from './components/AgendaView2';
import DashboardView2 from './components/DashboardView2';
import HistoryView2 from './components/HistoryView2';
import logoLatam from './assets/logo_latam.png';

type View = 'home' | 'config2' | 'agenda2' | 'dashboard2' | 'history2';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState({ name: 'Cargando...', email: '', initials: '...' });
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error("Error fetching user:", err));
  }, []);

  const navItems = [
    { id: 'home', label: 'Inicio', icon: LayoutDashboard },
    { id: 'config2', label: 'Centro de Módulo', icon: Settings },
    { id: 'agenda2', label: 'Agenda Pro', icon: ListTodo },
    { id: 'dashboard2', label: 'Dashboard Pro', icon: BarChart3 },
    { id: 'history2', label: 'Historial Pro', icon: History },
  ];

  return (
    <div className="min-h-screen bg-[#F8F7FF] text-slate-800 flex overflow-hidden">
      {/* Sidebar */}
      <aside 
        style={{ background: 'linear-gradient(180deg, #0f004f 0%, #0f004f 60%, #1b0088 100%)' }}
        className={`${
          isSidebarOpen ? 'w-72' : 'w-20'
        } transition-all duration-300 flex flex-col relative z-20 shadow-2xl`}
      >
        <div className="p-8 flex items-center justify-between">
          {isSidebarOpen && (
            <motion.img 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={logoLatam}
              alt="LATAM Logo"
              className="h-10 w-auto cursor-pointer object-contain brightness-0 invert"
              onClick={() => setCurrentView('home')}
            />
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 text-white rounded-lg transition-colors ml-auto"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentView(item.id as View)}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-300 group relative ${
                  isActive 
                    ? 'bg-white/10 text-white shadow-lg' 
                    : 'text-white/50 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon 
                  size={22} 
                  className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white'} 
                />
                {isSidebarOpen && (
                  <>
                    <span className="font-semibold text-sm tracking-wide">{item.label}</span>
                    {isActive && (
                      <motion.div 
                        layoutId="activeDot"
                        className="ml-auto w-1.5 h-1.5 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)]" 
                      />
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* User Profile Section at bottom */}
        <div className="p-6 border-t border-white/5">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group">
            <div className="relative">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                {user.initials}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-[#0A0B2E] rounded-full" />
            </div>
            {isSidebarOpen && (
              <div className="flex-1 overflow-hidden">
                <h4 className="text-white text-xs font-bold truncate">{user.name}</h4>
                <p className="text-white/40 text-[10px] truncate">{user.email}</p>
              </div>
            )}
            {isSidebarOpen && <Menu size={14} className="text-white/20 group-hover:text-white/50" />}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-[#F8F7FF]">
        {/* View Container with Flexible Width */}
        <div className={currentView === 'home' ? "min-h-screen" : "p-6 lg:p-10 w-full max-w-[1800px] mx-auto"}>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {currentView === 'home' && (
                <HomeView onNavigate={(view) => setCurrentView(view as View)} />
              )}
              {currentView === 'config2' && <ConfigView2 />}
              {currentView === 'agenda2' && (
                <AgendaView2 
                  onNavigate={(v) => setCurrentView(v as View)} 
                  selectedDate={selectedDate} 
                  setSelectedDate={setSelectedDate} 
                />
              )}
              {currentView === 'dashboard2' && (
                <DashboardView2 
                  selectedDate={selectedDate} 
                  setSelectedDate={setSelectedDate} 
                />
              )}
              {currentView === 'history2' && <HistoryView2 />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
