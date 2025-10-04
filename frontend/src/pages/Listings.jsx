import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
export default function Listings(){
  const [list, setList] = useState([]);
  useEffect(()=> {
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings')
      .then(res=>setList(res.data.listings))
      .catch(()=>{});
  }, []);
  return (
    <div>
      <h2>Browse Listings</h2>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12}}>
        {list.map(l=>(
          <div key={l._id} style={{border:'1px solid #ddd',padding:10,borderRadius:8}}>
            <h3>{l.title}</h3>
            <p>{l.description?.slice(0,120)}</p>
            <p><strong>{l.price} {l.currency}</strong></p>
            <Link to={'/listings/'+l._id}>View</Link>
          </div>
        ))}
      </div>
    </div>
  )
}
