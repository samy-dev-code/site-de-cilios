import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../integrations/supabase/client';

async function uploadImage(file, folder) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('galeria').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data: pub } = supabase.storage.from('galeria').getPublicUrl(path);
  return pub?.publicUrl;
}

function PhotoSlot({ label, value, onPick, onClear, busy }) {
  const ref = useRef(null);
  return (
    <div>
      <p className="mb-1.5 text-[11px] uppercase tracking-widest text-lavender/70">{label}</p>
      <div className="flex items-center gap-3">
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-black/30">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-[10px] text-plum-300/50">Sem foto</div>
          )}
        </div>
        <div className="space-y-1.5">
          <input
            ref={ref}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => { onPick(e.target.files?.[0]); e.target.value = ''; }}
          />
          <button
            type="button"
            disabled={busy}
            onClick={() => ref.current?.click()}
            className="tap-btn block rounded-full border border-lavender/40 px-4 py-1.5 text-xs text-lavender transition hover:bg-lavender/10 disabled:opacity-50"
          >
            {busy ? 'Enviando…' : 'Enviar foto'}
          </button>
          {value && (
            <button
              type="button"
              onClick={onClear}
              className="tap-btn rounded-full border border-red-400/30 px-4 text-xs text-red-200/80 hover:text-red-200 transition"
            >
              Remover
            </button>
          )}
        </div>
      </div>
      <input
        value={value}
        onChange={(e) => onPick(e.target.value, true)}
        placeholder="ou cole uma URL de imagem"
        className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
      />
    </div>
  );
}

