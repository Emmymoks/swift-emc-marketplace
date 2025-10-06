import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, useNavigate } from 'react-router-dom'

export default function EditListing(){
  const { id } = useParams()
  const [listing, setListing] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const nav = useNavigate()

  useEffect(()=>{
    let mounted = true
    axios.get(`${base}/api/listings/${id}`)
      .then(res=>{ if(mounted) setListing(res.data.listing) })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  },[id])

  async function save(e){
    e.preventDefault()
    setSaving(true)
    try{
      const token = localStorage.getItem('token')
      const payload = { title: listing.title, description: listing.description, price: listing.price, category: listing.category, images: listing.images }
      const res = await axios.put(`${base}/api/listings/${id}`, payload, { headers: { Authorization: 'Bearer '+token } })
      if(res.data && res.data.ok) { alert('Saved'); nav('/my-listings') }
      else alert('Saved (unexpected response)')
    }catch(e){ alert('Save failed') }
    setSaving(false)
  }

  if(loading) return <div className="page"><div className="muted">Loading...</div></div>
  if(!listing) return <div className="page"><div className="muted">Listing not found or not approved yet</div></div>

  return (
    <div className="page">
      <h2>Edit Listing</h2>
      <form onSubmit={save} style={{maxWidth:640}}>
        <input value={listing.title || ''} onChange={e=>setListing({...listing, title:e.target.value})} required />
        <input value={listing.category || ''} onChange={e=>setListing({...listing, category:e.target.value})} />
        <input type="number" value={listing.price || ''} onChange={e=>setListing({...listing, price:parseFloat(e.target.value)})} />
        <textarea value={listing.description || ''} onChange={e=>setListing({...listing, description:e.target.value})} />
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <button className="btn" type="submit" disabled={saving}>{saving? 'Saving...':'Save'}</button>
        </div>
      </form>
    </div>
  )
}
