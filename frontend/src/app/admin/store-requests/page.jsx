'use client'

import { useState, useEffect } from 'react'
import { Store } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

const statusStyle = {
  pending:  'bg-yellow-100 text-yellow-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
}

export default function StoreRequestsPage() {
  const { user } = useRequireAuth('admin')
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [actioning, setActioning] = useState(null)

  const load = () => {
    const query = filter ? `?status=${filter}` : ''
    api.get(`/admin/store-requests${query}`)
      .then(res => setRequests(res.data.requests))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const handleAction = async (id, action) => {
    setActioning(id)
    try {
      await api.put(`/admin/store-requests/${id}/${action}`)
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally { setActioning(null) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Store Requests</h1>

        <div className="flex gap-2 mb-6">
          {['', 'pending', 'approved', 'rejected'].map(s => (
            <button key={s} onClick={() => { if (s !== filter) { setFilter(s); setLoading(true) } }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors capitalize ${filter === s ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {s || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : requests.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Store className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No {filter || ''} store requests.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map(req => (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{req.storeName}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{req.hostel} · Room {req.roomNumber}</p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full capitalize ${statusStyle[req.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {req.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">{req.user?.name}</span>
                    <span className="text-gray-400"> · {req.user?.email}</span>
                    <p className="text-xs text-gray-400 mt-0.5">{new Date(req.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p>
                  </div>
                  {req.status === 'pending' && (
                    <div className="flex gap-2">
                      <button onClick={() => handleAction(req.id, 'approve')} disabled={actioning === req.id}
                        className="text-sm bg-green-500 hover:bg-green-600 disabled:bg-green-300 text-white px-4 py-1.5 rounded-lg transition-colors">
                        {actioning === req.id ? '...' : 'Approve'}
                      </button>
                      <button onClick={() => handleAction(req.id, 'reject')} disabled={actioning === req.id}
                        className="text-sm border border-red-300 text-red-500 hover:bg-red-50 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors">
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
