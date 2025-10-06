import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'

export default function UserProfile(){
  const { username } = useParams()
  const [user, setUser] = useState(null)
  const [listings, setListings] = useState([])
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'

  useEffect(()=>{
    let mounted = true
    axios.get(`${base}/api/auth/user/${encodeURIComponent(username)}`)
      .then(res=>{ if(mounted) setUser(res.data.user) })
      .catch(()=>{})
    axios.get(`${base}/api/listings`)
      .then(res=>{ if(mounted) setListings((res.data.listings||[]).filter(l=> l.owner && l.owner.username === username)) })
      .catch(()=>{})
    return ()=>{ mounted=false }
  },[username])

  if(!user) return <div className="page"><div className="muted">User not found</div></div>

  return (
    <div className="page">
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <img src={user.profilePhotoUrl || 'https://via.placeholder.com/96'} alt="avatar" style={{width:96,height:96,objectFit:'cover',borderRadius:12}} />
        <div>
          <h2 style={{margin:0}}>{user.fullName || user.username}</h2>
          <div className="muted">@{user.username}</div>
          <div style={{marginTop:8}}>{user.bio}</div>
        </div>
      </div>

      <h3 style={{marginTop:20}}>Listings by {user.username}</h3>
      {listings.length===0 ? <div className="muted">No listings by this user</div> : (
        <div className="grid listings-grid">
          {listings.map(l=> (
            <div key={l._id} className="card">
              <h4>{l.title}</h4>
              <p className="muted">{l.description?.slice(0,120)}</p>
              <Link to={'/listings/'+l._id} className="btn ghost">View</Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
