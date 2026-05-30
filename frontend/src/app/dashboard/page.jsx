'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Package, ClipboardList, Megaphone, Settings, TrendingUp, ShoppingBag, AlertCircle } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

export default function DashboardPage() {
  const { user } = useRequireAuth('store_owner')
  const { store, loading } = useMyStore()
  const [pendingCount, setPendingCount] = useState(null)
  const [revenue, setRevenue] = useState(null)

  useEffect(() => {
    if (!store) return
    Promise.all([
      api.get(`/bookings/store/${store.id}?status=PENDING`),
      api.get(`/analytics/store/${store.id}`),
    ]).then(([bookingsRes, analyticsRes]) => {
      setPendingCount(bookingsRes.data.bookings.length)
      setRevenue(analyticsRes.data.analytics.revenue.total)
    }).catch(console.error)
  }, [store])

  if (!user) return null

  const activeItems = store?.items.filter((i) => i.isAvailable).length ?? null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            {loading ? 'Store Dashboard' : store ? store.name : 'Store Dashboard'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {store ? `${store.hostel} · Room ${store.roomNumber}` : 'Manage your store, items, and orders'}
          </p>
        </div>

        {!loading && !store && (
          <div className="mb-8 bg-orange-50 border border-orange-200 rounded-xl p-5 flex items-center justify-between">
            <p className="text-sm text-orange-700">You don't have a store yet.</p>
            <Link href="/dashboard/settings" className="bg-orange-500 text-white text-sm px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors">
              Create Store
            </Link>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {[
            { label: 'Total Orders', value: store?._count.bookings ?? '—', icon: ShoppingBag, color: 'text-orange-500 bg-orange-100' },
            { label: 'Revenue', value: revenue !== null ? formatCurrency(revenue) : '—', icon: TrendingUp, color: 'text-green-500 bg-green-100' },
            { label: 'Active Items', value: activeItems ?? '—', icon: Package, color: 'text-blue-500 bg-blue-100' },
            { label: 'Pending Orders', value: pendingCount ?? '—', icon: AlertCircle, color: 'text-yellow-500 bg-yellow-100' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{String(value)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <h2 className="text-base font-semibold text-gray-900 mb-4">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: '/dashboard/items', icon: Package, iconBg: 'bg-blue-100 group-hover:bg-blue-200', iconColor: 'text-blue-500', title: 'Manage Items', desc: 'Add, edit, or remove items from your store menu' },
            { href: '/dashboard/orders', icon: ClipboardList, iconBg: 'bg-orange-100 group-hover:bg-orange-200', iconColor: 'text-orange-500', title: 'Orders', desc: 'View incoming orders and update their status' },
            { href: '/dashboard/campaigns', icon: Megaphone, iconBg: 'bg-green-100 group-hover:bg-green-200', iconColor: 'text-green-500', title: 'Campaigns', desc: 'Create discount campaigns and coupon codes' },
            { href: '/dashboard/settings', icon: Settings, iconBg: 'bg-gray-100 group-hover:bg-gray-200', iconColor: 'text-gray-500', title: 'Store Settings', desc: 'Update store name, description, and availability' },
          ].map(({ href, icon: Icon, iconBg, iconColor, title, desc }) => (
            <Link key={href} href={href} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-orange-200 transition-all group flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${iconBg}`}>
                <Icon className={`w-5 h-5 ${iconColor}`} />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                <p className="text-sm text-gray-500">{desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
