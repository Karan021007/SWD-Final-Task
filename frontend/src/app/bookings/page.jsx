'use client'

import { Suspense, useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { ClipboardList, CheckCircle, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
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

function BookingsContent() {
  const { user } = useRequireAuth()
  const searchParams = useSearchParams()
  const isNew = !!searchParams.get('new')

  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)

  const [cancelBookingId, setCancelBookingId] = useState(null)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [cancelError, setCancelError] = useState('')

  useEffect(() => {
    api.get('/bookings/user')
      .then(res => setBookings(res.data.bookings))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  const openCancelModal = (bookingId) => {
    setCancelBookingId(bookingId)
    setCancelReason('')
    setCancelError('')
  }

  const closeCancelModal = () => {
    setCancelBookingId(null)
    setCancelReason('')
    setCancelError('')
  }

  const submitCancellation = async () => {
    if (!cancelBookingId) return
    setCancelling(true)
    setCancelError('')
    try {
      const res = await api.post(`/bookings/${cancelBookingId}/cancel-request`, { reason: cancelReason })
      setBookings(prev => prev.map(b =>
        b.id === cancelBookingId
          ? { ...b, cancellationRequest: res.data.cancellationRequest }
          : b
      ))
      closeCancelModal()
    } catch (err) {
      setCancelError(err.response?.data?.message || 'Failed to submit cancellation request')
    } finally {
      setCancelling(false)
    }
  }

  const canRequestCancellation = (booking) =>
    ['PENDING', 'CONFIRMED'].includes(booking.status) && !booking.cancellationRequest

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">My Bookings</h1>

        {isNew && (
          <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-5 py-4 mb-6">
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
            <div>
              <p className="font-medium text-green-800">Order placed successfully!</p>
              <p className="text-sm text-green-600">The store owner will confirm your order shortly.</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No bookings yet. Go browse some stores!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{booking.store?.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(booking.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </p>
                  </div>
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${statusStyle[booking.status] ?? 'bg-gray-100 text-gray-500'}`}>
                    {booking.status}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-0.5 mb-3">
                  {booking.items?.map((item) => (
                    <p key={item.id}>{item.name} × {item.quantity}</p>
                  ))}
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-900">{formatCurrency(booking.total)}</span>
                  {canRequestCancellation(booking) && (
                    <button
                      onClick={() => openCancelModal(booking.id)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
                    >
                      Request Cancellation
                    </button>
                  )}
                  {booking.cancellationRequest?.status === 'REQUESTED' && (
                    <span className="text-xs text-orange-500 font-medium">Cancellation Requested</span>
                  )}
                  {booking.cancellationRequest?.status === 'APPROVED' && (
                    <span className="text-xs text-green-600 font-medium">Cancellation Approved</span>
                  )}
                  {booking.cancellationRequest?.status === 'REJECTED' && (
                    <span className="text-xs text-red-500 font-medium">Cancellation Rejected</span>
                  )}
                </div>
                {booking.discount > 0 && (
                  <p className="text-xs text-green-600 text-right mt-0.5">Discount: −{formatCurrency(booking.discount)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {cancelBookingId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Request Cancellation</h2>
              <button onClick={closeCancelModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Please provide a reason for cancellation. The store owner will review your request.
            </p>
            <textarea
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none mb-4"
            />
            {cancelError && <p className="text-sm text-red-500 mb-3">{cancelError}</p>}
            <div className="flex gap-3">
              <button
                onClick={closeCancelModal}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitCancellation}
                disabled={cancelling}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {cancelling ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function BookingsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50" />}>
      <BookingsContent />
    </Suspense>
  )
}
