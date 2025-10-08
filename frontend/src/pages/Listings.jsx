import React, { useEffect, useState } from 'react'
import { resolveImageUrl, PLACEHOLDER_280x200, PLACEHOLDER_48 } from '../lib/image'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import ChatPopover from '../components/ChatPopover'

export default function Listings(){
  const [list, setList] = useState([]);
  const nav = useNavigate()
  useEffect(()=> {
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings')
      .then(res=>setList(res.data.listings || []))
      .catch(()=>setList([]));
  }, []);
  const [activeChat, setActiveChat] = useState(null) // listing id currently chatted

  return (
    <div className="page">
      <h2>Browse Listings</h2>
      {list.length===0 ? <div className="muted">No listings found</div> : (
      <div className="grid listings-grid">
        {list.map(l=>(
          <div key={l._id} className="card listing-card">
            <div style={{display:'flex',gap:12}}>
                <div style={{width:140,height:100,flex:'0 0 140px'}}>
                <img src={resolveImageUrl(l.images && l.images[0]) || PLACEHOLDER_280x200} alt="listing" onError={(e)=>{ e.target.onerror=null; e.target.src=PLACEHOLDER_280x200 }} style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
              </div>
              <div style={{flex:1}}>
                <h3 style={{marginTop:0}}>{l.title}</h3>
                <p className="muted" style={{margin:'6px 0'}}>{l.description?.slice(0,180)}</p>
                <p style={{margin:'6px 0'}}><strong>{l.price} {l.currency}</strong></p>
                <div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}>
                  {l.owner && (
                    <>
                        <img src={resolveImageUrl(l.owner.profilePhotoUrl) || PLACEHOLDER_48} alt="owner" onError={(e)=>{ e.target.onerror=null; e.target.src=PLACEHOLDER_48 }} style={{width:48,height:48,objectFit:'cover',borderRadius:8}} />
                              <div style={{display:'flex',flexDirection:'column'}}>
                                <Link to={'/user/'+encodeURIComponent(l.owner.username)} style={{fontWeight:700}} className="no-underline">{l.owner.username}</Link>
                                <div className="muted" style={{fontSize:12}}>{l.owner.location}</div>
                              </div>
                    </>
                  )}
                </div>
              </div>
            </div>
                <div style={{display:'flex',gap:8,marginTop:12}}>
              <Link to={'/listings/'+l._id} className="btn">View</Link>
              <button type="button" className="btn ghost" onClick={()=>{
                const token = localStorage.getItem('token')
                if(!token){ nav('/listings/'+l._id); return }
                setActiveChat(l._id)
              }}>Message seller</button>
              {activeChat === l._id && (
                <ChatPopover listingId={l._id} sellerId={l.owner && l.owner._id} onClose={()=>setActiveChat(null)} />
              )}
            </div>
          </div>
        ))}
      </div>)}
    </div>
  )
}
