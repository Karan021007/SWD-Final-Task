'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

const navLinks = {
  user: [
    { label: 'Browse Stores', href: '/stores' },
    { label: 'My Bookings', href: '/bookings' },
  ],
  store_owner: [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Orders', href: '/dashboard/orders' },
    { label: 'Campaigns', href: '/dashboard/campaigns' },
    { label: 'Browse Stores', href: '/stores' },
    { label: 'My Bookings', href: '/bookings' },
  ],
  admin: [
    { label: 'Users', href: '/admin/users' },
    { label: 'Store Requests', href: '/admin/store-requests' },
    { label: 'Analytics', href: '/admin/analytics' },
  ],
}

const homePath = {
  user: '/stores',
  store_owner: '/dashboard',
  admin: '/admin',
}

export default function Navbar() {
  const { user, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()

  if (!user) return null

  const links = navLinks[user.role]

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-0 flex items-center justify-between h-14">
      <div className="flex items-center gap-8">
        <Link href="/" className="text-lg font-bold text-orange-500 shrink-0">
          Munchies
        </Link>
        <div className="flex items-center gap-1">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                pathname === link.href
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <span className="text-gray-500">
          {user.name}
          <span className="ml-1.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium uppercase tracking-wide">
            {user.role.replace('_', ' ')}
          </span>
        </span>
        <Link
          href="/profile"
          className={`text-sm transition-colors ${pathname === '/profile' ? 'text-orange-600 font-medium' : 'text-gray-500 hover:text-gray-800'}`}
        >
          Profile
        </Link>
        <button
          onClick={handleLogout}
          className="text-gray-500 hover:text-gray-800 transition-colors"
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}
