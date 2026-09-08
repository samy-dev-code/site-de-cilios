import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

export const asArray = (value) => (Array.isArray(value) ? value : []);

const FALLBACKS = {
  business_name: 'Mari Lash Designer',
  whatsapp_number: '5514998792169',
  instagram: '',
  address: '',
};

/**
 * Carrega as configurações do estúdio (tabela `settings`) — fonte de verdade do painel /admin.
 * Nunca quebra: se o Supabase falhar, usa os valores de fallback.
 */
export function useSettings() {
  const [settings, setSettings] = useState(FALLBACKS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from('settings')
      .select('key, value')
      .then(({ data, error }) => {
        if (!alive) return;
        if (!error && data) {
          const map = { ...FALLBACKS };
          for (const row of data) {
            if (row?.key && typeof row.value === 'string' && row.value.trim() !== '') {
              map[row.key] = row.value.trim();
            }
          }
          setSettings(map);
        }
        setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return { settings, loading };
}

/** Instagram da empresa como URL absoluta (aceita @user, user ou URL completa). */
export function instagramUrl(handle) {
  const raw = (handle ?? '').trim();
  if (!raw) return null;
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://instagram.com/${raw.replace(/^@/, '')}`;
}

/** Número de WhatsApp já no formato internacional (só dígitos). */
export function whatsappNumber(number) {
  const digits = (number ?? '').replace(/\D/g, '');
  return digits || '5514998792169';
}

export function whatsappLink(number, message) {
  return `https://wa.me/${whatsappNumber(number)}?text=${encodeURIComponent(message)}`;
}

/** Horários de funcionamento (tabela `business_hours`) para exibição no rodapé. */
export function useBusinessHours() {
  const [hours, setHours] = useState([]);
  useEffect(() => {
    let alive = true;
    supabase
      .from('business_hours')
      .select('weekday, is_open, open_time, close_time')
      .order('weekday')
      .then(({ data, error }) => {
        if (!alive) return;
        setHours(error ? [] : asArray(data));
      });
    return () => {
      alive = false;
    };
  }, []);
  return hours;
}
