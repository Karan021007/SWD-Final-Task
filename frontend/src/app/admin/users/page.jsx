'use client'

import { useState, useEffect } from 'react'
import { ShieldOff, ShieldCheck, RotateCcw } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

const roleStyle = {
  USER: 'bg-gray-100 text-gray-600',
  STORE_OWNER: 'bg-blue-100 text-blue-600',
  ADMIN: 'bg-purple-100 text-purple-600',
}

export default function UsersPage() {
  const { user } = useRequireAuth('admin')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [actioning, setActioning] = useState(null)

  const load = () => {
    const query = filter ? `?role=${filter}` : ''
    api.get(`/admin/users${query}`)
      .then(res => setUsers(res.data.users))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [filter])

  const action = async (userId, path, body) => {
    setActioning(userId)
    try {
      await api.post(`/admin/users/${userId}/${path}`, body ?? {})
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Action failed')
    } finally { setActioning(null) }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Users</h1>

        {/* Role filter */}
        <div className="flex gap-2 mb-6">
          {['', 'USER', 'STORE_OWNER', 'ADMIN'].map(r => (
            <button key={r} onClick={() => { if (r !== filter) { setFilter(r); setLoading(true) } }}
              className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${filter === r ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'}`}>
              {r || 'All'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3,4].map(i => <div key={i} className="h-16 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Role</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Warnings</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Status</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map(u => (
                  <tr key={u.id} className={`hover:bg-gray-50 ${u.isBlocked ? 'opacity-60' : ''}`}>
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{u.name}</p>
                      <p className="text-xs text-gray-400">{u.email}{u.hostel ? ` · ${u.hostel}` : ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleStyle[u.role] ?? ''}`}>{u.role}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={u.warningCount > 0 ? 'text-orange-500 font-semibold' : 'text-gray-400'}>{u.warningCount}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.isBlocked ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {u.isBlocked ? (
                          <button onClick={() => action(u.id, 'unblock')} disabled={actioning === u.id} title="Unblock"
                            className="text-gray-400 hover:text-green-500 disabled:opacity-40 transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => action(u.id, 'block', { isGlobal: true })} disabled={actioning === u.id} title="Block globally"
                            className="text-gray-400 hover:text-red-400 disabled:opacity-40 transition-colors">
                            <ShieldOff className="w-4 h-4" />
                          </button>
                        )}
                        {u.warningCount > 0 && (
                          <button onClick={() => action(u.id, 'reset-warnings')} disabled={actioning === u.id} title="Reset warnings"
                            className="text-gray-400 hover:text-orange-400 disabled:opacity-40 transition-colors">
                            <RotateCcw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="text-center py-10 text-gray-400 text-sm">No users found.</p>}
          </div>
        )}
      </div>
    </div>
  )
}
