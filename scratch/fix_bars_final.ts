import fs from 'fs';

const filePath = 'c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\\DashboardView2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Buscar el map de trend
const mapStart = '{trend.map((t, i) => (';
const mapEnd = '))}'; // Fin del map

const startIndex = content.indexOf(mapStart);
// Encontrar el final del contenedor del map
const containerStart = content.lastIndexOf('<div', startIndex);
const containerEnd = content.indexOf('</div>', content.indexOf(mapEnd)) + 6;

if (startIndex !== -1) {
    const newSection = `<div className="flex items-end justify-between gap-6 h-56">
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

    // Reemplazar desde el contenedor
    // Para ser más seguros, busquemos el bloque h-48
    const h48Index = content.indexOf('h-48', startIndex - 50);
    const blockStart = content.lastIndexOf('<div', h48Index);
    const blockEnd = content.indexOf('</div>', content.indexOf('))}')) + 6;
    
    content = content.substring(0, blockStart) + newSection + content.substring(blockEnd);

    fs.writeFileSync(filePath, content);
    console.log("✅ Gráfico de tendencia rediseñado con éxito.");
} else {
    console.log("❌ No se encontró el map de trend.");
}
