import { Link } from 'react-router-dom';
import { useSettings, instagramUrl, whatsappLink, useBusinessHours, asArray } from '../hooks/useSettings';
import { InstagramIcon, WhatsAppIcon, PixIcon, CashIcon, CardIcon, ClockIcon } from './icons';

const WEEKDAYS = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Formas de pagamento realmente aceitas (fluxo de agendamento: PIX, dinheiro e cartão)
const PAYMENTS = [
  { label: 'PIX', Icon: PixIcon },
  { label: 'Dinheiro', Icon: CashIcon },
  { label: 'Cartão de débito', Icon: CardIcon },
  { label: 'Cartão de crédito', Icon: CardIcon },
];

function formatTime(t) {
  return typeof t === 'string' ? t.slice(0, 5) : '';
}

function HoursList() {
  const hours = useBusinessHours();
  const list = asArray(hours);
  if (list.length === 0) {
    return <li className="text-sm text-plum-300/50">Consulte os horários disponíveis no agendamento.</li>;
  }
  return (
    <ul className="space-y-1.5">
      {list.map((h) => (
        <li key={h.weekday} className="flex items-center gap-2 text-sm text-plum-200/70">
          <ClockIcon className="h-3.5 w-3.5 shrink-0 text-lavender/60" />
          <span className="w-20 shrink-0 text-plum-100/90">{WEEKDAYS[h.weekday] ?? ''}</span>
          <span className={h.is_open ? 'text-plum-200/80' : 'text-plum-300/40'}>
            {h.is_open ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}` : 'Fechado'}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default function SiteFooter() {
  const { settings } = useSettings();
  const igUrl = instagramUrl(settings.instagram);
  const waUrl = whatsappLink(settings.whatsapp_number, 'Olá! Gostaria de saber mais sobre os serviços e agendamentos.');
  const businessName = settings.business_name || 'Mari Lash Designer';

  return (
    <footer className="relative mt-10 border-t border-plum-500/15 bg-gradient-to-b from-[#0b0614] via-[#120a22] to-[#07030d]">
      <div aria-hidden className="divider-fade absolute inset-x-0 top-0" />
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Sobre */}
          <div>
            <h3 className="font-serif text-lg text-gradient">Sobre</h3>
            <p className="mt-3 text-sm leading-relaxed text-plum-200/60">
              {businessName} — extensão de cílios e design de sobrancelhas com técnica refinada e atendimento exclusivo.
            </p>
            <nav className="mt-4 flex flex-col gap-2 text-sm" aria-label="Links do site">
              <a href="/#servicos" className="text-plum-200/70 transition hover:text-lavender">Serviços</a>
              <a href="/#galeria" className="text-plum-200/70 transition hover:text-lavender">Galeria</a>
              <a href="/#depoimentos" className="text-plum-200/70 transition hover:text-lavender">Depoimentos</a>
              <Link to="/" className="text-plum-200/70 transition hover:text-lavender">Agendamento</Link>
            </nav>
          </div>

          {/* Atendimento */}
          <div>
            <h3 className="font-serif text-lg text-gradient">Atendimento</h3>
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Falar com a empresa pelo WhatsApp"
              className="mt-3 inline-flex items-center gap-2 rounded-full border border-plum-500/25 bg-plum-900/30 px-4 py-2 text-sm text-plum-100 transition hover:border-lavender/60 hover:bg-plum-800/40"
            >
              <WhatsAppIcon className="h-4 w-4 text-emerald-300" />
              WhatsApp
            </a>
            <div className="mt-5">
              <p className="mb-2 text-xs uppercase tracking-[0.2em] text-lavender/60">Horários</p>
              <HoursList />
            </div>
          </div>

          {/* Redes sociais */}
          <div>
            <h3 className="font-serif text-lg text-gradient">Redes sociais</h3>
            {igUrl ? (
              <a
                href={igUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram da empresa"
                className="mt-3 inline-flex items-center gap-2 rounded-full border border-plum-500/25 bg-plum-900/30 px-4 py-2 text-sm text-plum-100 transition hover:border-lavender/60 hover:bg-plum-800/40"
              >
                <InstagramIcon className="h-4 w-4 text-lavender" />
                @{(settings.instagram || '').replace(/^@/, '') || 'Instagram'}
              </a>
            ) : (
              <p className="mt-3 text-sm text-plum-300/50">Em breve.</p>
            )}
            <div className="mt-6">
              <h3 className="font-serif text-lg text-gradient">Informações</h3>
              <nav className="mt-3 flex flex-col gap-2 text-sm" aria-label="Informações legais">
                <Link to="/termos-de-uso" className="text-plum-200/70 transition hover:text-lavender">Termos de Uso</Link>
                <Link to="/politica-de-privacidade" className="text-plum-200/70 transition hover:text-lavender">Política de Privacidade</Link>
              </nav>
            </div>
          </div>

          {/* Formas de pagamento */}
          <div>
            <h3 className="font-serif text-lg text-gradient">Formas de pagamento</h3>
            <ul className="mt-3 space-y-2">
              {PAYMENTS.map(({ label, Icon }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-plum-200/70">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-plum-500/20 bg-plum-900/40 text-lavender/80">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-plum-300/40">Pagamento combinado na confirmação do agendamento.</p>
          </div>
        </div>

        {/* Linha final */}
        <div className="mt-12 flex flex-col items-center gap-3 border-t border-plum-500/10 pt-6 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-xs text-plum-300/50">
            © {new Date().getFullYear()} {businessName} · Todos os direitos reservados
          </p>
          <p className="text-[11px] text-plum-300/40">
            Desenvolvido por{' '}
            <a
              href="https://instagram.com/s.kakimori"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram de Samy Dev"
              className="font-medium text-lavender/70 underline-offset-4 transition hover:text-lavender hover:underline"
            >
              Samy Dev
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
