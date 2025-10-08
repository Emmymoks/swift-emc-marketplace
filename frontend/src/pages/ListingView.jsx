import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import ChatPopover from '../components/ChatPopover';

// ✅ Helper constants
const PLACEHOLDER_320x240 = 'https://via.placeholder.com/320x240?text=No+Image';
const PLACEHOLDER_48 = 'https://via.placeholder.com/48';
const resolveImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  return (import.meta.env.VITE_API_URL || 'http://localhost:5000') + url;
};

export default function ListingView() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState('');
  const [openChat, setOpenChat] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    let mounted = true;

    // Fetch listing
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}`)
      .then(res => { if (mounted) setListing(res.data.listing); })
      .catch(console.error);

    // Optional: Load chat history
    axios.get(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages/${id}`)
      .then(res => setMsgs(res.data.messages || []))
      .catch(() => {});

    // Setup socket
    const s = io(import.meta.env.VITE_API_WS || import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      transports: ['websocket'],
    });
    socketRef.current = s;

    const roomId = 'listing_' + id;
    s.emit('joinRoom', roomId);

    const handleNewMessage = (m) => {
      setMsgs(prev => {
        if (m._id && prev.find(x => x._id === m._id)) return prev;
        return [...prev, m];
      });
    };

    s.on('newMessage', handleNewMessage);

    return () => {
      mounted = false;
      s.off('newMessage', handleNewMessage);
      s.emit('leaveRoom', roomId);
      s.disconnect();
    };
  }, [id]);

  async function send() {
    const token = localStorage.getItem('token');
    if (!token) return alert('Please log in to send messages.');
    if (!socketRef.current || !text.trim()) return;

    const roomId = 'listing_' + id;
    const tempId = Date.now().toString();
    const message = { _tempId: tempId, from: 'me', text };

    setMsgs(prev => [...prev, message]);
    socketRef.current.emit('sendMessage', { roomId, message });

    try {
      await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/messages`,
        { roomId, text, listing: id },
        { headers: { Authorization: 'Bearer ' + token } }
      );
    } catch (e) {
      console.error('Message send failed', e);
    }
    setText('');
  }

  // Submit review
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  async function submitReview(){
    const token = localStorage.getItem('token')
    if(!token) return alert('Please log in to review')
    try{
      const res = await axios.post(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/listings/${id}/review`, { rating, comment }, { headers: { Authorization: 'Bearer '+token } })
      setListing(res.data.listing)
      setComment('')
      alert('Thanks for your review')
    }catch(e){ alert('Review failed') }
  }

  if (!listing) return <div className="page">Loading...</div>;

  return (
    <div className="page">
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ width: 160, height: 120 }}>
          <img
            src={resolveImageUrl(listing.images?.[0]) || PLACEHOLDER_320x240}
            alt="listing"
            onError={(e) => { e.target.src = PLACEHOLDER_320x240; }}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
          />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0 }}>{listing.title}</h2>
          {listing.owner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              <img
                src={resolveImageUrl(listing.owner.profilePhotoUrl) || PLACEHOLDER_48}
                alt="owner"
                onError={(e) => { e.target.src = PLACEHOLDER_48; }}
                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 8 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700 }}>
                  <Link to={`/user/${encodeURIComponent(listing.owner.username)}`}>@{listing.owner.username}</Link>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>{listing.owner.location}</div>
              </div>
              <div>
                <button type="button" className="btn ghost" onClick={() => setOpenChat(true)}>Message seller</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <p className="muted">{listing.description}</p>
      <p><strong>{listing.price} {listing.currency}</strong></p>

      <div className="chat-box" style={{ marginTop: 20 }}>
        <h4>Chat about this listing</h4>
        <div className="msgs">
          {msgs.map((m, i) => (
            <div key={m._id || m._tempId || i} style={{ marginBottom: 6 }}>
              <b>{m.from?.username || (m.from === 'me' ? 'You' : 'User')}</b>: {m.text}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <input value={text} onChange={e => setText(e.target.value)} placeholder="Message..." />
          <button className="btn" onClick={send}>Send</button>
        </div>
      </div>

      <div style={{marginTop:18}} className="card">
        <h4>Leave a review</h4>
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <select value={rating} onChange={e=>setRating(Number(e.target.value))}>
            {[5,4,3,2,1].map(v=> <option key={v} value={v}>{v} star{v>1?'s':''}</option>)}
          </select>
          <input value={comment} onChange={e=>setComment(e.target.value)} placeholder="Write a short comment" />
          <button className="btn" onClick={submitReview}>Submit</button>
        </div>
        {listing.reviews && listing.reviews.length>0 && (
          <div style={{marginTop:12}}>
            <h5>Reviews</h5>
            {listing.reviews.map(r=> (
              <div key={r._id} className="card" style={{marginBottom:6}}>
                <div style={{fontWeight:700}}>{r.rating} ★</div>
                <div className="muted">{r.comment}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openChat && (
        <ChatPopover
          listingId={id}
          sellerId={listing.owner?._id}
          onClose={() => setOpenChat(false)}
        />
      )}
    </div>
  );
}
