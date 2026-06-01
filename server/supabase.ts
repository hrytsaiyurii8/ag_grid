import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import 'dotenv/config'

let client: SupabaseClient | null = null

function assertServiceRoleKey(key: string): void {
  try {
    const parts = key.split('.')
    if (parts.length < 2) return
    const payload = JSON.parse(atob(parts[1]!)) as { role?: string }
    if (payload.role === 'anon') {
      throw new Error(
        'SUPABASE_SERVICE_ROLE_KEY looks like the anon key. Use the service_role secret from Supabase Dashboard → Project Settings → API.',
      )
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('anon key')) throw e
    // non-JWT key format — ignore
  }
}

export function getSupabase(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!url || !key) {
      throw new Error(
        'Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Copy .env.example to .env and fill in your Supabase project credentials.',
      )
    }

    assertServiceRoleKey(key)

    client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return client
}

export async function checkSupabaseConnection(): Promise<{
  ok: boolean
  error?: string
}> {
  try {
    const supabase = getSupabase()
    const { error } = await supabase.from('datasets').select('id').limit(1)

    if (!error) return { ok: true }

    const msg = error.message ?? 'Unknown error'
    if (error.code === 'PGRST205' || msg.includes('Could not find the table')) {
      return {
        ok: false,
        error:
          'Supabase tables missing. Run supabase/migrations/001_grid_tables.sql in the Supabase SQL editor, then npm run seed.',
      }
    }

    return { ok: false, error: msg }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Connection failed' }
  }
}
