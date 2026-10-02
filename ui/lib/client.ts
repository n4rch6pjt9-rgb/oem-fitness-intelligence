import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  if(!import.meta.env.VITE_SUPABASE_URL||!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY)throw new Error('Configuração pública Supabase incompleta.');
  return createBrowserClient(
    import.meta.env.VITE_SUPABASE_URL!,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY!
  )
}
