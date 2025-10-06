import React, { useState } from 'react'
import api from '../lib/api'
import { useNavigate } from 'react-router-dom'

export default function AdminLogin(){
  const [email, setEmail] = useState('')
  const [secret, setSecret] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  async function submit(e){
    e.preventDefault(); setLoading(true);
    try{
      const res = await api.post('/api/admin/login', { email, password: secret });
      // store secret temporarily in sessionStorage for admin panel actions
      sessionStorage.setItem('admin_secret', res.data.secret || secret)
      window.dispatchEvent(new Event('adminChange'));
      nav('/Adminpanel')
    }catch(err){ alert(err?.response?.data?.error || err?.message || 'Invalid admin secret'); }
    finally{ setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="page" style={{maxWidth:420}}>
      <h3>Admin login</h3>
      <input placeholder="Admin email" type="email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input placeholder="Admin password" type="password" value={secret} onChange={e=>setSecret(e.target.value)} required/>
      <div style={{marginTop:8,fontSize:13}} className="muted">Enter ADMIN_EMAIL and ADMIN_PASSWORD </div>
      <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...':'Enter Admin Panel'}</button>
    </form>
  )
}
