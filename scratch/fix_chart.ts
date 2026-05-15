import fs from 'fs';

const filePath = 'c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\DashboardView2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar la sección del gráfico completa por una versión más robusta
const oldSection = `<div className="flex items-end justify-between gap-6 h-48">
                       {trend.map((t, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                            <div className="relative w-full flex items-end justify-center h-full">
                               <span className="absolute -top-7 text-[10px] font-black text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity">{t.percentage}%</span>
                               <motion.div 
                                 initial={{ height: 0 }} 
                                 animate={{ height: \`\${t.percentage}%\` }} 
                                 className={\`w-full max-w-[60px] rounded-2xl transition-all duration-500 shadow-xl \${
                                   t.percentage >= 80 ? 'bg-[#99CC33] shadow-[#99CC33]/20' : 'bg-slate-200'
                                 }\`}
                               />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.day}</span>
                         </div>
                       ))}
                    </div>`;

const newSection = `<div className="flex items-end justify-between gap-4 h-56">
                       {trend.map((t, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-4 group">
                            <div className="relative w-full flex items-end justify-center h-48 bg-slate-50/80 rounded-2xl border border-slate-100/50 shadow-inner overflow-hidden mb-2">
                               <div 
                                 style={{ height: \`\${Math.max(4, t.percentage)}%\` }} 
                                 className={\`w-full max-w-[32px] rounded-t-xl transition-all duration-1000 ease-out shadow-lg z-10 relative \${
                                   t.percentage >= 80 ? 'bg-gradient-to-t from-[#7DA81A] to-[#99CC33]' : 
                                   t.percentage >= 40 ? 'bg-gradient-to-t from-amber-400 to-amber-300' : 
                                   'bg-slate-300'
                                 }\`}
                               >
                                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 text-[9px] font-black text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                     {t.percentage}%
                                  </div>
                               </div>
                            </div>
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{t.day}</span>
                         </div>
                       ))}
                    </div>`;

content = content.replace(oldSection.trim(), newSection.trim());

fs.writeFileSync(filePath, content);
console.log("✅ Gráfico de tendencia actualizado.");
