'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Package, ImagePlus, X, AlertTriangle, Pencil } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { useRequireAuth } from '@/hooks/useRequireAuth'
import { useMyStore } from '@/hooks/useMyStore'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/Utils'

const INPUT_CLS = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400'
const NO_SPIN = '[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none'

export default function ItemsPage() {
  const { user } = useRequireAuth('store_owner')
  const { store } = useMyStore()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  // Add form
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', price: '', quantity: '' })
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [error, setError] = useState('')
  const fileInputRef = useRef(null)

  // Edit modal
  const [editTarget, setEditTarget] = useState(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', price: '', quantity: '' })
  const [editImageFile, setEditImageFile] = useState(null)
  const [editImagePreview, setEditImagePreview] = useState(null)
  const [editImageCleared, setEditImageCleared] = useState(false)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const editFileInputRef = useRef(null)

  // Delete modal
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!store) return
    api.get(`/items/store/${store.id}`)
      .then(res => setItems(res.data.items))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [store])

  const handleImageChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setImageFile(file); setImagePreview(URL.createObjectURL(file))
  }
  const clearImage = () => {
    setImageFile(null); setImagePreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleEditImageChange = (e) => {
    const file = e.target.files?.[0]; if (!file) return
    setEditImageFile(file)
    setEditImagePreview(URL.createObjectURL(file))
    setEditImageCleared(false)
  }
  const clearEditImage = () => {
    setEditImageFile(null)
    setEditImagePreview(null)
    setEditImageCleared(true)
    if (editFileInputRef.current) editFileInputRef.current.value = ''
  }

  const openEdit = (item) => {
    setEditTarget(item)
    setEditForm({ name: item.name, description: item.description ?? '', price: String(item.price), quantity: String(item.quantity) })
    setEditImageFile(null)
    setEditImagePreview(item.image)
    setEditImageCleared(false)
    setEditError('')
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!store) return
    setSubmitting(true); setError('')
    try {
      const fd = new FormData()
      fd.append('storeId', store.id)
      fd.append('name', form.name)
      fd.append('description', form.description)
      fd.append('price', form.price)
      fd.append('quantity', form.quantity)
      if (imageFile) fd.append('image', imageFile)
      const res = await api.post('/items', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setItems(prev => [res.data.item, ...prev])
      setForm({ name: '', description: '', price: '', quantity: '' })
      clearImage(); setShowForm(false)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add item')
    } finally { setSubmitting(false) }
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    if (!editTarget) return
    setEditSubmitting(true); setEditError('')
    try {
      const fd = new FormData()
      fd.append('name', editForm.name)
      fd.append('description', editForm.description)
      fd.append('price', editForm.price)
      fd.append('quantity', editForm.quantity)
      if (editImageFile) fd.append('image', editImageFile)
      if (editImageCleared && !editImageFile) fd.append('removeImage', 'true')
      const res = await api.put(`/items/${editTarget.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      setItems(prev => prev.map(i => i.id === editTarget.id ? res.data.item : i))
      setEditTarget(null)
    } catch (err) {
      setEditError(err.response?.data?.message || 'Failed to update item')
    } finally { setEditSubmitting(false) }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await api.delete(`/items/${deleteTarget.id}`)
      setItems(prev => prev.filter(i => i.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item')
    } finally { setDeleting(false) }
  }

  const handleToggle = async (item) => {
    try {
      const res = await api.put(`/items/${item.id}`, { isAvailable: !item.isAvailable })
      setItems(prev => prev.map(i => i.id === item.id ? res.data.item : i))
    } catch { alert('Failed to update item') }
  }

  if (!user) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Items</h1>
          <button onClick={() => setShowForm(v => !v)} className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Add form */}
        {showForm && (
          <form onSubmit={handleAdd} className="bg-white border border-gray-200 rounded-xl p-6 mb-6 space-y-4">
            <h2 className="font-semibold text-gray-900">New Item</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input required value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} className={INPUT_CLS} placeholder="Maggi, Chai..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))} className={INPUT_CLS} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
                <input required type="number" min="0" step="0.01" value={form.price} onChange={e => setForm(f => ({...f, price: e.target.value}))} className={`${INPUT_CLS} ${NO_SPIN}`} placeholder="50" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                <input required type="number" min="0" value={form.quantity} onChange={e => setForm(f => ({...f, quantity: e.target.value}))} className={`${INPUT_CLS} ${NO_SPIN}`} placeholder="10" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Item Image</label>
              {imagePreview ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={clearImage} className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl px-5 py-4 text-sm text-gray-400 hover:text-orange-500 transition-colors">
                  <ImagePlus className="w-5 h-5" /> Click to upload image
                </button>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button type="submit" disabled={submitting} className="bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors">
                {submitting ? 'Adding...' : 'Add Item'}
              </button>
              <button type="button" onClick={() => { setShowForm(false); clearImage() }} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
            </div>
          </form>
        )}

        {/* Items table */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-white border border-gray-200 rounded-xl animate-pulse" />)}</div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <Package className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p>No items yet. Add your first item above.</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-5 py-3 font-medium text-gray-600">Item</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Price</th>
                  <th className="text-right px-5 py-3 font-medium text-gray-600">Stock</th>
                  <th className="text-center px-5 py-3 font-medium text-gray-600">Available</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img src={item.image} alt={item.name} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center shrink-0">
                            <Package className="w-5 h-5 text-orange-200" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-gray-900">{item.name}</p>
                          {item.description && <p className="text-xs text-gray-400 mt-0.5">{item.description}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right text-gray-700">{formatCurrency(item.price)}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={item.quantity < 5 ? 'text-red-500 font-medium' : 'text-gray-700'}>{item.quantity}</span>
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button onClick={() => handleToggle(item)} className={`w-9 h-5 rounded-full transition-colors ${item.isAvailable ? 'bg-green-400' : 'bg-gray-200'}`}>
                        <span className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-auto ${item.isAvailable ? 'translate-x-2' : '-translate-x-2'}`} />
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(item)} className="text-gray-300 hover:text-orange-400 transition-colors" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => setDeleteTarget(item)} className="text-gray-300 hover:text-red-400 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Edit Item</h3>
              <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEdit} className="px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                  <input required value={editForm.name} onChange={e => setEditForm(f => ({...f, name: e.target.value}))} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({...f, description: e.target.value}))} className={INPUT_CLS} placeholder="Optional" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Price (₹) *</label>
                  <input required type="number" min="0" step="0.01" value={editForm.price} onChange={e => setEditForm(f => ({...f, price: e.target.value}))} className={`${INPUT_CLS} ${NO_SPIN}`} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantity *</label>
                  <input required type="number" min="0" value={editForm.quantity} onChange={e => setEditForm(f => ({...f, quantity: e.target.value}))} className={`${INPUT_CLS} ${NO_SPIN}`} />
                </div>
              </div>

              {/* Image */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Item Image</label>
                {editImagePreview && !editImageCleared ? (
                  <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-gray-200">
                    <img src={editImagePreview} alt="Preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={clearEditImage} className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => editFileInputRef.current?.click()} className="flex items-center gap-2 border-2 border-dashed border-gray-300 hover:border-orange-400 rounded-xl px-5 py-4 text-sm text-gray-400 hover:text-orange-500 transition-colors">
                    <ImagePlus className="w-5 h-5" /> Click to upload image
                  </button>
                )}
                <input ref={editFileInputRef} type="file" accept="image/*" onChange={handleEditImageChange} className="hidden" />
              </div>

              {editError && <p className="text-xs text-red-500">{editError}</p>}
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={editSubmitting} className="px-5 py-2 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-lg transition-colors">
                  {editSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteTarget(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Delete item?</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  <span className="font-medium text-gray-700">"{deleteTarget.name}"</span> will be permanently removed.
                </p>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300 rounded-lg transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:bg-red-300 rounded-lg transition-colors">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
