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

  // Demo items fallback
  const DEMO_ITEMS = [
  { _id:'demo1', title:'Vintage Camera', price:120, currency:'USD', images:['https://images.unsplash.com/photo-1484704849700-f032a568e944?auto=format&fit=crop&w=800&q=60'], description:'Classic 35mm camera in working condition.' },
    { _id:'demo2', title:'Mountain Bike', price:450, currency:'USD', images:['https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=60'], description:'Hardtail bike, great for trails.' },
  { _id:'demo3', title:'iPhone 12', price:350, currency:'USD', images:['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=800&q=60'], description:'Used phone with new battery.' },
    { _id:'demo4', title:'Wooden Desk', price:200, currency:'USD', images:['https://images.unsplash.com/photo-1499955085172-a104c9463ece?auto=format&fit=crop&w=800&q=60'], description:'Sturdy desk for home office.' },
    { _id:'demo5', title:'Acoustic Guitar', price:220, currency:'USD', images:['https://images.unsplash.com/photo-1511376777868-611b54f68947?auto=format&fit=crop&w=800&q=60'], description:'Great tone, minor wear.' },
    { _id:'demo6', title:'Coffee Maker', price:45, currency:'USD', images:['https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=800&q=60'], description:'Brews excellent coffee.' },
    { _id:'demo7', title:'Used Textbooks', price:30, currency:'USD', images:['https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=800&q=60'], description:'College textbooks bundle.' },
    { _id:'demo8', title:'Garden Tools Set', price:60, currency:'USD', images:['https://images.unsplash.com/photo-1518976024611-3f9a4c0aef1a?auto=format&fit=crop&w=800&q=60'], description:'Set includes spade, rake, and shears.' },
    { _id:'demo9', title:'Laptop Stand', price:25, currency:'USD', images:['https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&w=800&q=60'], description:'Aluminum adjustable stand.' },
    { _id:'demo10', title:'Fitness Mat', price:20, currency:'USD', images:['https://images.unsplash.com/photo-1599058917215-5e3a5b0b9d2e?auto=format&fit=crop&w=800&q=60'], description:'Non-slip yoga/fitness mat.' }
  ]

  // if no listings are loaded, show demo items as a friendly fallback
  const visibleListings = (listings && listings.length>0) ? listings : DEMO_ITEMS

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
              visibleListings.slice(0,6).map(l=> {
                const isDemo = String(l._id||'').startsWith('demo')
                const Img = (<img src={resolveImageUrl((l.images && l.images[0])||'')||'https://via.placeholder.com/320x240'} alt={l.title} onError={(e)=>{ e.target.onerror=null; e.target.src='https://via.placeholder.com/320x240' }} />)
                return isDemo ? (
                  <div key={l._id} className="card featured" style={{cursor:'default'}}>
                    {Img}
                    <div style={{padding:8}}>
                      <div style={{fontWeight:700}}>{l.title}</div>
                      <div className="muted">{l.price} {l.currency}</div>
                    </div>
                  </div>
                ) : (
                  <Link key={l._id} to={`/listing/${l._id}`} className="card featured">
                    {Img}
                    <div style={{padding:8}}>
                      <div style={{fontWeight:700}}>{l.title}</div>
                      <div className="muted">{l.price} {l.currency}</div>
                    </div>
                  </Link>
                )
              })
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
