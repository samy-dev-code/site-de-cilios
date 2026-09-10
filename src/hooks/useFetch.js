import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

/** Hook genérico de busca com estados de loading/erro. */
export function useFetch(table, { columns = '*', filters = [], order = null, limit = null } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        let query = supabase.from(table).select(columns);
        filters.forEach(([col, op, val]) => (query = query.filter(col, op, val)));
        if (order) {
          query = query.order(order.col, { ascending: order.asc ?? true });
          // Garante ordenação estável ao paginar
          query = query.order('id', { ascending: true });
        }
        // Busca TODAS as páginas (o PostgREST limita a ~1000 linhas por requisição)
        const PAGE = 1000;
        let allRows = [];
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: rows, error: err } = await query.range(from, from + PAGE - 1);
          if (err) throw err;
          allRows = allRows.concat(rows ?? []);
          if (!rows || rows.length < PAGE) break;
          from += PAGE;
        }
        if (mounted) setData(allRows);
      } catch (e) {
        if (mounted) setError(e?.message ?? 'Erro ao carregar dados.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, columns, JSON.stringify(filters), JSON.stringify(order), limit]);

  return { data, loading, error };
}
