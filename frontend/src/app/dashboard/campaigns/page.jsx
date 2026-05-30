'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Copy, Check, Plus, Trash2, X, AlertTriangle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

const emptyForm = {
  name: '',
  description: '',
  discountType: 'PERCENTAGE',
  discountValue: '',
  minOrderValue: '',
  maxUsageCount: '',
  maxUsagePerUser: '',
  startDate: '',
  endDate: '',
}

export default function CampaignsPage() {
  const { user } = useRequireAuth('store_owner')
  const { store } = useMyStore()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')

  // Delete modal
  const [deleteId, setDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!store) return
    api.get(`/campaigns/store/${store.id}`)
      .then(res => setCampaigns(res.data.campaigns))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [store])

  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
    setCopied(code)
    setTimeout(() => setCopied(null), 2000)
  }

  const openCreate = () => {
    setForm(emptyForm)
    setCreateError('')
    setShowCreate(true)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    setCreating(true)
    setCreateError('')
    try {
      const res = await api.post('/campaigns', {
        name: form.name,
        description: form.description || undefined,
        discountType: form.discountType,
        discountValue: parseFloat(form.discountValue),
        minOrderValue: form.minOrderValue ? parseFloat(form.minOrderValue) : undefined,
        maxUsageCount: form.maxUsageCount ? parseInt(form.maxUsageCount) : undefined,
        maxUsagePerUser: form.maxUsagePerUser ? parseInt(form.maxUsagePerUser) : undefined,
        startDate: new Date(form.startDate + 'T00:00:00').toISOString(),
        endDate: new Date(form.endDate + 'T23:59:59').toISOString(),
      })
      setCampaigns(prev => [res.data.campaign, ...prev])
      setShowCreate(false)
    } catch (err) {
      setCreateError(err.response?.data?.message || 'Failed to create campaign')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/campaigns/${deleteId}`)
      setCampaigns(prev => prev.filter(c => c.id !== deleteId))
      setDeleteId(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete campaign')
    } finally {
      setDeleting(false)
    }
  }

  const now = new Date()

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Campaigns</h1>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 text-sm bg-orange-500 hover:bg-orange-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Campaign
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2].map(i => <div key={i} className="h-32 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Megaphone className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="mb-4">No campaigns yet.</p>
            <button onClick={openCreate} className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
              Create your first campaign →
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {campaigns.map(c => {
              const active = c.isActive && new Date(c.startDate) <= now && new Date(c.endDate) >= now
              return (
                <div key={c.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{c.name}</p>
                      {c.description && <p className="text-sm text-gray-500 mt-0.5">{c.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {active ? 'Active' : 'Inactive'}
                      </span>
                      <button
                        onClick={() => setDeleteId(c.id)}
                        className="text-gray-300 hover:text-red-500 transition-colors"
                        title="Delete campaign"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Coupon code */}
                  <div className="flex items-center gap-3 mb-4">
                    <code className="bg-orange-50 text-orange-700 text-sm font-mono px-3 py-1.5 rounded-lg border border-orange-100 tracking-wider">
                      {c.couponCode}
                    </code>
                    <button onClick={() => copyCode(c.couponCode)} className="text-gray-400 hover:text-gray-600 transition-colors" title="Copy code">
                      {copied === c.couponCode ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-500">
                    <div>
                      <span className="font-medium text-gray-700">Discount</span><br />
                      {c.discountType === 'PERCENTAGE' ? `${c.discountValue}%` : formatCurrency(c.discountValue)} off
                    </div>
                    {c.minOrderValue && (
                      <div><span className="font-medium text-gray-700">Min. order</span><br />{formatCurrency(c.minOrderValue)}</div>
                    )}
                    <div>
                      <span className="font-medium text-gray-700">Used</span><br />
                      {c.usageCount}{c.maxUsageCount ? ` / ${c.maxUsageCount}` : ''} times
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Ends</span><br />
                      {new Date(c.endDate).toLocaleDateString('en-IN')}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">New Campaign</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Campaign name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Summer Sale"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Tell customers about this offer"
                  rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none" />
              </div>

              {/* Discount type + value */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Discount *</label>
                <div className="flex gap-2">
                  <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm">
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, discountType: 'PERCENTAGE' }))}
                      className={`px-3 py-2 font-medium transition-colors ${form.discountType === 'PERCENTAGE' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      %
                    </button>
                    <button type="button"
                      onClick={() => setForm(f => ({ ...f, discountType: 'FLAT' }))}
                      className={`px-3 py-2 font-medium transition-colors ${form.discountType === 'FLAT' ? 'bg-orange-500 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                      ₹
                    </button>
                  </div>
                  <input required type="number" min="0" step="any"
                    value={form.discountValue} onChange={e => setForm(f => ({ ...f, discountValue: e.target.value }))}
                    placeholder={form.discountType === 'PERCENTAGE' ? '10' : '50'}
                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. order value</label>
                  <input type="number" min="0" step="any"
                    value={form.minOrderValue} onChange={e => setForm(f => ({ ...f, minOrderValue: e.target.value }))}
                    placeholder="Optional"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max total uses</label>
                  <input type="number" min="1" step="1"
                    value={form.maxUsageCount} onChange={e => setForm(f => ({ ...f, maxUsageCount: e.target.value }))}
                    placeholder="Unlimited"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max uses per customer</label>
                <input type="number" min="1" step="1"
                  value={form.maxUsagePerUser} onChange={e => setForm(f => ({ ...f, maxUsagePerUser: e.target.value }))}
                  placeholder="Unlimited"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
                  <input required type="date"
                    value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date *</label>
                  <input required type="date"
                    value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
                </div>
              </div>

              <p className="text-xs text-gray-400">A unique coupon code will be generated automatically.</p>

              {createError && <p className="text-sm text-red-500">{createError}</p>}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowCreate(false)}
                  className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={creating}
                  className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                  {creating ? 'Creating…' : 'Create Campaign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Delete campaign?</h2>
                <p className="text-sm text-gray-500">This cannot be undone.</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 rounded-lg text-sm transition-colors">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