export default function GalleryTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [savedId, setSavedId] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ label: '', hint: '', service_name: '', category: '', before_url: '', after_url: '' });
  const [savingDraft, setSavingDraft] = useState(false);
  const [draftBusy, setDraftBusy] = useState(null); // 'before_url' | 'after_url' | null

  const load = async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('gallery_items')
      .select('*')
      .order('position');
    if (err) setError(err.message);
    else setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  function patch(id, changes) {
    setItems((list) => list.map((it) => (it.id === id ? { ...it, ...changes } : it)));
  }

  async function save(it) {
    setBusyId(it.id);
    setError(null);
    const { error: err } = await supabase
      .from('gallery_items')
      .update({ label: it.label, hint: it.hint, service_name: it.service_name || '', category: it.category || '', before_url: it.before_url, after_url: it.after_url, active: it.active, position: it.position })
      .eq('id', it.id);
    if (err) setError(err.message);
    else {
      setSavedId(it.id);
      setTimeout(() => setSavedId((v) => (v === it.id ? null : v)), 2000);
    }
    setBusyId(null);
  }

  async function handleUpload(it, field, file, isUrl = false) {
    if (isUrl) { patch(it.id, { [field]: file }); return; }
    if (!file) return;
    if (!/^image\//.test(file.type)) { setError('Selecione um arquivo de imagem.'); return; }
    setBusyId(it.id);
    try {
      const url = await uploadImage(file, it.id);
      patch(it.id, { [field]: url });
    } catch (e) {
      setError(e.message || 'Falha no upload. Tente novamente.');
    }
    setBusyId(null);
  }

  async function removeItem(it) {
    if (!window.confirm(`Excluir "${it.label || 'item sem título'}" da galeria?`)) return;
    setBusyId(it.id);
    const { error: err } = await supabase.from('gallery_items').delete().eq('id', it.id);
    if (err) setError(err.message);
    else setItems((list) => list.filter((x) => x.id !== it.id));
    setBusyId(null);
  }

  async function addDraft(e) {
    e.preventDefault();
    setSavingDraft(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('gallery_items')
      .insert({ ...draft, position: items.length })
      .select()
      .single();
    if (err) setError(err.message);
    else {
      setItems((list) => [...list, data]);
      setDraft({ label: '', hint: '', service_name: '', category: '', before_url: '', after_url: '' });
      setShowForm(false);
    }
    setSavingDraft(false);
  }

  async function uploadDraftPhoto(file, field) {
    if (!file) return;
    if (!/^image\//.test(file.type)) { setError('Selecione um arquivo de imagem.'); return; }
    setDraftBusy(field);
    setError(null);
    try {
      const url = await uploadImage(file, 'novo');
      setDraft((d) => ({ ...d, [field]: url }));
    } catch (e) {
      setError(e.message || 'Falha no upload. Tente novamente.');
    }
    setDraftBusy(null);
  }

  async function move(it, dir) {
    const idx = items.findIndex((x) => x.id === it.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= items.length) return;
    const other = items[swapIdx];
    patch(it.id, { position: swapIdx });
    patch(other.id, { position: idx });
    await supabase.from('gallery_items').update({ position: swapIdx }).eq('id', it.id);
    await supabase.from('gallery_items').update({ position: idx }).eq('id', other.id);
  }

  if (loading) {
    return (
      <div className="glass rounded-3xl p-8 space-y-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white/5" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-3xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-serif text-xl text-lavender-soft">Galeria — Antes e Depois</h3>
            <p className="mt-1 text-sm text-plum-200/70">Edite textos, envie fotos de antes/depois e organize a ordem em que aparecem no site.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            className="tap-btn rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-5 py-2.5 text-xs font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110"
          >
            {showForm ? 'Cancelar' : '+ Novo item'}
          </button>
        </div>

        {showForm && (
          <form onSubmit={addDraft} className="mt-5 space-y-4 rounded-2xl border border-lavender/20 bg-black/20 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Título</label>
                <input
                  required
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                  placeholder="Ex.: Volume Russo"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Legenda</label>
                <input
                  value={draft.hint}
                  onChange={(e) => setDraft((d) => ({ ...d, hint: e.target.value }))}
                  placeholder="Ex.: Resultado natural"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Serviço realizado</label>
                <input
                  value={draft.service_name}
                  onChange={(e) => setDraft((d) => ({ ...d, service_name: e.target.value }))}
                  placeholder="Ex.: Volume Russo"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Categoria (opcional)</label>
                <input
                  value={draft.category}
                  onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
                  placeholder="Ex.: Cílios, Sobrancelhas…"
                  className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
                />
              </div>
            </div>
            <PhotoSlot
              label="Foto do ANTES (opcional)"
              value={draft.before_url}
              busy={draftBusy === 'before_url'}
              onPick={(v, isUrl) => {
                if (isUrl) setDraft((d) => ({ ...d, before_url: v }));
                else uploadDraftPhoto(v, 'before_url');
              }}
              onClear={() => setDraft((d) => ({ ...d, before_url: '' }))}
            />
            <PhotoSlot
              label="Foto do DEPOIS (opcional)"
              value={draft.after_url}
              busy={draftBusy === 'after_url'}
              onPick={(v, isUrl) => {
                if (isUrl) setDraft((d) => ({ ...d, after_url: v }));
                else uploadDraftPhoto(v, 'after_url');
              }}
              onClear={() => setDraft((d) => ({ ...d, after_url: '' }))}
            />
            <p className="text-[11px] text-plum-200/50">Pelo menos uma foto é recomendada para o item aparecer bem no portfólio.</p>
            <button
              type="submit" disabled={savingDraft}
              className="tap-btn rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {savingDraft ? 'Salvando…' : 'Adicionar à galeria'}
            </button>
          </form>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      {items.length === 0 && (
        <div className="glass rounded-3xl p-8 text-center text-sm text-plum-200/70">
          Nenhum item na galeria ainda. Clique em "+ Novo item" para começar.
        </div>
      )}

      {items.map((it, idx) => (
        <div key={it.id} className="glass rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => move(it, -1)} disabled={idx === 0}
                aria-label="Mover para cima"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition disabled:opacity-30">↑</button>
              <button type="button" onClick={() => move(it, 1)} disabled={idx === items.length - 1}
                aria-label="Mover para baixo"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 text-plum-200/80 hover:border-lavender/50 hover:text-lavender transition disabled:opacity-30">↓</button>
              <span className="ml-1 text-xs uppercase tracking-[0.25em] text-plum-300/50">Item {idx + 1}</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-xs text-plum-200/70">
                <button
                  type="button"
                  role="switch"
                  aria-checked={it.active}
                  onClick={() => { patch(it.id, { active: !it.active }); save({ ...it, active: !it.active }); }}
                  className={`relative h-6 w-11 rounded-full transition ${it.active ? 'bg-gradient-to-r from-plum-500 to-lavender' : 'bg-white/15'}`}
                >
                  <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${it.active ? 'left-[1.4rem]' : 'left-0.5'}`} />
                </button>
                {it.active ? 'Visível' : 'Oculto'}
              </label>
              <button
                type="button"
                onClick={() => removeItem(it)}
                className="rounded-full border border-red-400/30 px-4 py-1.5 text-xs text-red-200/90 hover:bg-red-500/10 transition"
              >
                Excluir
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Título</label>
              <input
                value={it.label}
                onChange={(e) => patch(it.id, { label: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Legenda</label>
              <input
                value={it.hint}
                onChange={(e) => patch(it.id, { hint: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white outline-none focus:border-lavender/70 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Serviço realizado</label>
              <input
                value={it.service_name || ''}
                onChange={(e) => patch(it.id, { service_name: e.target.value })}
                placeholder="Ex.: Volume Russo"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-widest text-lavender/70">Categoria (opcional)</label>
              <input
                value={it.category || ''}
                onChange={(e) => patch(it.id, { category: e.target.value })}
                placeholder="Ex.: Cílios, Sobrancelhas…"
                className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-plum-300/40 outline-none focus:border-lavender/70 transition"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoSlot
              label="Foto do ANTES"
              value={it.before_url}
              busy={busyId === it.id}
              onPick={(v, isUrl) => handleUpload(it, 'before_url', v, isUrl)}
              onClear={() => patch(it.id, { before_url: '' })}
            />
            <PhotoSlot
              label="Foto do DEPOIS"
              value={it.after_url}
              busy={busyId === it.id}
              onPick={(v, isUrl) => handleUpload(it, 'after_url', v, isUrl)}
              onClear={() => patch(it.id, { after_url: '' })}
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-plum-200/50">
              {it.before_url && it.after_url
                ? '✦ Comparaador antes/depois ativado no site.'
                : 'Dica: envie as duas fotos para ativar o comparador antes/depois.'}
            </p>
            <button
              type="button"
              onClick={() => save(it)}
              disabled={busyId === it.id}
              className="tap-btn rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm font-medium text-white shadow-lg shadow-plum-600/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {busyId === it.id ? 'Salvando…' : savedId === it.id ? 'Salvo! ✦' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
