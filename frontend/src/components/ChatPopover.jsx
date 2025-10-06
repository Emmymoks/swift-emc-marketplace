import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { getSocket } from '../lib/socket'

export default function ChatPopover({ roomId, listingId, sellerId, onClose }){
  const [open, setOpen] = useState(true)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const mounted = useRef(true)
  const socket = getSocket()
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const myId = (()=>{
    try{ const p = localStorage.getItem('profile'); return p ? JSON.parse(p)._id : null }catch(e){ return null }
  })()

  useEffect(()=>{ mounted.current = true; return ()=> mounted.current = false },[])

  useEffect(()=>{
    if(!socket) return
    const r = roomId || (listingId ? `listing_${listingId}` : `user:${sellerId}`)
    socket.emit('joinRoom', r)
    socket.on('newMessage', handleNew)

    // load history
    (async ()=>{
      try{
        const token = localStorage.getItem('token')
        const res = await axios.get(`${base}/api/messages/${encodeURIComponent(r)}`, { headers: { Authorization: 'Bearer '+token } })
        if(mounted.current) setMsgs(res.data.msgs || [])
      }catch(e){}
    })()

    return ()=>{
      try{ socket.emit('leaveRoom', r); socket.off('newMessage', handleNew) }catch(e){}
    }
  },[roomId, listingId, sellerId])

  function handleNew(m){
    if(!m) return
    setMsgs(prev=>{
      if(m._id && prev.find(x=>x._id===m._id)) return prev
      return [...prev, m]
    })
  }

  async function send(){
    if(!text.trim()) return
    const r = roomId || (listingId ? `listing_${listingId}` : `user:${sellerId}`)
    const token = localStorage.getItem('token')
    try{
      await axios.post(`${base}/api/messages`, { roomId: r, text, listing: listingId || null, toId: sellerId || null }, { headers: { Authorization: 'Bearer '+token } })
      setText('')
    }catch(e){ alert('Send failed') }
  }

  if(!open) return null
  return (
    <div style={{position:'absolute',right:0,bottom:0,width:320,maxWidth:'100%',zIndex:9999}} className="chat-popover">
      <div style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,overflow:'hidden',boxShadow:'0 6px 18px rgba(0,0,0,0.12)'}}>
        <div style={{padding:8,display:'flex',justifyContent:'space-between',alignItems:'center',background:'#fafafa',borderBottom:'1px solid #eee'}}>
          <div style={{fontWeight:700}}>Chat</div>
          <div>
            <button type="button" className="btn ghost" onClick={()=>{ setOpen(false); if(onClose) onClose() }}>Close</button>
          </div>
        </div>
        <div style={{padding:8, height:260, overflowY:'auto', background:'#fff'}}>
          {msgs.length===0 ? <div className="muted">No messages</div> : msgs.map(m=> {
            const mine = m.from && (String(m.from._id) === String(myId))
            return (
              <div key={m._id || Math.random()} style={{marginBottom:8, textAlign: mine ? 'right' : 'left'}}>
                <div style={{display:'inline-block',padding:'6px 10px',borderRadius:12,background: mine ? '#007bff' : '#f0f0f0', color: mine ? '#fff' : '#333'}}>
                  {(!m.from || m.from===null) ? <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>Admin</div> : (m.from && m.from.username ? <b>{m.from.username}</b> : null)}
                  <div>{m.text}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{padding:8,display:'flex',gap:8}}>
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message..." onKeyDown={e=> e.key==='Enter' && send()} />
          <button type="button" className="btn" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}
