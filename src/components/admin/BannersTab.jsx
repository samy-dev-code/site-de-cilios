import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';
import BannerPreview from './BannerPreview';

const EMPTY_FORM = {
  title: '',
  subtitle: '',
  button_text: '',
  button_url: '',
  content_position: 'center',
  object_fit: 'cover',
  object_position: 'center',
  height_mode: 'default',
  title_size: 'normal',
  overlay_opacity: 55,
  featured: false,
  active: true,
  no_expiration: true,
  start_at: '',
  end_at: '',
  duration: 6000,
  desktop_image_url: '',
  mobile_image_url: '',
};
const MAX_SIZE = 4 * 1024 * 1024; // 4MB
const POSITIONS = [
  { value: 'center', label: 'Centro' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
  { value: 'bottom-left', label: 'Inferior esquerdo' },
  { value: 'bottom-center', label: 'Inferior centro' },
  { value: 'bottom-right', label: 'Inferior direito' },
];
const OBJECT_POSITIONS = [
  { value: 'center', label: 'Centro' },
  { value: 'top', label: 'Centro superior' },
  { value: 'bottom', label: 'Centro inferior' },
  { value: 'left', label: 'Esquerda' },
  { value: 'right', label: 'Direita' },
  { value: 'top left', label: 'Superior esquerdo' },
  { value: 'top right', label: 'Superior direito' },
  { value: 'bottom left', label: 'Inferior esquerdo' },
  { value: 'bottom right', label: 'Inferior direito' },
];
const HEIGHT_MODES = [
  { value: 'compact', label: 'Compacta' },
  { value: 'default', label: 'Padrão (hero)' },
  { value: 'tall', label: 'Alta' },
  { value: 'fullscreen', label: 'Tela cheia' },
];
const TITLE_SIZES = [
  { value: 'normal', label: 'Normal' },
  { value: 'large', label: 'Grande' },
  { value: 'huge', label: 'Enorme' },
];
const fmt = (d) => (d ? new Date(d).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function statusOf(b) {
  if (b.archived) return { label: 'Arquivado', cls: 'border-white/10 text-plum-200/60' };
  if (!b.active) return { label: 'Inativo', cls: 'border-white/10 text-plum-200/60' };
  const now = Date.now();
  if (b.start_at && new Date(b.start_at).getTime() > now) return { label: 'Agendado', cls: 'border-amber-400/40 text-amber-200' };
  if (!b.no_expiration && b.end_at && new Date(b.end_at).getTime() < now) return { label: 'Expirado', cls: 'border-red-400/40 text-red-200' };
  return { label: 'Publicado', cls: 'border-emerald-400/40 text-emerald-200' };
}

function Toast({ msg, type }) {
  if (!msg) return null;
  return (
    <div className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full px-6 py-3 text-sm shadow-xl backdrop-blur-xl ${type === 'error' ? 'border border-red-400/30 bg-red-500/15 text-red-100' : 'border border-emerald-400/30 bg-emerald-500/15 text-emerald-100'}`}>
      {msg}
    </div>
  );
}

function toLocalInput(v) {
  if (!v) return '';
  const d = new Date(v);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function BannersTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [toast, setToast] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [desktopFile, setDesktopFile] = useState(null);
  const [mobileFile, setMobileFile] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewViewport, setPreviewViewport] = useState('desktop');
  const dragIndex = useRef(null);
  const notify = useCallback((msg, type = 'ok') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2600);
  }, []);

  const load = useCallback(async () => {
    const { data, error: err } = await supabase.from('banners').select('*').order('sort_order');
    if (err) setError(err.message);
    else { setError(null); setItems(Array.isArray(data) ? data : []); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function upload(file, bannerId, kind) {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `banners/${bannerId}-${kind}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('banners').upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;
    return supabase.storage.from('banners').getPublicUrl(path).data.publicUrl;
  }

  function startEdit(b) {
    setEditingId(b.id);
    setForm({
      title: b.title ?? '', subtitle: b.subtitle ?? '',
      button_text: b.button_text ?? '', button_url: b.button_url ?? '',
      content_position: b.content_position ?? 'center',
      object_fit: b.object_fit ?? 'cover',
      object_position: b.object_position ?? 'center',
      height_mode: b.height_mode ?? 'default',
      title_size: b.title_size ?? 'normal',
      overlay_opacity: b.overlay_opacity ?? 55,
      featured: !!b.featured, active: b.active,
      no_expiration: b.no_expiration ?? true,
      start_at: toLocalInput(b.start_at), end_at: toLocalInput(b.end_at),
      duration: b.duration ?? 6000,
      desktop_image_url: b.desktop_image_url ?? '', mobile_image_url: b.mobile_image_url ?? '',
    });
    setDesktopFile(null);
    setMobileFile(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim() || null,
        subtitle: form.subtitle.trim() || null,
        button_text: form.button_text.trim() || null,
        button_url: form.button_url.trim() || null,
        content_position: form.content_position,
        object_fit: form.object_fit,
        object_position: form.object_position,
        height_mode: form.height_mode,
        title_size: form.title_size,
        overlay_opacity: Math.min(85, Math.max(0, Number(form.overlay_opacity) || 0)),
        featured: form.featured,
        active: form.active,
        no_expiration: form.no_expiration,
        start_at: form.start_at ? new Date(form.start_at).toISOString() : null,
        end_at: form.no_expiration ? null : (form.end_at ? new Date(form.end_at).toISOString() : null),
        duration: Math.max(2000, Number(form.duration) || 6000),
        updated_at: new Date().toISOString(),
      };
      let saved;
      if (editingId) {
        const { data, error: err } = await supabase.from('banners').update(payload).eq('id', editingId).select().single();
        if (err) throw err;
        saved = data;
      } else {
        const { data, error: err } = await supabase.from('banners').insert({ ...payload, sort_order: (items.at(-1)?.sort_order ?? 0) + 1 }).select().single();
        if (err) throw err;
        saved = data;
      }
      if (desktopFile) saved.desktop_image_url = await upload(desktopFile, saved.id, 'desktop');
      if (mobileFile) saved.mobile_image_url = await upload(mobileFile, saved.id, 'mobile');
      if (desktopFile || mobileFile) {
        const { error: uErr } = await supabase.from('banners').update({
          desktop_image_url: saved.desktop_image_url,
          mobile_image_url: saved.mobile_image_url,
        }).eq('id', saved.id);
        if (uErr) throw uErr;
      }
      setForm(EMPTY_FORM); setDesktopFile(null); setMobileFile(null); setEditingId(null);
      notify(editingId ? 'Banner atualizado!' : 'Banner criado!');
      load();
    } catch (err) {
      setError(err.message || 'Erro ao salvar o banner.');
    } finally {
      setSaving(false);
    }
  }

  async function patch(b, fields, okMsg) {
    const prev = items;
    setItems((p) => p.map((x) => (x.id === b.id ? { ...x, ...fields } : x)));
    const { error: err } = await supabase.from('banners').update({ ...fields, updated_at: new Date().toISOString() }).eq('id', b.id);
    if (err) { setItems(prev); notify(err.message, 'error'); }
    else if (okMsg) notify(okMsg);
  }

  async function duplicate(b) {
    const { data, error: err } = await supabase.from('banners').insert({
      title: b.title ? `${b.title} (cópia)` : null,
      subtitle: b.subtitle, button_text: b.button_text, button_url: b.button_url,
      desktop_image_url: b.desktop_image_url, mobile_image_url: b.mobile_image_url,
      content_position: b.content_position, object_fit: b.object_fit, object_position: b.object_position,
      height_mode: b.height_mode, title_size: b.title_size, overlay_opacity: b.overlay_opacity,
      featured: b.featured, active: false,
      archived: false, no_expiration: b.no_expiration, start_at: b.start_at, end_at: b.end_at,
      duration: b.duration, sort_order: (items.at(-1)?.sort_order ?? 0) + 1,
    }).select().single();
    if (err) notify(err.message, 'error');
    else { notify('Banner duplicado (inativo).'); load(); }
  }

  async function remove(b) {
    if (!window.confirm(`Excluir o banner "${b.title || 'sem título'}"? Esta ação não pode ser desfeita.`)) return;
    const { error: err } = await supabase.from('banners').delete().eq('id', b.id);
    if (err) notify(err.message, 'error');
    else { notify('Banner excluído.'); if (editingId === b.id) setEditingId(null); load(); }
  }

  async function reorder(from, to) {
    if (to < 0 || to >= items.length || from === to) return;
    const list = [...items];
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    setItems(list);
    const { error: err } = await supabase.from('banners').upsert(list.map((b, i) => ({ id: b.id, sort_order: i + 1 })));
    if (err) { notify(err.message, 'error'); load(); }
  }

  const filtered = useMemo(
    () => items.filter((b) => !b.archived),
    [items]
  );
  const archivedItems = useMemo(() => items.filter((b) => b.archived), [items]);

  if (loading) {
    return <div className="py-20 text-center"><span className="h-8 w-8 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender" /></div>;
  }

  return (
    <>
      <Toast msg={toast?.msg} type={toast?.type} />
      <div className="grid lg:grid-cols-5 gap-6">
        {/* FORM */}
        <form onSubmit={submit} className="glass rounded-3xl p-6 lg:col-span-2 space-y-4 h-fit">
          <h3 className="font-serif text-xl text-lavender-soft">{editingId ? 'Editar banner' : 'Novo banner'}</h3>
          {/* Título / subtítulo */}
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
          {/* Botão */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Texto do botão</label>
              <input value={form.button_text} onChange={(e) => setForm({ ...form, button_text: e.target.value })} placeholder="Agendar agora"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">URL / ação</label>
              <input value={form.button_url} onChange={(e) => setForm({ ...form, button_url: e.target.value })} placeholder="https://wa.me/…"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70" />
            </div>
          </div>
          {/* Imagens */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {['desktop', 'mobile'].map((kind) => {
              const file = kind === 'desktop' ? desktopFile : mobileFile;
              const setter = kind === 'desktop' ? setDesktopFile : setMobileFile;
              const url = kind === 'desktop' ? form.desktop_image_url : form.mobile_image_url;
              return (
                <div key={kind}>
                  <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">
                    Imagem {kind === 'desktop' ? 'desktop' : 'mobile (opcional)'}
                  </label>
                  <input
                    type="file" accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0] ?? null;
                      if (f && f.size > MAX_SIZE) { notify('Imagem muito grande (máx. 4MB).', 'error'); e.target.value = ''; return; }
                      setter(f);
                    }}
                    className="w-full text-[11px] text-plum-200/70 file:mr-2 file:rounded-full file:border-0 file:bg-plum-600 file:px-3 file:py-1.5 file:text-[11px] file:text-white hover:file:bg-plum-500"
                  />
                  {(file || url) && (
                    <img
                      src={file ? URL.createObjectURL(file) : url}
                      alt={`Prévia ${kind}`}
                      className="mt-2 h-20 w-full rounded-xl border border-white/10 object-cover"
                      onError={(ev) => { ev.currentTarget.style.display = 'none'; }}
                    />
                  )}
                  {kind === 'mobile' && !form.mobile_image_url && !mobileFile && (
                    <p className="mt-1 text-[10px] text-plum-200/50">Se vazia, usa a imagem desktop.</p>
                  )}
                </div>
              );
            })}
          </div>
          {/* Enquadramento da imagem */}
          <div className="rounded-2xl border border-plum-500/15 bg-plum-900/20 p-4 space-y-3">
            <p className="text-xs uppercase tracking-widest text-lavender/70">Enquadramento da imagem</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-plum-200/60">Modo de encaixe</label>
                <select value={form.object_fit} onChange={(e) => setForm({ ...form, object_fit: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lavender/70">
                  <option value="cover">Preencher (cover)</option>
                  <option value="contain">Imagem inteira (contain)</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-plum-200/60">Posição da imagem</label>
                <select value={form.object_position} onChange={(e) => setForm({ ...form, object_position: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lavender/70">
                  {OBJECT_POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-plum-200/60">Altura do banner</label>
                <select value={form.height_mode} onChange={(e) => setForm({ ...form, height_mode: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lavender/70">
                  {HEIGHT_MODES.map((h) => <option key={h.value} value={h.value}>{h.label}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-plum-200/60">Tamanho do título</label>
                <select value={form.title_size} onChange={(e) => setForm({ ...form, title_size: e.target.value })}
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white outline-none focus:border-lavender/70">
                  {TITLE_SIZES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] text-plum-200/60">Escurecimento do overlay ({form.overlay_opacity}%)</label>
              <input type="range" min={0} max={85} value={form.overlay_opacity}
                onChange={(e) => setForm({ ...form, overlay_opacity: Number(e.target.value) })}
                className="w-full accent-[#c9a7e8]" />
            </div>
            <p className="text-[10px] text-plum-200/50">
              Use "contain" + posição para arte com texto incorporado; "cover" + posição para preservar rosto/cílios.
            </p>
          </div>
          {/* Posição / duração */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Posição do conteúdo</label>
              <select value={form.content_position} onChange={(e) => setForm({ ...form, content_position: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70">
                {POSITIONS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Duração (segundos)</label>
              <input type="number" min={2} max={30} value={form.duration / 1000}
                onChange={(e) => setForm({ ...form, duration: Math.round(Number(e.target.value) * 1000) })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70" />
            </div>
          </div>
          {/* Período */}
          <label className="flex items-center gap-2 text-sm text-plum-200/80">
            <input type="checkbox" checked={form.no_expiration} onChange={(e) => setForm({ ...form, no_expiration: e.target.checked })} className="accent-[#c9a7e8]" />
            Banner sem data de expiração
          </label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Início (opcional)</label>
              <input type="datetime-local" value={form.start_at} onChange={(e) => setForm({ ...form, start_at: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70" />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Término</label>
              <input type="datetime-local" disabled={form.no_expiration} value={form.end_at} onChange={(e) => setForm({ ...form, end_at: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70 disabled:opacity-40" />
            </div>
          </div>
          {/* Flags */}
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-plum-200/80">
              <input type="checkbox" checked={form.featured} onChange={(e) => setForm({ ...form, featured: e.target.checked })} className="accent-[#c9a7e8]" />
              Destaque ✦
            </label>
            <label className="flex items-center gap-2 text-sm text-plum-200/80">
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="accent-[#c9a7e8]" />
              Exibir no site
            </label>
          </div>
          {error && <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-200">{error}</p>}
          <div className="flex gap-3">
            <button type="submit" disabled={saving} className="rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm text-white shadow-lg shadow-plum-600/30 hover:brightness-110 transition disabled:opacity-60">
              {saving ? 'Salvando…' : editingId ? 'Salvar alterações' : 'Adicionar banner'}
            </button>
            {editingId && (
              <button type="button" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setDesktopFile(null); setMobileFile(null); }} className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-plum-200/70 hover:text-lavender transition">
                Cancelar
              </button>
            )}
          </div>
        </form>

        {/* LIST */}
        <div className="lg:col-span-3 space-y-3">
          <ul className="space-y-3">
            {filtered.map((b, i) => {
              const st = statusOf(b);
              const img = b.desktop_image_url || b.image_url;
              return (
                <li
                  key={b.id}
                  draggable
                  onDragStart={() => { dragIndex.current = i; }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => { e.preventDefault(); reorder(dragIndex.current, i); dragIndex.current = null; }}
                  className={`glass glass-hover rounded-2xl p-4 text-sm flex gap-4 items-center cursor-grab active:cursor-grabbing ${!b.active || b.archived ? 'opacity-60' : ''}`}
                >
                  <div className="hidden sm:block text-plum-300/40 select-none" title="Arraste para reordenar">⠿</div>
                  <div className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    {img ? <img src={img} alt={b.title ?? 'Banner'} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-lg text-lavender/40">✦</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-lavender-soft truncate">
                      {b.title || 'Sem título'} {b.featured && <span className="text-amber-300">✦</span>}
                    </p>
                    <p className="text-xs text-plum-200/60 truncate">{b.subtitle || '—'}</p>
                    <p className="mt-0.5 text-[11px] text-plum-200/40">
                      #{i + 1} · Início: {fmt(b.start_at)} · {b.no_expiration ? 'Sem expiração' : `Fim: ${fmt(b.end_at)}`}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`rounded-full border px-3 py-0.5 text-[11px] ${st.cls}`}>{st.label}</span>
                    <div className="flex flex-wrap justify-end gap-1.5 text-[11px]">
                      <button onClick={() => patch(b, { active: !b.active }, b.active ? 'Banner desativado.' : 'Banner ativado!')} className="text-plum-200/80 hover:text-lavender transition">{b.active ? 'Desativar' : 'Ativar'}</button>
                      <button onClick={() => setPreviewOpen(b)} className="text-plum-200/80 hover:text-lavender transition">Preview</button>
                      <button onClick={() => startEdit(b)} className="text-plum-200/80 hover:text-lavender transition">Editar</button>
                      <button onClick={() => duplicate(b)} className="text-plum-200/80 hover:text-lavender transition">Duplicar</button>
                      <button onClick={() => patch(b, { archived: true }, 'Banner arquivado.')} className="text-plum-200/80 hover:text-lavender transition">Arquivar</button>
                      <button onClick={() => remove(b)} className="text-red-300/60 hover:text-red-300 transition">Excluir</button>
                    </div>
                  </div>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="glass rounded-2xl p-6 text-sm text-plum-200/60">Nenhum banner cadastrado ainda.</li>}
          </ul>

          {archivedItems.length > 0 && (
            <details className="glass rounded-2xl p-4 text-sm">
              <summary className="cursor-pointer text-plum-200/70">Arquivados ({archivedItems.length})</summary>
              <ul className="mt-3 space-y-2">
                {archivedItems.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3 rounded-xl bg-black/20 px-3 py-2">
                    <span className="truncate text-plum-200/70">{b.title || 'Sem título'}</span>
                    <div className="flex gap-2 text-[11px]">
                      <button onClick={() => patch(b, { archived: false }, 'Banner restaurado.')} className="text-plum-200/80 hover:text-lavender transition">Restaurar</button>
                      <button onClick={() => remove(b)} className="text-red-300/60 hover:text-red-300 transition">Excluir</button>
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      </div>

      {previewOpen && (
        <div onClick={() => setPreviewOpen(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl overflow-hidden rounded-2xl border border-lavender/20 shadow-2xl">
            <div className="flex items-center justify-end gap-1 border-b border-white/10 bg-black/60 p-2">
              {['desktop', 'mobile'].map((v) => (
                <button key={v} onClick={() => setPreviewViewport(v)}
                  className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-widest transition ${previewViewport === v ? 'bg-plum-600 text-white' : 'text-plum-300/70 hover:text-plum-200'}`}>
                  {v === 'desktop' ? 'Desktop' : 'Mobile'}
                </button>
              ))}
            </div>
            <div className={`mx-auto ${previewViewport === 'mobile' ? 'max-w-[360px]' : ''} bg-black`}>
              <BannerPreview banner={previewOpen} viewport={previewViewport} />
            </div>
            <p className="bg-black/60 py-2 text-center text-xs text-plum-200/60">Prévia — clique fora para fechar</p>
          </div>
        </div>
      )}
    </>
  );
}
