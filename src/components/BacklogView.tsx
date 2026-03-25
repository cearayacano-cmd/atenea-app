import { useState, useEffect } from 'react';
import { Wand2, Plus, Trash2, Edit2, Check, X, Loader2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type } from "@google/genai";

interface BacklogItem {
  id: number;
  actividad: string;
  prioridad: number;
  status: string;
  area?: string;
  created_at: string;
}

const PRIORITIES = [
  { label: 'CRÍTICA', value: 10, color: 'bg-accent' },
  { label: 'ALTA', value: 7, color: 'bg-primary' },
  { label: 'MEDIA', value: 4, color: 'bg-[#00A6D4]' },
  { label: 'BAJA', value: 2, color: 'bg-[#B8B8B8]' },
];

const STATUSES = [
  'pendiente',
  'en estudio',
  'en curso',
  'en espera',
  'despriorizado',
  'terminada'
];

export default function BacklogView() {
  const [backlog, setBacklog] = useState<BacklogItem[]>([]);
  const [freeText, setFreeText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ actividad: '', prioridad: 4, status: 'pendiente', area: '' });
  const [inlineEditingAreaId, setInlineEditingAreaId] = useState<number | null>(null);
  const [tempArea, setTempArea] = useState('');

  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    fetchBacklog();
  }, []);

  const fetchBacklog = async () => {
    const res = await fetch('/backlog');
    const data = await res.json();
    setBacklog(data);
  };

  const saveInlineArea = async (id: number) => {
    const item = backlog.find(i => i.id === id);
    if (!item) return;
    await fetch(`/backlog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...item, area: tempArea })
    });
    setInlineEditingAreaId(null);
    fetchBacklog();
  };

  const filteredBacklog = showAll 
    ? backlog 
    : backlog.filter(item => item.status === 'pendiente');

  const handleAiMagic = async () => {
    if (!freeText.trim()) return;
    setIsProcessing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Analiza el siguiente texto libre y extrae una lista de actividades concretas para un backlog. 
        Para cada actividad:
        1. Asigna una prioridad basada en el contexto (10 para crítica, 7 para alta, 4 para media, 2 para baja).
        
        El formato de salida debe ser un JSON array de objetos con las propiedades "actividad" y "prioridad".
        
        Texto: "${freeText}"`,
        config: {
          // ... rest of config
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                actividad: { type: Type.STRING },
                prioridad: { type: Type.INTEGER }
              },
              required: ["actividad", "prioridad"]
            }
          }
        }
      });

      const items = JSON.parse(response.text || '[]');
      
      for (const item of items) {
        await fetch('/backlog', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            actividad: item.actividad,
            prioridad: item.prioridad,
            status: 'pendiente',
            area: ''
          })
        });
      }
      
      setFreeText('');
      fetchBacklog();
    } catch (error) {
      console.error("Error processing text with AI:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAddManual = async () => {
    await fetch('/backlog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        actividad: 'Nueva actividad',
        prioridad: 4,
        status: 'pendiente',
        area: ''
      })
    });
    fetchBacklog();
  };

  const handleDelete = async (id: number) => {
    await fetch(`/backlog/${id}`, { method: 'DELETE' });
    fetchBacklog();
  };

  const startEditing = (item: BacklogItem) => {
    setEditingId(item.id);
    setEditForm({ 
      actividad: item.actividad, 
      prioridad: item.prioridad, 
      status: item.status,
      area: item.area || ''
    });
  };

  const saveEdit = async (id: number) => {
    await fetch(`/backlog/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm)
    });
    setEditingId(null);
    fetchBacklog();
  };

  return (
    <div className="space-y-8">
      {/* AI Input Section */}
      <div className="latam-card">
        <h3 className="text-lg font-bold text-primary mb-4 flex items-center gap-2">
          <Wand2 size={20} className="text-accent" />
          Captura Rápida con IA
        </h3>
        <div className="space-y-4">
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="Escribe aquí todo lo que tienes pendiente... (ej: Preparar reporte mensual, llamar a cliente X, revisar presupuesto Q2)"
            className="w-full h-32 p-4 rounded-xl border border-border-soft focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all resize-none bg-bg-main/50"
          />
          <div className="flex justify-end">
            <button
              onClick={handleAiMagic}
              disabled={isProcessing || !freeText.trim()}
              className="latam-btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isProcessing ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Procesando...
                </>
              ) : (
                <>
                  <Wand2 size={20} />
                  Transformar con IA
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backlog List */}
      <div className="latam-card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h3 className="text-xl font-bold text-primary">Listado de Backlog</h3>
            <button
              onClick={() => setShowAll(!showAll)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                showAll 
                  ? 'bg-primary text-white border-primary' 
                  : 'bg-white text-primary border-primary hover:bg-primary/5'
              }`}
            >
              {showAll ? 'VER SOLO PENDIENTES' : 'MOSTRAR TODO'}
            </button>
          </div>
          <button
            onClick={handleAddManual}
            className="p-2 bg-primary text-white rounded-lg hover:bg-primary-soft transition-colors flex items-center gap-2 text-sm font-bold"
          >
            <Plus size={18} />
            AGREGAR MANUAL
          </button>
        </div>

        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {filteredBacklog.map((item) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="group p-4 bg-white border border-border-soft rounded-2xl hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4"
              >
                {editingId === item.id ? (
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <input
                      type="text"
                      value={editForm.actividad}
                      onChange={(e) => setEditForm({ ...editForm, actividad: e.target.value })}
                      className="md:col-span-2 p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm font-medium"
                    />
                    <select
                      value={editForm.prioridad}
                      onChange={(e) => setEditForm({ ...editForm, prioridad: Number(e.target.value) })}
                      className="p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                    >
                      {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                    </select>
                    <input
                      type="text"
                      value={editForm.area || ''}
                      onChange={(e) => setEditForm({ ...editForm, area: e.target.value })}
                      placeholder="Área"
                      className="p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                    />
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                      className="p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm capitalize"
                    >
                      {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex items-center gap-3 min-w-[150px] flex-wrap">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold text-white ${
                        PRIORITIES.find(p => p.value === item.prioridad)?.color || 'bg-gray-400'
                      }`}>
                        {PRIORITIES.find(p => p.value === item.prioridad)?.label}
                      </span>
                      {inlineEditingAreaId === item.id || !item.area ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="text"
                            value={inlineEditingAreaId === item.id ? tempArea : ''}
                            onChange={(e) => {
                              setInlineEditingAreaId(item.id);
                              setTempArea(e.target.value);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveInlineArea(item.id);
                            }}
                            placeholder="Área"
                            className="px-2 py-1 rounded-md text-[10px] font-bold border border-border-soft outline-none focus:ring-1 focus:ring-primary w-20"
                          />
                          <button
                            onClick={() => saveInlineArea(item.id)}
                            className="text-green-600 hover:text-green-700 transition-colors"
                            title="Confirmar área"
                          >
                            <Check size={14} />
                          </button>
                        </div>
                      ) : (
                        <span 
                          onClick={() => {
                            setInlineEditingAreaId(item.id);
                            setTempArea(item.area || '');
                          }}
                          className="px-2 py-1 rounded-md text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 cursor-pointer hover:bg-primary/20 transition-colors"
                          title="Click para editar área"
                        >
                          {item.area}
                        </span>
                      )}
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${
                        item.status === 'terminada' ? 'bg-green-100 text-green-700' :
                        item.status === 'en curso' ? 'bg-blue-100 text-blue-700' :
                        item.status === 'en espera' ? 'bg-amber-100 text-amber-700' :
                        item.status === 'en estudio' ? 'bg-purple-100 text-purple-700' :
                        item.status === 'despriorizado' ? 'bg-gray-100 text-gray-500' :
                        'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col">
                      <span className="font-bold text-primary">{item.actividad}</span>
                      <span className="text-[10px] text-text-muted">
                        {new Date(item.created_at + ' UTC').toLocaleDateString()} {new Date(item.created_at + ' UTC').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 justify-end">
                  {editingId === item.id ? (
                    <>
                      <button
                        onClick={() => saveEdit(item.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-all"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
                        <X size={18} />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => startEditing(item)}
                        className="p-2 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 size={18} />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {backlog.length === 0 && !isProcessing && (
            <div className="text-center py-12 bg-bg-main/30 rounded-3xl border-2 border-dashed border-border-soft">
              <AlertCircle className="mx-auto text-text-muted mb-4" size={48} />
              <p className="text-text-muted font-medium">Tu backlog está vacío. ¡Usa la IA para empezar!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
