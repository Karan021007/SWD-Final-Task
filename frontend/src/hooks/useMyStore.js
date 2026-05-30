'use client'

import { useState, useEffect } from 'react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

export function useMyStore() {
  const { user } = useAuthStore()
  const [store, setStore] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user || user.role !== 'store_owner') return
    api.get('/stores/owner/my-store')
      .then(res => setStore(res.data.store))
      .catch(err => setError(err.response?.data?.message || 'Failed to load store'))
      .finally(() => setLoading(false))
  }, [user])

  return { store, loading, error, setStore }
}
