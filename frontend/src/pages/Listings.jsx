import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
export default function Listings(){
  const [list, setList] = useState([]);
  useEffect(()=> {
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings')
      .then(res=>setList(res.data.listings || []))
      .catch(()=>setList([]));
  }, []);
  return (
    <div className="page">
      <h2>Browse Listings</h2>
      {list.length===0 ? <div className="muted">No listings found</div> : (
      <div className="grid listings-grid">
        {list.map(l=>(
          <div key={l._id} className="card">
            <h3>{l.title}</h3>
            <p className="muted">{l.description?.slice(0,120)}</p>
            <p><strong>{l.price} {l.currency}</strong></p>
            <Link to={'/listings/'+l._id} className="btn ghost">View</Link>
          </div>
        ))}
      </div>)}
    </div>
  )
}
