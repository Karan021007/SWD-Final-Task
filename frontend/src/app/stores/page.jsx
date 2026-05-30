'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { MapPin, Package, Tag, Store } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'

export default function StoresPage() {
  const { user } = useRequireAuth()
  const { store: myStore } = useMyStore()
  const [stores, setStores] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.get('/stores')
      .then(res => setStores(res.data.stores))
      .catch(() => setError('Failed to load stores'))
      .finally(() => setLoading(false))
  }, [])

  const visibleStores = myStore ? stores.filter(s => s.id !== myStore.id) : stores

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Hey {user.name.split(' ')[0]}, what are you craving?
          </h1>
          {user.hostel && (
            <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" /> {user.hostel}
            </p>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-orange-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{loading ? '—' : stores.length} Stores</h3>
            <p className="text-sm text-gray-500">Active in your network</p>
          </div>
          <Link href="/bookings" className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-md hover:border-orange-200 transition-all group">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
              <Package className="w-5 h-5 text-blue-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">My Bookings</h3>
            <p className="text-sm text-gray-500">Track your active orders</p>
          </Link>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mb-3">
              <Tag className="w-5 h-5 text-green-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Active Deals</h3>
            <p className="text-sm text-gray-500">Coupons & discounts</p>
          </div>

        {/* Become a seller */}
        <Link href="/apply" className="col-span-full sm:col-span-1 bg-orange-50 border border-orange-200 rounded-xl p-5 hover:shadow-md hover:border-orange-400 transition-all flex items-start gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-1">Become a Seller</h3>
            <p className="text-sm text-gray-500">Apply to open your own store on Munchies</p>
          </div>
        </Link>
        </div>

        {/* Store listing */}
        <h2 className="text-base font-semibold text-gray-900 mb-4">All Stores</h2>
        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="h-32 bg-gray-100 animate-pulse" />
                <div className="p-4 space-y-2">
                  <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
                  <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleStores.length === 0 ? (
          <div className="text-center py-16 text-gray-400">No stores available yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleStores.map(store => (
              <Link key={store.id} href={`/stores/${store.id}`} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-200 transition-all">
                <div className="h-32 bg-orange-50 flex items-center justify-center">
                  {store.image
                    ? <img src={store.image} alt={store.name} className="h-full w-full object-cover" />
                    : <Package className="w-10 h-10 text-orange-200" />}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{store.name}</h3>
                  <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> {store.hostel} · Room {store.roomNumber}
                  </p>
                  {store.description && (
                    <p className="text-xs text-gray-400 mt-1 line-clamp-1">{store.description}</p>
                  )}
                  <p className="text-xs text-orange-500 mt-2">{store._count.items} items</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
