import { supabase } from '@/lib/supabaseClient'
import type { Database } from '@/types/supabase'

export type PlatformSettings = {
  id?: string
  client_surcharge_percent: number
  platform_fee_percent: number
  currency: string
  updated_at?: string
  updated_by?: string | null
}

const DEFAULT_SETTINGS: PlatformSettings = {
  client_surcharge_percent: 0.1,
  platform_fee_percent: 0.2,
  currency: 'CLP',
}

export async function fetchPlatformSettings(): Promise<PlatformSettings> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('Failed to load platform settings:', error)
    return DEFAULT_SETTINGS
  }

  if (!data) {
    return DEFAULT_SETTINGS
  }

  return {
    id: data.id,
    client_surcharge_percent: data.client_surcharge_percent ?? DEFAULT_SETTINGS.client_surcharge_percent,
    platform_fee_percent: data.platform_fee_percent ?? DEFAULT_SETTINGS.platform_fee_percent,
    currency: data.currency ?? DEFAULT_SETTINGS.currency,
    updated_at: data.updated_at,
    updated_by: data.updated_by ?? null,
  }
}

export async function updatePlatformSettings(
  settings: Pick<PlatformSettings, 'client_surcharge_percent' | 'platform_fee_percent' | 'currency'>,
  updatedBy?: string
) {
  const current = await fetchPlatformSettings()
  const payload = {
    client_surcharge_percent: settings.client_surcharge_percent,
    platform_fee_percent: settings.platform_fee_percent,
    currency: settings.currency,
    updated_at: new Date().toISOString(),
    updated_by: updatedBy ?? current.updated_by ?? null,
  }

  const query = current.id
    ? supabase.from('platform_settings').update(payload).eq('id', current.id)
    : supabase.from('platform_settings').insert(payload)

  const { error } = await query.single()

  if (error) {
    console.error('Error updating platform settings:', error)
    throw error
  }
}

export function getDefaultPlatformSettings() {
  return DEFAULT_SETTINGS
}

export type PlatformSettingsRow = Database['public']['Tables']['platform_settings']['Row']
