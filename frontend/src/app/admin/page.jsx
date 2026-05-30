'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Users, Store, BarChart2, ShieldAlert, CheckCircle, Ban } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

export default function AdminPage() {
  const { user } = useRequireAuth('admin')
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/admin/stats')
      .then(res => setStats(res.data.stats))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (!user) return null

  const statCards = [
    { label: 'Total Users',      value: stats.totalUsers,      icon: Users,        color: 'text-blue-500 bg-blue-100' },
    { label: 'Active Stores',    value: stats.activeStores,    icon: Store,        color: 'text-green-500 bg-green-100' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: CheckCircle,  color: 'text-yellow-500 bg-yellow-100' },
    { label: 'Blocked Users',    value: stats.blockedUsers,    icon: Ban,          color: 'text-red-500 bg-red-100' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-500 mt-1">Platform management and oversight</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          {statCards.map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-2xl font-bold text-gray-900">{loading ? '—' : (value ?? '—')}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <h2 className="text-base font-semibold text-gray-900 mb-4">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { href: '/admin/users', icon: Users, bg: 'bg-blue-100 group-hover:bg-blue-200', color: 'text-blue-500', title: 'Users', desc: 'View all users, issue warnings, block accounts' },
            { href: '/admin/store-requests', icon: Store, bg: 'bg-yellow-100 group-hover:bg-yellow-200', color: 'text-yellow-600', title: 'Store Requests', desc: 'Approve or reject store owner applications' },
            { href: '/admin/analytics', icon: BarChart2, bg: 'bg-green-100 group-hover:bg-green-200', color: 'text-green-500', title: 'Analytics', desc: `${stats.totalBookings ?? '—'} total bookings · ${stats.activeCampaigns ?? '—'} active campaigns` },
            { href: '/admin/warnings', icon: ShieldAlert, bg: 'bg-red-100 group-hover:bg-red-200', color: 'text-red-500', title: 'Warnings & Blocks', desc: 'Review user warnings and manage blocks' },
          ].map(({ href, icon: Icon, bg, color, title, desc }) => (
            <Link key={href} href={href} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md hover:border-orange-200 transition-all group flex items-start gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition-colors ${bg}`}>
                <Icon className={`w-5 h-5 ${color}`} />
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
