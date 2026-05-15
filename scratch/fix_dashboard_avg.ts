import fs from 'fs';

const filePath = 'c:\\Users\\3875129\\.gemini\\antigravity\\scratch\\athenea\\src\\components\\DashboardView2.tsx';
let content = fs.readFileSync(filePath, 'utf8');

// Reemplazar / 7) por / 5) en los cálculos de promedio
content = content.replace(/\/ 7\)/g, '/ 5)');

fs.writeFileSync(filePath, content);
console.log("✅ Divisores actualizados de 7 a 5.");
