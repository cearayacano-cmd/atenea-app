import fs from 'fs';

const filePath = 'c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\\DashboardView2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldMap = `                    <div className="flex items-end justify-between gap-6 h-56">
                       {trend.map((t, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-4 group cursor-help">
                            <div className="relative w-full flex items-end justify-center h-48 bg-slate-100/50 rounded-3xl border border-slate-200/30 overflow-hidden mb-2 shadow-inner">
                               {/* Fondo de capacidad */}
                               <div className="absolute inset-0 bg-slate-200/20 z-0" />
                               
                               {/* Barra Dual (como el dibujo del usuario) */}
                               <div 
                                 style={{ height: \`\${Math.max(2, t.percentage)}%\` }} 
                                 className={\`w-full max-w-[48px] transition-all duration-1000 ease-out z-10 relative flex flex-col \${
                                   t.percentage >= 80 ? 'bg-gradient-to-t from-[#7DA81A] to-[#99CC33]' : 
                                   t.percentage >= 40 ? 'bg-gradient-to-t from-amber-500 to-amber-400' : 
                                   'bg-gradient-to-t from-slate-400 to-slate-300'
                                 } rounded-t-xl shadow-lg\`}
                               >
                                  {/* La barrita horizontal del dibujo */}
                                  <div className="w-full h-1 bg-white/50 backdrop-blur-sm z-20" />
                                  
                                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-700 opacity-0 group-hover:opacity-100 transition-all">
                                     {t.percentage}%
                                  </div>
                               </div>
                            </div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t.day}</span>
                         </div>
                       ))}
                    </div>`;

const newMap = `<div className="flex items-end justify-between gap-6 h-64">
                       {trend.map((t, i) => (
                         <div key={i} className="flex-1 flex flex-col items-center gap-4 group cursor-help">
                            <div className="relative w-full flex items-end justify-center h-52 bg-slate-100/50 rounded-3xl border border-slate-200/30 overflow-hidden mb-2 shadow-inner group-hover:bg-slate-100 transition-all">
                               {/* Fondo de capacidad */}
                               <div className="absolute inset-0 bg-slate-200/10 z-0" />
                               
                               {/* Barra Stacked por Prioridad */}
                               <div 
                                 style={{ height: \`\${Math.max(2, t.percentage)}%\` }} 
                                 className="w-full max-w-[54px] transition-all duration-1000 ease-out z-10 relative flex flex-col-reverse rounded-t-xl overflow-hidden shadow-2xl"
                               >
                                  {/* Segmento Medio/Bajo */}
                                  <div 
                                    style={{ height: \`\${(t.medio / t.percentage) * 100}%\` }}
                                    className="w-full bg-gradient-to-t from-slate-400 to-slate-300 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.medio > 10 && \`\${t.medio}%\`}
                                  </div>
                                  {/* Segmento Alto */}
                                  <div 
                                    style={{ height: \`\${(t.alto / t.percentage) * 100}%\` }}
                                    className="w-full bg-gradient-to-t from-amber-500 to-amber-400 border-t border-white/20 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.alto > 10 && \`\${t.alto}%\`}
                                  </div>
                                  {/* Segmento Crítico */}
                                  <div 
                                    style={{ height: \`\${(t.critico / t.percentage) * 100}%\` }}
                                    className="w-full bg-gradient-to-t from-red-600 to-red-500 border-t border-white/20 flex items-center justify-center text-[8px] font-black text-white"
                                  >
                                    {t.critico > 10 && \`\${t.critico}%\`}
                                  </div>
                               </div>

                               {/* Indicador de porcentaje total flotante */}
                               <div className="absolute top-4 text-[10px] font-black text-slate-400 opacity-40">
                                  {t.percentage}%
                               </div>
                            </div>
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{t.day}</span>
                         </div>
                       ))}
                    </div>`;

// Reemplazo directo con un poco de tolerancia a espacios
const normalizedContent = content.replace(/\r\n/g, '\n');
const normalizedOldMap = oldMap.replace(/\r\n/g, '\n');

if (normalizedContent.includes(normalizedOldMap.trim())) {
    content = normalizedContent.replace(normalizedOldMap.trim(), newMap.trim());
    fs.writeFileSync(filePath, content);
    console.log("✅ Gráfico de tendencia actualizado a STACKED.");
} else {
    // Fallback: búsqueda por marcadores
    const startIdx = normalizedContent.indexOf('{trend.map');
    const containerStart = normalizedContent.lastIndexOf('<div', startIdx);
    const containerEnd = normalizedContent.indexOf('</div>', normalizedContent.indexOf('))}')) + 6;
    
    if (startIdx !== -1) {
        content = normalizedContent.substring(0, containerStart) + newMap + normalizedContent.substring(containerEnd);
        fs.writeFileSync(filePath, content);
        console.log("✅ Gráfico de tendencia actualizado a STACKED (vía marcadores).");
    } else {
        console.log("❌ No se pudo encontrar el mapa de tendencia.");
    }
}
