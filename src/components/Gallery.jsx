import { useEffect, useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import BeforeAfterCarousel from './BeforeAfterCarousel';

const FALLBACK = [
  { id: 'f1', label: 'Volume Russo', hint: 'Resultado natural', before_url: '', after_url: '/galeria/cliente-1.jpeg', service_name: 'Volume Russo', category: '' },
  { id: 'f2', label: 'Fio a Fio', hint: 'Olhar marcado', before_url: '', after_url: '/galeria/cliente-2.jpeg', service_name: 'Fio a Fio', category: '' },
  { id: 'f3', label: 'Mega Volume', hint: 'Impacto total', before_url: '', after_url: '/galeria/cliente-3.jpeg', service_name: 'Mega Volume', category: '' },
  { id: 'f4', label: 'Brasileiro', hint: 'Elegância diária', before_url: '', after_url: '/galeria/cliente-4.jpeg', service_name: 'Brasileiro', category: '' },
];

/* Portfólio "Antes & Depois": carrossel automático dos trabalhos realizados */
export default function Gallery() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data, error } = await supabase
        .from('gallery_items')
        .select('id, label, hint, before_url, after_url, service_name, category')
        .eq('active', true)
        .order('position');
      if (mounted && !error && data) {
        // Itens sem foto "antes" usam a própria foto "depois" no lugar
        const slides = data.map((r) => ({ ...r, before_url: r.before_url || r.after_url }));
        setItems(slides.length > 0 ? slides : FALLBACK);
      }
    })();
    return () => { mounted = false; };
  }, []);

  if (items.length === 0) {
    return (
      <div className="glass rounded-2xl p-8 text-center">
        <span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-plum-500/30 border-t-plum-400" />
      </div>
    );
  }

  return <BeforeAfterCarousel items={items} />;
}
