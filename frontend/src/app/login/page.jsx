'use client'

import { useState, useEffect, Suspense } from 'react'
import { z } from 'zod'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Eye, EyeOff, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { setUser, setToken } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [justRegistered, setJustRegistered] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (searchParams.get('registered')) setJustRegistered(true)
  }, [searchParams])

  const onSubmit = async (e) => {
    e.preventDefault()
    setServerError('')

    const result = schema.safeParse({ email, password })
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors
      setFieldErrors({
        email: errs.email?.[0],
        password: errs.password?.[0],
      })
      return
    }

    setFieldErrors({})
    setSubmitting(true)

    try {
      const res = await api.post('/auth/login', { email, password })
      const { token, user } = res.data
      const role = user.role.toLowerCase()
      setToken(token)
      setUser({ id: user.id, email: user.email, name: user.name, role, hostel: user.hostel ?? undefined })
      const dest = { user: '/stores', store_owner: '/dashboard', admin: '/admin' }[role] ?? '/'
      router.push(dest)
    } catch (err) {
      const status = err.response?.status
      const msg = err.response?.data?.message || ''

      if (status === 401 || msg.toLowerCase().includes('invalid credentials')) {
        setServerError('Incorrect email or password. Please try again.')
      } else if (status === 403 || msg.toLowerCase().includes('blocked')) {
        setServerError('Your account has been blocked. Please contact support.')
      } else if (status === 429) {
        setServerError('Too many login attempts. Please wait a moment and try again.')
      } else if (!navigator.onLine) {
        setServerError('No internet connection. Please check your network and try again.')
      } else {
        setServerError('Something went wrong. Please try again.')
      }
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="text-gray-500 mt-1 text-sm">Sign in to your Munchies account</p>
        </div>

        {justRegistered && (
          <div className="mb-6 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
            <CheckCircle className="w-4 h-4 shrink-0" />
            Account created! Sign in below.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  fieldErrors.email
                    ? 'border-red-400 focus:ring-red-300 bg-red-50'
                    : 'border-gray-300 focus:ring-orange-400'
                }`}
              />
              {fieldErrors.email && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-red-400 pointer-events-none" />
              )}
            </div>
            {fieldErrors.email && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                className={`w-full px-3 py-2 pr-10 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-colors ${
                  fieldErrors.password
                    ? 'border-red-400 focus:ring-red-300 bg-red-50'
                    : 'border-gray-300 focus:ring-orange-400'
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {fieldErrors.password && (
              <p className="mt-1.5 text-xs text-red-500">{fieldErrors.password}</p>
            )}
          </div>

          {/* Server error */}
          {serverError && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="flex-1">{serverError}</span>
              <button
                type="button"
                onClick={() => setServerError('')}
                className="text-red-400 hover:text-red-600 transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-orange-500 hover:text-orange-600 font-medium">
            Create one
          </Link>
        </p>
      </div>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
