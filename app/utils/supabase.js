import { createClient } from '@supabase/supabase-js'

export function useSupabase() {

  const config = useRuntimeConfig()

  const supabaseUrl =
    config.public.supabaseUrl ||
    config.supabaseUrl

  const supabaseKey =
    config.public.supabaseKey ||
    config.supabaseKey

  if (!supabaseUrl) {
    throw new Error(
      'Falta supabaseUrl en runtimeConfig'
    )
  }

  if (!supabaseKey) {
    throw new Error(
      'Falta supabaseKey en runtimeConfig'
    )
  }

  return createClient(
    supabaseUrl,
    supabaseKey
  )
}