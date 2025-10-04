import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminPanel(){
  const [pending, setPending] = useState([]);
  const [secret, setSecret] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadPending(s){
    setError('');
    setLoading(true);
    try{
      const secretToUse = s || sessionStorage.getItem('admin_secret') || '';
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings', { params:{ secret: secretToUse }, headers: { 'x-admin-secret': secretToUse } });
      setPending(res.data.pending || []);
    }catch(e){
      setError('Failed to load admin data. Check secret and server.');
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

  return (
    <div className="page">
      <h2>Admin Panel</h2>
      <p className="muted">This page is hidden from the main nav. Enter your admin secret to load pending listings.</p>
      <div style={{maxWidth:480}}>
        <input placeholder="Admin secret" type="password" value={secret} onChange={e=>setSecret(e.target.value)} />
        <div style={{display:'flex',gap:8}}>
          <button className="btn" onClick={()=>loadPending(secret)} disabled={!secret || loading}>{loading? 'Loading...':'Load pending'}</button>
          <button className="btn ghost" onClick={()=>{ setSecret(''); setPending([]); }}>Clear</button>
        </div>
        {error && <div style={{color:'var(--danger)',marginTop:8}}>{error}</div>}
      </div>

      <div style={{marginTop:20}}>
        <h3>Pending listings</h3>
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
    </div>
  )
}
