import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function AdminPanel(){
  const [pending, setPending] = useState([]);
  const secret = prompt('Enter admin secret password to access this admin panel (this page is hidden from navbar).');
  useEffect(()=> {
    if (!secret) return;
    axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings', { params:{ secret }, headers: { 'x-admin-secret': secret } })
      .then(res=>setPending(res.data.pending))
      .catch(e=>{ alert('Failed to load admin data'); });
  }, []);
  async function approve(id){
    const secret = prompt('Admin secret');
    await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/approve', {}, { headers: { 'x-admin-secret': secret } });
    setPending(p=>p.filter(x=>x._id!==id));
  }
  async function reject(id){
    const secret = prompt('Admin secret');
    await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings/'+id+'/reject', {}, { headers: { 'x-admin-secret': secret } });
    setPending(p=>p.filter(x=>x._id!==id));
  }
  return (
    <div>
      <h2>Admin Panel (hidden)</h2>
      <p>Pending listings for approval</p>
      {pending.map(l=>(
        <div key={l._id} style={{border:'1px solid #ddd',padding:8,marginBottom:8}}>
          <h4>{l.title}</h4>
          <p>{l.description}</p>
          <button onClick={()=>approve(l._id)}>Approve</button>
          <button onClick={()=>reject(l._id)}>Reject</button>
        </div>
      ))}
    </div>
  )
}
