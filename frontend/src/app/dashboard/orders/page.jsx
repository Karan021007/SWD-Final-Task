'use client'

import { useState, useEffect } from 'react'
import { ClipboardList } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

const statusStyle = {
  PENDING:   'bg-yellow-100 text-yellow-700',
  CONFIRMED: 'bg-blue-100 text-blue-700',
  READY:     'bg-green-100 text-green-700',
  COLLECTED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-100 text-red-600',
  EXPIRED:   'bg-gray-100 text-gray-400',
}

const nextStatus = {
  PENDING: 'CONFIRMED',
  CONFIRMED: 'READY',
  READY: 'COLLECTED',
}

const nextLabel = {
  PENDING: 'Confirm',
  CONFIRMED: 'Mark Ready',
  READY: 'Mark Collected',
}

export default function OrdersPage() {
  const { user } = useRequireAuth('store_owner')
  const { store } = useMyStore()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    if (!store) return
    const query = filter !== 'ALL' ? `?status=${filter}` : ''
    api.get(`/bookings/store/${store.id}${query}`)
      .then(res => setBookings(res.data.bookings))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [store, filter])

  const handleStatusUpdate = async (bookingId, status) => {
    setUpdating(bookingId)
    try {
      await api.put(`/bookings/${bookingId}/status`, { status })
      setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status } : b))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status')
    } finally { setUpdating(null) }
  }

  const handleCancellation = async (bookingId, action) => {
    setUpdating(bookingId)
    try {
      await api.put(`/bookings/${bookingId}/cancel-${action}`)
      setBookings(prev => prev.map(b =>
        b.id === bookingId
          ? {
              ...b,
              status: action === 'approve' ? 'CANCELLED' : b.status,
              cancellationRequest: b.cancellationRequest
                ? { ...b.cancellationRequest, status: action === 'approve' ? 'APPROVED' : 'REJECTED' }
                : b.cancellationRequest,
            }
          : b
      ))
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process cancellation')
    } finally { setUpdating(null) }
  }

  if (!user) return null

  const filters = ['ALL', 'PENDING', 'CONFIRMED', 'READY', 'COLLECTED', 'CANCELLED']

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {filters.map(f => (
            <button key={f} onClick={() => { if (f !== filter) { setFilter(f); setLoading(true) } }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === f ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No {filter !== 'ALL' ? filter.toLowerCase() : ''} orders.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => {
              const pendingCancellation = booking.cancellationRequest?.status === 'REQUESTED'

              return (
                <div key={booking.id} className={`bg-white border rounded-xl p-5 ${pendingCancellation ? 'border-orange-300' : 'border-gray-200'}`}>
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold text-gray-900">{booking.user?.name}</p>
                      <p className="text-xs text-gray-400">{booking.user?.email} · {new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pendingCancellation && (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-orange-100 text-orange-700">
                          Cancellation Requested
                        </span>
                      )}
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[booking.status] ?? ''}`}>
                        {booking.status}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm text-gray-600 mb-3 space-y-0.5">
                    {booking.items?.map((item) => (
                      <p key={item.id}>{item.name} × {item.quantity} — {formatCurrency(item.price * item.quantity)}</p>
                    ))}
                  </div>

                  {/* Cancellation reason */}
                  {booking.cancellationRequest?.reason && (
                    <p className="text-xs text-gray-500 italic mb-3 border-l-2 border-orange-300 pl-2">
                      "{booking.cancellationRequest.reason}"
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-gray-900">{formatCurrency(booking.total)}</p>
                    <div className="flex items-center gap-2">
                      {pendingCancellation ? (
                        <>
                          <button
                            onClick={() => handleCancellation(booking.id, 'reject')}
                            disabled={updating === booking.id}
                            className="text-sm border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {updating === booking.id ? '...' : 'Reject'}
                          </button>
                          <button
                            onClick={() => handleCancellation(booking.id, 'approve')}
                            disabled={updating === booking.id}
                            className="text-sm bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {updating === booking.id ? '...' : 'Approve'}
                          </button>
                        </>
                      ) : (
                        nextStatus[booking.status] && (
                          <button
                            onClick={() => handleStatusUpdate(booking.id, nextStatus[booking.status])}
                            disabled={updating === booking.id}
                            className="text-sm bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white px-4 py-1.5 rounded-lg transition-colors"
                          >
                            {updating === booking.id ? '...' : nextLabel[booking.status]}
                          </button>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
