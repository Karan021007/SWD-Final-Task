'use client'

import { useState, useEffect } from 'react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'

export default function SettingsPage() {
  const { user } = useRequireAuth('store_owner')
  const { store, loading, setStore } = useMyStore()
  const [form, setForm] = useState({ name: '', description: '', hostel: '', roomNumber: '', isActive: true })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const isNew = !store && !loading

  useEffect(() => {
    if (store) setForm({ name: store.name, description: store.description ?? '', hostel: store.hostel, roomNumber: store.roomNumber, isActive: store.isActive })
  }, [store])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    try {
      if (isNew) {
        const res = await api.post('/stores', form)
        setStore(res.data.store)
      } else {
        const res = await api.put(`/stores/${store.id}`, form)
        setStore(res.data.store)
      }
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">{isNew ? 'Create Your Store' : 'Store Settings'}</h1>

        {loading ? (
          <div className="space-y-4">{[1,2,3,4].map(i => <div key={i} className="h-12 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store name *</label>
              <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="My Snack Store" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" rows={3} placeholder="What do you sell?" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hostel *</label>
                <input required value={form.hostel} onChange={e => setForm(f => ({...f, hostel: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="Nilgiri" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room number *</label>
                <input required value={form.roomNumber} onChange={e => setForm(f => ({...f, roomNumber: e.target.value}))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" placeholder="101" />
              </div>
            </div>
            {store && (
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-sm font-medium text-gray-700">Store active</p>
                  <p className="text-xs text-gray-400">Customers can see and order from your store</p>
                </div>
                <button type="button" onClick={() => setForm(f => ({...f, isActive: !f.isActive}))}
                  className={`w-11 h-6 rounded-full transition-colors ${form.isActive ? 'bg-green-400' : 'bg-gray-200'}`}>
                  <span className={`block w-5 h-5 bg-white rounded-full shadow transition-transform mx-auto ${form.isActive ? 'translate-x-2.5' : '-translate-x-2.5'}`} />
                </button>
              </div>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
            {success && <p className="text-sm text-green-600">✓ {isNew ? 'Store created!' : 'Changes saved.'}</p>}
            <button type="submit" disabled={saving}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2.5 rounded-lg text-sm transition-colors">
              {saving ? 'Saving...' : isNew ? 'Create Store' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
