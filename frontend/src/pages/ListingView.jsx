import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { useParams } from 'react-router-dom'
import io from 'socket.io-client'

export default function ListingView(){
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [socket, setSocket] = useState(null);
  useEffect(()=> {
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/listings/' + id)
      .then(res=>setListing(res.data.listing))
      .catch(()=>{});
    const s = io(import.meta.env.VITE_API_WS||'http://localhost:5000');
    setSocket(s);
    const roomId = 'listing_'+id;
    s.emit('joinRoom', roomId);
    s.on('newMessage', (m)=> {
      setMsgs(prev=>[...prev, m]);
    });
    return ()=> s.disconnect();
  }, [id]);
  async function send(){
    if(!socket) return;
    const token = localStorage.getItem('token');
    const roomId = 'listing_'+id;
    const message = { from: 'me', text };
    socket.emit('sendMessage', { roomId, message });
    // also post to server for persistence
    try{
      await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/messages', { roomId, text, listing: id }, { headers: { Authorization: 'Bearer '+token } });
    }catch(e){}
    setText('');
  }
  if(!listing) return <div>Loading...</div>
  return (
    <div>
      <h2>{listing.title}</h2>
      <p>{listing.description}</p>
      <p><strong>{listing.price} {listing.currency}</strong></p>
      <div style={{border:'1px solid #ccc',padding:10,marginTop:20}}>
        <h4>Chat about this listing</h4>
        <div style={{maxHeight:240,overflow:'auto',marginBottom:6}}>
          {msgs.map((m,i)=>(<div key={i}><b>{m.from}</b>: {m.text}</div>))}
        </div>
        <input value={text} onChange={e=>setText(e.target.value)} placeholder="Message..." />
        <button onClick={send}>Send</button>
      </div>
    </div>
  )
}
