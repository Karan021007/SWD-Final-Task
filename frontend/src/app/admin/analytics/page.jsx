'use client'

import { useState, useEffect } from 'react'
import { Users, Store, ShoppingBag, Megaphone, TrendingUp, Ban } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

export default function AnalyticsPage() {
  const { user } = useRequireAuth('admin')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data.stats))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const cards = stats ? [
    { label: 'Total Users',       value: stats.totalUsers,       icon: Users,       color: 'text-blue-500 bg-blue-50 border-blue-100' },
    { label: 'Total Stores',      value: stats.totalStores,      icon: Store,       color: 'text-indigo-500 bg-indigo-50 border-indigo-100' },
    { label: 'Active Stores',     value: stats.activeStores,     icon: Store,       color: 'text-green-500 bg-green-50 border-green-100' },
    { label: 'Total Bookings',    value: stats.totalBookings,    icon: ShoppingBag, color: 'text-orange-500 bg-orange-50 border-orange-100' },
    { label: 'Active Campaigns',  value: stats.activeCampaigns,  icon: Megaphone,   color: 'text-purple-500 bg-purple-50 border-purple-100' },
    { label: 'Pending Requests',  value: stats.pendingRequests,  icon: TrendingUp,  color: 'text-yellow-500 bg-yellow-50 border-yellow-100' },
    { label: 'Blocked Users',     value: stats.blockedUsers,     icon: Ban,         color: 'text-red-500 bg-red-50 border-red-100' },
  ] : []

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Platform Analytics</h1>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[1,2,3,4,5,6,7].map(i => <div key={i} className="h-28 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {cards.map(({ label, value, icon: Icon, color }) => (
              <div key={label} className={`bg-white border rounded-xl p-5 ${color.split(' ')[2]}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${color.split(' ')[1]}`}>
                  <Icon className={`w-5 h-5 ${color.split(' ')[0]}`} />
                </div>
                <p className="text-3xl font-bold text-gray-900">{value ?? '—'}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
