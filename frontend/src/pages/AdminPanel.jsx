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
  const [allUsers, setAllUsers] = useState([]);
  const [allListings, setAllListings] = useState([]);
  const [allReviews, setAllReviews] = useState([]);
  const [searchUsername, setSearchUsername] = useState('');
  const [searchResult, setSearchResult] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [msgRoom, setMsgRoom] = useState('');
  const [msgText, setMsgText] = useState('');
  const [socket, setSocket] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Accordion toggles
  const [showUsers, setShowUsers] = useState(false);
  const [showListings, setShowListings] = useState(false);
  const [showReviews, setShowReviews] = useState(false);

  const nav = useNavigate()

  useEffect(()=>{
    const s = sessionStorage.getItem('admin_secret') || '';
    if (!s) nav('/admin-login');
    try{
      const sc = ioClient(import.meta.env.VITE_API_URL || undefined);
      setSocket(sc);
      sc.on('admin:newMessage', (m)=>{
        if(!m) return;
        setInbox(curr => {
          const other = curr.filter(i=>i.roomId!==m.roomId);
          const key = `admin:unread:${m.roomId}`
          const cur = parseInt(localStorage.getItem(key) || '0', 10) || 0
          localStorage.setItem(key, String(cur+1))
          return [{ roomId: m.roomId, text: m.text, from: m.from, unread: cur+1 }, ...other].slice(0,50);
        });
        setUnreadCount(c=>c+1);
        setMessages(curr => (m.roomId === msgRoom ? [...curr, m] : curr));
      });
      sc.on('admin:user:signup', (payload)=>{
        setAnalytics(a=> ({ ...(a||{}), totalUsers: payload.totalUsers }))
      });
    }catch(e){ }
  },[])

  async function loadInbox(){
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/recent-messages', { headers: { 'x-admin-secret': secret } });
      const rooms = res.data.rooms || [];
      setInbox(rooms.map(r=> ({
        roomId: r.roomId,
        text: r.lastMessage.text,
        from: r.lastMessage.from,
        unread: parseInt(localStorage.getItem('admin:unread:'+r.roomId)||'0',10)||0
      })));
    }catch(e){ }
  }

  useEffect(()=>{ loadInbox() }, [])
  useEffect(()=>{ loadAllUsers(); loadAllListings(); loadAllReviews(); }, [])

  async function loadPending(){
    setError(''); setLoading(true);
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings', { headers: { 'x-admin-secret': secret } });
      setPending(res.data.pending || []);
    }catch(e){ setError('Failed to load pending listings.'); setPending([]); }
    finally{ setLoading(false); }
  }

  async function approve(id){
    try{
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/approve', {}, { headers: { 'x-admin-secret': secret } });
      setPending(p=>p.filter(x=>x._id!==id));
    }catch(e){ alert('Approve failed'); }
  }
  async function reject(id){
    try{
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/reject', {}, { headers: { 'x-admin-secret': secret } });
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

  async function loadAllUsers(){
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/users/all', { headers: { 'x-admin-secret': secret } });
      setAllUsers(res.data.users || [])
    }catch(e){ }
  }

  async function loadAllListings(){
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/all', { headers: { 'x-admin-secret': secret } });
      setAllListings(res.data.listings || [])
    }catch(e){}
  }

  async function loadAllReviews(){
    try{
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/reviews', { headers: { 'x-admin-secret': secret } });
      setAllReviews(res.data.reviews || [])
    }catch(e){}
  }

  async function deleteUser(id){ if(!confirm('Delete user and their data?')) return; try{ await axios.delete((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/users/'+id, { headers: { 'x-admin-secret': secret } }); setAllUsers(u=> u.filter(x=> x._id !== id)); }catch(e){ alert('Delete failed') } }
  async function deleteListing(id){ if(!confirm('Delete listing?')) return; try{ await axios.delete((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id, { headers: { 'x-admin-secret': secret } }); setAllListings(l=> l.filter(x=> x._id !== id)); }catch(e){ alert('Delete failed') } }
  async function deleteReview(id){ if(!confirm('Delete review?')) return; try{ await axios.delete((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/reviews/'+id, { headers: { 'x-admin-secret': secret } }); setAllReviews(r=> r.filter(x=> String(x.review._id) !== String(id))); }catch(e){ alert('Delete failed') } }

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
      try{ localStorage.setItem('admin:unread:'+msgRoom, '0'); setInbox(curr=>curr.map(i=> i.roomId===msgRoom? {...i, unread:0}: i)); setUnreadCount(0); }catch(e){}
    }catch(err){ setError('Failed to load messages'); }
    setLoading(false);
  }

  async function replyMessage(){
    if (!msgRoom || !msgText) return;
    try{
      const target = messages.slice().reverse().find(m=>m.from && m.from._id) || messages[0]
      const toId = target ? (target.from?._id || target.to?._id) : null
      const res = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/messages/reply', { roomId: msgRoom, toId, text: msgText }, { headers: { 'x-admin-secret': secret } });
      setMessages(m=>[...m, res.data.msg]);
      setMsgText('');
    }catch(err){ alert('Send failed'); }
  }

  return (
    <div className="page">
      <h2>Admin Panel</h2>

      {/* Pending Listings */}
      <div style={{marginBottom:20}}>
        <h4>Pending Listings</h4>
        <div style={{marginBottom:8}}>
          <button className="btn" onClick={loadPending} disabled={loading}>{loading? 'Loading...':'Refresh'}</button>
          <button className="btn ghost" onClick={()=>setPending([])} style={{marginLeft:8}}>Clear</button>
          <button className="btn" onClick={loadAnalytics} style={{marginLeft:8}}>Load Analytics</button>
        </div>
        {error && <div style={{color:'var(--danger)',marginTop:8}}>{error}</div>}
        <div className="grid listings-grid">
          {pending.length===0 && <div className="muted">No pending listings</div>}
          {pending.map(l=> (
            <div key={l._id} className="card">
              <h4>{l.title}</h4>
              <p className="muted">{l.description}</p>
              <div style={{display:'flex',gap:8}}>
                <button className="btn" onClick={()=>approve(l._id)}>Approve</button>
                <button className="btn danger" onClick={()=>reject(l._id)}>Reject</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Analytics */}
      {analytics && (
        <div className="card" style={{marginBottom:20}}>
          <h4>Site Analytics</h4>
          <div>Total users: {analytics.totalUsers}</div>
          <div>Total listings: {analytics.totalListings}</div>
          <div>Pending listings: {analytics.pendingListings}</div>
          <div>Total messages: {analytics.totalMessages}</div>
          <div>Uptime (s): {Math.round(analytics.uptime)}</div>
        </div>
      )}

      {/* Accordion Sections */}
      <div className="card" style={{marginBottom:20}}>
        <h4 style={{cursor:'pointer'}} onClick={()=>setShowUsers(!showUsers)}>👤 Users {showUsers?'▲':'▼'}</h4>
        {showUsers && (
          <div style={{marginTop:8}}>
            {allUsers.map(u=>(
              <div key={u._id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #eee'}}>
                <div>{u.username} <span className="muted" style={{fontSize:12}}>{u.email}</span></div>
                <button className="btn danger" onClick={()=>deleteUser(u._id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{marginBottom:20}}>
        <h4 style={{cursor:'pointer'}} onClick={()=>setShowListings(!showListings)}>📦 Listings {showListings?'▲':'▼'}</h4>
        {showListings && (
          <div style={{marginTop:8}}>
            {allListings.map(l=>(
              <div key={l._id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px solid #eee'}}>
                <div><strong>{l.title}</strong> <span className="muted">by {l.owner?.username}</span></div>
                <button className="btn danger" onClick={()=>deleteListing(l._id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card" style={{marginBottom:20}}>
        <h4 style={{cursor:'pointer'}} onClick={()=>setShowReviews(!showReviews)}>⭐ Reviews {showReviews?'▲':'▼'}</h4>
        {showReviews && (
          <div style={{marginTop:8}}>
            {allReviews.map(rv=>(
              <div key={rv.review._id} style={{padding:'6px 0',borderBottom:'1px solid #eee'}}>
                <strong>{rv.review.rating}★</strong> — {rv.listingTitle}
                <div className="muted">{rv.review.comment}</div>
                <button className="btn danger" style={{marginTop:4}} onClick={()=>deleteReview(rv.review._id)}>Delete</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chat Section */}
      <div className="card" style={{marginBottom:40}}>
        <h4>💬 Messages / Complaints {unreadCount>0 && <span style={{background:'var(--accent)',color:'#fff',borderRadius:12,padding:'2px 8px',fontSize:12,marginLeft:8}}>{unreadCount}</span>}</h4>
        <div style={{display:'flex',gap:12,marginTop:10}}>
          <div style={{width:'35%',borderRight:'1px solid #eee',paddingRight:8,maxHeight:260,overflow:'auto'}}>
            {inbox.length===0 && <div className="muted">No messages</div>}
            {inbox.map(i=>(
              <div key={i.roomId}
                className="card"
                style={{marginBottom:6,cursor:'pointer',padding:8,background:msgRoom===i.roomId?'#f0f6ff':''}}
                onClick={()=>{ setMsgRoom(i.roomId); loadMessages(); setUnreadCount(0); }}>
                <div style={{fontWeight:700}}>{i.from?.username || 'User'}</div>
                <div className="muted" style={{fontSize:13}}>{i.text}</div>
                {i.unread>0 && <div style={{color:'var(--danger)',fontSize:12}}>Unread: {i.unread}</div>}
              </div>
            ))}
          </div>

          <div style={{flex:1,display:'flex',flexDirection:'column',maxHeight:260}}>
            <div style={{flex:1,overflow:'auto',padding:'4px 8px',border:'1px solid #ddd',borderRadius:6,background:'#fafafa'}}>
              {messages.length===0 && <div className="muted">No messages loaded</div>}
              {messages.map(m=>(
                <div key={m._id} style={{margin:'4px 0',textAlign: m.from?.role==='admin' ? 'right':'left'}}>
                  <div style={{
                    display:'inline-block',
                    background:m.from?.role==='admin' ? 'var(--accent)' : '#e9ecef',
                    color:m.from?.role==='admin' ? '#fff' : '#333',
                    padding:'6px 10px',
                    borderRadius:8,
                    maxWidth:'80%'
                  }}>
                    {m.text}
                  </div>
                </div>
              ))}
            </div>
            <div style={{display:'flex',gap:8,marginTop:8}}>
              <input placeholder="Reply..." value={msgText} onChange={e=>setMsgText(e.target.value)} />
              <button className="btn" onClick={replyMessage}>Send</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
