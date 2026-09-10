import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const parseBRL = (s) => {
  const n = Number(String(s ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const EMPTY = {
  name: '', description: '', price: '', promotional_price: '', duration_minutes: 60,
  category_id: '', image_url: '', active: true, featured: false, archived: false, display_order: 0,
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
};

const fmtDur = (min) => {
  const m = Number(min) || 0;
  return m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}min` : ''}` : `${m}min`;
};

export default function ServicesTab({ onAudit }) {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // busca e filtros
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all'); // all | active | inactive | featured | archived
  const [sortBy, setSortBy] = useState('display_order');

  const fileRef = useRef(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [svc, cats] = await Promise.all([
      supabase.from('services').select('*').order('display_order'),
      supabase.from('categories').select('*').order('display_order'),
    ]);
    if (svc.error) setError(svc.error.message); else setError(null);
    if (cats.error) setError((e) => e ?? cats.error.message);
    setItems(asArray(svc.data));
    setCategories(asArray(cats.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const catName = (id) => categories.find((c) => c.id === id)?.name ?? 'Sem categoria';

  const filtered = useMemo(() => {
    let list = asArray(items);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((s) => (s.name ?? '').toLowerCase().includes(q) || (s.description ?? '').toLowerCase().includes(q));
    if (catFilter !== 'all') list = list.filter((s) => s.category_id === catFilter);
    if (statusFilter === 'active') list = list.filter((s) => s.active && !s.archived);
    else if (statusFilter === 'inactive') list = list.filter((s) => !s.active && !s.archived);
    else if (statusFilter === 'featured') list = list.filter((s) => s.featured);
    else if (statusFilter === 'archived') list = list.filter((s) => s.archived);
    else list = list.filter((s) => !s.archived);

    const sorters = {
      display_order: (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || (a.name ?? '').localeCompare(b.name ?? ''),
      name: (a, b) => (a.name ?? '').localeCompare(b.name ?? ''),
      price: (a, b) => Number(a.price || 0) - Number(b.price || 0),
      created_at: (a, b) => new Date(b.created_at) - new Date(a.created_at),
      updated_at: (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
    };
    return [...list].sort(sorters[sortBy] || sorters.display_order);
  }, [items, search, catFilter, statusFilter, sortBy]);

  const logAudit = useCallback(async (action, entity, entityId, entityName, details = {}) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_audit_log').insert({
      user_email: user?.email ?? null, action, entity, entity_id: entityId, entity_name: entityName, details,
    });
    onAudit?.();
  }, [onAudit]);

  function startEdit(s) {
    setEditingId(s.id);
    setShowForm(true);
    setForm({
      name: s.name ?? '', description: s.description ?? '',
      price: s.price != null ? String(s.price).replace('.', ',') : '',
      promotional_price: s.promotional_price != null ? String(s.promotional_price).replace('.', ',') : '',
      duration_minutes: s.duration_minutes ?? 60,
      category_id: s.category_id ?? '', image_url: s.image_url ?? '',
      active: s.active ?? true, featured: s.featured ?? false, archived: s.archived ?? false,
      display_order: s.display_order ?? 0,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function uploadImage(file) {
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp|avif)$/.test(file.type)) { setError('Formato inválido. Use JPG, PNG, WEBP ou AVIF.'); return null; }
    if (file.size > 4 * 1024 * 1024) { setError('Imagem muito grande (máx. 4 MB).'); return null; }
    setUploading(true); setError(null);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from('service-images').upload(path, file, { contentType: file.type });
    setUploading(false);
    if (upErr) { setError(upErr.message); return null; }
    const { data } = supabase.storage.from('service-images').getPublicUrl(path);
    return data?.publicUrl ?? null;
  }

  async function submit(e) {
    e.preventDefault();
    setError(null); setNotice(null);
    const price = parseBRL(form.price);
    if (!form.name.trim()) return setError('Informe o nome do serviço.');
    if (!price) return setError('Informe um preço válido (ex: 129,90).');
    const promo = form.promotional_price ? parseBRL(form.promotional_price) : null;
    if (form.promotional_price && !promo) return setError('Preço promocional inválido.');
    if (promo && promo >= price) return setError('O preço promocional deve ser MENOR que o preço normal.');
    if (!form.category_id) return setError('Selecione uma categoria.');
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      price,
      promotional_price: promo,
      duration_minutes: Number(form.duration_minutes) || 60,
      category_id: form.category_id,
      image_url: form.image_url || null,
      active: form.active, featured: form.featured, archived: form.archived,
      display_order: Number(form.display_order) || 0,
    };
    let err;
    if (editingId) {
      const old = items.find((s) => s.id === editingId);
      ({ error: err } = await supabase.from('services').update(payload).eq('id', editingId));
      if (!err && old && (Number(old.price) !== price || Number(old.promotional_price ?? null) !== promo)) {
        await supabase.from('service_price_history').insert({
          service_id: editingId,
          old_price: old.price ?? null, new_price: price,
          old_promotional_price: old.promotional_price ?? null, new_promotional_price: promo,
          user_email: (await supabase.auth.getUser()).data?.user?.email ?? null,
        });
      }
      if (!err) await logAudit('editou serviço', 'service', editingId, payload.name, { price });
    } else {
      const maxOrder = items.reduce((m, s) => Math.max(m, s.display_order ?? 0), 0);
      ({ error: err } = await supabase.from('services').insert({ ...payload, display_order: payload.display_order || maxOrder + 1 }));
      if (!err) await logAudit('criou serviço', 'service', null, payload.name, { price });
    }
    setSaving(false);
    if (err) setError(err.message);
    else {
      setNotice(editingId ? 'Serviço atualizado com sucesso!' : 'Serviço criado com sucesso!');
      setForm(EMPTY); setEditingId(null); setShowForm(false);
      if (fileRef.current) fileRef.current.value = '';
      load();
    }
  }

  async function patch(s, fields, confirmMsg) {
    if (confirmMsg && !window.confirm(confirmMsg)) return;
    const { error: err } = await supabase.from('services').update(fields).eq('id', s.id);
    if (err) return alert(err.message);
    const actions = { active: 'ativou/desativou serviço', featured: 'alterou destaque', archived: 'arquivou serviço' };
    if ('active' in fields) await logAudit(fields.active ? 'ativou serviço' : 'desativou serviço', 'service', s.id, s.name);
    if ('featured' in fields) await logAudit(fields.featured ? 'destacou serviço' : 'removeu destaque', 'service', s.id, s.name);
    if ('archived' in fields) await logAudit(fields.archived ? 'arquivou serviço' : 'desarquivou serviço', 'service', s.id, s.name);
    void actions;
    load();
  }

  async function duplicate(s) {
    const { error: err } = await supabase.from('services').insert({
      name: `${s.name} (cópia)`, description: s.description, price: s.price,
      promotional_price: s.promotional_price, duration_minutes: s.duration_minutes,
      category_id: s.category_id, image_url: s.image_url, active: false,
      featured: false, archived: false, display_order: (s.display_order ?? 0) + 1,
    });
    if (err) return alert(err.message);
    await logAudit('duplicou serviço', 'service', null, `${s.name} (cópia)`);
    load();
  }

  async function remove(s) {
    if (!window.confirm(`Excluir PERMANENTEMENTE "${s.name}"?\n\nPrefira Arquivar para preservar o histórico de agendamentos e preços.`)) return;
    const { error: err } = await supabase.from('services').delete().eq('id', s.id);
    if (err) alert('Não foi possível excluir (pode haver agendamentos vinculados). Considere arquivar o serviço.');
    else { await logAudit('excluiu serviço', 'service', s.id, s.name); load(); }
  }

  async function move(s, dir) {
    const siblings = filtered;
    const idx = siblings.findIndex((x) => x.id === s.id);
    const other = siblings[idx + dir];
    if (!other) return;
    await supabase.from('services').update({ display_order: other.display_order ?? 0 }).eq('id', s.id);
    await supabase.from('services').update({ display_order: s.display_order ?? 0 }).eq('id', other.id);
    load();
  }

  const chip = (active) =>
    `rounded-full px-3 py-1 text-[11px] transition ${active ? 'border-lavender/50 bg-lavender/10 text-lavender' : 'border-white/10 text-plum-200/70 hover:border-lavender/40'}`;
  const btn = 'tap-btn rounded-full border border-white/10 px-4 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition whitespace-nowrap';
  const inputCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition';
  const labelCls = 'mb-1.5 block text-xs uppercase tracking-widest text-lavender/70';

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Barra de ações */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) { setEditingId(null); setForm(EMPTY); } }}
          className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition"
        >
          {showForm ? 'Fechar formulário' : '+ Novo serviço'}
        </button>
        <input
          value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar serviço…"
          className={`${inputCls} flex-1 min-w-[180px] max-w-xs !py-2.5`}
        />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={`${inputCls} max-w-[180px] !py-2.5`}>
          <option value="all">Todas as categorias</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} max-w-[150px] !py-2.5`}>
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="featured">Destaques</option>
          <option value="archived">Arquivados</option>
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={`${inputCls} max-w-[180px] !py-2.5`}>
          <option value="display_order">Ordem de exibição</option>
          <option value="name">Nome</option>
          <option value="price">Preço</option>
          <option value="created_at">Data de criação</option>
          <option value="updated_at">Última alteração</option>
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">{notice}</p>}

      {/* Formulário */}
      {showForm && (
        <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 animate-fade-up">
          <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar serviço' : 'Novo serviço'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Volume Brasileiro" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição *</label>
              <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Técnica com acabamento delicado e volumoso." className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Preço (R$) *</label>
              <input required inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="150,00" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço promocional</label>
              <input inputMode="decimal" value={form.promotional_price} onChange={(e) => setForm({ ...form, promotional_price: e.target.value })} placeholder="129,90 (opcional)" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Duração (min) *</label>
              <input required type="number" min={15} step={5} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Categoria *</label>
              <select required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className={inputCls}>
                <option value="">Selecione…</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Ordem de exibição</label>
              <input type="number" min={0} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Imagem</label>
              <input
                ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment"
                onChange={async (e) => {
                  const url = await uploadImage(e.target.files?.[0]);
                  if (url) setForm((f) => ({ ...f, image_url: url }));
                }}
                className="w-full text-xs text-plum-200/70 file:mr-3 file:rounded-full file:border-0 file:bg-lavender/15 file:px-4 file:py-2 file:text-xs file:text-lavender"
              />
              {uploading && <p className="mt-1 text-xs text-lavender/70">Enviando imagem…</p>}
              {form.image_url && (
                <div className="mt-2 flex items-center gap-2">
                  <img src={form.image_url} alt="" className="h-12 w-12 rounded-lg object-cover ring-1 ring-white/10" />
                  <button type="button" onClick={() => setForm({ ...form, image_url: '' })} className="text-xs text-red-300/70 hover:text-red-300">Remover</button>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" /> Ativo (visível no site)
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-[#c9a7e8]" /> Destaque na home
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} className="accent-[#c9a7e8]" /> Arquivado
              </label>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || uploading} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar serviço'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-plum-200/70 hover:text-lavender transition">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Lista */}
      <ul className="space-y-3">
        {filtered.map((s, i) => (
          <li key={s.id} className={`glass glass-hover rounded-2xl p-4 sm:p-5 text-sm ${s.archived ? 'opacity-50' : !s.active ? 'opacity-70' : ''}`}>
            <div className="flex flex-col sm:flex-row gap-4">
              {s.image_url ? (
                <img src={s.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-plum-800/40 text-lg">💜</div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-serif text-lg text-lavender-soft">{s.name}</p>
                  {s.featured && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">★ Destaque</span>}
                  {s.archived && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-plum-200/70">Arquivado</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] ${s.active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-plum-200/60'}`}>{s.active ? 'Ativo' : 'Inativo'}</span>
                </div>
                <p className="text-xs text-plum-200/70">
                  <span className="text-lavender">{catName(s.category_id)}</span> · {fmtDur(s.duration_minutes)} ·{' '}
                  {s.promotional_price ? (
                    <>
                      <span className="line-through opacity-50">{brl(s.price)}</span>{' '}
                      <span className="font-semibold text-emerald-300">{brl(s.promotional_price)}</span>
                    </>
                  ) : brl(s.price)}
                </p>
                {s.description && <p className="mt-1 text-xs text-plum-200/60 max-w-xl line-clamp-2">{s.description}</p>}
                <p className="mt-1 text-[10px] text-plum-300/40">Ordem {s.display_order ?? 0} · criado {fmtDate(s.created_at)} · alterado {fmtDate(s.updated_at || s.created_at)}</p>
              </div>
              <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                <div className="flex flex-col gap-1">
                  <button onClick={() => move(s, -1)} disabled={i === 0} className="h-9 w-9 rounded-full border border-white/10 text-xs text-plum-200/70 hover:border-lavender/50 disabled:opacity-30" aria-label="Subir">▲</button>
                  <button onClick={() => move(s, 1)} disabled={i === filtered.length - 1} className="h-9 w-9 rounded-full border border-white/10 text-xs text-plum-200/70 hover:border-lavender/50 disabled:opacity-30" aria-label="Descer">▼</button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button onClick={() => patch(s, { active: !s.active }, !s.active ? undefined : 'Desativar este serviço? Ele sairá do site e do agendamento. O histórico será preservado.')} className={btn}>{s.active ? 'Desativar' : 'Ativar'}</button>
                  <button onClick={() => patch(s, { featured: !s.featured })} className={btn}>{s.featured ? 'Remover ★' : 'Destacar'}</button>
                  <button onClick={() => patch(s, { archived: !s.archived }, !s.archived ? 'Arquivar este serviço? Ele sairá do site e do agendamento, mas o histórico será preservado.' : undefined)} className={btn}>{s.archived ? 'Desarquivar' : 'Arquivar'}</button>
                  <button onClick={() => startEdit(s)} className={btn}>Editar</button>
                  <button onClick={() => duplicate(s)} className={btn}>Duplicar</button>
                  <button onClick={() => remove(s)} className="tap-btn rounded-full px-4 text-xs text-red-300/60 hover:text-red-300 transition">Excluir</button>
                </div>
              </div>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="glass rounded-2xl p-8 text-center text-sm text-plum-200/60">
            {items.length === 0 ? 'Nenhum serviço cadastrado ainda. Clique em "+ Novo serviço".' : 'Nenhum serviço encontrado com os filtros atuais.'}
          </li>
        )}
      </ul>
    </div>
  );
}
