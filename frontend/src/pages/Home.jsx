import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import { resolveImageUrl } from '../lib/image'

export default function Home(){
  const [listings, setListings] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const nav = useNavigate()
  const timer = useRef(null)
  useEffect(()=>{
    let mounted = true
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings')
      .then(res=>{ if(mounted) setListings(res.data.listings || []) })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  },[])

  async function handleSearch(q){
    setQuery(q)
    if(timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(async ()=>{
      if(!q || q.trim().length < 2) { setSuggestions([]); return }
      try{
        const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings', { params: { q } })
        setSuggestions(res.data.listings || [])
        setShowSuggestions(true)
      }catch(e){ setSuggestions([]) }
    }, 220)
  }

  function goToSearchResults(q){
    setShowSuggestions(false)
    nav('/listings?q=' + encodeURIComponent(q))
  }

  return (
    <div className="page home-hero">
      <div className="hero-row">
        <div className="hero-left">
          <h1>Discover unique items & services near you</h1>
          <p className="muted">Fast listings, secure messaging, and trusted local sellers. Start browsing or post your own listing.</p>

          <div style={{marginTop:12}} className="search-animated">
            <input value={query} onChange={e=>handleSearch(e.target.value)} placeholder="Search items or services... (try 'bike', 'plumbing', 'phone')" onFocus={()=>setShowSuggestions(true)} onBlur={()=> setTimeout(()=>setShowSuggestions(false), 180)} />
            <button className="search-btn" onClick={()=>goToSearchResults(query)}>Search</button>
            {showSuggestions && suggestions.length>0 && (
              <div className="search-suggestions">
                {suggestions.slice(0,8).map(s=> (
                  <div key={s._id} className="search-suggestion" onClick={()=> goToSearchResults(s.title || s._id)}>
                    <div style={{display:'flex',gap:8,alignItems:'center'}}>
                      <img src={resolveImageUrl((s.images && s.images[0])||'')} alt="thumb" style={{width:48,height:36,borderRadius:6,objectFit:'cover'}} onError={(e)=> e.target.src = 'https://via.placeholder.com/48'} />
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700}}>{s.title}</div>
                        <div className="muted" style={{fontSize:12}}>{s.price} {s.currency}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{marginTop:14}}>
            <Link to="/listings" className="btn">Browse Listings</Link>
            <Link to="/dashboard" className="btn ghost" style={{marginLeft:8}}>Sell Something</Link>
          </div>
        </div>
        <div className="hero-right">
          <div className="featured-grid">
            {loading ? <div className="muted">Loading featured...</div> : (
              listings.slice(0,4).map(l=> (
                <Link key={l._id} to={`/listing/${l._id}`} className="card featured">
                  <img src={resolveImageUrl((l.images && l.images[0])||'')} alt={l.title} onError={(e)=>{ e.target.src='https://via.placeholder.com/320x240' }} />
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
