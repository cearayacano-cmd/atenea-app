import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function run() {
  const model = genAI.getGenerativeModel({ model: "gemini-3.1-flash-lite" });
  const text = "Validar hipótesis de llamadas en plataforma";
  
  const prompt = `Analiza el siguiente texto libre y conviértelo en una actividad clara y profesional para un backlog operativo.
      
REGLA MUY IMPORTANTE: NO dividas ni desgloses el texto en múltiples tareas. Devuelve SIEMPRE 1 sola actividad (a menos que haya viñetas claras).

TU OBJETIVO PRINCIPAL:
1. REGLA DE ORO DE LA ACTIVIDAD: La propiedad "actividad" del JSON resultante debe ser EXACTAMENTE el texto original ingresado por el usuario (solo se permite corregir de forma mínima la ortografía de palabras si es necesario). NUNCA reescribas la actividad, no la resumas, no la generalices, y bajo ningún concepto la reemplaces por los títulos o nombres del catálogo oficial. Debe conservarse el texto exacto tal como lo escribió el usuario.
2. Evalúa las palabras del usuario para encontrar su similitud lógica con el siguiente CATÁLOGO OFICIAL (basado en el Modelo de Calidad Customer Care de 12 pasos) para fines de metadata.
3. El catálogo oficial sirve ÚNICAMENTE para extraer y asignar "complejidad", "tiempo_estimado" y "rol_ejecutante" según la similitud lógica. Si no hay similitud, asume complejidad 2, tiempo 60 y rol "Calidad Fabrica". NUNCA uses los nombres del catálogo en la propiedad "actividad".

[CATÁLOGO - Calidad Fabrica]
- "Paso 1-4: Revisión de indicadores Radar / Foco" (complejidad: 1, tiempo: 60)
- "Paso 5: Hipótesis: planteamiento + contexto" (complejidad: 2, tiempo: 75)
- "Paso 6: Validación en Operación (Escuchas/Lado a lado)" (complejidad: 2, tiempo: 165)
- "Paso 6.1: Validación hipótesis en conjunto con LCoach" (complejidad: 1, tiempo: 60)
- "Paso 7-8: Análisis con IA (LEA + Amelia)" (complejidad: 3, tiempo: 60)
- "Paso 9: Construir Entregable (slide/plan acción)" (complejidad: 2, tiempo: 60)
- "Paso 10-12: Seguimiento, Ajuste y Escalamiento" (complejidad: 2, tiempo: 60)

[CATÁLOGO - Calidad LATAM]
- "Análisis profundo IA + escuchas" (complejidad: 3, tiempo: 240)
- "Auditorias BOT" (complejidad: 1, tiempo: 180)
- "Auditorias PCA/PTA" (complejidad: 2, tiempo: 240)
- "Revisión levantamientos Operación" (complejidad: 1, tiempo: 30)
- "Calibraciones" (complejidad: 1, tiempo: 60)

4. REGLA DE ARRASTRE: Si en el texto el usuario menciona que es una tarea "retrasada", "pendiente de ayer", o que lleva días "arrastrándose", DEBES sumar obligatoriamente +1 al nivel de complejidad original y si la complejidad final es >=3, sugiere dividir la tarea.
5. Asigna una "prioridad" lógica (7 alta, 4 media, 2 baja). REGLA CRÍTICA: Si la complejidad asignada es 1, la prioridad NO puede ser alta (7).
6. Asigna el "area" más lógica ("Operativo", "Monitoreo", "Tendencias", "Escuelita", "Calidad").

El formato de salida debe ser ESTRICTAMENTE un JSON array de objetos con:
"actividad" (string), "prioridad" (number), "area" (string), "complejidad" (number), "tiempo_estimado" (number), "rol_ejecutante" (string).

REGLA CRÍTICA: SOLO DEBES RESPONDER CON EL JSON ARRAY y absolutamente nada de texto adicional. Ni "Aquí tienes", ni explicaciones. Solo el JSON.

Texto a analizar: "${text}"`;

  const response = await model.generateContent(prompt);
  console.log("RAW RESPONSE FROM GEMINI:");
  console.log(response.response.text());
}

run();
