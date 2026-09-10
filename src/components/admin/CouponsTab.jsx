import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

const asArray = (v) => (Array.isArray(v) ? v : []);
const brl = (n) => (n == null ? '' : `R$ ${Number(n).toFixed(2).replace('.', ',')}`);
const parseBRL = (s) => {
  const n = Number(String(s ?? '').replace(/[^\d,.-]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 0 ? n : null;
};

const EMPTY = {
  code: '', name: '', description: '',
  discount_type: 'percentage', discount_value: '',
  start_date: '', end_date: '', active: true, archived: false,
  max_uses: '', max_uses_per_client: '', min_amount: '',
  service_ids: [], category_ids: [], promotion_ids: [],
  allow_with_promotion: false,
};

const fmtDate = (iso) => {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }); } catch { return '—'; }
};

export default function CouponsTab({ onAudit }) {
  const [items, setItems] = useState([]);
  const [services, setServices] = useState([]);
  const [categories, setCategories] = useState([]);
  const [promotions, setPromotions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [cps, svcs, cats, promos] = await Promise.all([
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
      supabase.from('services').select('id, name, category_id, active').order('display_order'),
      supabase.from('categories').select('id, name').order('display_order'),
      supabase.from('promotions').select('id, name').order('display_order'),
    ]);
    if (cps.error) setError(cps.error.message); else setError(null);
    if (svcs.error) setError((e) => e ?? svcs.error.message);
    if (cats.error) setError((e) => e ?? cats.error.message);
    if (promos.error) setError((e) => e ?? promos.error.message);
    setItems(asArray(cps.data));
    setServices(asArray(svcs.data));
    setCategories(asArray(cats.data));
    setPromotions(asArray(promos.data));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const logAudit = useCallback(async (action, entityId, entityName) => {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('admin_audit_log').insert({
      user_email: user?.email ?? null, action, entity: 'coupon', entity_id: entityId, entity_name: entityName, details: {},
    });
    onAudit?.();
  }, [onAudit]);

  const filtered = useMemo(() => {
    let list = asArray(items);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((c) => (c.code ?? '').toLowerCase().includes(q) || (c.name ?? '').toLowerCase().includes(q));
    if (statusFilter === 'active') list = list.filter((c) => c.active && !c.archived);
    else if (statusFilter === 'inactive') list = list.filter((c) => !c.active && !c.archived);
    else if (statusFilter === 'archived') list = list.filter((c) => c.archived);
    else list = list.filter((c) => !c.archived);
    return list;
  }, [items, search, statusFilter]);

  function startEdit(c) {
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      code: c.code ?? '', name: c.name ?? '', description: c.description ?? '',
      discount_type: c.discount_type ?? 'percentage',
      discount_value: c.discount_value != null ? String(c.discount_value).replace('.', ',') : '',
      start_date: c.start_date ?? '', end_date: c.end_date ?? '',
      active: c.active ?? true, archived: c.archived ?? false,
      max_uses: c.max_uses ?? '', max_uses_per_client: c.max_uses_per_client ?? '',
      min_amount: c.min_amount != null && c.min_amount > 0 ? String(c.min_amount).replace('.', ',') : '',
      service_ids: asArray(c.service_ids), category_ids: asArray(c.category_ids), promotion_ids: asArray(c.promotion_ids),
      allow_with_promotion: c.allow_with_promotion ?? false,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const toggleIn = (field, id) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(id) ? f[field].filter((x) => x !== id) : [...f[field], id],
    }));

  async function submit(e) {
    e.preventDefault();
    setError(null); setNotice(null);
    const code = form.code.trim().toUpperCase();
    if (!code) return setError('Informe o código do cupom.');
    const dv = parseBRL(form.discount_value);
    if (dv == null || dv <= 0) return setError('Informe um valor de desconto válido.');
    if (form.discount_type === 'percentage' && dv > 100) return setError('Desconto percentual não pode passar de 100%.');
    const minAmount = form.min_amount ? parseBRL(form.min_amount) : 0;
    if (form.min_amount && minAmount == null) return setError('Valor mínimo inválido.');
    if (form.start_date && form.end_date && form.end_date < form.start_date) return setError('A data final deve ser depois da data inicial.');
    setSaving(true);
    const payload = {
      code,
      name: form.name.trim() || null,
      description: form.description.trim() || null,
      discount_type: form.discount_type,
      discount_value: dv,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      active: form.active, archived: form.archived,
      max_uses: form.max_uses ? Number(form.max_uses) : null,
      max_uses_per_client: form.max_uses_per_client ? Number(form.max_uses_per_client) : null,
      min_amount: minAmount || 0,
      service_ids: form.service_ids,
      category_ids: form.category_ids,
      promotion_ids: form.promotion_ids,
      allow_with_promotion: form.allow_with_promotion,
    };
    let err;
    if (editingId) {
      ({ error: err } = await supabase.from('coupons').update(payload).eq('id', editingId));
      if (!err) await logAudit('editou cupom', editingId, code);
    } else {
      ({ error: err } = await supabase.from('coupons').insert(payload));
      if (!err) await logAudit('criou cupom', null, code);
    }
    setSaving(false);
    if (err) setError(err.code === '23505' ? 'Já existe um cupom com esse código.' : err.message);
    else {
      setNotice(editingId ? 'Cupom atualizado com sucesso!' : 'Cupom criado com sucesso!');
      setForm(EMPTY); setEditingId(null); setShowForm(false);
      load();
    }
  }

  async function patch(c, fields) {
    const { error: err } = await supabase.from('coupons').update(fields).eq('id', c.id);
    if (err) return alert(err.message);
    if ('active' in fields) await logAudit(fields.active ? 'ativou cupom' : 'desativou cupom', c.id, c.code);
    if ('archived' in fields) await logAudit(fields.archived ? 'arquivou cupom' : 'desarquivou cupom', c.id, c.code);
    load();
  }

  async function duplicate(c) {
    const { error: err } = await supabase.from('coupons').insert({
      code: `${c.code}COPIA`, name: c.name ? `${c.name} (cópia)` : null, description: c.description,
      discount_type: c.discount_type, discount_value: c.discount_value,
      start_date: c.start_date, end_date: c.end_date,
      active: false, archived: false,
      max_uses: c.max_uses, max_uses_per_client: c.max_uses_per_client, min_amount: c.min_amount,
      service_ids: c.service_ids, category_ids: c.category_ids, promotion_ids: c.promotion_ids,
      allow_with_promotion: c.allow_with_promotion,
    });
    if (err) return alert(err.message);
    await logAudit('duplicou cupom', null, `${c.code}COPIA`);
    load();
  }

  async function remove(c) {
    if (!window.confirm(`Excluir PERMANENTEMENTE o cupom "${c.code}"?`)) return;
    const { error: err } = await supabase.from('coupons').delete().eq('id', c.id);
    if (err) alert('Não foi possível excluir (pode haver utilizações vinculadas). Considere arquivar.');
    else { await logAudit('excluiu cupom', c.id, c.code); load(); }
  }

  const today = new Date().toISOString().slice(0, 10);
  const isExpired = form.end_date && form.end_date < today;

  const btn = 'tap-btn rounded-full border border-white/10 px-4 text-xs text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition whitespace-nowrap';
  const inputCls = 'w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition';
  const labelCls = 'mb-1.5 block text-xs uppercase tracking-widest text-lavender/70';

  const SelectionBox = ({ field, options, label }) => (
    <div className="sm:col-span-2">
      <label className={labelCls}>{label}</label>
      {options.length === 0 ? (
        <p className="text-xs text-plum-200/60">Nada cadastrado ainda.</p>
      ) : (
        <div className="max-h-40 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 space-y-1.5">
          {options.map((o) => (
            <label key={o.id} className={`flex items-center gap-3 rounded-lg px-2 py-1.5 text-sm transition cursor-pointer ${form[field].includes(o.id) ? 'bg-lavender/10' : 'hover:bg-white/5'}`}>
              <input type="checkbox" checked={form[field].includes(o.id)} onChange={() => toggleIn(field, o.id)} className="accent-[#c9a7e8]" />
              <span className="flex-1 text-plum-100/90">{o.name}</span>
            </label>
          ))}
        </div>
      )}
      <p className="mt-1 text-[10px] text-plum-300/50">Deixe vazio para valer para todos.</p>
    </div>
  );

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
          {showForm ? 'Fechar formulário' : '+ Novo cupom'}
        </button>
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Pesquisar cupom…" className={`${inputCls} flex-1 min-w-[180px] max-w-xs !py-2.5`} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={`${inputCls} max-w-[150px] !py-2.5`}>
          <option value="all">Todos os status</option>
          <option value="active">Ativos</option>
          <option value="inactive">Inativos</option>
          <option value="archived">Arquivados</option>
        </select>
      </div>

      {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
      {notice && <p className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-200">{notice}</p>}

      {showForm && (
        <form onSubmit={submit} className="glass rounded-3xl p-6 space-y-4 animate-fade-up">
          <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar cupom' : 'Novo cupom'}</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>Código *</label>
              <input required value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="CILIOS10" className={`${inputCls} uppercase tracking-widest`} />
            </div>
            <div>
              <label className={labelCls}>Nome</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Desconto cílios" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls}>Descrição</label>
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Válido para primeiro agendamento" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Tipo de desconto *</label>
              <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })} className={inputCls}>
                <option value="percentage">Porcentagem (%)</option>
                <option value="fixed">Valor fixo (R$)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{form.discount_type === 'percentage' ? 'Desconto (%) *' : 'Desconto (R$) *'}</label>
              <input required inputMode="decimal" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })} placeholder={form.discount_type === 'percentage' ? '10' : '15,00'} className={inputCls} />
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
              <label className={labelCls}>Limite de utilizações (total)</label>
              <input type="number" min={1} value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })} placeholder="Sem limite" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Limite por cliente</label>
              <input type="number" min={1} value={form.max_uses_per_client} onChange={(e) => setForm({ ...form, max_uses_per_client: e.target.value })} placeholder="Sem limite" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Valor mínimo do pedido (R$)</label>
              <input inputMode="decimal" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} placeholder="0,00" className={inputCls} />
            </div>
            <div className="flex flex-col justify-end gap-2 pb-1">
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.allow_with_promotion} onChange={(e) => setForm({ ...form, allow_with_promotion: e.target.checked })} className="accent-[#c9a7e8]" /> Permitir acumular com promoções
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" /> Ativo
              </label>
              <label className="flex items-center gap-2 text-sm text-plum-200/80">
                <input type="checkbox" checked={form.archived} onChange={(e) => setForm({ ...form, archived: e.target.checked })} className="accent-[#c9a7e8]" /> Arquivado
              </label>
            </div>
            <SelectionBox field="service_ids" options={services} label="Serviços permitidos" />
            <SelectionBox field="category_ids" options={categories} label="Categorias permitidas" />
            <SelectionBox field="promotion_ids" options={promotions} label="Promoções permitidas" />
          </div>
          {isExpired && <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-2.5 text-xs text-amber-200">Atenção: a data final já passou — este cupom será recusado como expirado.</p>}
          <div className="flex flex-wrap gap-3">
            <button type="submit" disabled={saving} className="tap-btn w-full sm:w-auto rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Criar cupom'}
            </button>
            <button type="button" onClick={() => { setShowForm(false); setEditingId(null); setForm(EMPTY); }} className="tap-btn w-full sm:w-auto rounded-full border border-white/10 px-5 text-sm text-plum-200/70 hover:text-lavender transition">Cancelar</button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {filtered.map((c) => {
          const expired = c.end_date && c.end_date < today;
          const exhausted = c.max_uses != null && c.uses >= c.max_uses;
          return (
            <li key={c.id} className={`glass glass-hover rounded-2xl p-4 sm:p-5 text-sm ${c.archived ? 'opacity-50' : !c.active ? 'opacity-70' : ''}`}>
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-serif text-lg text-lavender-soft break-all">{c.code}</p>
                    {c.name && <span className="text-xs text-plum-200/60">{c.name}</span>}
                    {c.archived && <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-plum-200/70">Arquivado</span>}
                    <span className={`rounded-full px-2 py-0.5 text-[10px] ${c.active ? 'bg-emerald-500/15 text-emerald-200' : 'bg-white/10 text-plum-200/60'}`}>{c.active ? 'Ativo' : 'Inativo'}</span>
                    {expired && <span className="rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] text-red-200">Expirado</span>}
                    {exhausted && <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] text-amber-200">Esgotado</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-plum-200/70">
                    {c.discount_type === 'percentage' ? `${Number(c.discount_value)}% OFF` : `${brl(c.discount_value)} OFF`}
                    {' · usos: '}{c.uses}{c.max_uses != null ? `/${c.max_uses}` : ''}
                    {c.min_amount > 0 ? ` · mín. ${brl(c.min_amount)}` : ''}
                    {` · ${c.allow_with_promotion ? 'acumula com promoção' : 'não acumula com promoção'}`}
                  </p>
                  {c.description && <p className="mt-1 text-xs text-plum-200/60 line-clamp-2">{c.description}</p>}
                  <p className="mt-1 text-[10px] text-plum-300/40">
                    Vigência: {fmtDate(c.start_date)} até {fmtDate(c.end_date)} · criado {fmtDate(c.created_at)}
                  </p>
                </div>
                <div className="flex flex-wrap items-start gap-1.5 sm:justify-end">
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => patch(c, { active: !c.active })} className={btn}>{c.active ? 'Desativar' : 'Ativar'}</button>
                    <button onClick={() => patch(c, { archived: !c.archived })} className={btn}>{c.archived ? 'Desarquivar' : 'Arquivar'}</button>
                    <button onClick={() => startEdit(c)} className={btn}>Editar</button>
                    <button onClick={() => duplicate(c)} className={btn}>Duplicar</button>
                    <button onClick={() => remove(c)} className="tap-btn rounded-full px-4 text-xs text-red-300/60 hover:text-red-300 transition">Excluir</button>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="glass rounded-2xl p-8 text-center text-sm text-plum-200/60">
            {items.length === 0 ? 'Nenhum cupom cadastrado ainda. Clique em "+ Novo cupom".' : 'Nenhum cupom encontrado com os filtros atuais.'}
          </li>
        )}
      </ul>
    </div>
  );
}
