import React, { useState } from 'react'
import axios from 'axios'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin(){
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault(); setLoading(true);
    try{
      const res = await axios.post((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/login', { password: secret });
      // store secret temporarily in sessionStorage for admin panel actions
      sessionStorage.setItem('admin_secret', res.data.secret || secret)
      nav('/Adminpanel')
    }catch(err){ alert('Invalid admin secret'); }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="page" style={{maxWidth:420}}>
      <h3>Admin login</h3>
      <input placeholder="Admin secret (password)" type="password" value={secret} onChange={e=>setSecret(e.target.value)} required/>
      <div style={{marginTop:8,fontSize:13}} className="muted">This uses server ADMIN_EMAIL/ADMIN_PASSWORD values. Enter the admin password here.</div>
      <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...':'Enter Admin Panel'}</button>
    </form>
  )
}
