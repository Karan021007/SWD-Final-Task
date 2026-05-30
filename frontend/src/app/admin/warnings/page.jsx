'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ShieldAlert, ShieldOff, ShieldCheck, RotateCcw, AlertTriangle, ArrowLeft, Plus, X } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { api } from '@/lib/api'

export default function WarningsPage() {
  const { user } = useRequireAuth('admin')
  const [tab, setTab] = useState('warnings')
  const [warnings, setWarnings] = useState([])
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)

  // Block modal state
  const [showBlockModal, setShowBlockModal] = useState(false)
  const [users, setUsers] = useState([])
  const [stores, setStores] = useState([])
  const [blockForm, setBlockForm] = useState({ userId: '', isGlobal: true, storeId: '', reason: '' })
  const [blocking, setBlocking] = useState(false)
  const [blockError, setBlockError] = useState('')

  const loadAll = () => {
    setLoading(true)
    Promise.all([
      api.get('/admin/warnings'),
      api.get('/admin/blocked'),
    ]).then(([wRes, bRes]) => {
      setWarnings(wRes.data.warnings)
      setBlocks(bRes.data.blocks)
    }).catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadAll() }, [])

  const openBlockModal = async () => {
    setBlockForm({ userId: '', isGlobal: true, storeId: '', reason: '' })
    setBlockError('')
    setShowBlockModal(true)
    const [uRes, sRes] = await Promise.all([
      api.get('/admin/users'),
      api.get('/stores'),
    ])
    setUsers(uRes.data.users)
    setStores(sRes.data.stores)
  }

  const submitBlock = async () => {
    if (!blockForm.userId) { setBlockError('Please select a user'); return }
    if (!blockForm.isGlobal && !blockForm.storeId) { setBlockError('Please select a store'); return }
    setBlocking(true)
    setBlockError('')
    try {
      await api.post(`/admin/users/${blockForm.userId}/block`, {
        isGlobal: blockForm.isGlobal,
        storeId: blockForm.isGlobal ? undefined : blockForm.storeId,
        reason: blockForm.reason || undefined,
      })
      setShowBlockModal(false)
      loadAll()
    } catch (err) {
      setBlockError(err.response?.data?.message || 'Failed to block user')
    } finally { setBlocking(false) }
  }

  const resetWarnings = async (userId) => {
    setActioning(userId + '-reset')
    try {
      await api.post(`/admin/users/${userId}/reset-warnings`)
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reset warnings')
    } finally { setActioning(null) }
  }

  const unblock = async (userId, storeId) => {
    setActioning(userId + '-unblock')
    try {
      await api.post(`/admin/users/${userId}/unblock`, storeId ? { storeId } : {})
      loadAll()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to unblock user')
    } finally { setActioning(null) }
  }

  if (!user) return null

  // Group warnings by user for summary
  const userWarnings = warnings.reduce((acc, w) => {
    if (!acc[w.user.id]) acc[w.user.id] = { user: w.user, records: [] }
    acc[w.user.id].records.push(w)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Link href="/admin" className="text-gray-400 hover:text-gray-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Warnings & Blocks</h1>
            <p className="text-sm text-gray-500">Review user warnings and manage blocks</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {['warnings', 'blocked'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                  tab === t ? 'bg-orange-500 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:border-orange-300'
                }`}
              >
                {t === 'warnings' ? `Warnings (${warnings.length})` : `Blocked (${blocks.length})`}
              </button>
            ))}
          </div>
          {tab === 'blocked' && (
            <button
              onClick={openBlockModal}
              className="flex items-center gap-1.5 text-sm bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Block User
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white border border-gray-200 rounded-xl animate-pulse" />)}
          </div>
        ) : tab === 'warnings' ? (
          <>
            {Object.keys(userWarnings).length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-400">
                <ShieldAlert className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>No warnings issued yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(userWarnings).map(({ user: u, records }) => (
                  <div key={u.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${
                          u.warningCount >= 3 ? 'bg-red-100 text-red-600' : u.warningCount >= 2 ? 'bg-orange-100 text-orange-600' : 'bg-yellow-100 text-yellow-600'
                        }`}>
                          {u.warningCount}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{u.name}</p>
                          <p className="text-xs text-gray-400">{u.email}{u.hostel ? ` · ${u.hostel}` : ''}</p>
                        </div>
                        {u.isBlocked && (
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Blocked</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => resetWarnings(u.id)}
                          disabled={actioning === u.id + '-reset'}
                          title="Reset all warnings"
                          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-500 disabled:opacity-40 border border-gray-200 hover:border-orange-300 rounded-lg px-3 py-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Reset
                        </button>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {records.map(w => (
                        <div key={w.id} className="flex items-start gap-3 px-5 py-3">
                          <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-gray-700">{w.reason}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{new Date(w.createdAt).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {blocks.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl py-16 text-center text-gray-400">
                <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-gray-200" />
                <p>No blocked users.</p>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">User</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Scope</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Reason</th>
                      <th className="text-left px-5 py-3 font-medium text-gray-600">Date</th>
                      <th className="text-right px-5 py-3 font-medium text-gray-600">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {blocks.map(b => (
                      <tr key={b.id} className="hover:bg-gray-50">
                        <td className="px-5 py-3">
                          <p className="font-medium text-gray-900">{b.user.name}</p>
                          <p className="text-xs text-gray-400">{b.user.email}</p>
                        </td>
                        <td className="px-5 py-3">
                          {b.isGlobal ? (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 text-red-600">Global</span>
                          ) : (
                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                              {b.store?.name ?? 'Store'}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">{b.reason ?? '—'}</td>
                        <td className="px-5 py-3 text-xs text-gray-400">{new Date(b.createdAt).toLocaleDateString('en-IN')}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() => unblock(b.user.id, b.isGlobal ? undefined : b.store?.id)}
                            disabled={actioning === b.user.id + '-unblock'}
                            title="Unblock"
                            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-green-600 disabled:opacity-40 border border-gray-200 hover:border-green-300 rounded-lg px-3 py-1.5 transition-colors ml-auto"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            Unblock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Block User Modal */}
      {showBlockModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Block User</h2>
              <button onClick={() => setShowBlockModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* User select */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User *</label>
                <select
                  value={blockForm.userId}
                  onChange={e => setBlockForm(f => ({ ...f, userId: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select a user…</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
                  ))}
                </select>
              </div>

              {/* Scope toggle */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Block scope</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setBlockForm(f => ({ ...f, isGlobal: true, storeId: '' }))}
                    className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-colors ${blockForm.isGlobal ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                  >
                    Global
                  </button>
                  <button
                    type="button"
                    onClick={() => setBlockForm(f => ({ ...f, isGlobal: false }))}
                    className={`flex-1 text-sm font-medium py-2 rounded-lg border transition-colors ${!blockForm.isGlobal ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-600 border-gray-200 hover:border-red-300'}`}
                  >
                    Store-specific
                  </button>
                </div>
              </div>

              {/* Store select */}
              {!blockForm.isGlobal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Store *</label>
                  <select
                    value={blockForm.storeId}
                    onChange={e => setBlockForm(f => ({ ...f, storeId: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                  >
                    <option value="">Select a store…</option>
                    {stores.map(s => (
                      <option key={s.id} value={s.id}>{s.name} · {s.hostel}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Reason */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (optional)</label>
                <input
                  type="text"
                  value={blockForm.reason}
                  onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                  placeholder="e.g. Repeated no-shows"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            {blockError && <p className="text-sm text-red-500 mt-3">{blockError}</p>}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowBlockModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitBlock}
                disabled={blocking}
                className="flex-1 bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white font-medium py-2 rounded-lg text-sm transition-colors"
              >
                {blocking ? 'Blocking…' : 'Block User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
