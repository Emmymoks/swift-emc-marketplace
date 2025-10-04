import React, { useEffect, useState } from 'react'
import axios from 'axios'
export default function Dashboard(){
  const [me, setMe] = useState(null);
  const [listing, setListing] = useState({});
  const [submitting, setSubmitting] = useState(false);
  useEffect(()=>{ /* fetch user profile when logged in */ }, []);
  async function createListing(e){
    e.preventDefault();
    setSubmitting(true);
    try{
      const token = localStorage.getItem('token');
      // upload any files in listing._files and replace with URLs
      const payload = { ...listing };
      if(listing._files && listing._files.length){
        payload.images = payload.images || [];
        for(const f of listing._files){
          const fd = new FormData(); fd.append('file', f);
          try{
            const res = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
            payload.images.push(res.data.url)
          }catch(e){ /* skip */ }
        }
        delete payload._files
      }
      const { data } = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings', payload, { headers: { Authorization: 'Bearer '+token } });
      alert('Listing created and is pending admin approval.');
      setListing({});
    }catch(err){ alert('Error creating listing'); }
    setSubmitting(false);
  }

  function onFilesChange(e){
    const files = e.target.files ? Array.from(e.target.files) : []
    setListing(l=>({ ...l, _files: files }))
  }
  return (
    <div className="page">
      <h2>Dashboard</h2>
      <p className="muted">Post a new listing (will be pending admin approval)</p>
      <form onSubmit={createListing} style={{maxWidth:640}}>
        <input placeholder="Title" value={listing.title||''} onChange={e=>setListing({...listing, title:e.target.value})} required/>
        <div className="form-row">
          <div className="form-col">
            <select value={listing.type||'item'} onChange={e=>setListing({...listing, type:e.target.value})}>
              <option value="item">Item</option>
              <option value="service">Service</option>
            </select>
          </div>
          <div className="form-col">
            <input placeholder="Category" value={listing.category||''} onChange={e=>setListing({...listing, category:e.target.value})} />
          </div>
        </div>
        <input placeholder="Price" type="number" value={listing.price||''} onChange={e=>setListing({...listing, price:parseFloat(e.target.value)})} />
        <textarea placeholder="Description" value={listing.description||''} onChange={e=>setListing({...listing, description:e.target.value})} />
        <div style={{margin:'8px 0'}}>
          <label className="btn ghost">Upload images<input type="file" accept="image/*" multiple onChange={onFilesChange} style={{display:'none'}} /></label>
        </div>
        <button className="btn" type="submit" disabled={submitting}>{submitting? 'Creating...':'Create (Pending)'}</button>
      </form>
    </div>
  )
}
