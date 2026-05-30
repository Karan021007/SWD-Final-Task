'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { MapPin, Package, Tag, ChevronLeft, ChevronRight, Store, LogIn } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { api } from '@/lib/api'

const dashboardPath = {
  user: '/stores',
  store_owner: '/dashboard',
  admin: '/admin',
}

const BANNER_COLORS = [
  'from-orange-500 to-rose-500',
  'from-violet-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
]

export default function HomePage() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const [stores, setStores] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loadingStores, setLoadingStores] = useState(true)
  const [activeSlide, setActiveSlide] = useState(0)

  useEffect(() => {
    api.get('/stores')
      .then(res => setStores(res.data.stores))
      .catch(console.error)
      .finally(() => setLoadingStores(false))

    api.get('/campaigns/active')
      .then(res => setCampaigns(res.data.campaigns))
      .catch(console.error)
  }, [])

  const nextSlide = useCallback(() => {
    setActiveSlide(s => (s + 1) % Math.max(campaigns.length, 1))
  }, [campaigns.length])

  const prevSlide = useCallback(() => {
    setActiveSlide(s => (s - 1 + Math.max(campaigns.length, 1)) % Math.max(campaigns.length, 1))
  }, [campaigns.length])

  useEffect(() => {
    if (campaigns.length <= 1) return
    const timer = setInterval(nextSlide, 4500)
    return () => clearInterval(timer)
  }, [campaigns.length, nextSlide])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <nav className="bg-white border-b border-gray-200 px-6 h-14 flex items-center justify-between sticky top-0 z-30">
        <Link href="/" className="text-lg font-bold text-orange-500">Munchies 🍜</Link>
        <div className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link
                href={dashboardPath[user.role] ?? '/'}
                className="text-gray-600 hover:text-gray-900 font-medium transition-colors"
              >
                {user.name.split(' ')[0]}'s Dashboard
              </Link>
              <button
                onClick={handleLogout}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-1.5 text-gray-600 hover:text-gray-900 font-medium transition-colors">
                <LogIn className="w-4 h-4" />
                Sign in
              </Link>
              <Link
                href="/register"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
              >
                Register
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* Campaign Carousel */}
      {campaigns.length > 0 && (
        <div className="relative overflow-hidden">
          <div
            className="flex transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${activeSlide * 100}%)` }}
          >
            {campaigns.map((c, i) => (
              <div
                key={c.id}
                className={`min-w-full bg-gradient-to-r ${BANNER_COLORS[i % BANNER_COLORS.length]} text-white px-8 py-16 flex flex-col items-center text-center`}
              >
                <span className="text-xs font-semibold uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full mb-3">
                  {c.store.name} · {c.store.hostel}
                </span>
                <h2 className="text-2xl sm:text-3xl font-bold mb-2">{c.name}</h2>
                <p className="text-sm text-white/80 mb-4 max-w-lg">{c.description}</p>
                <div className="flex items-center gap-4 flex-wrap justify-center">
                  <span className="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl font-mono font-bold tracking-wider text-lg">
                    {c.couponCode}
                  </span>
                  <span className="text-white/90 text-sm">
                    {c.discountType === 'PERCENTAGE' ? `${c.discountValue}% off` : `₹${c.discountValue} off`}
                    {' · '}Ends {new Date(c.endDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <Link
                  href={user ? `/stores/${c.store.id}` : '/login'}
                  className="mt-5 bg-white text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-full hover:bg-gray-100 transition-colors"
                >
                  Shop now →
                </Link>
              </div>
            ))}
          </div>

          {/* Arrows */}
          {campaigns.length > 1 && (
            <>
              <button
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <button
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 bg-black/20 hover:bg-black/40 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </>
          )}

          {/* Dots */}
          {campaigns.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
              {campaigns.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setActiveSlide(i)}
                  className={`w-2 h-2 rounded-full transition-all ${i === activeSlide ? 'bg-white w-5' : 'bg-white/50'}`}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Hero — shown only when no campaigns */}
      {campaigns.length === 0 && (
        <div className="bg-gradient-to-r from-orange-500 to-rose-500 text-white px-8 py-24 text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">Campus food, made easy 🍜</h1>
          <p className="text-white/80 text-sm mb-6 max-w-md mx-auto">
            Browse stores run by your hostel neighbours and place pickup orders in seconds.
          </p>
        </div>
      )}

      {/* Stores */}
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-gray-900">
            {loadingStores ? 'All Stores' : `All Stores (${stores.length})`}
          </h2>
          {!user && (
            <Link href="/login" className="text-sm text-orange-500 hover:text-orange-600 font-medium transition-colors">
              Sign in to order →
            </Link>
          )}
        </div>

        {loadingStores ? (
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
        ) : stores.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Store className="w-12 h-12 mx-auto mb-3 text-gray-200" />
            <p>No stores open yet. Check back soon!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {stores.map(store => {
              const card = (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md hover:border-orange-200 transition-all h-full">
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
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-orange-500">{store._count.items} items</p>
                      {!user && (
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Tag className="w-3 h-3" /> Sign in to order
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )

              return user ? (
                <Link key={store.id} href={`/stores/${store.id}`} className="block">
                  {card}
                </Link>
              ) : (
                <div key={store.id}>{card}</div>
              )
            })}
          </div>
        )}
      </div>

    </div>
  )
}
