'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

const roleDashboard = {
  user: '/stores',
  store_owner: '/dashboard',
  admin: '/admin',
}

export function useRequireAuth(requiredRole) {
  const { user, token } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (!token || !user) {
      router.push('/')
      return
    }
    if (requiredRole && user.role !== requiredRole) {
      router.push(roleDashboard[user.role])
    }
  }, [token, user, router, requiredRole])

  return { user, token }
}
