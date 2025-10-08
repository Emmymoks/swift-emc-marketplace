import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { getSocket } from '../lib/socket'

export default function ChatPopover({ roomId, listingId, sellerId, onClose }){
  const [open, setOpen] = useState(true)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const mounted = useRef(true)
  const socketRef = useRef(null)
  const base = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  const myId = (()=>{
    try{ const p = localStorage.getItem('profile'); return p ? JSON.parse(p)._id : null }catch(e){ return null }
  })()

  useEffect(()=>{ mounted.current = true; return ()=> mounted.current = false },[])

  useEffect(()=>{
    // Determine room identifier
    // If both sellerId and myId available, use deterministic 2-user room: user:<min>_<max>
    let r = roomId || null
    if(!r){
      if(listingId) r = `listing_${listingId}`
      else if(sellerId && myId){
        try{
          const a = String(myId)
          const b = String(sellerId)
          r = `user:${a < b ? a + '_' + b : b + '_' + a}`
        }catch(e){ r = `user:${sellerId}` }
      }else if(sellerId) r = `user:${sellerId}`
    }
    if(!r) return

    // initialize socket
    let socket
    try{
      socket = getSocket()
      socketRef.current = socket
    }catch(e){ socket = null; socketRef.current = null }

    // Guarded attach
    try{
      if(socket){
        // avoid duplicate listeners
        socket.off && socket.off('newMessage')
        socket.emit && socket.emit('joinRoom', r)
        socket.on && socket.on('newMessage', handleNew)
      }
    }catch(e){ /* non-fatal */ }

    // load history (safe)
    (async ()=>{
      try{
        const token = localStorage.getItem('token')
        const res = await axios.get(`${base}/api/messages/${encodeURIComponent(r)}`, { headers: { Authorization: token ? ('Bearer '+token) : '' } })
        if(mounted.current) setMsgs(Array.isArray(res.data.msgs) ? res.data.msgs : [])
      }catch(e){ /* ignore fetch errors, show empty state */ }
    })()

    return ()=>{
      try{
        if(socket){ socket.emit && socket.emit('leaveRoom', r); socket.off && socket.off('newMessage', handleNew) }
      }catch(e){}
    }
  },[roomId, listingId, sellerId])

  function handleNew(m){
    try{
      if(!m) return
      setMsgs(prev=>{
        try{
          if(m._id && prev.find(x=>x._id===m._id)) return prev
        }catch(e){}
        return [...prev, m]
      })
    }catch(e){}
  }

  async function send(){
    if(!text.trim()) return
    // compute the same deterministic room id as the loader
    let r = roomId || null
    if(!r){
      if(listingId) r = `listing_${listingId}`
      else if(sellerId && myId){
        try{ const a = String(myId), b = String(sellerId); r = `user:${a < b ? a + '_' + b : b + '_' + a}` }catch(e){ r = `user:${sellerId}` }
      }else if(sellerId) r = `user:${sellerId}`
    }
    const token = localStorage.getItem('token')
    try{
      await axios.post(`${base}/api/messages`, { roomId: r, text, listing: listingId || null, toId: sellerId || null }, { headers: { Authorization: token ? ('Bearer '+token) : '' } })
      setText('')
    }catch(e){ alert('Send failed') }
  }

  async function deleteMessage(id){
    if(!id) return;
    const token = localStorage.getItem('token')
    try{
      await axios.delete(`${base}/api/messages/${encodeURIComponent(id)}`, { headers: { Authorization: token ? ('Bearer '+token) : '' } })
      setMsgs(prev=> prev.filter(x=> String(x._id) !== String(id)))
    }catch(e){ alert('Delete failed') }
  }

  async function deleteConversation(){
    // compute room
    let r = roomId || null
    if(!r){
      if(listingId) r = `listing_${listingId}`
      else if(sellerId && myId){
        try{ const a = String(myId), b = String(sellerId); r = `user:${a < b ? a + '_' + b : b + '_' + a}` }catch(e){ r = `user:${sellerId}` }
      }else if(sellerId) r = `user:${sellerId}`
    }
    const token = localStorage.getItem('token')
    if(!r) return
    try{
      await axios.delete(`${base}/api/messages/conversations/${encodeURIComponent(r)}`, { headers: { Authorization: token ? ('Bearer '+token) : '' } })
      setMsgs([])
      if(onClose) onClose()
    }catch(e){ alert('Failed to delete conversation') }
  }

  function senderInfo(m){
    if(!m) return { name: 'Unknown', mine: false }
    const mine = !!(m.from && (String(m.from._id || m.from) === String(myId)))
    let name = 'User'
    try{
      if(!m.from || m.from === null) name = 'Admin'
      else if(typeof m.from === 'string') name = m.from
      else if(m.from.username) name = m.from.username
    }catch(e){}
    return { name, mine }
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
          <div style={{padding:8, height:220, overflowY:'auto', background:'#fff'}}>
          {msgs.length===0 ? <div className="muted">No messages</div> : msgs.map((m,i)=> {
            const info = senderInfo(m)
            const mine = info.mine
            return (
              <div key={m._id || i} style={{marginBottom:8, textAlign: mine ? 'right' : 'left'}}>
                <div style={{display:'inline-block',padding:'6px 10px',borderRadius:12,background: mine ? '#007bff' : '#f0f0f0', color: mine ? '#fff' : '#333'}}>
                  <div style={{fontSize:11,fontWeight:700,marginBottom:6}}>{info.name}</div>
                  <div>{m.text}</div>
                </div>
              </div>
            )
          })}
        </div>
        <div style={{padding:8,display:'flex',gap:8,flexDirection:'column'}}>
          <div style={{display:'flex',gap:8}}>
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message..." onKeyDown={e=> e.key==='Enter' && send()} />
          <button type="button" className="btn" onClick={send}>Send</button>
          </div>
          <div style={{display:'flex',justifyContent:'flex-end'}}>
            <a href="/chats" onClick={(e)=>{ e.preventDefault(); window.location.href = '/chats' }} className="btn ghost">Open all chats</a>
          </div>
        </div>
      </div>
    </div>
  )
}
