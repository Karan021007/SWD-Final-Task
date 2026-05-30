'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MapPin, Package, ShoppingCart, Plus, Minus } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useCartStore } from '@/stores/cartStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

export default function StoreDetailPage() {
  const { user } = useRequireAuth()
  const params = useParams()
  const router = useRouter()
  const storeId = params.id

  const [store, setStore] = useState(null)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [localQty, setLocalQty] = useState({})

  const { carts, addToCart, updateQuantity, removeFromCart, getCartTotal } = useCartStore()
  const cart = carts[storeId]
  const cartCount = cart?.items.reduce((s, i) => s + i.quantity, 0) ?? 0
  const cartTotal = getCartTotal(storeId)

  useEffect(() => {
    if (!storeId) return
    Promise.all([
      api.get(`/stores/${storeId}`),
      api.get(`/items/store/${storeId}?availableOnly=true`),
    ])
      .then(([storeRes, itemsRes]) => {
        setStore(storeRes.data.store)
        setItems(itemsRes.data.items)
        const qty = {}
        itemsRes.data.items.forEach((item) => {
          const inCart = carts[storeId]?.items.find(i => i.itemId === item.id)
          qty[item.id] = inCart?.quantity ?? 0
        })
        setLocalQty(qty)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [storeId])

  const increment = (item) => {
    const newQty = (localQty[item.id] ?? 0) + 1
    setLocalQty(q => ({ ...q, [item.id]: newQty }))
    const inCart = cart?.items.find(i => i.itemId === item.id)
    if (inCart) {
      updateQuantity(storeId, item.id, newQty)
    } else {
      addToCart(storeId, store.name, { id: item.id, itemId: item.id, name: item.name, price: item.price, quantity: 1 })
    }
  }

  const decrement = (item) => {
    const newQty = Math.max(0, (localQty[item.id] ?? 0) - 1)
    setLocalQty(q => ({ ...q, [item.id]: newQty }))
    if (newQty === 0) {
      removeFromCart(storeId, item.id)
    } else {
      updateQuantity(storeId, item.id, newQty)
    }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <Navbar />

      {loading ? (
        <div className="max-w-3xl mx-auto px-6 py-10 space-y-4">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-32 bg-gray-100 rounded animate-pulse" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        </div>
      ) : !store ? (
        <div className="text-center py-20 text-gray-400">Store not found.</div>
      ) : (
        <div className="max-w-3xl mx-auto px-6 py-10">
          {/* Store header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {store.hostel} · Room {store.roomNumber}
            </p>
            {store.description && (
              <p className="text-sm text-gray-500 mt-2">{store.description}</p>
            )}
          </div>

          {/* Items */}
          {items.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
              <p>No items available right now.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map(item => {
                const qty = localQty[item.id] ?? 0
                return (
                  <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate">{item.description}</p>
                      )}
                      <p className="text-sm font-semibold text-orange-500 mt-1">{formatCurrency(item.price)}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {qty === 0 ? (
                        <button
                          onClick={() => increment(item)}
                          className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Add
                        </button>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => decrement(item)}
                            className="w-8 h-8 rounded-full border border-gray-300 flex items-center justify-center hover:border-orange-400 hover:text-orange-500 transition-colors"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold text-gray-900">{qty}</span>
                          <button
                            onClick={() => increment(item)}
                            className="w-8 h-8 rounded-full bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Sticky cart bar */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-6 py-4 z-10">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <ShoppingCart className="w-5 h-5 text-orange-500" />
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-orange-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              </div>
              <span className="text-sm text-gray-600">
                {cartCount} item{cartCount !== 1 ? 's' : ''} · <span className="font-semibold text-gray-900">{formatCurrency(cartTotal)}</span>
              </span>
            </div>
            <button
              onClick={() => router.push(`/cart?storeId=${storeId}`)}
              className="bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm px-5 py-2 rounded-lg transition-colors"
            >
              View Cart →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
