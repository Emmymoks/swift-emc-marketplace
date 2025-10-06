import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useParams, Link } from 'react-router-dom'
import io from 'socket.io-client'

export default function ListingView(){
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef(null);
  useEffect(()=> {
    let mounted = true;
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings/' + id)
      .then(res=>{ if(mounted) setListing(res.data.listing) })
      .catch(()=>{});
    const s = io(import.meta.env.VITE_API_WS||'http://localhost:5000');
    socketRef.current = s;
    const roomId = 'listing_'+id;
    s.emit('joinRoom', roomId);
    s.on('newMessage', (m)=> {
      setMsgs(prev=>{
        // dedupe
        if (m._id && prev.find(x=>x._id===m._id)) return prev
        return [...prev, m]
      });
    });
    return ()=>{ mounted=false; try{ s.disconnect(); }catch(e){} };
  }, [id]);
  async function send(){
    if(!socketRef.current) return;
    const token = localStorage.getItem('token');
    const roomId = 'listing_'+id;
  const message = { from: 'me', text };
  socketRef.current.emit('sendMessage', { roomId, message });
    // also post to server for persistence
    try{
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/messages', { roomId, text, listing: id }, { headers: { Authorization: 'Bearer '+token } });
    }catch(e){}
    setText('');
  }
  if(!listing) return <div className="page">Loading...</div>
  return (
    <div className="page">
      <div style={{display:'flex',gap:12,alignItems:'center'}}>
        <div style={{width:160,height:120}}>
          <img src={listing.images && listing.images[0] ? listing.images[0] : 'https://via.placeholder.com/320x240'} alt="listing" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:8}} />
        </div>
        <div style={{flex:1}}>
          <h2 style={{margin:0}}>{listing.title}</h2>
          {listing.owner && (<div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
            <img src={listing.owner.profilePhotoUrl || 'https://via.placeholder.com/48'} alt="owner" style={{width:48,height:48,objectFit:'cover',borderRadius:8}} />
            <div>
              <div style={{fontWeight:700}}><Link to={'/user/'+encodeURIComponent(listing.owner.username)}>@{listing.owner.username}</Link></div>
              <div className="muted" style={{fontSize:12}}>{listing.owner.location}</div>
            </div>
          </div>)}
        </div>
      </div>
      <p className="muted">{listing.description}</p>
      <p><strong>{listing.price} {listing.currency}</strong></p>
      <div className="chat-box" style={{marginTop:20}}>
        <h4>Chat about this listing</h4>
        <div className="msgs">
          {msgs.map((m,i)=>(
            <div key={m._id || i} style={{marginBottom:6}}>
              <b>{m.from && m.from.username ? m.from.username : (m.from===null ? 'Admin' : (m.from === 'me' ? 'You' : 'User'))}</b>: {m.text}
            </div>
          ))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Message..." />
          <button className="btn" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}
