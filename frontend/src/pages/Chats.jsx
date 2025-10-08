import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Link, useNavigate } from 'react-router-dom'
import ChatPopover from '../components/ChatPopover'

export default function Chats(){
  const [convs, setConvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeRoom, setActiveRoom] = useState(null)
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const nav = useNavigate()

  useEffect(()=>{
    let mounted = true
    const token = localStorage.getItem('token')
    if(!token){ setLoading(false); return }
    axios.get(`${base}/api/messages/conversations/list`, { headers: { Authorization: 'Bearer '+token } })
      .then(res=>{ if(mounted) setConvs(res.data.conversations || []) })
      .catch(()=>{})
      .finally(()=>{ if(mounted) setLoading(false) })
    return ()=> mounted = false
  }, [])

  if(!localStorage.getItem('token')) return (
    <div className="page"><h3>Please log in to view your chats</h3></div>
  )

  return (
    <div className="page">
      <h2>Your Chats</h2>
      {loading ? <div className="muted">Loading...</div> : (
        <div style={{display:'flex',gap:12}}>
          <div style={{width:320}}>
            {convs.length===0 ? <div className="muted">No conversations yet</div> : (
              convs.map(c=> (
                <div key={c.roomId} style={{padding:8,borderBottom:'1px solid #eee',display:'flex',alignItems:'center',gap:8}}>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700}}>{c.partner && (c.partner.username || c.partner.email)}</div>
                    <div className="muted" style={{fontSize:13}}>{c.lastMessage}</div>
                  </div>
                  <div>
                    <button className="btn" onClick={()=> setActiveRoom(c.roomId)}>Open</button>
                    <button className="btn ghost" style={{marginLeft:8}} onClick={async()=>{
                      const token = localStorage.getItem('token')
                      if(!confirm('Delete this conversation for you? This will remove all messages locally for this conversation.')) return
                      try{ await axios.delete(`${base}/api/messages/conversations/${encodeURIComponent(c.roomId)}`, { headers: { Authorization: token ? ('Bearer '+token) : '' } }); setConvs(prev=> prev.filter(x=> x.roomId !== c.roomId)); if(activeRoom===c.roomId) setActiveRoom(null) }catch(e){ alert('Delete failed') }
                    }}>Delete</button>
                  </div>
                </div>
              ))
            )}
          </div>
          <div style={{flex:1}}>
            {activeRoom ? <ChatPopover roomId={activeRoom} onClose={()=>setActiveRoom(null)} /> : <div className="muted">Select a conversation to open</div>}
          </div>
        </div>
      )}
    </div>
  )
}
