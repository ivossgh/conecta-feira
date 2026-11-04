import { createClient } from '@supabase/supabase-js';

// Essas variáveis vêm do arquivo .env.local que vamos criar a seguir
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Cria a conexão com o banco
export const supabase = createClient(supabaseUrl, supabaseKey);