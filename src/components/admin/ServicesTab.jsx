import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const EMPTY = { name: '', description: '', price: '', duration_minutes: 60, active: true };

export default function ServicesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('services').select('*').order('sort_order');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(s) {
    setEditingId(s.id);
    setForm({ name: s.name, description: s.description ?? '', price: String(s.price), duration_minutes: s.duration_minutes, active: s.active });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price: Number(String(form.price).replace(',', '.')),
      duration_minutes: Number(form.duration_minutes) || 60,
      active: form.active,
    };
    const { error: err } = editingId
      ? await supabase.from('services').update(payload).eq('id', editingId)
      : await supabase.from('services').insert({ ...payload, sort_order: items.length + 1 });
    setSaving(false);
    if (err) setError(err.message);
    else { setForm(EMPTY); setEditingId(null); load(); }
  }

  async function toggleActive(s) {
    setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: !x.active } : x)));
    const { error: err } = await supabase.from('services').update({ active: !s.active }).eq('id', s.id);
    if (err) { setItems((prev) => prev.map((x) => (x.id === s.id ? { ...x, active: s.active } : x))); alert(err.message); }
  }

  async function remove(s) {
    if (!window.confirm(`Excluir o serviço "${s.name}"?`)) return;
    const { error: err } = await supabase.from('services').delete().eq('id', s.id);
    if (err) alert('Não foi possível excluir (pode haver agendamentos vinculados). Você pode desativá-lo.');
    else load();
  }

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form onSubmit={submit} className="glass rounded-3xl p-6 lg:col-span-2 space-y-4 h-fit">
        <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar serviço' : 'Novo serviço'}</h3>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Nome *</label>
          <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Volume Russo"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Descrição</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Como é o procedimento?"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Preço (R$) *</label>
            <input required inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="180,00"
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
          </div>
          <div className="w-32">
            <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Duração (min)</label>
            <input type="number" min={15} step={15} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-plum-200/80">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" />
          Visível no site
        </label>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar serviço'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-plum-200/70 hover:text-lavender transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <ul className="lg:col-span-3 space-y-3">
        {items.map((s) => (
          <li key={s.id} className={`glass glass-hover rounded-2xl p-5 text-sm ${!s.active ? 'opacity-50' : ''}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-serif text-lg text-lavender-soft">{s.name}</p>
                <p className="text-xs text-plum-200/70">R$ {Number(s.price).toFixed(2).replace('.', ',')} · {s.duration_minutes} min</p>
                {s.description && <p className="mt-1 text-xs text-plum-200/60 max-w-md">{s.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => toggleActive(s)} className={`rounded-full border px-3 py-1 text-[11px] transition ${s.active ? 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-white/10 text-plum-200/60 hover:bg-white/5'}`}>
                  {s.active ? 'Ativo' : 'Inativo'}
                </button>
                <button onClick={() => startEdit(s)} className="rounded-full border border-white/10 px-3 py-1 text-[11px] text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition">Editar</button>
                <button onClick={() => remove(s)} className="text-[11px] text-red-300/60 hover:text-red-300 transition">Excluir</button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="glass rounded-2xl p-6 text-sm text-plum-200/60">Nenhum serviço cadastrado ainda.</li>}
      </ul>
    </div>
  );
}
