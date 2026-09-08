import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function HoursTab() {
  const [hours, setHours] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [newBlock, setNewBlock] = useState({ date: '', reason: '' });

  const asArray = (value) => (Array.isArray(value) ? value : []);

  const load = useCallback(async () => {
    setLoading(true);
    const [h, b] = await Promise.all([
      supabase.from('business_hours').select('*').order('weekday'),
      supabase.from('blocked_dates').select('*').gte('blocked_date', toISO(new Date())).order('blocked_date'),
    ]);
    if (h.error || b.error) setMsg({ err: true, text: h.error?.message || b.error?.message || 'Erro ao carregar horários.' });
    setHours(asArray(h.data));
    setBlocked(asArray(b.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateLocal(id, patch) {
    setHours((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }

  async function saveHours() {
    setSaving(true);
    setMsg(null);
    const rows = hours.map((h) => ({
      id: h.id,
      weekday: h.weekday,
      open_time: h.is_open && h.open_time ? h.open_time : null,
      close_time: h.is_open && h.close_time ? h.close_time : null,
      is_open: h.is_open,
    }));
    const { error } = await supabase.from('business_hours').upsert(rows);
    setSaving(false);
    setMsg(error ? { err: true, text: error.message } : { err: false, text: 'Horários salvos com sucesso! 💜' });
    if (!error) setTimeout(() => setMsg(null), 3000);
  }

  async function addBlock(e) {
    e.preventDefault();
    if (!newBlock.date) return;
    const { error } = await supabase.from('blocked_dates').insert({ blocked_date: newBlock.date, reason: newBlock.reason.trim() || null });
    if (error) alert(error.message);
    else { setNewBlock({ date: '', reason: '' }); load(); }
  }

  async function removeBlock(b) {
    const { error } = await supabase.from('blocked_dates').delete().eq('id', b.id);
    if (error) alert(error.message);
    else setBlocked((prev) => prev.filter((x) => x.id !== b.id));
  }

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 items-start">
      <div className="glass rounded-3xl p-6">
        <h3 className="font-serif text-xl text-lavender-soft mb-5">Horário de atendimento</h3>
        <ul className="space-y-3">
          {hours.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 p-4 text-sm">
              <span className="w-20 text-lavender-soft">{WEEKDAYS[h.weekday]}</span>
              <label className="flex items-center gap-2 text-xs text-plum-200/80">
                <input type="checkbox" checked={h.is_open} onChange={(e) => updateLocal(h.id, { is_open: e.target.checked })} className="accent-[#c9a7e8]" />
                Aberto
              </label>
              {h.is_open && (
                <span className="flex items-center gap-2 text-xs text-plum-200/70">
                  <input type="time" value={(h.open_time ?? '').slice(0, 5)} onChange={(e) => updateLocal(h.id, { open_time: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-white outline-none focus:border-lavender/70" />
                  às
                  <input type="time" value={(h.close_time ?? '').slice(0, 5)} onChange={(e) => updateLocal(h.id, { close_time: e.target.value })} className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5 text-white outline-none focus:border-lavender/70" />
                </span>
              )}
            </li>
          ))}
        </ul>
        <div className="mt-5 flex items-center gap-3">
          <button onClick={saveHours} disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
            {saving ? 'Salvando…' : 'Salvar horários'}
          </button>
          {msg && <span className={`text-sm ${msg.err ? 'text-red-300' : 'text-emerald-300'}`}>{msg.text}</span>}
        </div>
      </div>

      <div className="glass rounded-3xl p-6">
        <h3 className="font-serif text-xl text-lavender-soft mb-5">Folgas e bloqueios</h3>
        <form onSubmit={addBlock} className="flex flex-wrap gap-3 mb-5">
          <input type="date" required value={newBlock.date} min={toISO(new Date())} onChange={(e) => setNewBlock({ ...newBlock, date: e.target.value })}
            className="flex-1 min-w-40 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-lavender/70" />
          <input value={newBlock.reason} onChange={(e) => setNewBlock({ ...newBlock, reason: e.target.value })} placeholder="Motivo (ex: férias)"
            className="flex-1 min-w-40 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
          <button type="submit" className="rounded-full border border-lavender/50 px-5 py-2.5 text-sm text-lavender hover:bg-lavender/10 transition">Bloquear</button>
        </form>
        <ul className="space-y-2">
          {blocked.length === 0 && <li className="text-sm text-plum-200/60">Nenhuma folga programada.</li>}
          {blocked.map((b) => (
            <li key={b.id} className="flex items-center justify-between rounded-2xl border border-white/10 p-3.5 text-sm">
              <span className="text-plum-100">
                {new Date(`${b.blocked_date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                {b.reason && <span className="ml-2 text-plum-200/60 italic">— {b.reason}</span>}
              </span>
              <button onClick={() => removeBlock(b)} className="text-[11px] text-red-300/60 hover:text-red-300 transition">Remover</button>
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs text-plum-200/50 leading-relaxed">
          Dias bloqueados ficam automaticamente indisponíveis no formulário de agendamento do site.
        </p>
      </div>
    </div>
  );
}
