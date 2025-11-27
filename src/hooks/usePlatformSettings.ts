import { useCallback, useEffect, useMemo, useState } from 'react'
import type { PlatformSettings } from '@/services/platformSettings'
import {
  fetchPlatformSettings,
  getDefaultPlatformSettings,
  updatePlatformSettings,
} from '@/services/platformSettings'
import { useAuth } from '@/contexts/AuthContext'

interface UsePlatformSettingsResult {
  settings: PlatformSettings
  isLoading: boolean
  error: Error | null
  refresh: () => Promise<void>
  save: (settings: PlatformSettings) => Promise<void>
  isSaving: boolean
}

export function usePlatformSettings(): UsePlatformSettingsResult {
  const { user } = useAuth()
  const [settings, setSettings] = useState<PlatformSettings>(getDefaultPlatformSettings())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSaving, setIsSaving] = useState<boolean>(false)
  const [error, setError] = useState<Error | null>(null)

  const loadSettings = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchPlatformSettings()
      setSettings(data)
    } catch (err) {
      console.error('Error loading platform settings:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    loadSettings()
  }, [loadSettings])

  const save = useCallback(
    async (next: PlatformSettings) => {
      if (!user) {
        throw new Error('Debes iniciar sesión para actualizar la configuración')
      }

      try {
        setIsSaving(true)
        setError(null)
        await updatePlatformSettings(
          {
            client_surcharge_percent: next.client_surcharge_percent,
            platform_fee_percent: next.platform_fee_percent,
            currency: next.currency,
          },
          user.id
        )
        await loadSettings()
      } catch (err) {
        console.error('Error saving platform settings:', err)
        setError(err as Error)
        throw err
      } finally {
        setIsSaving(false)
      }
    },
    [user, loadSettings]
  )

  return useMemo(
    () => ({ settings, isLoading, error, refresh: loadSettings, save, isSaving }),
    [settings, isLoading, error, loadSettings, save, isSaving]
  )
}
