// Cliente Supabase do projeto — gerado pelo StormAI ao vincular o banco.
// A chave abaixo é a publishable/anon: pública por design (RLS protege os dados).
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ngqpusiswttonmmqjizq.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_05OxuecZ3WGiDJ6bB_oAEA_Ad65wm7U';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
