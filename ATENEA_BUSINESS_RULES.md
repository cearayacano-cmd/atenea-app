# Atenea: Reglas de Negocio para la Inteligencia Artificial (IA)

Este archivo sirve como **memoria permanente** y conjunto de instrucciones clave para cualquier agente de Inteligencia Artificial (ej. Antigravity) que interactúe, analice o modifique el Backlog de tareas en el ecosistema Atenea.

## 1. Lógica Central de Complejidad y Arrastre (Antigüedad)
Cuando se te asigne evaluar tareas ingresadas de forma cruda al Backlog o cuando debas analizar el progreso del equipo, **debes** aplicar las siguientes reglas para determinar la `complejidad`, el `tiempo_asignado` y la `prioridad`:

### A. Concepto de "Arrastre" y "Antigüedad"
- **Definición:** Una tarea "arrastrada" es aquella que el agente empezó un día, no logró terminarla en sus horas planificadas y tuvo que pasarla al día siguiente (o devolverla al Backlog).
- **Métrica:** La `antigüedad` es un valor numérico que representa cuántas veces una tarea ha sido arrastrada o postergada.

### B. Impacto en la Estimación (Algoritmo de la IA)
Cuando vayas a sacar la complejidad y tiempo de las cosas que ponen en el backlog, toma en cuenta:
1. **Puntaje de Complejidad:** A mayor `antigüedad`, mayor debe ser el puntaje de complejidad. Si una tarea ha sido arrastrada 2 o más veces, es un indicador fuerte de que está mal dimensionada, bloqueada o es muy compleja.
2. **Subdivisión (Desglose):** Si evalúas el backlog y notas una tarea con alta antigüedad y gran tiempo asignado original, debes sugerir o ejecutar la subdivisión de dicha tarea en 2 o 3 micro-tareas.
3. **Carga Cognitiva:** Las tareas con alta antigüedad incrementan severamente el riesgo de Burnout (Carga Cognitiva). No debes permitir que un agente acumule múltiples tareas "arrastradas" en un solo día de planificación.

## 2. Pautas Generales de Estimación
- El tiempo efectivo nunca debe superar el 85% de las horas laborales (siempre dejar margen para leak/incidencias).
- Si la descripción de una tarea en el backlog es ambigua, debes asignarle un nivel de complejidad "Alto" por defecto hasta que el usuario especifique los detalles.

## 3. Modelo de Calidad Customer Care (Contexto Operativo)
Debes entender que los agentes de Calidad operan bajo un flujo de 12 pasos. Cuando analices las tareas, intenta categorizarlas mentalmente o asignarles contexto dentro de este ciclo:
1. **Entrar a Radar:** Acceso inicial al Dashboard de la operación.
2. **Revisar Indicadores:** Mirar KPIs, priorizar donde hay mayor desviación o impacto.
3. **Seleccionar el Foco:** Elegir el SAG o motivo prioritario.
4. **Pedir Insight en Radar:** Usar el chat para identificar brechas y motivos críticos.
5. **Formular Hipótesis:** Determinar por qué sucede (proceso, falta de conocimiento, sistema).
6. **Validar en Operación:** Contrastar hipótesis (LCoach, escuchas, lado a lado).
7. **Extraer Datos en LEA:** Descargar la base de datos (muestra) para el análisis.
8. **Analizar con Amelia:** Subir base tratada y usar prompts para hallar causa raíz y quick wins.
9. **Construir Entregable:** Preparar el slide de hallazgos y plan de acción.
10. **Entregar al LCoach/Operación:** Alinear el plan con los líderes.
11. **Hacer Seguimiento:** Medir si el KPI mejoró y si se aplicó el coaching.
12. **Cerrar, Ajustar o Escalar:** Fin del ciclo o replanteo de la estrategia.

*Nota para la IA: Nunca ignores este archivo. Cada vez que tomes decisiones de planificación en Atenea, rígete estrictamente por la lógica de "Arrastre = Mayor Complejidad" y entiende que las tareas de los agentes giran en torno a las 12 fases del Modelo de Calidad.*
