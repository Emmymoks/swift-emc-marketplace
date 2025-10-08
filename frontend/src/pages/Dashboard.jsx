import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function Dashboard() {
  const [listing, setListing] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [previews, setPreviews] = useState([])

  const itemCategories = [
    'Vehicles', 'Electronics', 'Clothings', 'Furnitures',
    'Food Items', 'Books', 'Accessories', 'Jewelry',
    'Sports Equipment', 'Toys', 'Home Appliances', 'Real Estate', 'Other'
  ]

  const serviceCategories = [
    'IT', 'Construction', 'Welding', 'Electricals', 'Plumbing',
    'Cleaning', 'Tutoring', 'Consulting', 'Transportation',
    'Design', 'Event Planning', 'Healthcare', 'Other'
  ]

  async function createListing(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      const token = localStorage.getItem('token')
      const payload = { ...listing }

      if (listing._files && listing._files.length) {
        payload.images = payload.images || []
        for (const f of listing._files) {
          const fd = new FormData()
          fd.append('file', f)
          const res = await axios.post(
            (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/upload',
            fd,
            { headers: { 'Content-Type': 'multipart/form-data' } }
          )
          if (res.data?.url) payload.images.push(res.data.url)
        }
        delete payload._files
      }

      const { data } = await axios.post(
        (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api/listings',
        payload,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      alert(data?.ok ? 'Listing created successfully and pending admin approval.' : 'Listing created (response unexpected).')
      setListing({})
    } catch {
      alert('Error creating listing')
    }
    setSubmitting(false)
  }

  function onFilesChange(e) {
    const files = e.target.files ? Array.from(e.target.files) : []
    setListing(l => ({ ...l, _files: files }))
  }

  useEffect(() => {
    const urls = listing._files ? listing._files.map(f => URL.createObjectURL(f)) : []
    setPreviews(urls)
    return () => { urls.forEach(u => URL.revokeObjectURL(u)) }
  }, [listing._files])

  const categories = listing.type === 'service' ? serviceCategories : itemCategories

  return (
    <div className="page">
      <h2>Dashboard</h2>
      <p className="muted">Post a new listing (pending admin approval)</p>

      <form onSubmit={createListing} style={{ maxWidth: 640 }}>
        <input placeholder="Title" value={listing.title || ''} onChange={e => setListing({ ...listing, title: e.target.value })} required />

        <div className="form-row">
          <div className="form-col">
            <select value={listing.type || 'item'} onChange={e => setListing({ ...listing, type: e.target.value, category: '' })}>
              <option value="item">Item</option>
              <option value="service">Service</option>
            </select>
          </div>

          <div className="form-col">
            <select
              value={categories.includes(listing.category) ? listing.category : 'Other'}
              onChange={e => setListing({ ...listing, category: e.target.value })}
            >
              <option value="">Select Category</option>
              {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
            {listing.category === 'Other' && (
              <input placeholder="Enter custom category"
                value={listing.customCategory || ''}
                onChange={e => setListing({ ...listing, customCategory: e.target.value })}
              />
            )}
          </div>
        </div>

        <input placeholder="Price" type="number" value={listing.price || ''} onChange={e => setListing({ ...listing, price: parseFloat(e.target.value) })} />
        <textarea placeholder="Description" value={listing.description || ''} onChange={e => setListing({ ...listing, description: e.target.value })} />

        <div style={{ margin: '8px 0' }}>
          <label className="btn ghost">Upload images
            <input type="file" accept="image/*" multiple onChange={onFilesChange} style={{ display: 'none' }} />
          </label>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {previews.map((p, idx) => (
              <img key={idx} src={p} alt="preview" style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8 }} />
            ))}
          </div>
        </div>

        <button className="btn" type="submit" disabled={submitting}>{submitting ? 'Creating...' : 'Create'}</button>
      </form>
    </div>
  )
}
