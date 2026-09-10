import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const parseBRL = (s) => {
  const n = Number(String(s ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
};

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const PROMO_TYPE_LABELS = {
  group: 'Grupo',
  combo: 'Combo',
  discount: 'Desconto',
};

const EMPTY = {
  name: '', description: '', image_url: '',
  promo_type: 'group',
  discount_type: 'percentage', discount_value: '',
  participants: 1, service_ids: [], price: '',
  regular_price: '', promotional_price: '',
  weekdays: [0, 1, 2, 3, 4, 5, 6],
  allowed_time_start: '', allowed_time_end: '',
  start_date: '', end_date: '',
  active: true, featured: false, archived: false, display_order: 0,
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
};

export default function PromotionsTab({ onAudit }) {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [promos, svcs] = await Promise.all([
      supabase.from('promotions').select('*').order('display_order'),
      supabase.from('services').select('id, name, price, promotional_price, duration_minutes, active, archived').order('display_order'),
    ]);
    if (promos.error) setError(promos.error.message); else setError(null);
    if (svcs.error) setError((e) => e ?? svcs.error.message);
    setItems(asArray(promos.data));
    setServices(asArray(svcs.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const logAudit = useCallback(async (action, entityId, entityName) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_audit_log').insert({
      user_email: user?.email ?? null, action, entity: 'promotion', entity_id: entityId, entity_name: entityName, details: {},
    });
    onAudit?.();
  }, [onAudit]);

  const svcById = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services]);
  const bundlePrice = (ids) => asArray(ids).reduce((sum, id) => {
    const s = svcById[id];
    return sum + (s ? Number(s.promotional_price ?? s.price ?? 0) : 0);
  }, 0);

  const filtered = useMemo(() => {
    let list = asArray(items);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((p) => (p.name ?? '').toLowerCase().includes(q));
    if (statusFilter === 'active') list = list.filter((p) => p.active && !p.archived);
    else if (statusFilter === 'inactive') list = list.filter((p) => !p.active && !p.archived);
    else if (statusFilter === 'featured') list = list.filter((p) => p.featured);
    else if (statusFilter === 'archived') list = list.filter((p) => p.archived);
    else list = list.filter((p) => !p.archived);
    return [...list].sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0) || (a.name ?? '').localeCompare(b.name ?? ''));
  }, [items, search, statusFilter]);

  const weekdayLabel = (arr) => {
    const d = Array.isArray(arr) ? arr : [0, 1, 2, 3, 4, 5, 6];
    if (d.length >= 7) return 'Todos os dias';
    if (!d.length) return 'Nenhum dia selecionado';
    return d.slice().sort((a, b) => a - b).map((i) => WEEKDAYS[i] ?? i).join(', ');
  };

  function startEdit(p) {
    setEditingId(p.id);
    setShowForm(true);
    setForm({
      name: p.name ?? '', description: p.description ?? '', image_url: p.image_url ?? '',
      promo_type: p.promo_type ?? 'group',
      discount_type: p.discount_type ?? 'percentage',
      discount_value: p.discount_value != null ? String(p.discount_value).replace('.', ',') : '',
      participants: p.participants ?? 1,
      service_ids: asArray(p.service_ids),
      price: p.price != null ? String(p.price).replace('.', ',') : '',
      regular_price: p.regular_price != null ? String(p.regular_price).replace('.', ',') : '',
      promotional_price: p.promotional_price != null ? String(p.promotional_price).replace('.', ',') : '',
      weekdays: Array.isArray(p.weekdays) && p.weekdays.length ? [...p.weekdays] : [0, 1, 2, 3, 4, 5, 6],
      allowed_time_start: p.allowed_time_start ? p.allowed_time_start.slice(0, 5) : '',
      allowed_time_end: p.allowed_time_end ? p.allowed_time_end.slice(0, 5) : '',
      start_date: p.start_date ?? '', end_date: p.end_date ?? '',
      active: p.active ?? true, featured: p.featured ?? false, archived: p.archived ?? false,
      display_order: p.display_order ?? 0,
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

  function toggleService(id) {
    setForm((f) => ({
      ...f,
      service_ids: f.service_ids.includes(id) ? f.service_ids.filter((x) => x !== id) : [...f.service_ids, id],
    }));
  }

  function toggleWeekday(i) {
    setForm((f) => ({
      ...f,
      weekdays: f.weekdays.includes(i) ? f.weekdays.filter((w) => w !== i) : [...f.weekdays, i],
    }));
  }

  async function submit(e) {
    e.preventDefault();
    setError(null); setNotice(null);
    if (!form.name.trim()) return setError('Informe o nome da promoção.');

    // Valida a configuração de preço por pessoa se informada
    const regularPrice = form.regular_price ? parseBRL(form.regular_price) : null;
    const promoPrice = form.promotional_price ? parseBRL(form.promotional_price) : null;
    if (form.regular_price && regularPrice == null) return setError('Preço normal inválido.');
    if (form.promotional_price && promoPrice == null) return setError('Preço promocional inválido.');
    if (regularPrice != null && promoPrice != null && promoPrice > regularPrice) {
      return setError('O preço promocional não pode ser maior que o preço normal.');
    }
    if (form.allowed_time_start !== form.allowed_time_end && !(form.allowed_time_start && form.allowed_time_end)) {
      return setError('Preencha início e fim dos horários permitidos juntos.');
    }

    // Desconto clássico apenas se não estiver usando preço por pessoa
    const dv = parseBRL(form.discount_value);
    if (dv == null || dv < 0) return setError('Informe um valor de desconto válido.');
    if (form.discount_type === 'percentage' && dv > 100) return setError('Desconto percentual não pode passar de 100%.');
    if (!form.service_ids.length && !form.price && regularPrice == null) return setError('Selecione ao menos um serviço incluído ou defina um preço para a promoção.');
    const price = form.price ? parseBRL(form.price) : null;
    if (form.price && !price) return setError('Preço da promoção inválido.');
    if (form.start_date && form.end_date && form.end_date < form.start_date) return setError('A data final deve ser depois da data inicial.');

    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url || null,
      promo_type: form.promo_type || 'group',
      discount_type: form.discount_type,
      discount_value: dv,
      participants: Math.min(Math.max(Number(form.participants) || 1, 1), 20),
      service_ids: form.service_ids,
      price,
      regular_price: regularPrice != null ? regularPrice : null,
      promotional_price: promoPrice != null ? promoPrice : null,
      weekdays: form.weekdays.length ? form.weekdays : [0, 1, 2, 3, 4, 5, 6],
      allowed_time_start: form.allowed_time_start || null,
      allowed_time_end: form.allowed_time_end || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active, featured: form.featured, archived: form.archived,
      display_order: Number(form.display_order) || 0,
    };
    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('promotions').update(payload).eq('id', editingId));
      if (!err) await logAudit('editou promoção', editingId, payload.name);
    } else {
      const maxOrder = items.reduce((m, p) => Math.max(m, p.display_order ?? 0), 0);
      ({ error: err } = await supabase.from('promotions').insert({ ...payload, display_order: payload.display_order || maxOrder + 1 }));
      if (!err) await logAudit('criou promoção', null, payload.name);
    }
    setSaving(false);
    if (err) setError(err.message);
    else {
      setNotice(editingId ? 'Promoção atualizada com sucesso!' : 'Promoção criada com sucesso!');
      setForm(EMPTY); setEditingId(null); setShowForm(false);
      load();
    }
  }

  async function patch(p, fields) {
    const { error: err } = await supabase.from('promotions').update(fields).eq('id', p.id);
    if (err) return alert(err.message);
    if ('active' in fields) await logAudit(fields.active ? 'ativou promoção' : 'desativou promoção', p.id, p.name);
    if ('featured' in fields) await logAudit(fields.featured ? 'destacou promoção' : 'removeu destaque da promoção', p.id, p.name);
    if ('archived' in fields) await logAudit(fields.archived ? 'arquivou promoção' : 'desarquivou promoção', p.id, p.name);
    load();
  }

  async function duplicate(p) {
    const { error: err } = await supabase.from('promotions').insert({
      name: `${p.name} (cópia)`, description: p.description, image_url: p.image_url,
      promo_type: p.promo_type || 'group',
      discount_type: p.discount_type, discount_value: p.discount_value,
      participants: p.participants, service_ids: p.service_ids, price: p.price,
      regular_price: p.regular_price, promotional_price: p.promotional_price,
      weekdays: p.weekdays, allowed_time_start: p.allowed_time_start, allowed_time_end: p.allowed_time_end,
      start_date: p.start_date, end_date: p.end_date,
      active: false, featured: false, archived: false, display_order: (p.display_order ?? 0) + 1,
    });
    if (err) return alert(err.message);
    await logAudit('duplicou promoção', null, `${p.name} (cópia)`);
    load();
  }

  async function remove(p) {
    if (!window.confirm(`Excluir PERMANENTEMENTE "${p.name}"?\n\nPrefira Arquivar para preservar agendamentos vinculados.`)) return;
    const { error: err } = await supabase.from('promotions').delete().eq('id', p.id);
    if (err) alert('Não foi possível excluir (pode haver agendamentos vinculados). Considere arquivar.');
    else { await logAudit('excluiu promoção', p.id, p.name); load(); }
  }

  async function move(p, dir) {
    const idx = filtered.findIndex((x) => x.id === p.id);
    const other = filtered[idx + dir];
    if (!other) return;
    await supabase.from('promotions').update({ display_order: other.display_order ?? 0 }).eq('id', p.id);
    await supabase.from('promotions').update({ display_order: p.display_order ?? 0 }).eq('id', other.id);
    load();
  }

  const isExpired = form.end_date && form.end_date < new Date().toISOString().slice(0, 10);
  const bundle = bundlePrice(form.service_ids);

  const btn = 'tap-btn rounded-full border border-white/10 px-4 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition whitespace-nowrap';
  const inputCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition';
  const labelCls = 'mb-1.5 block text-xs uppercase tracking-widest text-lavender/70';

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={() => { setShowForm((v) => !v); if (showForm) { setEditingId(null); setForm(EMPTY); } }}
          className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition"
        >
          {showForm ? 'Fechar formulário' : '+ Nova promoção'}
        </button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar promoção…" className={`${inputCls} flex-1 min-w-[180px] max-w-xs !py-2.5`} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} max-w-[150px] !py-2.5`}>
          <option value="all">Todos os status</option>
          <option value="active">Ativas</option>
          <option value="inactive">Inativas</option>
          <option value="featured">Destaques</option>
          <option value="archived">Arquivadas</option>
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">{notice}</p>}

      {showForm && (
        <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 animate-fade-up">
          <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar promoção' : 'Nova promoção'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls}>Nome *</label>
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Duas Amigas" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição / Regras</label>
              <textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Traga uma amiga e ganhem desconto no serviço!" className={`${inputCls} resize-none`} />
            </div>
            <div>
              <label className={labelCls}>Tipo de promoção</label>
              <select value={form.promo_type} onChange={(e) => setForm({ ...form, promo_type: e.target.value })} className={inputCls}>
                <option value="group">Grupo (múltiplas pessoas)</option>
                <option value="combo">Combo (vários serviços)</option>
                <option value="discount">Desconto</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Participantes * (1 = individual)</label>
              <input required type="number" min={1} max={20} value={form.participants} onChange={(e) => setForm({ ...form, participants: e.target.value })} className={inputCls} />
              <p className="mt-1 text-[10px] text-plum-200/50">Se 2+, a cliente precisa informar todos os nomes.</p>
            </div>

            <div className="sm:col-span-2 border-t border-white/10 pt-3">
              <p className="mb-2 text-xs uppercase tracking-widest text-lavender/70">Preço por pessoa <span className="normal-case text-plum-200/50">(recomendado — mostrado no site como “R$ 120 / pessoa”)</span></p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className={labelCls}>Preço normal (por pessoa)</label>
                  <input inputMode="decimal" value={form.regular_price} onChange={(e) => setForm({ ...form, regular_price: e.target.value })} placeholder="150,00" className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Preço promocional (por pessoa)</label>
                  <input inputMode="decimal" value={form.promotional_price} onChange={(e) => setForm({ ...form, promotional_price: e.target.value })} placeholder="120,00" className={inputCls} />
                </div>
              </div>
              {form.regular_price && form.promotional_price && (
                <p className="mt-2 text-xs text-plum-200/70">
                  Para {form.participants} participante(s): de <span className="line-through opacity-60">{brl(parseBRL(form.regular_price) * Number(form.participants))}</span>{' '}
                  por <span className="font-semibold text-lavender">{brl(parseBRL(form.promotional_price) * Number(form.participants))}</span>
                </p>
              )}
            </div>

            <div>
              <label className={labelCls}>Tipo de desconto (fallback)</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={inputCls}>
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{form.discount_type === 'percentage' ? 'Desconto (%)' : 'Desconto (R$)'}</label>
              <input inputMode="decimal" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder="Desconto extra além do preço promocional" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Preço fixo da promoção (opcional)</label>
              <input inputMode="decimal" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} placeholder="Deixe vazio para somar os serviços" className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Data inicial</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Data final</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} className={inputCls} />
            </div>

            <div>
              <label className={labelCls}>Dias da semana permitidos</label>
              <div className="flex flex-wrap gap-1.5">
                {WEEKDAYS.map((w, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggleWeekday(i)}
                    className={`rounded-full px-3 py-2 text-xs transition ${form.weekdays.includes(i) ? 'bg-gradient-to-r from-plum-600 to-lavender text-white' : 'border border-white/10 text-plum-200/70 hover:border-lavender/50'}`}
                  >
                    {w}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-plum-200/50">Se nada marcar, valerá todos os dias.</p>
            </div>
            <div>
              <label className={labelCls}>Horários permitidos (opcional)</label>
              <div className="flex items-center gap-2">
                <input type="time" value={form.allowed_time_start} onChange={(e) => setForm({ ...form, allowed_time_start: e.target.value })} className={inputCls} />
                <span className="text-plum-200/50">até</span>
                <input type="time" value={form.allowed_time_end} onChange={(e) => setForm({ ...form, allowed_time_end: e.target.value })} className={inputCls} />
              </div>
              <p className="mt-1 text-[10px] text-plum-200/50">Ex: só pode usar entre 18:00 e 20:00.</p>
            </div>

            <div>
              <label className={labelCls}>Ordem de exibição</label>
              <input type="number" min={0} value={form.display_order} onChange={(e) => setForm({ ...form, display_order: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Imagem</label>
              <input
                type="file" accept="image/jpeg,image/png,image/webp,image/avif" capture="environment"
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
            <div className="sm:col-span-2">
              <label className={labelCls}>Serviços incluídos</label>
              {services.length === 0 ? (
                <p className="text-xs text-plum-200/60">Nenhum serviço cadastrado. Cadastre serviços primeiro ou defina um preço fixo.</p>
              ) : (
                <div className="max-h-56 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 space-y-1.5">
                  {services.map((s) => (
                    <label key={s.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition cursor-pointer ${form.service_ids.includes(s.id) ? 'bg-lavender/10' : 'hover:bg-white/5'}`}>
                      <input type="checkbox" checked={form.service_ids.includes(s.id)} onChange={() => toggleService(s.id)} className="accent-[#c9a7e8]" />
                      <span className="flex-1 text-plum-100/90">{s.name}{!s.active && <span className="ml-2 text-[10px] text-amber-200/70">(inativo)</span>}</span>
                      <span className="text-xs text-lavender/80">{brl(s.promotional_price ?? s.price)}</span>
                    </label>
                  ))}
                </div>
              )}
              {form.service_ids.length > 0 && (
                <p className="mt-2 text-xs text-plum-200/60">
                  Soma dos serviços: <span className="text-lavender">{brl(bundle)}</span>
                  {form.price ? <> · Preço fixo da promoção: <span className="text-lavender">{brl(parseBRL(form.price))}</span></> : null}
                </p>
              )}
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" /> Ativa (visível no site)
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-[#c9a7e8]" /> Destaque
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} className="accent-[#c9a7e8]" /> Arquivada
              </label>
            </div>
          </div>
          {isExpired && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">Atenção: a data final já passou — a promoção não aparecerá no site enquanto estiver expirada.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving || uploading} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar promoção'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-plum-200/70 hover:text-lavender transition">Cancelar</button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {filtered.map((p, i) => {
          const expired = p.end_date && p.end_date < new Date().toISOString().slice(0, 10);
          const notStarted = p.start_date && p.start_date > new Date().toISOString().slice(0, 10);
          const hasPerPerson = p.regular_price != null;
          return (
            <li key={p.id} className={`glass glass-hover rounded-2xl p-4 sm:p-5 text-sm ${p.archived ? 'opacity-50' : !p.active ? 'opacity-70' : ''}`}>
              <div className="flex flex-col sm:flex-row gap-4">
                {p.image_url ? (
                  <img src={p.image_url} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover ring-1 ring-white/10" loading="lazy" />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-plum-800/40 text-lg">🎁</div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg text-lavender-soft">{p.name}</p>
                    {p.promo_type && <span className="rounded-full bg-lavender/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-lavender">{PROMO_TYPE_LABELS[p.promo_type] ?? p.promo_type}</span>}
                    {p.featured && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-amber-200">★ Destaque</span>}
                    {p.archived && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-plum-200/70">Arquivada</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${p.active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-plum-200/60'}`}>{p.active ? 'Ativa' : 'Inativa'}</span>
                    {expired && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200">Expirada</span>}
                    {notStarted && <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-200">Começa {fmtDate(p.start_date)}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-plum-200/70">
                    {hasPerPerson
                      ? (p.promotional_price != null
                          ? `${brl(p.regular_price)} → ${brl(p.promotional_price)} / pessoa`
                          : `${brl(p.regular_price)} / pessoa${p.discount_value ? ` · ${p.discount_type === 'percentage' ? `${Number(p.discount_value)}%` : brl(p.discount_value)} OFF` : ''}`)
                      : (p.discount_type === 'percentage' ? `${Number(p.discount_value)}% OFF` : `${brl(p.discount_value)} OFF`)}
                    {' · '}{p.participants} participante{p.participants > 1 ? 's' : ''}
                    {!hasPerPerson && p.price ? ` · ${brl(p.price)}` : !hasPerPerson && p.service_ids.length ? ` · serviços somam ${brl(bundlePrice(p.service_ids))}` : ''}
                  </p>
                  {p.description && <p className="mt-1 text-xs text-plum-200/70 line-clamp-2">{p.description}</p>}
                  {p.service_ids.length > 0 && (
                    <p className="mt-1 text-xs text-plum-200/60 max-w-xl line-clamp-2">
                      Inclui: {p.service_ids.map((id) => svcById[id]?.name ?? '—').join(', ')}
                    </p>
                  )}
                  <p className="mt-1 text-[10px] text-plum-300/40">
                    Dias: {weekdayLabel(p.weekdays)}
                    {p.allowed_time_start && p.allowed_time_end ? ` · Horário: ${String(p.allowed_time_start).slice(0, 5)} às ${String(p.allowed_time_end).slice(0, 5)}` : ''}
                    {' · '}Vigência: {fmtDate(p.start_date)} até {fmtDate(p.end_date)} · ordem {p.display_order ?? 0}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                  <div className="flex flex-col gap-1">
                    <button onClick={() => move(p, -1)} disabled={i === 0} className="h-9 w-9 rounded-full border border-white/10 text-xs text-plum-200/70 hover:border-lavender/50 disabled:opacity-30" aria-label="Subir">▲</button>
                    <button onClick={() => move(p, 1)} disabled={i === filtered.length - 1} className="h-9 w-9 rounded-full border border-white/10 text-xs text-plum-200/70 hover:border-lavender/50 disabled:opacity-30" aria-label="Descer">▼</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => patch(p, { active: !p.active })} className={btn}>{p.active ? 'Desativar' : 'Ativar'}</button>
                    <button onClick={() => patch(p, { featured: !p.featured })} className={btn}>{p.featured ? 'Remover ★' : 'Destacar'}</button>
                    <button onClick={() => patch(p, { archived: !p.archived })} className={btn}>{p.archived ? 'Desarquivar' : 'Arquivar'}</button>
                    <button onClick={() => startEdit(p)} className={btn}>Editar</button>
                    <button onClick={() => duplicate(p)} className={btn}>Duplicar</button>
                    <button onClick={() => remove(p)} className="tap-btn rounded-full px-4 text-xs text-red-300/60 hover:text-red-300 transition">Excluir</button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="glass rounded-2xl p-8 text-center text-sm text-plum-200/60">
            {items.length === 0 ? 'Nenhuma promoção cadastrada ainda. Clique em "+ Nova promoção".' : 'Nenhuma promoção encontrada com os filtros atuais.'}
          </li>
        )}
      </ul>
    </div>
  );
}