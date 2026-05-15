import fs from 'fs';

const filePath = 'c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\\HistoryView2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix grid-cols-2 in expanded
content = content.replace('grid grid-cols-1 md:grid-cols-2 gap-8 mt-6', 'grid grid-cols-1 gap-6 mt-6');

// 2. Fix colors in expanded
content = content.replace('bg-bg-main/20', 'bg-slate-50/30');
content = content.replace('text-text-muted', 'text-slate-400');
content = content.replace('border-border-soft/50', 'border-slate-100');

// 3. Fix cards padding and shadows
// Ya lo hice en el paso anterior pero aseguremos que no haya basura

fs.writeFileSync(filePath, content);
console.log("✅ HistoryView2 estilizado y corregido.");
