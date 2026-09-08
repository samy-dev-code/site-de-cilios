import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

export default function BannersTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', subtitle: '', link_url: '', active: true, image_url: '' });
  const [file, setFile] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('banners').select('*').order('sort_order');
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  function startEdit(b) {
    setEditingId(b.id);
    setForm({ title: b.title ?? '', subtitle: b.subtitle ?? '', link_url: b.link_url ?? '', active: b.active, image_url: b.image_url ?? '' });
    setFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadImage(bannerId) {
    if (!file) return null;
    const ext = file.name.split('.').pop();
    const path = `banners/${bannerId}.${ext}`;
    const { error: upErr } = await supabase.storage.from('banners').upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    return supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let payload = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        link_url: form.link_url.trim() || null,
        active: form.active,
      };
      let saved;
      if (editingId) {
        const { data, error: err } = await supabase.from('banners').update(payload).eq('id', editingId).select().single();
        if (err) throw err;
        saved = data;
      } else {
        const { data, error: err } = await supabase.from('banners').insert({ ...payload, sort_order: items.length + 1 }).select().single();
        if (err) throw err;
        saved = data;
      }
      if (file) {
        const url = await uploadImage(saved.id);
        if (url) {
          await supabase.from('banners').update({ image_url: url }).eq('id', saved.id);
          saved.image_url = url;
        }
      }
      setForm({ title: '', subtitle: '', link_url: '', active: true, image_url: '' });
      setFile(null);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar o banner.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(b) {
    setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, active: !b.active } : x)));
    const { error: err } = await supabase.from('banners').update({ active: !b.active }).eq('id', b.id);
    if (err) { setItems((prev) => prev.map((x) => (x.id === b.id ? { ...x, active: b.active } : x))); alert(err.message); }
  }

  async function move(index, dir) {
    const other = index + dir;
    if (other < 0 || other >= items.length) return;
    const a = items[index], b = items[other];
    setItems((prev) => {
      const next = [...prev];
      [next[index], next[other]] = [next[other], next[index]];
      return next;
    });
    const { error: err } = await supabase.from('banners').upsert([
      { id: a.id, sort_order: other + 1 },
      { id: b.id, sort_order: index + 1 },
    ]);
    if (err) { alert(err.message); load(); }
  }

  async function remove(b) {
    if (!window.confirm('Excluir este banner?')) return;
    const { error: err } = await supabase.from('banners').delete().eq('id', b.id);
    if (err) alert(err.message);
    else load();
  }

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form onSubmit={submit} className="glass rounded-3xl p-6 lg:col-span-2 space-y-4 h-fit">
        <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar banner' : 'Novo banner'}</h3>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Título</label>
          <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Promoção de inverno ✦"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Subtítulo</label>
          <textarea rows={2} value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} placeholder="30% de desconto em Volume Russo"
            className="w-full resize-none rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Link (opcional)</label>
          <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })} placeholder="https://wa.me/5511999999999"
            className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
        </div>
        <div>
          <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Imagem</label>
          <input
            ref={fileRef} type="file" accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-xs text-plum-200/70 file:mr-3 file:rounded-full file:border-0 file:bg-plum-600 file:px-4 file:py-2 file:text-xs file:text-white hover:file:bg-plum-500"
          />
          {form.image_url && !file && <p className="mt-1 text-[11px] text-plum-200/50">Já existe uma imagem salva — envie um novo arquivo para substituir.</p>}
        </div>
        <label className="flex items-center gap-2 text-sm text-plum-200/80">
          <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" />
          Exibir no site
        </label>
        {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
            {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar banner'}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setForm({ title: '', subtitle: '', link_url: '', active: true, image_url: '' }); setFile(null); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-plum-200/70 hover:text-lavender transition">
              Cancelar
            </button>
          )}
        </div>
      </form>

      <ul className="lg:col-span-3 space-y-3">
        {items.map((b, i) => (
          <li key={b.id} className={`glass glass-hover rounded-2xl p-4 text-sm flex gap-4 items-center ${!b.active ? 'opacity-50' : ''}`}>
            <div className="flex flex-col gap-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} aria-label="Subir" className="rounded border border-white/10 px-2 py-0.5 text-xs text-plum-200/70 hover:text-lavender disabled:opacity-30 transition">↑</button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Descer" className="rounded border border-white/10 px-2 py-0.5 text-xs text-plum-200/70 hover:text-lavender disabled:opacity-30 transition">↓</button>
            </div>
            <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
              {b.image_url ? <img src={b.image_url} alt={b.title ?? 'Banner'} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-lg text-lavender/40">✦</div>}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-medium text-lavender-soft truncate">{b.title || 'Sem título'}</p>
              <p className="text-xs text-plum-200/60 truncate">{b.subtitle || '—'}</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => toggleActive(b)} className={`rounded-full border px-3 py-1 text-[11px] transition ${b.active ? 'border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/10' : 'border-white/10 text-plum-200/60 hover:bg-white/5'}`}>
                {b.active ? 'Ativo' : 'Inativo'}
              </button>
              <div className="flex gap-2">
                <button onClick={() => startEdit(b)} className="text-[11px] text-plum-200/80 hover:text-lavender transition">Editar</button>
                <button onClick={() => remove(b)} className="text-[11px] text-red-300/60 hover:text-red-300 transition">Excluir</button>
              </div>
            </div>
          </li>
        ))}
        {items.length === 0 && <li className="glass rounded-2xl p-6 text-sm text-plum-200/60">Nenhum banner cadastrado ainda.</li>}
      </ul>
    </div>
  );
}
