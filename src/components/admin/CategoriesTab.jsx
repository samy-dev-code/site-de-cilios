import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const slugify = (s) =>
  String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `cat-${Date.now()}`;

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR'); } catch { return '—'; }
};

export default function CategoriesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: err } = await supabase.from('categories').select('*').order('display_order');
    if (err) setError(err.message); else setError(null);
    setItems(asArray(data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function create(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const maxOrder = items.reduce((m, c) => Math.max(m, c.display_order ?? 0), 0);
    const { error: err } = await supabase.from('categories').insert({
      name: name.trim(), slug: slugify(name), display_order: maxOrder + 1,
    });
    setSaving(false);
    if (err) return setError(err.message);
    setName('');
    load();
  }

  async function rename(id) {
    if (!editName.trim()) return;
    const { error: err } = await supabase.from('categories').update({ name: editName.trim(), slug: slugify(editName) }).eq('id', id);
    if (err) return setError(err.message);
    setEditingId(null);
    load();
  }

  async function toggle(c) {
    const { error: err } = await supabase.from('categories').update({ active: !c.active }).eq('id', c.id);
    if (err) return setError(err.message);
    load();
  }

  const inputCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition';
  const btn = 'rounded-full border border-white/10 px-3.5 py-2 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition whitespace-nowrap';

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-6">
      <form onSubmit={create} className="glass rounded-3xl p-6 space-y-4">
        <h3 className="font-serif text-xl text-lavender-soft">Nova categoria</h3>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Extensão de cílios" className={`${inputCls} flex-1`} />
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
            {saving ? 'Salvando…' : 'Criar categoria'}
          </button>
        </div>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
      </form>

      <ul className="space-y-3">
        {items.map((c) => (
          <li key={c.id} className={`glass glass-hover rounded-2xl p-4 text-sm flex flex-wrap items-center gap-3 ${c.active ? '' : 'opacity-60'}`}>
            <span className="rounded-lg bg-plum-800/40 px-2.5 py-1 text-[11px] text-lavender/80">#{c.display_order}</span>
            {editingId === c.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} className={`${inputCls} flex-1 min-w-[160px] !py-2`} autoFocus />
                <button onClick={() => rename(c.id)} className={btn}>Salvar</button>
                <button onClick={() => setEditingId(null)} className={btn}>Cancelar</button>
              </>
            ) : (
              <>
                <p className="flex-1 min-w-[140px] font-serif text-lg text-lavender-soft">{c.name}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-plum-200/60'}`}>{c.active ? 'Ativa' : 'Inativa'}</span>
                <span className="text-[10px] text-plum-300/40">criada em {fmtDate(c.created_at)}</span>
                <button onClick={() => { setEditingId(c.id); setEditName(c.name); }} className={btn}>Editar</button>
                <button onClick={() => toggle(c)} className={btn}>{c.active ? 'Desativar' : 'Ativar'}</button>
              </>
            )}
          </li>
        ))}
        {items.length === 0 && (
          <li className="glass rounded-2xl p-8 text-center text-sm text-plum-200/60">Nenhuma categoria cadastrada ainda.</li>
        )}
      </ul>
    </div>
  );
}
