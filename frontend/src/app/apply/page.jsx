'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Store, CheckCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

export default function ApplyPage() {
  const { user } = useRequireAuth('user')
  const router = useRouter()
  const [form, setForm] = useState({ storeName: '', hostel: '', roomNumber: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user?.hostel) setForm(f => ({ ...f, hostel: user.hostel }))
  }, [user])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true); setError('')
    try {
      await api.post('/users/store-owner-request', form)
      setSubmitted(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to submit request')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Store className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Become a Seller</h1>
            <p className="text-sm text-gray-500">Apply to open your own store on Munchies</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-green-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Request submitted!</h2>
            <p className="text-sm text-gray-500 mb-6">
              An admin will review your application. You'll receive an email once it's approved — then you can log back in and start managing your store.
            </p>
            <button
              onClick={() => router.push('/stores')}
              className="text-sm text-orange-500 hover:underline font-medium"
            >
              ← Back to stores
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <p className="text-sm text-gray-500">
              Fill in your store details below. An admin will review your application and you'll be notified by email.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store name *</label>
              <input
                required
                value={form.storeName}
                onChange={e => setForm(f => ({ ...f, storeName: e.target.value }))}
                placeholder="e.g. Karan's Bites"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostel *</label>
                <input
                  required
                  value={form.hostel}
                  onChange={e => setForm(f => ({ ...f, hostel: e.target.value }))}
                  placeholder="e.g. Nilgiri"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room number *</label>
                <input
                  required
                  value={form.roomNumber}
                  onChange={e => setForm(f => ({ ...f, roomNumber: e.target.value }))}
                  placeholder="e.g. 204"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
