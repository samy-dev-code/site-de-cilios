import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import BeforeAfterCarousel from './BeforeAfterCarousel';

/* Portfólio "Antes & Depois": carrossel automático dos trabalhos realizados.
   Busca apenas itens ativos do Supabase e atualiza em tempo real quando o
   admin cadastra/edita algo no painel. Sem imagens de exemplo hardcoded. */
export default function Gallery() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchItems = async () => {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('id, label, hint, before_url, after_url, service_name, category')
        .eq('active', true)
        .order('position');
      if (mounted && !error && data) {
        // Só itens com pelo menos uma foto; itens sem foto "antes" usam a "depois"
        setItems(
          data
            .filter((r) => r.after_url || r.before_url)
            .map((r) => ({ ...r, before_url: r.before_url || r.after_url }))
        );
      }
      if (mounted) setLoading(false);
    };

    fetchItems();

    // Tempo real: reflete imediatamente o que o admin salvar
    const channel = supabase
      .channel('gallery-items-site')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_items' }, fetchItems)
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  if (loading) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-plum-500/30 border-t-plum-400" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center text-sm text-plum-200/70">
        Em breve, novidades por aqui ✦
      </div>
    );
  }

  return <BeforeAfterCarousel items={items} />;
}
