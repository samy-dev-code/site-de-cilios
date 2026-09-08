import { useState } from 'react';
import { useSettings, whatsappLink } from '../hooks/useSettings';
import { WhatsAppIcon } from './icons';

const DEFAULT_MESSAGE = 'Olá! Gostaria de saber mais sobre os serviços e agendamentos.';

/**
 * Botão flutuante de WhatsApp (canto inferior direito).
 * Em telas pequenas fica mais discreto (menor e mais perto da borda) e
 * usa z-index abaixo do modal de agendamento (que usa z-50+).
 */
export default function WhatsAppFloat() {
  const { settings } = useSettings();
  const [showTip, setShowTip] = useState(false);
  const url = whatsappLink(settings.whatsapp_number, DEFAULT_MESSAGE);

  return (
    <div className="fixed bottom-4 right-4 z-40 sm:bottom-6 sm:right-6">
      {/* Tooltip — apenas desktop */}
      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-full right-0 mb-2 hidden whitespace-nowrap rounded-xl border border-plum-500/25 bg-[#140a24]/95 px-3.5 py-2 text-xs text-plum-100 shadow-xl shadow-black/40 transition-opacity duration-200 sm:block ${
          showTip ? 'opacity-100' : 'opacity-0'
        }`}
      >
        Fale conosco pelo WhatsApp
      </div>

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com a empresa pelo WhatsApp"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onFocus={() => setShowTip(true)}
        onBlur={() => setShowTip(false)}
        className="group flex h-[3.25rem] w-[3.25rem] items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-600/40 ring-1 ring-white/20 transition-transform duration-200 hover:scale-105 focus-visible:scale-105 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-95 sm:h-14 sm:w-14"
      >
        <WhatsAppIcon className="h-6 w-6 text-white sm:h-7 sm:w-7" />
      </a>
    </div>
  );
}
