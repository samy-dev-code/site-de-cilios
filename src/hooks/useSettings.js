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
 * Cache compartilhado em nível de módulo: vários componentes na mesma página
 * disparam UMA única consulta ao Supabase (evita requests duplicados).
 * Nunca quebra: se o Supabase falhar, usa os valores de fallback.
 */
let cachedSettings = null;
let pendingPromise = null;
const subscribers = new Set();

function fetchSettings() {
  if (cachedSettings) {
    return Promise.resolve(cachedSettings);
  }
  if (!pendingPromise) {
    pendingPromise = supabase
      .from('settings')
      .select('key, value')
      .then(({ data, error }) => {
        pendingPromise = null;
        if (error || !data) return cachedSettings ?? FALLBACKS;
        const map = { ...FALLBACKS };
        for (const row of data) {
          if (row?.key && typeof row.value === 'string' && row.value.trim() !== '') {
            map[row.key] = row.value.trim();
          }
        }
        cachedSettings = map;
        subscribers.forEach((fn) => fn(map));
        return map;
      })
      .catch(() => {
        pendingPromise = null;
        return FALLBACKS;
      });
  }
  return pendingPromise;
}

export function useSettings() {
  const [settings, setSettings] = useState(cachedSettings ?? FALLBACKS);

  useEffect(() => {
    let alive = true;
    const fn = (map) => { if (alive) setSettings(map); };
    subscribers.add(fn);
    fetchSettings().then((map) => {
      if (alive) setSettings(map);
      subscribers.delete(fn);
    });
    return () => {
      alive = false;
      subscribers.delete(fn);
    };
  }, []);

  return { settings, loading: settings === FALLBACKS };
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
