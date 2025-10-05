import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { io as ioClient } from 'socket.io-client'

export default function SupportChat({ user }){
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState([])
  const [text, setText] = useState('')
  const socketRef = useRef(null)
  const roomId = user ? `support:${user.id || user._id}` : null

  useEffect(()=>{
    if(!roomId) return
    const s = ioClient(import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL.replace(/^http/, 'ws') : undefined)
    socketRef.current = s
    s.on('connect', ()=>{})
    s.on('newMessage', (msg)=>{
      if(msg && msg.roomId === roomId) setMsgs(cur => [...cur, msg])
    })
    // load existing
    (async ()=>{
      try{
        const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/messages/' + roomId)
        setMsgs(res.data.msgs || [])
      }catch(e){}
    })()
    return ()=>{ try{ s.disconnect() }catch(e){} }
  },[roomId])

  async function send(){
    if(!text || !roomId) return
    try{
      const token = localStorage.getItem('token')
      const res = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/messages', { roomId, toId: null, text }, { headers: { Authorization: 'Bearer '+token } })
      setMsgs(m=>[...m, res.data.msg])
      setText('')
    }catch(e){ alert('Send failed') }
  }

  if(!user) return null
  return (
    <div style={{position:'fixed',right:20,bottom:20,width:320,zIndex:60}}>
      <div style={{background:'#fff',border:'1px solid #ddd',borderRadius:8,overflow:'hidden'}}>
        <div style={{padding:8,display:'flex',alignItems:'center',justifyContent:'space-between',background:'#fafafa',borderBottom:'1px solid #eee'}}>
          <div style={{fontWeight:700}}>Support</div>
          <button className="btn ghost" onClick={()=>setOpen(o=>!o)}>{open? '−':'+'}</button>
        </div>
        {open && (
          <div style={{padding:8}}>
            <div style={{height:180,overflow:'auto',marginBottom:8}}>
              {msgs.map(m=> (
                <div key={m._id || Math.random()} style={{marginBottom:6}}>
                  <div style={{fontSize:12,fontWeight:600}}>{m.from ? (m.from.username||'User') : 'You'}</div>
                  <div className="muted">{m.text}</div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8}}>
              <input value={text} onChange={e=>setText(e.target.value)} placeholder="Type a message" />
              <button className="btn" onClick={send}>Send</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
