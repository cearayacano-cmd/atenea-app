import { useState, useEffect } from 'react';
import { Save, Info, Calendar, Clock, Trash2, Plus } from 'lucide-react';

interface Bloque {
  id: number;
  fecha: string | null;
  dia_semana: string | null;
  hora_inicio: string;
  hora_fin: string;
  tipo: string;
}

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
const TIPOS = ['Almuerzo', 'Reunión', 'Personal', 'Otro'];

export default function ConfigView() {
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('17:00');
  const [effectiveHours, setEffectiveHours] = useState<number | string>(6);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Bloques No Disponibles
  const [bloques, setBloques] = useState<Bloque[]>([]);
  const [newRecurrente, setNewRecurrente] = useState({ dias: [] as string[], inicio: '13:00', fin: '14:00', tipo: 'Almuerzo' });
  const [newEspecifico, setNewEspecifico] = useState({ fecha: new Date().toISOString().split('T')[0], inicio: '09:00', fin: '10:00', tipo: 'Reunión' });

  useEffect(() => {
    fetchConfig();
  }, [startDate]);

  useEffect(() => {
    fetchBloques();
  }, []);

  const fetchConfig = () => {
    fetch(`/api/tareas?fecha=${startDate}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.plan) {
          setStartTime(data.plan.hora_inicio || '06:00');
          setEndTime(data.plan.hora_fin || '15:45');
          setEffectiveHours(data.plan.horas_efectivas || 6);
        }
      });
  };

  const fetchBloques = () => {
    fetch('/api/bloques')
      .then(res => res.json())
      .then(data => setBloques(data));
  };

  const getDatesInRange = (start: string, end: string) => {
    const dates = [];
    let current = new Date(start + 'T00:00:00');
    const last = new Date(end + 'T00:00:00');
    while (current <= last) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const handleSave = async () => {
    const hours = typeof effectiveHours === 'string' ? parseFloat(effectiveHours) : effectiveHours;
    if (isNaN(hours)) {
      window.alert?.('Por favor, ingresa un número válido para las horas efectivas.');
      return;
    }

    if (endDate < startDate) {
      window.alert?.('La fecha de fin no puede ser anterior a la fecha de inicio.');
      return;
    }

    setIsSaving(true);
    try {
      const dates = getDatesInRange(startDate, endDate);
      const promises = dates.map(date => 
        fetch('/api/plan-diario', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            date,
            hora_inicio: startTime, 
            hora_fin: endTime, 
            horas_efectivas: hours
          }),
        })
      );
      
      await Promise.all(promises);
      setMessage(`Configuración guardada para ${dates.length} día(s)`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setNewRecurrente(prev => {
      const dias = prev.dias.includes(day)
        ? prev.dias.filter(d => d !== day)
        : [...prev.dias, day];
      return { ...prev, dias };
    });
  };

  const toggleAllDays = () => {
    setNewRecurrente(prev => {
      const allSelected = prev.dias.length === DIAS.length;
      return { ...prev, dias: allSelected ? [] : [...DIAS] };
    });
  };

  const handleAddRecurrente = async () => {
    if (newRecurrente.dias.length === 0) {
      window.alert?.('Por favor, selecciona al menos un día.');
      return;
    }

    for (const dia of newRecurrente.dias) {
      await addBloque({ 
        dia_semana: dia, 
        hora_inicio: newRecurrente.inicio, 
        hora_fin: newRecurrente.fin, 
        tipo: newRecurrente.tipo 
      });
    }
    setNewRecurrente(prev => ({ ...prev, dias: [] }));
  };

  const addBloque = async (bloqueData: any) => {
    try {
      const res = await fetch('/api/bloques', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bloqueData),
      });
      if (res.ok) {
        fetchBloques();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const deleteBloque = async (id: number) => {
    try {
      const res = await fetch(`/api/bloques/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchBloques();
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleResetDatabase = async () => {
    if (!window.confirm?.('¿Estás seguro de que deseas reiniciar la base de datos? Se borrarán todas las tareas, el backlog y la configuración.')) {
      return;
    }

    try {
      const res = await fetch('/api/reset-database', { method: 'POST' });
      if (res.ok) {
        window.alert?.('Base de datos reiniciada correctamente.');
        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      window.alert?.('Error al reiniciar la base de datos.');
    }
  };

  return (
    <div className="space-y-8">
      <div className="latam-card !p-8">
        <div className="max-w-md">
          <h3 className="text-lg font-bold text-primary mb-6">Configuración de Disponibilidad</h3>
          
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-2">Fecha Inicio</label>
                <input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-soft focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-muted uppercase mb-2">Fecha Fin</label>
                <input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border-soft focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-bold text-primary"
                />
              </div>
            </div>

            <div className="h-px bg-border-soft my-2" />

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">Hora Inicio</label>
              <input 
                type="time" 
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full p-3 rounded-xl border border-border-soft focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-text-muted uppercase mb-2">Hora Fin</label>
              <input 
                type="time" 
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full p-3 rounded-xl border border-border-soft focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
              />
            </div>


            <button
              onClick={handleSave}
              disabled={isSaving}
              className="latam-btn-primary w-full flex items-center justify-center disabled:opacity-50"
            >
              <Save size={20} className="mr-2" />
              {isSaving ? 'Guardando...' : 'Guardar Cambios'}
            </button>

            {message && (
              <p className="text-center text-sm font-bold text-[#7DA81A]">{message}</p>
            )}
          </div>
        </div>
      </div>

      <div className="latam-card !p-8">
        <div className="flex items-center gap-3 mb-8">
          <Calendar className="text-accent" size={24} />
          <h3 className="text-xl font-bold text-primary">🗓 BLOQUES NO DISPONIBLES</h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Bloques Recurrentes */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border-soft">
              <span className="text-lg font-bold text-text-strong">1️⃣ BLOQUES RECURRENTES SEMANALES</span>
            </div>

            <div className="bg-bg-main p-6 rounded-2xl space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-text-muted uppercase">Días de la semana</label>
                  <button 
                    onClick={toggleAllDays}
                    className="text-[10px] font-bold text-primary hover:underline uppercase"
                  >
                    {newRecurrente.dias.length === DIAS.length ? 'Desmarcar todos' : 'Seleccionar todos'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DIAS.map(d => (
                    <button
                      key={d}
                      onClick={() => toggleDay(d)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        newRecurrente.dias.includes(d)
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-white text-text-muted border-border-soft hover:border-primary/50'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Tipo</label>
                  <select 
                    value={newRecurrente.tipo}
                    onChange={(e) => setNewRecurrente({...newRecurrente, tipo: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Inicio</label>
                  <input 
                    type="time" 
                    value={newRecurrente.inicio}
                    onChange={(e) => setNewRecurrente({...newRecurrente, inicio: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Fin</label>
                  <input 
                    type="time" 
                    value={newRecurrente.fin}
                    onChange={(e) => setNewRecurrente({...newRecurrente, fin: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={handleAddRecurrente}
                className="w-full py-2 bg-primary text-white rounded-lg font-bold text-sm hover:bg-primary-soft transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Agregar Bloque Recurrente
              </button>
            </div>

            <div className="space-y-3">
              {bloques.filter(b => b.dia_semana).map(bloque => (
                <div key={bloque.id} className="flex items-center justify-between p-4 bg-white border border-border-soft rounded-xl hover:shadow-md transition-all group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-primary uppercase tracking-wider">{bloque.dia_semana}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{bloque.tipo}</span>
                    </div>
                    <div className="flex items-center text-text-muted text-sm font-medium">
                      <Clock size={14} className="mr-1" />
                      {bloque.hora_inicio} - {bloque.hora_fin}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteBloque(bloque.id)}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Bloques Específicos */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 pb-2 border-b border-border-soft">
              <span className="text-lg font-bold text-text-strong">2️⃣ BLOQUES POR FECHA ESPECÍFICA</span>
            </div>

            <div className="bg-bg-main p-6 rounded-2xl space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Fecha</label>
                  <input 
                    type="date" 
                    value={newEspecifico.fecha}
                    onChange={(e) => setNewEspecifico({...newEspecifico, fecha: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Tipo</label>
                  <select 
                    value={newEspecifico.tipo}
                    onChange={(e) => setNewEspecifico({...newEspecifico, tipo: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  >
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Inicio</label>
                  <input 
                    type="time" 
                    value={newEspecifico.inicio}
                    onChange={(e) => setNewEspecifico({...newEspecifico, inicio: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase mb-1">Fin</label>
                  <input 
                    type="time" 
                    value={newEspecifico.fin}
                    onChange={(e) => setNewEspecifico({...newEspecifico, fin: e.target.value})}
                    className="w-full p-2 rounded-lg border border-border-soft outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </div>
              </div>
              <button 
                onClick={() => addBloque({ fecha: newEspecifico.fecha, hora_inicio: newEspecifico.inicio, hora_fin: newEspecifico.fin, tipo: newEspecifico.tipo })}
                className="w-full py-2 bg-accent text-white rounded-lg font-bold text-sm hover:bg-accent-hover transition-colors flex items-center justify-center gap-2"
              >
                <Plus size={16} /> Agregar Bloque
              </button>
            </div>

            <div className="space-y-3">
              {bloques.filter(b => b.fecha).map(bloque => (
                <div key={bloque.id} className="flex items-center justify-between p-4 bg-white border border-border-soft rounded-xl hover:shadow-md transition-all group">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-accent uppercase tracking-wider">{bloque.fecha}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">{bloque.tipo}</span>
                    </div>
                    <div className="flex items-center text-text-muted text-sm font-medium">
                      <Clock size={14} className="mr-1" />
                      {bloque.hora_inicio} - {bloque.hora_fin}
                    </div>
                  </div>
                  <button 
                    onClick={() => deleteBloque(bloque.id)}
                    className="p-2 text-text-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="pt-12 pb-8 border-t border-border-soft flex justify-center">
        <button
          onClick={handleResetDatabase}
          className="px-6 py-3 rounded-xl border-2 border-red-200 text-red-500 font-bold hover:bg-red-50 transition-all flex items-center gap-2 text-sm"
        >
          <Trash2 size={18} />
          REINICIAR BASE DE DATOS (MODO PRUEBAS)
        </button>
      </div>
    </div>
  );
}
