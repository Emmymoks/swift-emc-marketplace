import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
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
      setMsgs(prev=>[...prev, m]);
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
      <h2>{listing.title}</h2>
      <p className="muted">{listing.description}</p>
      <p><strong>{listing.price} {listing.currency}</strong></p>
      <div className="chat-box" style={{marginTop:20}}>
        <h4>Chat about this listing</h4>
        <div className="msgs">
          {msgs.map((m,i)=>(<div key={i}><b>{m.from}</b>: {m.text}</div>))}
        </div>
        <div style={{display:'flex',gap:8,marginTop:8}}>
          <input value={text} onChange={e=>setText(e.target.value)} placeholder="Message..." />
          <button className="btn" onClick={send}>Send</button>
        </div>
      </div>
    </div>
  )
}
