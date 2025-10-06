import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link } from 'react-router-dom'
import { io as ioClient } from 'socket.io-client'

export default function MyListings(){
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(()=>{
    let mounted = true
    const token = localStorage.getItem('token')
    if(!token){ setLoading(false); return }
    axios.get(`${base}/api/listings/mine`, { headers: { Authorization: 'Bearer '+token } })
      .then(res=>{ if(mounted) setList(res.data.listings || []) })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setLoading(false) })
    // join user room for direct messages - fetch profile if needed
    (async ()=>{
      try{
        let profile = null
        try{ profile = JSON.parse(localStorage.getItem('profile') || 'null') }catch(e){}
        if(!profile){
          const token = localStorage.getItem('token')
          if(!token) return
          const res = await axios.get(`${base}/api/auth/profile`, { headers: { Authorization: 'Bearer '+token } })
          profile = res.data.user
          try{ localStorage.setItem('profile', JSON.stringify(profile)) }catch(e){}
        }
        if(profile && (profile._id || profile.id)){
          const ws = import.meta.env.VITE_API_WS || (import.meta.env.VITE_API_URL || 'http://localhost:5000')
          const s = ioClient(ws, { transports: ['websocket'], reconnection: true })
          const room = `user:${profile._id || profile.id}`
          s.on('connect', ()=> s.emit('joinRoom', room))
          // cleanup on unmount
          return ()=>{ try{ s.emit('leaveRoom', room); s.disconnect() }catch(e){} }
        }
      }catch(e){}
    })()
    return ()=> mounted = false
  },[])

  async function del(id){
    if(!confirm('Delete this listing?')) return
    const token = localStorage.getItem('token')
    try{
      await axios.delete(`${base}/api/listings/${id}`, { headers: { Authorization: 'Bearer '+token } })
      setList(l=>l.filter(x=>x._id !== id))
    }catch(e){ alert('Failed to delete') }
  }

  return (
    <div className="page">
      <h2>My Listings</h2>
      {loading ? <div className="muted">Loading...</div> : (
        list.length===0 ? <div className="muted">You have no listings</div> : (
          <div className="grid listings-grid">
            {list.map(l=> (
              <div key={l._id} className="card">
                <h4>{l.title}</h4>
                <p className="muted">{l.description?.slice(0,120)}</p>
                <div style={{display:'flex',gap:8}}>
                  <Link to={'/listings/'+l._id} className="btn ghost">View</Link>
                  <Link to={'/edit-listing/'+l._id} className="btn">Edit</Link>
                  <button className="btn ghost" onClick={()=>del(l._id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )
      )}
    </div>
  )
}
