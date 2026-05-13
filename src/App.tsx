/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Settings, Calendar, ListChecks, LayoutDashboard, Menu, X, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import HomeView from './components/HomeView';
import ConfigView from './components/ConfigView';
import ConfigView2 from './components/ConfigView2';
import PlanningView from './components/PlanningView';
import AgendaView from './components/AgendaView';
import AgendaView2 from './components/AgendaView2';
import DashboardView from './components/DashboardView';
import BacklogView from './components/BacklogView';
import HistoryView from './components/HistoryView';

type View = 'home' | 'config' | 'config2' | 'planning' | 'agenda' | 'agenda2' | 'dashboard' | 'backlog' | 'history';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('config2');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState({ name: 'Cargando...', email: '', initials: '...' });

  useEffect(() => {
    fetch('/api/me')
      .then(res => res.json())
      .then(data => setUser(data))
      .catch(err => console.error("Error fetching user:", err));
  }, []);

  const navItems = [
    { id: 'config2', label: 'Centro de Módulo', icon: Settings },
    { id: 'planning', label: 'Planificación Clásica', icon: Calendar },
    { id: 'agenda', label: 'Agenda del Día 1', icon: ListChecks },
    { id: 'agenda2', label: 'Agenda del Día 2', icon: ListChecks },
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'history', label: 'Historial', icon: History },
  ];

  return (
    <div className="min-h-screen bg-bg-main text-text-strong flex font-sans">
      {currentView === 'home' ? (
        <HomeView onNavigate={(view) => setCurrentView(view as View)} />
      ) : (
        <>
          {/* Sidebar */}
          <aside 
            className={`${
              isSidebarOpen ? 'w-64' : 'w-20'
            } bg-primary transition-all duration-300 flex flex-col`}
          >
            <div className="p-6 flex items-center justify-between">
              {isSidebarOpen && (
                <motion.h1 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg font-bold tracking-tight text-white cursor-pointer"
                  onClick={() => setCurrentView('home')}
                >
                  Inteligencia <br /> Operativa
                </motion.h1>
              )}
              <button 
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="p-2 hover:bg-primary-soft text-white rounded-lg transition-colors"
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>

            <nav className="flex-1 px-4 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id as View)}
                  className={`w-full flex items-center p-3 rounded-xl transition-all duration-300 relative group ${
                    currentView === item.id 
                      ? 'bg-primary-soft text-white shadow-lg scale-[1.02]' 
                      : 'text-white/60 hover:bg-primary-soft/50 hover:text-white hover:scale-[1.02]'
                  }`}
                >
                  {currentView === item.id && (
                    <motion.div 
                      layoutId="active-indicator"
                      className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-accent rounded-r-full"
                    />
                  )}
                  <item.icon size={20} className={`${isSidebarOpen ? 'mr-3' : 'mx-auto'} transition-transform duration-300 group-hover:scale-110`} />
                  {isSidebarOpen && <span className="font-medium">{item.label}</span>}
                </button>
              ))}
            </nav>

            <div className="p-6 border-t border-white/10">
              <div className="flex items-center text-white">
                <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold uppercase">
                  {user.initials}
                </div>
                {isSidebarOpen && (
                  <div className="ml-3 overflow-hidden">
                    <p className="text-sm font-medium truncate">{user.name}</p>
                    <p className="text-xs text-white/60 truncate">{user.email}</p>
                  </div>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 overflow-y-auto">
            <header className="h-16 bg-white border-b border-border-soft flex items-center px-8 sticky top-0 z-10 shadow-sm">
              <h2 className="text-xl font-bold text-primary">
                {navItems.find(i => i.id === currentView)?.label}
              </h2>
            </header>

            <div className="p-8 max-w-5xl mx-auto">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentView}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentView === 'config' && <ConfigView />}
                  {currentView === 'config2' && <ConfigView2 />}
                  {currentView === 'backlog' && <BacklogView />}
                  {currentView === 'planning' && <PlanningView onNavigate={(v) => setCurrentView(v as View)} />}
                  {currentView === 'agenda' && <AgendaView onNavigate={(v) => setCurrentView(v as View)} />}
                  {currentView === 'agenda2' && <AgendaView2 onNavigate={(v) => setCurrentView(v as View)} />}
                  {currentView === 'history' && <HistoryView />}
                  {currentView === 'dashboard' && <DashboardView />}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </>
      )}
    </div>
  );
}

