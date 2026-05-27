import { useState, useEffect } from 'react';
import { Users, CheckCircle2, Clock, TrendingUp, BarChart3, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function ProductivityView() {
  const [stats, setStats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetch(`/api/productividad?fecha=${fecha}`)
      .then(res => res.json())
      .then(data => {
        if (data.stats) setStats(data.stats);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, [fecha]);

  const totalTareas = stats.reduce((acc, curr) => acc + curr.total_tareas, 0);
  const totalCompletadas = stats.reduce((acc, curr) => acc + curr.completadas, 0);
  const porcentajeGlobal = totalTareas > 0 ? (totalCompletadas / totalTareas) * 100 : 0;

  return (
    <div className="w-full h-full p-8 overflow-y-auto bg-[#F8F7FF]">
       <div className="flex justify-between items-center mb-8">
         <div>
           <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter flex items-center gap-3">
             <BarChart3 className="text-primary" size={32} />
             Productividad Global
           </h1>
           <p className="text-slate-500 font-medium mt-1 uppercase text-xs tracking-widest">Panel de supervisión y rendimiento del equipo</p>
         </div>
         <div className="bg-white px-4 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-3">
           <CalendarIcon size={18} className="text-slate-400" />
           <input 
             type="date" 
             value={fecha}
             onChange={e => setFecha(e.target.value)}
             className="bg-transparent border-none outline-none text-sm font-bold text-slate-700 cursor-pointer"
           />
         </div>
       </div>

       {loading ? (
         <div className="flex items-center justify-center h-64 text-slate-400 font-bold uppercase tracking-widest text-sm">Cargando métricas...</div>
       ) : (
         <div className="space-y-8">
           
           {/* Resumen Global */}
           <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
             <div className="flex-1">
               <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Avance Global del Día</h2>
               <div className="flex items-end gap-4 mb-4">
                 <span className="text-6xl font-black text-primary tracking-tighter">{Math.round(porcentajeGlobal)}%</span>
                 <div className="mb-2">
                   <p className="text-sm font-bold text-slate-600">{totalCompletadas} completadas</p>
                   <p className="text-xs font-semibold text-slate-400">de {totalTareas} asignadas</p>
                 </div>
               </div>
               <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                 <motion.div 
                   initial={{ width: 0 }}
                   animate={{ width: `${porcentajeGlobal}%` }}
                   transition={{ duration: 1, ease: "easeOut" }}
                   className="h-full bg-primary" 
                 />
               </div>
             </div>
             
             <div className="flex gap-4">
                <div className="bg-emerald-50 text-emerald-600 p-6 rounded-2xl text-center min-w-[140px]">
                  <CheckCircle2 size={24} className="mx-auto mb-2" />
                  <span className="block text-3xl font-black">{totalCompletadas}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest">Resueltas</span>
                </div>
                <div className="bg-amber-50 text-amber-500 p-6 rounded-2xl text-center min-w-[140px]">
                  <Clock size={24} className="mx-auto mb-2" />
                  <span className="block text-3xl font-black">{totalTareas - totalCompletadas}</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest">Pendientes</span>
                </div>
             </div>
           </div>

           {/* Grilla de Usuarios */}
           <div>
             <h2 className="text-sm font-black text-slate-800 uppercase tracking-widest mb-6 flex items-center gap-2">
               <Users size={18} className="text-slate-400" />
               Rendimiento por Operador
             </h2>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
               {stats.map((user, idx) => {
                 const pct = user.total_tareas > 0 ? (user.completadas / user.total_tareas) * 100 : 0;
                 return (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     transition={{ delay: idx * 0.05 }}
                     key={user.id} 
                     className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow cursor-pointer"
                     onClick={() => {
                       localStorage.setItem('atenea_user_id', user.id.toString());
                       window.location.reload();
                     }}
                   >
                     <div className="flex items-center gap-3 mb-4 pb-4 border-b border-slate-50 relative z-10">
                       <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black">
                         {user.nombre.substring(0,2).toUpperCase()}
                       </div>
                       <div>
                         <h3 className="text-sm font-black text-slate-800 uppercase">{user.nombre}</h3>
                         <p className="text-[10px] text-slate-400 font-bold">{user.email}</p>
                       </div>
                     </div>

                     <div className="space-y-3 relative z-10">
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-slate-500 font-medium">Completadas</span>
                         <span className="font-black text-emerald-600">{user.completadas}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs">
                         <span className="text-slate-500 font-medium">Pendientes</span>
                         <span className="font-black text-amber-500">{user.pendientes}</span>
                       </div>
                       <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-50">
                         <span className="text-slate-500 font-medium">Total Asignadas</span>
                         <span className="font-black text-slate-800">{user.total_tareas}</span>
                       </div>
                       
                       {/* Progress bar */}
                       <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-2">
                         <div 
                           className={`h-full ${pct === 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-primary' : 'bg-slate-200'}`} 
                           style={{ width: `${pct}%` }}
                         />
                       </div>
                     </div>
                     
                     {/* Overlay para ver detalles */}
                     <div className="absolute inset-0 bg-primary/95 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                       <span className="text-white font-black uppercase tracking-widest text-xs flex items-center gap-2">
                         Inspeccionar Agenda <ArrowRightIcon size={14} />
                       </span>
                     </div>
                   </motion.div>
                 );
               })}
             </div>
           </div>
         </div>
       )}
    </div>
  );
}

// Pequeños íconos auxiliares
function CalendarIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>;
}
function ArrowRightIcon(props: any) {
  return <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
