'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingCart, Trash2, Plus, Minus, Tag } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useCartStore } from '@/stores/cartStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

function CartContent() {
  const { user } = useRequireAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const storeId = searchParams.get('storeId') ?? ''

  const { carts, updateQuantity, removeFromCart, clearCart, getCartTotal } = useCartStore()
  const cart = carts[storeId]
  const cartTotal = getCartTotal(storeId)

  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponError, setCouponError] = useState('')
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const subtotal = cartTotal
  const itemCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0

  const handleQuantity = (itemId, delta, current) => {
    const next = current + delta
    if (next <= 0) removeFromCart(storeId, itemId)
    else updateQuantity(storeId, itemId, next)
  }

  const handlePlaceOrder = async () => {
    if (!cart || cart.items.length === 0) return
    setPlacing(true); setError('')
    try {
      const payload = {
        storeId,
        items: cart.items.map(i => ({ itemId: i.itemId, quantity: i.quantity })),
      }
      if (couponCode.trim()) payload.couponCode = couponCode.trim()

      const res = await api.post('/bookings', payload)
      clearCart(storeId)
      router.push(`/bookings?new=${res.data.booking?.id ?? '1'}`)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.')
    } finally {
      setPlacing(false)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8 flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-orange-500" /> Your Cart
        </h1>

        {!cart || cart.items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="mb-4">Your cart is empty.</p>
            <button onClick={() => router.push('/stores')} className="text-orange-500 hover:underline text-sm font-medium">
              Browse stores →
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Store name */}
            <p className="text-sm text-gray-500">
              Ordering from <span className="font-semibold text-gray-800">{cart.storeName ?? cart.storeId}</span>
            </p>

            {/* Items */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {cart.items.map((item, idx) => (
                <div key={item.itemId} className={`flex items-center gap-4 px-5 py-4 ${idx !== 0 ? 'border-t border-gray-100' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(item.price)} each</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleQuantity(item.itemId, -1, item.quantity)}
                      className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantity(item.itemId, 1, item.quantity)}
                      className="w-7 h-7 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="w-16 text-right text-sm font-semibold text-gray-900">
                    {formatCurrency(item.price * item.quantity)}
                  </p>
                  <button
                    onClick={() => removeFromCart(storeId, item.itemId)}
                    className="text-gray-300 hover:text-red-400 transition-colors ml-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Coupon */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Tag className="w-4 h-4 text-orange-400" /> Coupon Code
              </label>
              <div className="flex gap-2">
                <input
                  value={couponCode}
                  onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false); setCouponError('') }}
                  placeholder="Enter coupon code"
                  disabled={couponApplied}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:bg-gray-50 disabled:text-gray-400"
                />
                {couponApplied ? (
                  <button
                    onClick={() => { setCouponCode(''); setCouponApplied(false); setCouponError('') }}
                    className="text-sm text-red-500 hover:text-red-600 px-3 py-2"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      if (!couponCode.trim()) return
                      setCouponApplied(true)
                      setCouponError('')
                    }}
                    disabled={!couponCode.trim()}
                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-40 text-gray-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    Apply
                  </button>
                )}
              </div>
              {couponApplied && !couponError && (
                <p className="text-xs text-green-600 mt-2">✓ Coupon will be applied at checkout</p>
              )}
              {couponError && <p className="text-xs text-red-500 mt-2">{couponError}</p>}
            </div>

            {/* Order summary */}
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
              <h2 className="font-semibold text-gray-900">Order Summary</h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>{itemCount} item{itemCount !== 1 ? 's' : ''}</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {couponApplied && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Coupon ({couponCode})</span>
                  <span>Applied at checkout</span>
                </div>
              )}
              <div className="border-t border-gray-100 pt-3 flex justify-between font-semibold text-gray-900">
                <span>Total</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              onClick={handlePlaceOrder}
              disabled={placing || cart.items.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-semibold py-3 rounded-xl text-sm transition-colors"
            >
              {placing ? 'Placing order...' : 'Place Order'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-gray-50 flex items-center justify-center text-gray-400">Loading cart…</div>}>
      <CartContent />
    </Suspense>
  )
}
