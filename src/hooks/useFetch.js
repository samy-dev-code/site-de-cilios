import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';

/** Hook genérico de busca com estados de loading/erro. */
export function useFetch(table, { columns = '*', filters = [], order = null, limit = null } = {}) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        let query = supabase.from(table).select(columns);
        filters.forEach(([col, op, val]) => (query = query.filter(col, op, val)));
        if (order) query = query.order(order.col, { ascending: order.asc ?? true });
        if (limit) query = query.limit(limit);
        const { data: rows, error: err } = await query;
        if (err) throw err;
        if (mounted) setData(rows ?? []);
      } catch (e) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table]);

  return { data, loading, error };
}
