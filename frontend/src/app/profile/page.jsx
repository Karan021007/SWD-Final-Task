'use client'

import { useState, useEffect } from 'react'
import { Bell, Megaphone, Store, Check } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

const categories = [
  {
    key: 'bookingNotifications',
    icon: Bell,
    label: 'Booking notifications',
    description: 'Order received, confirmed, ready for pickup, and cancellation updates',
  },
  {
    key: 'promotionalAlerts',
    icon: Megaphone,
    label: 'Promotional campaign alerts',
    description: 'New sale campaigns and coupon codes from stores you follow',
  },
  {
    key: 'newStoreNotifications',
    icon: Store,
    label: 'New store notifications',
    description: 'Get notified when a new store opens on campus',
  },
]

export default function ProfilePage() {
  const { user } = useRequireAuth()
  const [prefs, setPrefs] = useState({
    bookingNotifications: true,
    promotionalAlerts: true,
    newStoreNotifications: true,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/users/email-preferences')
      .then(res => setPrefs(res.data.preferences))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const toggle = (key) => {
    setPrefs(p => ({ ...p, [key]: !p[key] }))
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    setError('')
    setSaved(false)
    try {
      await api.put('/users/email-preferences', prefs)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Profile</h1>
          <p className="text-sm text-gray-500 mt-1">{user.email}</p>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Email preferences</h2>
            <p className="text-sm text-gray-500 mt-0.5">Choose which emails you'd like to receive</p>
          </div>

          {loading ? (
            <div className="p-6 space-y-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-start justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="h-4 bg-gray-100 rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
                  </div>
                  <div className="w-11 h-6 bg-gray-100 rounded-full animate-pulse shrink-0" />
                </div>
              ))}
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {categories.map(({ key, icon: Icon, label, description }) => (
                <div key={key} className="flex items-start justify-between gap-4 px-6 py-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Icon className="w-4 h-4 text-orange-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{description}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(key)}
                    className={`w-11 h-6 rounded-full transition-colors shrink-0 mt-1 relative ${prefs[key] ? 'bg-orange-500' : 'bg-gray-200'}`}
                  >
                    <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform absolute top-1 ${prefs[key] ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <div>
              {saved && (
                <span className="flex items-center gap-1.5 text-sm text-green-600">
                  <Check className="w-4 h-4" /> Preferences saved
                </span>
              )}
              {error && <p className="text-sm text-red-500">{error}</p>}
            </div>
            <button
              onClick={handleSave}
              disabled={saving || loading}
              className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium px-5 py-2 rounded-lg text-sm transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
