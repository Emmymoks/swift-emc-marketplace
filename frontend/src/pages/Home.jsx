import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'

export default function Home(){
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(()=>{
    let mounted = true
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings')
      .then(res=>{ if(mounted) setListings(res.data.listings || []) })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  },[])

  return (
    <div className="page home-hero">
      <div className="hero-row">
        <div className="hero-left">
          <h1>Discover unique items & services near you</h1>
          <p className="muted">Fast listings, secure messaging, and trusted local sellers. Start browsing or post your own listing.</p>
          <div style={{marginTop:12}}>
            <Link to="/listings" className="btn">Browse Listings</Link>
            <Link to="/dashboard" className="btn ghost" style={{marginLeft:8}}>Sell Something</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="featured-grid">
            {loading ? <div className="muted">Loading featured...</div> : (
              listings.slice(0,4).map(l=> (
                <Link key={l._id} to={`/listing/${l._id}`} className="card featured">
                  <img src={(l.images && l.images[0]) || ''} alt={l.title} onError={(e)=>e.target.style.opacity=0.6} />
                  <div style={{padding:8}}>
                    <div style={{fontWeight:700}}>{l.title}</div>
                    <div className="muted">{l.price} {l.currency}</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      <div style={{marginTop:18}}>
        <h3>Popular categories</h3>
        <div className="grid listings-grid">
          <div className="card">Electronics</div>
          <div className="card">Vehicles</div>
          <div className="card">Home & Garden</div>
          <div className="card">Services</div>
        </div>
      </div>
    </div>
  )
}
