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
      // very simple: try to load admin pending listings with secret to validate
      const res = await axios.get((import.meta.env.VITE_API_URL||'http://localhost:5000') + '/api/admin/listings', { headers: { 'x-admin-secret': secret } });
      // store secret temporarily in sessionStorage for admin panel actions
      sessionStorage.setItem('admin_secret', secret)
      nav('/Adminpanel')
    }catch(err){ alert('Invalid admin secret'); }
    setLoading(false);
  }

  return (
    <form onSubmit={submit} className="page" style={{maxWidth:420}}>
      <h3>Admin login</h3>
      <input placeholder="Admin secret" type="password" value={secret} onChange={e=>setSecret(e.target.value)} required/>
      <button className="btn" type="submit" disabled={loading}>{loading? 'Signing in...':'Enter Admin Panel'}</button>
    </form>
  )
}
