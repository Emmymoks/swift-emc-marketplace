import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { io as ioClient } from 'socket.io-client'
import axios from 'axios'

export default function AdminPanel(){
  const [pending, setPending] = useState([]);
  const [secret, setSecret] = useState(()=> sessionStorage.getItem('admin_secret') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analytics, setAnalytics] = useState(null);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [msgRoom, setMsgRoom] = useState('');
  const [msgText, setMsgText] = useState('');
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  const nav = useNavigate()

  useEffect(()=>{
    // if admin secret not present, redirect to admin login
    const s = sessionStorage.getItem('admin_secret') || '';
    if (!s) nav('/admin-login');
    // setup socket
    try{
  const sc = ioClient(import.meta.env.VITE_API_URL || undefined);
      setSocket(sc);
      sc.on('admin:newMessage', (m)=>{
        if(!m) return;
        // add to inbox (dedupe by roomId, keep latest message preview)
        setInbox(curr => {
          const other = curr.filter(i=>i.roomId!==m.roomId);
          return [{ roomId: m.roomId, text: m.text, from: m.from }, ...other].slice(0,50);
        });
        setUnreadCount(c=>c+1);
        // if admin currently viewing this room, append to messages list
        setMessages(curr => (m.roomId === msgRoom ? [...curr, m] : curr));
      });
      sc.on('admin:user:signup', (payload)=>{
        setAnalytics(a=> ({ ...(a||{}), totalUsers: payload.totalUsers }))
      });
    }catch(e){ }
    return ()=>{ try{ if(sc) sc.disconnect(); }catch(e){} }
  },[])

  async function loadPending(){
    setError('');
    setLoading(true);
    try{
      const secretToUse = secret;
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings', { headers: { 'x-admin-secret': secretToUse } });
      setPending(res.data.pending || []);
    }catch(e){
      setError('Failed to load pending listings.');
      setPending([]);
    }finally{ setLoading(false); }
  }

  async function approve(id){
    try{
      const secretToUse = secret || sessionStorage.getItem('admin_secret') || '';
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/approve', {}, { headers: { 'x-admin-secret': secretToUse } });
      setPending(p=>p.filter(x=>x._id!==id));
    }catch(e){ alert('Approve failed'); }
  }
  async function reject(id){
    try{
      const secretToUse = secret || sessionStorage.getItem('admin_secret') || '';
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/reject', {}, { headers: { 'x-admin-secret': secretToUse } });
      setPending(p=>p.filter(x=>x._id!==id));
    }catch(e){ alert('Reject failed'); }
  }

  async function loadAnalytics(){
    setLoading(true);
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/analytics', { headers: { 'x-admin-secret': secret } });
      setAnalytics(res.data);
    }catch(err){ setError('Failed to load analytics'); }
    setLoading(false);
  }

  async function searchUser(){
    if (!searchUsername) return;
    setLoading(true); setSearchResult(null);
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/users', { params: { username: searchUsername }, headers: { 'x-admin-secret': secret } });
      setSearchResult(res.data);
    }catch(err){ setError('User not found or search failed'); }
    setLoading(false);
  }

  async function loadMessages(){
    if (!msgRoom) return setError('Enter roomId to load messages');
    setLoading(true);
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/messages', { params: { roomId: msgRoom }, headers: { 'x-admin-secret': secret } });
      setMessages(res.data.msgs || []);
    }catch(err){ setError('Failed to load messages'); }
    setLoading(false);
  }

  async function replyMessage(){
    if (!msgRoom || !msgText) return;
    try{
      // determine reply target: pick last non-null 'from' user in messages for the room
      const target = messages.slice().reverse().find(m=>m.from && m.from._id) || messages[0]
      const toId = target ? (target.from?._id || target.to?._id) : null
      const res = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/messages/reply', { roomId: msgRoom, toId, text: msgText }, { headers: { 'x-admin-secret': secret } });
      // append locally
      setMessages(m=>[...m, res.data.msg]);
      setMsgText('');
    }catch(err){ alert('Send failed'); }
  }

  return (
    <div className="page">
      <h2>Admin Panel</h2>
      <div style={{display:'flex',gap:16,alignItems:'center'}}>
        <div style={{flex:1}}>
          <h4>Pending listings</h4>
          <div style={{marginBottom:8}}>
            <button className="btn" onClick={loadPending} disabled={loading}>{loading? 'Loading...':'Refresh pending'}</button>
            <button className="btn ghost" onClick={()=>setPending([])} style={{marginLeft:8}}>Clear list</button>
            <button className="btn" onClick={loadAnalytics} style={{marginLeft:8}}>Load analytics</button>
          </div>
          {error && <div style={{color:'var(--danger)',marginTop:8}}>{error}</div>}
          <div className="grid listings-grid">
            {pending.length===0 && <div className="muted">No pending listings</div>}
            {pending.map(l=> (
              <div key={l._id} className="card">
                <h4>{l.title}</h4>
                <p className="muted">{l.description}</p>
                <div className="admin-controls">
                  <button className="btn" onClick={()=>approve(l._id)}>Approve</button>
                  <button className="btn danger" onClick={()=>reject(l._id)}>Reject</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{width:360}}>
          <h4>Site analytics</h4>
          {analytics ? (
            <div className="card">
              <div>Total users: {analytics.totalUsers}</div>
              <div>Total listings: {analytics.totalListings}</div>
              <div>Pending listings: {analytics.pendingListings}</div>
              <div>Total messages: {analytics.totalMessages}</div>
              <div>Uptime (s): {Math.round(analytics.uptime)}</div>
            </div>
          ) : <div className="muted">No analytics loaded</div>}

          <h4 style={{marginTop:12}}>Search user</h4>
          <div style={{display:'flex',gap:8}}>
            <input placeholder="username" value={searchUsername} onChange={e=>setSearchUsername(e.target.value)} />
            <button className="btn" onClick={searchUser}>Search</button>
          </div>
          {searchResult && (
            <div className="card" style={{marginTop:8}}>
              <div><strong>{searchResult.user.username}</strong> ({searchResult.user.email})</div>
              <div>{searchResult.user.fullName}</div>
              <div style={{marginTop:8}}><strong>Listings</strong></div>
              {searchResult.listings.length===0 && <div className="muted">No listings</div>}
              {searchResult.listings.map(l=> <div key={l._id} className="muted">{l.title} - {l.approved? 'approved':'pending'}</div>)}
            </div>
          )}

          <h4 style={{marginTop:12}}>Messages / complaints {unreadCount>0 && <span style={{background:'var(--accent)',color:'#fff',borderRadius:12,padding:'2px 8px',fontSize:12,marginLeft:8}}>{unreadCount}</span>}</h4>
          <div style={{display:'flex',gap:8}}>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:700}}>Inbox</div>
              <div style={{maxHeight:120,overflow:'auto',marginTop:8}}>
                {inbox.length===0 && <div className="muted">No messages</div>}
                {inbox.map(i=> (
                  <div key={i.roomId} className="card" style={{marginBottom:6,cursor:'pointer'}} onClick={()=>{ setMsgRoom(i.roomId); loadMessages(); setUnreadCount(0); }}>
                    <div style={{fontWeight:700}}>{i.from?.username || 'User'}</div>
                    <div className="muted">{i.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{maxHeight:220,overflow:'auto',marginTop:8}}>
            {messages.length===0 && <div className="muted">No messages loaded</div>}
            {messages.map(m=> (
              <div key={m._id} className="card" style={{marginBottom:6}}>
                <div style={{fontSize:13}}><strong>{m.from?.username || 'Admin'}</strong> → <em>{m.to?.username || 'User'}</em></div>
                <div className="muted">{m.text}</div>
              </div>
            ))}
          </div>
          <div style={{display:'flex',gap:8,marginTop:8}}>
            <input placeholder="Reply text" value={msgText} onChange={e=>setMsgText(e.target.value)} />
            <button className="btn" onClick={replyMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  )
}
