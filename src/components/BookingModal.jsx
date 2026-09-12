import { useEffect, useMemo, useState, Component } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../integrations/supabase/client';
import { buildPixPayload, buildBookingMessage, openWhatsApp } from '../utils/payment';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const STEPS = ['Serviço', 'Data', 'Horário', 'Seus dados', 'Pagamento', 'Confirmação'];

const PAYMENTS = [
  {
    id: 'pix',
    label: 'PIX',
    desc: 'Pague agora pelo app do seu banco com o QR Code ao lado.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M12 2.1a2.6 2.6 0 0 1 1.85.77l3.7 3.7h-2.6a3.9 3.9 0 0 0-3.9 3.9v.06a3.9 3.9 0 0 1-3.9 3.9H2.87a2.6 2.6 0 0 1 0-3.68L10.15 2.87A2.6 2.6 0 0 1 12 2.1Zm8.9 9.9a1.3 1.3 0 0 1 0 1.84l-7.05 7.05a2.6 2.6 0 0 1-3.68 0l-3.7-3.7h2.6a3.9 3.9 0 0 0 3.9-3.9v-.06a3.9 3.9 0 0 1 3.9-3.9h4.28a1.3 1.3 0 0 1 .92.38ZM2.9 10.55a1.3 1.3 0 0 1-.93-2.21L8.6 1.72a2.6 2.6 0 0 1 .62-.46L2.9 8.58a1.3 1.3 0 0 0 0 1.84l7.05 7.05a2.6 2.6 0 0 0 3.68 0l3.7-3.7h-2.6a3.9 3.9 0 0 1-3.9-3.9v-.06a3.9 3.9 0 0 0-3.9-3.9H2.9Z" /></svg>
    ),
  },
  {
    id: 'cash',
    label: 'Dinheiro',
    desc: 'Pagamento presencial no estúdio, no dia do atendimento.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></svg>
    ),
  },
  {
    id: 'card',
    label: 'Cartão (Débito/Crédito)',
    desc: 'Processamento na maquininha presencial no estúdio.',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></svg>
    ),
  },
];

const PAYMENT_LABELS = { pix: 'PIX', cash: 'Dinheiro', card: 'Cartão (Débito/Crédito)' };

const brl = (v) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;
const toISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function Spinner() {
  return <span className="h-5 w-5 inline-block animate-spin rounded-full border-2 border-lavender/30 border-t-lavender align-middle" />;
}

function Stepper({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-8">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`h-1.5 rounded-full transition-all duration-300 ${i <= step ? 'w-8 bg-gradient-to-r from-plum-500 to-lavender' : 'w-4 bg-white/10'}`} title={label} />
        </div>
      ))}
    </div>
  );
}

function fmtBR(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
}

/* Se qualquer erro inesperado acontecer dentro do modal, mostramos uma
   mensagem limpa com botão de fechar — nunca uma tela preta travada. */
class BookingErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4" onClick={this.props.onClose}>
          <div className="glass max-w-sm rounded-2xl p-8 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-red-400/40 bg-red-500/10 text-2xl">😔</div>
            <p className="mt-4 font-serif text-2xl text-gradient">Ops! Algo deu errado</p>
            <p className="mt-3 text-sm text-plum-200/80">Não foi possível abrir o agendamento. Por favor, tente novamente.</p>
            <button
              onClick={this.props.onClose}
              className="mt-6 rounded-full bg-gradient-to-r from-plum-600 to-plum-400 px-6 py-2.5 text-sm font-medium text-white transition hover:brightness-110"
            >
              Fechar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function BookingModal({ services, loading = false, error = null, presetService = null, onClose }) {
  const [step, setStep] = useState(presetService ? 1 : 0);
  // `_asMaintenance` chega do card público quando a cliente clicou em "Agendar manutenção"
  const [service, setService] = useState(presetService);
  const [asMaintenance, setAsMaintenance] = useState(!!presetService?._asMaintenance);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount_amount }
  const [couponMsg, setCouponMsg] = useState(null); // { type: 'ok'|'err', text }
  const [couponChecking, setCouponChecking] = useState(false);
  const [hours, setHours] = useState([]);
  const [blocked, setBlocked] = useState([]);
  const [takenSlots, setTakenSlots] = useState([]);
  const [checking, setChecking] = useState(false);
  const [payment, setPayment] = useState(null);
  const [result, setResult] = useState(null); // retorno do RPC create_booking

  // Normalização segura: garante que valores vindos do Supabase sejam sempre arrays
  const asArray = (value) => (Array.isArray(value) ? value : []);
  const serviceList = asArray(services);
  const [pix, setPix] = useState({ pix_key: '', pix_holder_name: '', pix_city: '' });
  const [copied, setCopied] = useState(false);
  const [hoursError, setHoursError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [done, setDone] = useState(false);

  // Duração efetiva: manutenção usa a duração própria do serviço
  const selectedDuration = useMemo(() => {
    if (service && asMaintenance) return Number(service.maintenance_duration_minutes) || Number(service.duration_minutes) || 60;
    if (service) return Number(service.duration_minutes) || 60;
    return 60;
  }, [service, asMaintenance]);

  // Estimativa de valores (o valor FINAL é sempre recalculado no banco via create_booking)
  const pricing = useMemo(() => {
    const original = service
      ? asMaintenance
        ? Number(service.maintenance_promotional_price ?? service.maintenance_price) || 0
        : Number(service.promotional_price ?? service.price) || 0
      : 0;
    const couponDiscount = appliedCoupon ? Number(appliedCoupon.discount_amount) || 0 : 0;
    const totalDiscount = Math.min(couponDiscount, original);
    return { original, couponDiscount, totalDiscount, final: Math.max(original - totalDiscount, 0) };
  }, [service, asMaintenance, appliedCoupon]);

  // Trocar de seleção limpa cupom aplicado (regras podem diferir por serviço)
  const choose = (item) => {
    setService(item);
    setAsMaintenance(false);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
    setStep(1);
  };

  // Manutenção do próprio serviço (preço/duração embutidos no registro)
  const chooseMaintenance = (item) => {
    setService(item);
    setAsMaintenance(true);
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
    setStep(1);
  };

  // Trava o scroll do fundo enquanto o modal está aberto
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Horários de funcionamento e folgas
  const loadHours = async () => {
    setHoursError(null);
    const [h, b] = await Promise.all([
      supabase.from('business_hours').select('*'),
      supabase.from('blocked_dates').select('blocked_date, reason').gte('blocked_date', toISO(new Date())),
    ]);
    if (h.error) setHoursError(h.error.message);
    setHours(asArray(h.data));
    setBlocked(asArray(b.data));
    const s = await supabase.from('settings').select('key, value').in('key', ['pix_key', 'pix_holder_name', 'pix_city', 'pix_enabled', 'pix_copia_e_cola', 'pix_qr_url', 'whatsapp_number']);
    if (s.data) setPix(Object.fromEntries(s.data.map((r) => [r.key, r.value])));
  };

  useEffect(() => { loadHours(); }, []);

  // Agenda do dia selecionado (validação de conflito em tempo real)
  useEffect(() => {
    if (!date) return;
    let mounted = true;
    setChecking(true);
    supabase
      .from('appointments')
      .select('appointment_time, status, duration_minutes, service_id, services(duration_minutes)')
      .eq('appointment_date', date)
      .in('status', ['pending', 'confirmed'])
      .then(({ data, error }) => {
        if (!mounted) return;
        setChecking(false);
        if (error) {
          setTakenSlots([]);
          return;
        }
        setTakenSlots(asArray(data));
      })
      .catch(() => {
        if (mounted) {
          setChecking(false);
          setTakenSlots([]);
        }
      });
    return () => { mounted = false; };
  }, [date]);

  const hoursFor = (weekday) => {
    const h = hours.find((x) => x.weekday === weekday);
    if (!h || !h.is_open) return null;
    const periods = [
      h.open_time && h.close_time ? [h.open_time, h.close_time] : null,
      h.open_time_2 && h.close_time_2 ? [h.open_time_2, h.close_time_2] : null,
    ].filter(Boolean);
    return periods.length ? periods : null;
  };

  const slots = useMemo(() => {
    if (!date || !service) return [];
    const d = new Date(`${date}T12:00:00`);
    const periods = hoursFor(d.getDay());
    if (!periods) return [];
    const stepMin = 30;
    const total = selectedDuration;
    const out = [];
    for (const [open, close] of periods) {
      const [oh, om] = open.split(':').map(Number);
      const [ch, cm] = close.split(':').map(Number);
      for (let m = oh * 60 + om; m + total <= ch * 60 + cm; m += stepMin) {
        const hh = String(Math.floor(m / 60)).padStart(2, '0');
        const mm = String(m % 60).padStart(2, '0');
        const label = `${hh}:${mm}`;
        const start = m, end = m + total;
        const conflict = asArray(takenSlots).some((a) => {
          if (!a || typeof a.appointment_time !== 'string' || !a.appointment_time.includes(':')) return false;
          const [ah, am] = a.appointment_time.split(':').map(Number);
          const aStart = (ah || 0) * 60 + (am || 0);
          const aDur = Number(a.duration_minutes) || Number(a.services?.duration_minutes) || 60;
          return start < aStart + aDur && aStart < end;
        });
        out.push({ label, conflict });
      }
    }
    return out;
  }, [date, service, selectedDuration, hours, takenSlots]);

  // Calendário do mês (navegação simples)
  const [cursor, setCursor] = useState(() => new Date());
  const today = toISO(new Date());
  const days = useMemo(() => {
    const y = cursor.getFullYear(), m = cursor.getMonth();
    const first = new Date(y, m, 1);
    const count = new Date(y, m + 1, 0).getDate();
    const cells = Array(first.getDay()).fill(null);
    for (let d = 1; d <= count; d++) cells.push(toISO(new Date(y, m, d)));
    return cells;
  }, [cursor]);

  const blockedMap = useMemo(() => Object.fromEntries(asArray(blocked).map((b) => [b.blocked_date, b.reason])), [blocked]);

  const canContinue = [
    !!service,
    !!date,
    !!time && !checking,
    name.trim().length >= 3 && whatsapp.replace(/\D/g, '').length >= 10,
    !!payment,
    true,
  ][step];

  // Valida o cupom direto no banco (a tabela coupons não é pública)
  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code || !pricing.original) return;
    setCouponChecking(true);
    setCouponMsg(null);
    try {
      const { data, error } = await supabase.rpc('validate_coupon', {
        p_code: code,
        p_base_amount: pricing.original,
        p_client_whatsapp: whatsapp.trim(),
        p_service_id: service?.id ?? null,
        p_category_id: service?.category_id ?? null,
      });
      if (error) throw error;
      if (data?.valid) {
        setAppliedCoupon({ code: data.code, discount_amount: Number(data.discount_amount) || 0 });
        setCouponMsg({ type: 'ok', text: 'Cupom aplicado com sucesso! ✦' });
      } else {
        setAppliedCoupon(null);
        setCouponMsg({ type: 'err', text: data?.error || 'Cupom inválido.' });
      }
    } catch (e) {
      setAppliedCoupon(null);
      setCouponMsg({ type: 'err', text: e.message || 'Não foi possível validar o cupom agora.' });
    } finally {
      setCouponChecking(false);
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput('');
    setCouponMsg(null);
  };

  const pixEnabled = pix.pix_enabled !== 'false';
  const availablePayments = useMemo(
    () => (pixEnabled ? PAYMENTS : PAYMENTS.filter((m) => m.id !== 'pix')),
    [pixEnabled]
  );
  // Prioriza o "PIX Copia e Cola" configurado pelo admin; gera EMV apenas como fallback
  const pixPayload = useMemo(() => {
    if (!pixEnabled) return '';
    const copied = (pix.pix_copia_e_cola || '').trim();
    if (copied.length > 10) return copied;
    if (!pix.pix_key || !pix.pix_holder_name) return '';
    try {
      return buildPixPayload({ key: pix.pix_key, name: pix.pix_holder_name, city: pix.pix_city, amount: pricing.final || undefined, txid: 'MARI-LASH' });
    } catch (e) {
      console.error('Erro ao gerar payload PIX:', e);
      return '';
    }
  }, [pix, pricing.final, pixEnabled]);

  function copyPixCode() {
    if (!pixPayload) return;
    const done = () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    };
    const fallbackCopy = () => {
      try {
        const ta = document.createElement('textarea');
        ta.value = pixPayload;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        done();
      } catch (e) {
        console.error('Falha ao copiar o código PIX:', e);
      }
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(pixPayload).then(done).catch(fallbackCopy);
    } else {
      fallbackCopy();
    }
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      // Toda a validação (serviço, cupom, preços, conflito de horário)
      // acontece no banco, via RPC create_booking — o frontend nunca dita preços.
      const { data, error: err } = await supabase.rpc('create_booking', {
        p_service_id: service?.id ?? null,
        p_appointment_type: service && asMaintenance ? 'maintenance' : 'service',
        p_client_name: name.trim(),
        p_client_whatsapp: whatsapp.trim(),
        p_appointment_date: date,
        p_appointment_time: time,
        p_payment_method: payment || 'pending',
        p_notes: notes.trim() || null,
        p_coupon_code: appliedCoupon ? appliedCoupon.code : null,
      });
      if (err) throw err;
      if (!data?.ok) {
        setSubmitError(data?.error || 'Não foi possível concluir o agendamento.');
        setSubmitting(false);
        return;
      }
      setResult(data);
      const dateLabel = `${WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}, ${fmtBR(date)}`;
      openWhatsApp(buildBookingMessage({
        service: service?.name ? (asMaintenance ? `${service.name} (Manutenção)` : service.name) : '',
        date: dateLabel,
        time,
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        notes: notes.trim(),
        paymentLabel: PAYMENT_LABELS[payment] || 'A combinar',
        amount: data.final_amount,
        couponCode: data.coupon_discount > 0 ? (couponInput.trim().toUpperCase()) : null,
        totalDiscount: data.total_discount > 0 ? data.total_discount : null,
        originalAmount: data.original_amount,
      }), pix.whatsapp_number);
      setDone(true);
    } catch (e) {
      setSubmitError(e.message || 'Não foi possível concluir o agendamento. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setStep(0); setService(null); setAsMaintenance(false); setDate(null); setTime(null);
    setName(''); setWhatsapp(''); setNotes('');
    setCouponInput(''); setAppliedCoupon(null); setCouponMsg(null);
    setPayment(null); setResult(null); setDone(false); setSubmitError(null);
  }

  const selectedLabel = service
    ? `${service.name}${asMaintenance ? ' (Manutenção)' : ''}`
    : '';

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-3 sm:p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Agendar horário"
    >
      <div
        className="glass max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {done ? (
          <div className="py-6 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-plum-400/40 bg-plum-500/10 text-3xl">💜</div>
            <h2 className="mt-5 font-serif text-3xl text-gradient">Agendamento confirmado!</h2>
            <p className="mt-3 text-sm text-plum-200/80">
              Sua solicitação de <strong className="text-plum-200">{selectedLabel}</strong> foi registrada
              {date && <> para <strong className="text-plum-200">{fmtBR(date)} às {time}</strong></>}.
              {pricing.final > 0 && <> Valor final: <strong className="text-plum-200">{brl(pricing.final)}</strong>.</>}
            </p>
            <p className="mt-2 text-xs text-plum-200/60">Uma janela do WhatsApp foi aberta para você enviar a confirmação. Se não abriu, verifique o bloqueador de pop-ups.</p>
            {payment === 'pix' && pricing.final > 0 && (
              <div className="mt-6">
                <p className="rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-center text-xs leading-relaxed text-amber-100">
                  Após realizar o pagamento, envie o comprovante pelo WhatsApp comercial para confirmar seu agendamento.
                </p>
                <button
                  onClick={() => {
                    const dateLabel = date ? `${WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}, ${fmtBR(date)}` : '';
                    openWhatsApp([
                      '💜 *Comprovante de pagamento — PIX*',
                      '',
                      `✨ *Serviço:* ${selectedLabel}`,
                      dateLabel && `📅 *Data:* ${dateLabel}`,
                      time && `⏰ *Horário:* ${time}`,
                      `💰 *Valor:* ${brl(pricing.final)}`,
                      '',
                      `👩 *Nome:* ${name.trim()}`,
                      `📱 *WhatsApp:* ${whatsapp.trim()}`,
                      '',
                      'Segue o comprovante do pagamento em anexo. 💜',
                    ].filter(Boolean).join('\n'), pix.whatsapp_number);
                  }}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-500/15 px-4 py-3 text-xs font-bold uppercase tracking-wide text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor"><path d="M12.04 2a9.9 9.9 0 0 0-8.4 15.2L2 22l4.9-1.6A9.9 9.9 0 1 0 12.04 2Zm5.8 14.1c-.25.7-1.4 1.3-2 1.4-.5.1-1.2.1-1.9-.1a15 15 0 0 1-6.9-5.9c-.5-.9-.8-1.9-.8-2.7 0-.9.4-1.6.9-2 .2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5s.8 1.9.8 2c.1.2.1.4 0 .6l-.4.6c-.2.2-.3.3-.2.6.3.6.8 1.4 1.4 2 .8.8 1.5 1.1 1.8 1.3.3.1.5.1.6-.1l.8-1c.2-.3.4-.2.6-.1l2 .9c.2.1.4.2.4.3 0 .1 0 .5-.3 1.2Z" /></svg>
                  Enviar comprovante no WhatsApp
                </button>
              </div>
            )}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <button onClick={reset} className="btn-lux rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-6 py-3 text-sm font-medium text-white">
                Novo agendamento
              </button>
              <button onClick={onClose} className="rounded-full border border-plum-500/30 px-6 py-3 text-sm text-plum-200 transition hover:bg-plum-800/40">
                Fechar
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h2 className="font-serif text-3xl text-gradient">Agendar horário</h2>
                <p className="mt-1 text-sm text-plum-200/70">
                  {STEPS[step]} · passo {step + 1} de {STEPS.length}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fechar agendamento"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-plum-500/25 text-plum-200 transition hover:border-plum-400/60 hover:bg-plum-800/40"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <Stepper step={step} />

            {error && !loading ? (
              <div className="glass rounded-2xl p-8 text-center">
                <p className="text-sm text-red-200">Não conseguimos carregar os serviços agora.</p>
                <button onClick={() => window.location.reload()} className="mt-4 rounded-full border border-lavender/40 px-6 py-2 text-sm text-lavender transition hover:bg-lavender/10">Tentar novamente</button>
              </div>
            ) : loading ? (
              <div className="flex justify-center py-14"><Spinner /></div>
            ) : (
              <>
                {/* PASSO 0 — Serviço */}
                {step === 0 && (
                  <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                    {serviceList.length === 0 ? (
                      <p className="py-8 text-center text-sm text-plum-200/70">Nenhum serviço disponível no momento. 💜</p>
                    ) : serviceList.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-plum-500/20 bg-plum-900/30 px-4 py-3 transition hover:border-lavender/50 hover:bg-plum-800/40"
                      >
                        <button onClick={() => choose(s)} className="min-w-0 flex-1 text-left">
                          <span className="block text-sm font-medium text-plum-100">{s.name}</span>
                          <span className="block text-xs text-plum-200/60">{s.duration_minutes || 60} min</span>
                        </button>
                        <div className="flex shrink-0 items-center gap-2">
                          {s.maintenance_enabled && s.maintenance_price != null && (
                            <button
                              onClick={() => chooseMaintenance(s)}
                              className="rounded-full border border-lavender/40 px-3 py-1.5 text-[11px] text-lavender transition hover:bg-lavender/10"
                              title={`Manutenção: ${brl(s.maintenance_promotional_price ?? s.maintenance_price)} · ${s.maintenance_duration_minutes || 60} min`}
                            >
                              ↻ Manutenção
                            </button>
                          )}
                          <button onClick={() => choose(s)} className="text-sm text-lavender">{brl(s.promotional_price ?? s.price)}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* PASSO 1 — Data */}
                {step === 1 && (
                  <div>
                    <p className="mb-1 text-sm text-plum-200/80">Escolhido: <strong className="text-lavender">{selectedLabel}</strong></p>
                    <p className="mb-4 text-xs text-plum-200/60">Duração estimada: {selectedDuration} min</p>
                    <div className="mb-3 flex items-center justify-between">
                      <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} aria-label="Mês anterior" className="flex h-9 w-9 items-center justify-center rounded-full border border-plum-500/25 text-plum-200 transition hover:bg-plum-800/40">‹</button>
                      <p className="font-serif text-lg text-plum-100">{MONTHS[cursor.getMonth()]} {cursor.getFullYear()}</p>
                      <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} aria-label="Próximo mês" className="flex h-9 w-9 items-center justify-center rounded-full border border-plum-500/25 text-plum-200 transition hover:bg-plum-800/40">›</button>
                    </div>
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wider text-plum-200/50">
                      {WEEKDAYS.map((d) => <span key={d}>{d.slice(0, 3)}</span>)}
                    </div>
                    <div className="mt-1 grid grid-cols-7 gap-1">
                      {days.map((iso, i) => {
                        if (!iso) return <span key={`e${i}`} />;
                        const disabled = iso < today || !!blockedMap[iso];
                        const open = hoursFor(new Date(`${iso}T12:00:00`).getDay());
                        return (
                          <button
                            key={iso}
                            disabled={disabled || !open}
                            title={blockedMap[iso] || (!open ? 'Fechado' : undefined)}
                            onClick={() => { setDate(iso); setTime(null); setStep(2); }}
                            className={`aspect-square rounded-lg text-sm transition ${
                              date === iso
                                ? 'bg-gradient-to-r from-plum-600 to-lavender text-white'
                                : disabled || !open
                                  ? 'text-plum-200/25'
                                  : 'text-plum-100 hover:bg-plum-800/50'
                            }`}
                          >
                            {Number(iso.slice(-2))}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* PASSO 2 — Horário */}
                {step === 2 && (
                  <div>
                    <p className="mb-4 text-sm text-plum-200/80">
                      <strong className="text-lavender">{selectedLabel}</strong> · {date && fmtBR(date)}
                    </p>
                    {hoursError && (
                      <p className="mb-3 rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">
                        Não conseguimos carregar os horários de funcionamento. Tente novamente mais tarde.
                      </p>
                    )}
                    {checking ? (
                      <div className="flex justify-center py-8"><Spinner /></div>
                    ) : slots.length === 0 ? (
                      <p className="glass rounded-2xl p-6 text-center text-sm text-plum-200/70">Sem horários livres neste dia. Escolha outra data. 💜</p>
                    ) : (
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {slots.map((s) => (
                          <button
                            key={s.label}
                            disabled={s.conflict}
                            onClick={() => { setTime(s.label); setStep(3); }}
                            className={`rounded-xl border px-2 py-2.5 text-sm transition ${
                              s.conflict
                                ? 'cursor-not-allowed border-white/5 text-plum-200/30 line-through'
                                : time === s.label
                                  ? 'border-transparent bg-gradient-to-r from-plum-600 to-lavender text-white'
                                  : 'border-plum-500/25 text-plum-100 hover:border-lavender/50 hover:bg-plum-800/40'
                            }`}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* PASSO 3 — Dados + cupom */}
                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="bk-name" className="mb-1 block text-xs uppercase tracking-wider text-plum-200/70">Nome completo *</label>
                      <input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-plum-500/25 bg-plum-900/40 px-4 py-3 text-sm text-plum-100 outline-none transition focus:border-lavender/60" placeholder="Seu nome" />
                    </div>
                    <div>
                      <label htmlFor="bk-wa" className="mb-1 block text-xs uppercase tracking-wider text-plum-200/70">WhatsApp *</label>
                      <input id="bk-wa" inputMode="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="w-full rounded-xl border border-plum-500/25 bg-plum-900/40 px-4 py-3 text-sm text-plum-100 outline-none transition focus:border-lavender/60" placeholder="(14) 99999-9999" />
                    </div>

                    <div>
                      <label htmlFor="bk-notes" className="mb-1 block text-xs uppercase tracking-wider text-plum-200/70">Observações (opcional)</label>
                      <textarea id="bk-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full resize-none rounded-xl border border-plum-500/25 bg-plum-900/40 px-4 py-3 text-sm text-plum-100 outline-none transition focus:border-lavender/60" placeholder="Alguma preferência ou informação importante?" />
                    </div>

                    {/* Cupom de desconto */}
                    <div className="rounded-2xl border border-plum-500/25 bg-plum-900/30 p-4">
                      <label htmlFor="bk-coupon" className="mb-1 block text-xs uppercase tracking-wider text-plum-200/70">Possui um cupom de desconto?</label>
                      {appliedCoupon ? (
                        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-3 py-2.5">
                          <span className="text-sm text-emerald-200">
                            Cupom <strong className="tracking-wider">{appliedCoupon.code}</strong> aplicado · −{brl(appliedCoupon.discount_amount)}
                          </span>
                          <button onClick={removeCoupon} className="text-xs text-plum-200/70 underline transition hover:text-plum-100">Remover</button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            id="bk-coupon"
                            value={couponInput}
                            onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                            onKeyDown={(e) => e.key === 'Enter' && applyCoupon()}
                            className="min-w-0 flex-1 rounded-xl border border-plum-500/25 bg-plum-900/40 px-3 py-2.5 text-sm uppercase tracking-wider text-plum-100 outline-none transition focus:border-lavender/60"
                            placeholder="Digite seu cupom"
                          />
                          <button
                            onClick={applyCoupon}
                            disabled={couponChecking || !couponInput.trim()}
                            className="shrink-0 rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-white transition hover:brightness-110 disabled:opacity-40"
                          >
                            {couponChecking ? <Spinner /> : 'Aplicar cupom'}
                          </button>
                        </div>
                      )}
                      {couponMsg && (
                        <p className={`mt-2 text-xs ${couponMsg.type === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>{couponMsg.text}</p>
                      )}
                    </div>
                  </div>
                )}

                {/* PASSO 4 — Pagamento */}
                {step === 4 && (
                  <div>
                    <div className="mb-4 rounded-2xl border border-plum-500/25 bg-plum-900/30 p-4 text-sm">
                      <p className="text-plum-200/80">{selectedLabel}{date && ` · ${fmtBR(date)} às ${time}`}</p>
                      {pricing.totalDiscount > 0 && (
                        <p className="mt-1 text-xs text-plum-200/60">
                          {pricing.original > 0 && <span className="line-through">{brl(pricing.original)}</span>}{' '}
                          desconto de −{brl(pricing.totalDiscount)} · <strong className="text-lavender">{brl(pricing.final)}</strong>
                        </p>
                      )}
                      {pricing.totalDiscount === 0 && <p className="mt-1 text-lavender">{brl(pricing.final)}</p>}
                    </div>
                    {payment === 'pix' && pricing.final > 0 && (
                      <div className="mb-4 rounded-2xl border border-lavender/30 bg-lavender/5 p-4">
                        <p className="text-center font-serif text-lg text-lavender-soft">Pagamento via PIX</p>
                        <p className="mt-0.5 text-center text-xs text-plum-200/60">Abra o app do banco e escaneie o QR Code</p>
                        <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start sm:justify-center sm:gap-6">
                          {pix.pix_qr_url ? (
                            <img
                              src={pix.pix_qr_url}
                              alt="QR Code PIX para pagamento"
                              className="h-52 w-52 max-w-full rounded-2xl border border-plum-500/30 bg-white object-contain p-2"
                            />
                          ) : pixPayload ? (
                            <div className="rounded-2xl bg-white p-3">
                              <QRCodeSVG value={pixPayload} size={184} bgColor="#ffffff" fgColor="#1a0b2e" />
                            </div>
                          ) : null}
                          <div className="w-full max-w-xs sm:w-56">
                            {pixPayload ? (
                              <>
                                <p className="mb-1.5 text-xs uppercase tracking-wider text-plum-200/70">PIX Copia e Cola</p>
                                <div className="max-h-24 overflow-y-auto break-all rounded-xl border border-plum-500/25 bg-plum-900/40 p-2.5 font-mono text-[10px] leading-relaxed text-plum-200/80">
                                  {pixPayload}
                                </div>
                                <button
                                  onClick={copyPixCode}
                                  className={`mt-2 w-full rounded-full py-2.5 text-xs font-medium uppercase tracking-wider transition ${
                                    copied
                                      ? 'bg-emerald-500/20 text-emerald-200'
                                      : 'bg-gradient-to-r from-plum-700 to-plum-500 text-white hover:brightness-110'
                                  }`}
                                >
                                  {copied ? '✓ Código copiado!' : 'Copiar PIX'}
                                </button>
                              </>
                            ) : (
                              <p className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">
                                PIX Copia e Cola indisponível — use o QR Code ou combine pelo WhatsApp.
                              </p>
                            )}
                            {pix.pix_key && (
                              <p className="mt-3 break-all text-center text-[11px] text-plum-200/50 sm:text-left">
                                Chave: <strong className="text-plum-200/80">{pix.pix_key}</strong>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                    {payment === 'pix' && pricing.final > 0 && (
                      <div className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 p-4 text-center text-xs leading-relaxed text-amber-100">
                        Após realizar o pagamento, envie o comprovante pelo WhatsApp comercial para confirmar seu agendamento.
                      </div>
                    )}
                    {payment === 'pix' && pricing.final === 0 && (
                      <p className="mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 p-4 text-center text-xs text-emerald-200">Sem valor a pagar — os descontos cobrem o total. 🎉</p>
                    )}
                    {payment === 'pix' && pricing.final > 0 && !pixPayload && !pix.pix_qr_url && (
                      <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs text-amber-200">O PIX ainda não foi configurado. Escolha outra forma de pagamento ou combine diretamente pelo WhatsApp.</p>
                    )}
                    <div className="space-y-2">
                      {availablePayments.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setPayment(m.id)}
                          className={`flex w-full items-center gap-4 rounded-2xl border px-4 py-3.5 text-left transition ${
                            payment === m.id ? 'border-lavender/70 bg-lavender/10' : 'border-plum-500/25 bg-plum-900/30 hover:border-lavender/40'
                          }`}
                        >
                          <span className="text-lavender">{m.icon}</span>
                          <span>
                            <span className="block text-sm font-medium text-plum-100">{m.label}</span>
                            <span className="block text-xs text-plum-200/60">{m.desc}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* PASSO 5 — Resumo e confirmação */}
                {step === 5 && (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-plum-500/25 bg-plum-900/30 p-4 text-sm">
                      <p className="text-plum-200/80">
                        Serviço: <strong className="text-plum-100">{selectedLabel}</strong>
                      </p>
                      {date && <p className="mt-1 text-plum-200/80">📅 {WEEKDAYS[new Date(`${date}T12:00:00`).getDay()]}, {fmtBR(date)} às {time}</p>}
                      <p className="mt-1 text-plum-200/80">👩 {name.trim()} · 📱 {whatsapp.trim()}</p>
                      <p className="mt-1 text-plum-200/80">💳 {PAYMENT_LABELS[payment] || 'A combinar'}</p>
                      {notes.trim() && <p className="mt-1 text-xs text-plum-200/60">📝 {notes.trim()}</p>}
                    </div>

                    {/* Resumo de valores — só mostra linhas de desconto quando existem */}
                    <div className="rounded-2xl border border-plum-500/25 bg-plum-900/30 p-4 text-sm">
                      <div className="flex justify-between text-plum-200/80"><span>Serviço</span><span>{brl(pricing.original)}</span></div>
                      {pricing.couponDiscount > 0 && (
                        <div className="flex justify-between text-emerald-300"><span>Cupom {appliedCoupon?.code}</span><span>−{brl(pricing.couponDiscount)}</span></div>
                      )}
                      {pricing.totalDiscount > 0 && (
                        <div className="mt-1 flex justify-between border-t border-plum-500/20 pt-1 text-emerald-300"><span>Desconto total</span><span>−{brl(pricing.totalDiscount)}</span></div>
                      )}
                      <div className="mt-2 flex justify-between border-t border-plum-500/20 pt-2 text-base font-medium text-plum-100"><span>Valor final</span><span className="text-lavender">{brl(pricing.final)}</span></div>
                    </div>

                    {submitError && (
                      <p className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-200">{submitError}</p>
                    )}
                    <p className="text-center text-xs text-plum-200/50">
                      Ao confirmar, abriremos o WhatsApp com o resumo do seu agendamento.
                    </p>
                  </div>
                )}

                {/* Navegação entre passos */}
                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    onClick={() => setStep((s) => Math.max(s - 1, 0))}
                    disabled={step === 0 || submitting}
                    className="rounded-full border border-plum-500/30 px-5 py-2.5 text-sm text-plum-200 transition hover:bg-plum-800/40 disabled:opacity-30"
                  >
                    Voltar
                  </button>
                  {step < 5 ? (
                    <button
                      onClick={() => setStep((s) => s + 1)}
                      disabled={!canContinue}
                      className="btn-lux rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110 disabled:opacity-40"
                    >
                      {step === 4 ? 'Revisar resumo' : 'Continuar'}
                    </button>
                  ) : (
                    <button
                      onClick={submit}
                      disabled={submitting}
                      className="btn-lux rounded-full bg-gradient-to-r from-plum-700 to-plum-500 px-8 py-3 text-sm font-medium text-white shadow-lg shadow-plum-600/30 transition hover:brightness-110 disabled:opacity-40"
                    >
                      {submitting ? 'Confirmando…' : 'Confirmar agendamento ✦'}
                    </button>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// O modal é exportado já envolvido: qualquer falha interna vira mensagem amigável
export { BookingErrorBoundary };
